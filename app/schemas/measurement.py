from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class WaterStatus(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    OPTIMAL = "OPTIMAL"


NodeId = Annotated[str, StringConstraints(max_length=100)]


class MeasurementBase(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    node_id: NodeId
    temperature: float = Field(ge=-50, le=100)
    ph: float = Field(ge=0, le=14)
    turbidity: float = Field(ge=0)
    tds: float = Field(ge=0)
    level: float = Field(ge=0)

    @field_validator("node_id")
    @classmethod
    def validate_node_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("node_id must not be empty")
        return value


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementResponse(MeasurementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    water_status: WaterStatus
