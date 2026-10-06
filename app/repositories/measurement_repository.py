from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.measurement import Measurement


def add(db: Session, measurement: Measurement) -> None:
    db.add(measurement)


def find_all(
    db: Session,
    *,
    node_id: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Measurement]:
    statement = select(Measurement)
    if node_id is not None:
        statement = statement.where(Measurement.node_id == node_id)
    if from_date is not None:
        statement = statement.where(Measurement.created_at >= from_date)
    if to_date is not None:
        statement = statement.where(Measurement.created_at <= to_date)
    statement = (
        statement.order_by(Measurement.created_at.desc(), Measurement.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement))


def find_latest(db: Session, node_id: str | None = None) -> Measurement | None:
    statement = select(Measurement)
    if node_id is not None:
        statement = statement.where(Measurement.node_id == node_id)
    statement = statement.order_by(
        Measurement.created_at.desc(), Measurement.id.desc()
    ).limit(1)
    return db.scalar(statement)


def find_by_id(db: Session, measurement_id: int) -> Measurement | None:
    return db.get(Measurement, measurement_id)


def find_node_ids(db: Session) -> list[str]:
    statement = select(Measurement.node_id).distinct().order_by(Measurement.node_id)
    return list(db.scalars(statement))
