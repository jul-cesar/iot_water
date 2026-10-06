from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.measurement import MeasurementCreate, MeasurementResponse
from app.services.measurement_service import (
    create_measurement,
    get_latest_measurement,
    get_measurement,
    list_measurements,
    list_node_ids,
    to_response,
)

router = APIRouter(tags=["Measurements"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/measurements",
    response_model=MeasurementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store a water measurement",
)
def create(data: MeasurementCreate, db: DbSession) -> MeasurementResponse:
    return to_response(create_measurement(db, data))


@router.get(
    "/measurements",
    response_model=list[MeasurementResponse],
    summary="List water measurements",
)
def list_all(
    db: DbSession,
    node_id: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[MeasurementResponse]:
    if from_date is not None and to_date is not None and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="from_date must be earlier than or equal to to_date",
        )
    measurements = list_measurements(
        db,
        node_id=node_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )
    return [to_response(measurement) for measurement in measurements]


@router.get(
    "/measurements/latest",
    response_model=MeasurementResponse,
    summary="Get the latest water measurement",
)
def latest(db: DbSession, node_id: str | None = None) -> MeasurementResponse:
    measurement = get_latest_measurement(db, node_id)
    if measurement is None:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return to_response(measurement)


@router.get(
    "/measurements/{measurement_id}",
    response_model=MeasurementResponse,
    summary="Get a water measurement by ID",
)
def by_id(measurement_id: int, db: DbSession) -> MeasurementResponse:
    measurement = get_measurement(db, measurement_id)
    if measurement is None:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return to_response(measurement)


@router.get("/nodes", response_model=list[str], summary="List known IoT nodes")
def nodes(db: DbSession) -> list[str]:
    return list_node_ids(db)
