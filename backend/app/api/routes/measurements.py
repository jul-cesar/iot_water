import csv
import io
import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import AwareDatetime
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.history_auth import require_history_access
from app.schemas.measurement import MeasurementCreate, MeasurementResponse
from app.services.measurement_service import (
    create_measurement,
    get_latest_measurement,
    get_measurement,
    list_measurements,
    list_node_ids,
    to_response,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Measurements"])
DbSession = Annotated[Session, Depends(get_db)]
HistoryAccess = Annotated[None, Depends(require_history_access)]
MAX_EXPORT_ROWS = 50_000
_EXPORT_COLUMNS = (
    "created_at",
    "node_id",
    "temperature",
    "ph",
    "turbidity",
    "tds",
    "level",
    "water_status",
)


def _spreadsheet_safe(value: object) -> object:
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


@router.post(
    "/measurements",
    response_model=MeasurementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store a water measurement",
)
def create(data: MeasurementCreate, db: DbSession) -> MeasurementResponse:
    measurement = to_response(create_measurement(db, data))
    logger.info(
        "Measurement #%s temp=%s ph=%s turbidity=%s tds=%s level=%s status=%s",
        measurement.id,
        measurement.temperature,
        measurement.ph,
        measurement.turbidity,
        measurement.tds,
        measurement.level,
        measurement.water_status.value,
    )
    return measurement


@router.get(
    "/measurements",
    response_model=list[MeasurementResponse],
    summary="List water measurements",
)
def list_all(
    db: DbSession,
    _: HistoryAccess,
    node_id: str | None = None,
    from_date: AwareDatetime | None = None,
    to_date: AwareDatetime | None = None,
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
    "/measurements/export.csv",
    summary="Export water measurement history as CSV",
)
def export_csv(
    db: DbSession,
    _: HistoryAccess,
    node_id: str,
    from_date: AwareDatetime,
    to_date: AwareDatetime,
) -> Response:
    if from_date > to_date or to_date - from_date > timedelta(days=31):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Select a date range of up to 31 days",
        )

    measurements = list_measurements(
        db,
        node_id=node_id,
        from_date=from_date,
        to_date=to_date,
        limit=MAX_EXPORT_ROWS + 1,
    )
    if len(measurements) > MAX_EXPORT_ROWS:
        raise HTTPException(status_code=413, detail="Select a shorter date range")

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(_EXPORT_COLUMNS)
    for measurement in reversed(measurements):
        row = to_response(measurement)
        writer.writerow(
            [
                row.created_at.isoformat(),
                _spreadsheet_safe(row.node_id),
                row.temperature,
                row.ph,
                row.turbidity,
                row.tds,
                row.level,
                row.water_status.value,
            ]
        )

    filename = f"measurements-{from_date.date()}-{to_date.date()}.csv"
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
def by_id(
    measurement_id: int, db: DbSession, _: HistoryAccess
) -> MeasurementResponse:
    measurement = get_measurement(db, measurement_id)
    if measurement is None:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return to_response(measurement)


@router.get("/nodes", response_model=list[str], summary="List known IoT nodes")
def nodes(db: DbSession) -> list[str]:
    return list_node_ids(db)
