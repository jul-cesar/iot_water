from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.measurement import Measurement
from app.schemas.measurement import MeasurementCreate, WaterStatus
from app.services.measurement_service import (
    calculate_water_status,
    create_measurement,
    get_latest_measurement,
    get_measurement,
    list_measurements,
    list_node_ids,
    to_response,
)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


def payload(node_id: str = "Nodo_01_Agua", **overrides: object) -> MeasurementCreate:
    values: dict[str, object] = {
        "node_id": node_id,
        "temperature": 30.7,
        "ph": 7.0,
        "turbidity": 4.0,
        "tds": 73.0,
        "level": 10.0,
    }
    values.update(overrides)
    return MeasurementCreate(**values)


@pytest.mark.parametrize(
    ("ph", "turbidity", "expected"),
    [
        (5.49, 0, WaterStatus.CRITICAL),
        (9.51, 0, WaterStatus.CRITICAL),
        (7, 8.01, WaterStatus.CRITICAL),
        (5.5, 0, WaterStatus.WARNING),
        (9.5, 0, WaterStatus.WARNING),
        (7, 8, WaterStatus.WARNING),
        (6.49, 0, WaterStatus.WARNING),
        (8.51, 0, WaterStatus.WARNING),
        (7, 5.01, WaterStatus.WARNING),
        (6.5, 5, WaterStatus.OPTIMAL),
        (8.5, 5, WaterStatus.OPTIMAL),
    ],
)
def test_calculate_water_status_thresholds(
    ph: float, turbidity: float, expected: WaterStatus
) -> None:
    assert calculate_water_status(ph, turbidity) is expected


def test_critical_status_takes_priority_over_warning() -> None:
    assert calculate_water_status(ph=10, turbidity=6) is WaterStatus.CRITICAL


def test_create_measurement_commits_and_builds_response(db: Session) -> None:
    measurement = create_measurement(db, payload(ph=3.95, turbidity=8.6))
    response = to_response(measurement)

    assert measurement.id == 1
    assert measurement.created_at is not None
    assert response.water_status is WaterStatus.CRITICAL


def test_create_measurement_rolls_back_database_errors(db: Session) -> None:
    Base.metadata.drop_all(db.get_bind())

    with pytest.raises(SQLAlchemyError):
        create_measurement(db, payload())

    assert db.is_active
    assert db.scalar(text("SELECT 1")) == 1


def test_queries_filter_paginate_order_and_find_records(db: Session) -> None:
    base_time = datetime(2026, 1, 1, tzinfo=UTC)
    rows = [
        Measurement(**payload("Nodo_B").model_dump(), created_at=base_time),
        Measurement(**payload("Nodo_A").model_dump(), created_at=base_time),
        Measurement(
            **payload("Nodo_A").model_dump(),
            created_at=base_time + timedelta(hours=1),
        ),
    ]
    db.add_all(rows)
    db.commit()

    all_rows = list_measurements(db, limit=10, offset=0)
    filtered = list_measurements(
        db,
        node_id="Nodo_A",
        from_date=base_time + timedelta(minutes=30),
        to_date=base_time + timedelta(hours=2),
        limit=10,
        offset=0,
    )

    assert [row.id for row in all_rows] == [3, 2, 1]
    assert [row.id for row in list_measurements(db, limit=1, offset=1)] == [2]
    assert [row.id for row in filtered] == [3]
    assert get_latest_measurement(db).id == 3
    assert get_latest_measurement(db, "Nodo_B").id == 1
    assert get_measurement(db, 2).node_id == "Nodo_A"
    assert get_measurement(db, 999) is None
    assert list_node_ids(db) == ["Nodo_A", "Nodo_B"]
