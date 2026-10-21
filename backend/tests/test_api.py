import csv
import io
from collections.abc import Generator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

HISTORY_AUTH = ("admin", "test-password")


@pytest.fixture
def session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as db:
        yield db
    engine.dispose()


@pytest.fixture
def client(session: Session) -> Generator[TestClient, None, None]:
    def override_db() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = override_db
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def payload(node_id: str = "Nodo_01_Agua", **overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "node_id": node_id,
        "temperature": 30.7,
        "ph": 3.95,
        "turbidity": 8.6,
        "tds": 73.0,
        "level": 0.0,
    }
    values.update(overrides)
    return values


def test_post_creates_measurement_with_computed_status(client: TestClient) -> None:
    response = client.post("/api/measurements", json=payload())

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        **payload(),
        "created_at": response.json()["created_at"],
        "water_status": "CRITICAL",
    }


def test_list_filters_and_paginates_measurements(client: TestClient) -> None:
    client.post("/api/measurements", json=payload("Nodo_B", ph=7, turbidity=2))
    client.post("/api/measurements", json=payload("Nodo_A", ph=7, turbidity=2))
    client.post("/api/measurements", json=payload("Nodo_A", ph=7, turbidity=2))

    response = client.get(
        "/api/measurements",
        params={"node_id": "Nodo_A", "limit": 1, "offset": 1},
        auth=HISTORY_AUTH,
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [2]


def test_latest_detail_and_nodes(client: TestClient) -> None:
    first = client.post("/api/measurements", json=payload("Nodo_B")).json()
    second = client.post("/api/measurements", json=payload("Nodo_A")).json()

    assert client.get("/api/measurements/latest").json()["id"] == second["id"]
    assert (
        client.get("/api/measurements/latest", params={"node_id": "Nodo_B"}).json()[
            "id"
        ]
        == first["id"]
    )
    assert (
        client.get(f"/api/measurements/{first['id']}", auth=HISTORY_AUTH).json()[
            "node_id"
        ]
        == "Nodo_B"
    )
    assert client.get("/api/nodes").json() == ["Nodo_A", "Nodo_B"]


def test_missing_measurements_return_404(client: TestClient) -> None:
    assert client.get("/api/measurements/latest").status_code == 404
    assert client.get("/api/measurements/999", auth=HISTORY_AUTH).status_code == 404


def test_history_routes_require_credentials(client: TestClient) -> None:
    for path in ("/api/measurements", "/api/measurements/1"):
        response = client.get(path)
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid history credentials"}
        assert "www-authenticate" not in response.headers


@pytest.mark.parametrize(
    "auth",
    [("admin", "wrong"), ("wrong", "test-password")],
)
def test_wrong_history_credentials_are_rejected(
    client: TestClient, auth: tuple[str, str]
) -> None:
    response = client.get("/api/measurements", auth=auth)

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid history credentials"}
    assert "www-authenticate" not in response.headers


@pytest.mark.parametrize(
    "authorization",
    ["Basic !!!", "Basic bm9jb2xvbg=="],
)
def test_malformed_history_credentials_use_generic_response(
    client: TestClient, authorization: str
) -> None:
    response = client.get(
        "/api/measurements", headers={"Authorization": authorization}
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid history credentials"}
    assert "www-authenticate" not in response.headers


def test_environment_history_credentials_authenticate(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "history_username", "environment-user")
    monkeypatch.setattr(settings, "history_password", "environment-password")

    response = client.get(
        "/api/measurements",
        auth=("environment-user", "environment-password"),
    )

    assert response.status_code == 200


def test_empty_environment_credentials_fail_closed(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "history_username", "admin")
    monkeypatch.setattr(settings, "history_password", "")

    response = client.get("/api/measurements", auth=("admin", ""))

    assert response.status_code == 401


def test_invalid_date_range_returns_422(client: TestClient) -> None:
    response = client.get(
        "/api/measurements",
        params={
            "from_date": "2026-02-01T00:00:00Z",
            "to_date": "2026-01-01T00:00:00Z",
        },
        auth=HISTORY_AUTH,
    )

    assert response.status_code == 422


def test_mixed_timezone_date_range_returns_422(client: TestClient) -> None:
    response = client.get(
        "/api/measurements",
        params={
            "from_date": "2026-01-01T00:00:00",
            "to_date": "2026-02-01T00:00:00Z",
        },
        auth=HISTORY_AUTH,
    )

    assert response.status_code == 422


def export_params(node_id: str = "Nodo_01_Agua") -> dict[str, str]:
    now = datetime.now(timezone.utc)
    return {
        "node_id": node_id,
        "from_date": (now - timedelta(minutes=1)).isoformat(),
        "to_date": (now + timedelta(minutes=1)).isoformat(),
    }


def test_export_requires_valid_credentials(client: TestClient) -> None:
    missing = client.get("/api/measurements/export.csv", params=export_params())
    wrong = client.get(
        "/api/measurements/export.csv",
        params=export_params(),
        auth=("admin", "wrong"),
    )

    for response in (missing, wrong):
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid history credentials"}
        assert "www-authenticate" not in response.headers


def test_export_returns_chronological_excel_compatible_csv(
    client: TestClient,
) -> None:
    client.post("/api/measurements", json=payload(temperature=10))
    client.post("/api/measurements", json=payload(temperature=20))

    response = client.get(
        "/api/measurements/export.csv",
        params=export_params(),
        auth=HISTORY_AUTH,
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.content.startswith("\ufeff".encode())
    rows = list(csv.reader(io.StringIO(response.text.removeprefix("\ufeff"))))
    assert rows[0] == [
        "created_at",
        "node_id",
        "temperature",
        "ph",
        "turbidity",
        "tds",
        "level",
        "water_status",
    ]
    assert [row[2] for row in rows[1:]] == ["10.0", "20.0"]


@pytest.mark.parametrize("prefix", ["=", "+", "-", "@"])
def test_export_escapes_csv_and_neutralizes_spreadsheet_formulas(
    client: TestClient, prefix: str
) -> None:
    dangerous_node = f'{prefix}1+1,"quoted"\nnext'
    client.post("/api/measurements", json=payload(dangerous_node))

    response = client.get(
        "/api/measurements/export.csv",
        params=export_params(dangerous_node),
        auth=HISTORY_AUTH,
    )

    assert response.status_code == 200
    rows = list(csv.reader(io.StringIO(response.text.removeprefix("\ufeff"))))
    assert rows[1][1] == f"'{dangerous_node}"


@pytest.mark.parametrize(
    "params",
    [
        {"node_id": "Nodo_01_Agua", "to_date": "2026-02-01T00:00:00Z"},
        {"node_id": "Nodo_01_Agua", "from_date": "2026-01-01T00:00:00Z"},
        {
            "node_id": "Nodo_01_Agua",
            "from_date": "2026-02-01T00:00:00Z",
            "to_date": "2026-01-01T00:00:00Z",
        },
        {
            "node_id": "Nodo_01_Agua",
            "from_date": "2026-01-01T00:00:00Z",
            "to_date": "2026-02-01T00:00:01Z",
        },
    ],
)
def test_export_rejects_missing_reversed_or_excessive_ranges(
    client: TestClient, params: dict[str, str]
) -> None:
    response = client.get(
        "/api/measurements/export.csv", params=params, auth=HISTORY_AUTH
    )

    assert response.status_code == 422


def test_export_accepts_exactly_thirty_one_days(client: TestClient) -> None:
    response = client.get(
        "/api/measurements/export.csv",
        params={
            "node_id": "Nodo_01_Agua",
            "from_date": "2026-01-01T00:00:00Z",
            "to_date": "2026-02-01T00:00:00Z",
        },
        auth=HISTORY_AUTH,
    )

    assert response.status_code == 200


def test_export_rejects_results_above_row_cap(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.api.routes import measurements as measurement_routes

    monkeypatch.setattr(measurement_routes, "MAX_EXPORT_ROWS", 1)
    client.post("/api/measurements", json=payload(temperature=10))
    client.post("/api/measurements", json=payload(temperature=20))

    response = client.get(
        "/api/measurements/export.csv",
        params=export_params(),
        auth=HISTORY_AUTH,
    )

    assert response.status_code == 413
    assert response.json() == {"detail": "Select a shorter date range"}


def test_health_checks_database(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_database_errors_return_generic_503() -> None:
    sensitive_marker = "database-sensitive-marker"

    def failing_db() -> Generator[Session, None, None]:
        raise SQLAlchemyError(sensitive_marker)
        yield

    app.dependency_overrides[get_db] = failing_db
    try:
        response = TestClient(app, raise_server_exceptions=False).get("/health")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
    assert sensitive_marker not in response.text


def test_post_logs_received_measurement(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("INFO", logger="app.api.routes.measurements"):
        client.post("/api/measurements", json=payload())

    assert (
        "Measurement #1 temp=30.7 ph=3.95 turbidity=8.6 "
        "tds=73.0 level=0.0 status=CRITICAL"
    ) in caplog.text
    assert "node=" not in caplog.text
