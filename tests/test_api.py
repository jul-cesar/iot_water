from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app


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
    assert client.get(f"/api/measurements/{first['id']}").json()["node_id"] == "Nodo_B"
    assert client.get("/api/nodes").json() == ["Nodo_A", "Nodo_B"]


def test_missing_measurements_return_404(client: TestClient) -> None:
    assert client.get("/api/measurements/latest").status_code == 404
    assert client.get("/api/measurements/999").status_code == 404


def test_invalid_date_range_returns_422(client: TestClient) -> None:
    response = client.get(
        "/api/measurements",
        params={
            "from_date": "2026-02-01T00:00:00Z",
            "to_date": "2026-01-01T00:00:00Z",
        },
    )

    assert response.status_code == 422


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
