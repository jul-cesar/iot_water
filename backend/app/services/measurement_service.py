from datetime import datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.measurement import Measurement
from app.repositories import measurement_repository
from app.schemas.measurement import MeasurementCreate, MeasurementResponse, WaterStatus


def calculate_water_status(ph: float, turbidity: float) -> WaterStatus:
    if turbidity > 8 or ph < 5.5 or ph > 9.5:
        return WaterStatus.CRITICAL
    if turbidity > 5 or ph < 6.5 or ph > 8.5:
        return WaterStatus.WARNING
    return WaterStatus.OPTIMAL


def to_response(measurement: Measurement) -> MeasurementResponse:
    return MeasurementResponse(
        id=measurement.id,
        node_id=measurement.node_id,
        temperature=measurement.temperature,
        ph=measurement.ph,
        turbidity=measurement.turbidity,
        tds=measurement.tds,
        level=measurement.level,
        created_at=measurement.created_at,
        water_status=calculate_water_status(measurement.ph, measurement.turbidity),
    )


def create_measurement(db: Session, data: MeasurementCreate) -> Measurement:
    measurement = Measurement(**data.model_dump())
    try:
        measurement_repository.add(db, measurement)
        db.commit()
        db.refresh(measurement)
    except SQLAlchemyError:
        db.rollback()
        raise
    return measurement


def list_measurements(
    db: Session,
    *,
    node_id: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Measurement]:
    return measurement_repository.find_all(
        db,
        node_id=node_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )


def get_latest_measurement(
    db: Session, node_id: str | None = None
) -> Measurement | None:
    return measurement_repository.find_latest(db, node_id)


def get_measurement(db: Session, measurement_id: int) -> Measurement | None:
    return measurement_repository.find_by_id(db, measurement_id)


def list_node_ids(db: Session) -> list[str]:
    return measurement_repository.find_node_ids(db)
