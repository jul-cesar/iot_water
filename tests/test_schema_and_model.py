from datetime import datetime

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.models.measurement import Measurement
from app.schemas.measurement import MeasurementCreate, WaterStatus


def valid_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "node_id": "Nodo_01_Agua",
        "temperature": 30.7,
        "ph": 3.95,
        "turbidity": 8.6,
        "tds": 73.0,
        "level": 0.0,
    }
    payload.update(overrides)
    return payload


def test_measurement_accepts_alert_values_and_strips_node_id() -> None:
    measurement = MeasurementCreate(**valid_payload(node_id="  Nodo_01_Agua  "))

    assert measurement.node_id == "Nodo_01_Agua"
    assert measurement.ph == 3.95


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("node_id", "   "),
        ("temperature", -50.1),
        ("temperature", 100.1),
        ("ph", -0.1),
        ("ph", 14.1),
        ("turbidity", -0.1),
        ("tds", -0.1),
        ("level", -0.1),
    ],
)
def test_measurement_rejects_invalid_values(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        MeasurementCreate(**valid_payload(**{field: value}))


@pytest.mark.parametrize(
    ("field", "value"),
    [("ph", float("nan")), ("turbidity", float("inf"))],
)
def test_measurement_rejects_non_finite_values(field: str, value: float) -> None:
    with pytest.raises(ValidationError):
        MeasurementCreate(**valid_payload(**{field: value}))


def test_measurement_accepts_validation_boundaries() -> None:
    low = MeasurementCreate(**valid_payload(temperature=-50, ph=0))
    high = MeasurementCreate(**valid_payload(temperature=100, ph=14))

    assert low.temperature == -50
    assert high.ph == 14


def test_settings_parse_comma_separated_cors_origins() -> None:
    configured = Settings(
        database_url="postgresql+psycopg://user:pass@db:5432/water",
        cors_origins="https://one.example, https://two.example",
        _env_file=None,
    )

    assert configured.cors_origins == [
        "https://one.example",
        "https://two.example",
    ]


def test_measurement_table_has_database_timestamp_and_required_indexes() -> None:
    table = Measurement.__table__
    created_at = table.c.created_at
    index_columns = {
        tuple(column.name for column in index.columns) for index in table.indexes
    }

    assert created_at.server_default is not None
    assert created_at.nullable is False
    assert {("node_id",), ("created_at",), ("node_id", "created_at")} <= index_columns
    assert WaterStatus.CRITICAL.value == "CRITICAL"
    assert Measurement.__annotations__["created_at"].__args__[0] is datetime
