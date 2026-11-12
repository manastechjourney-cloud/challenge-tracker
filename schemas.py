import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChallengeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    duration_days: int = Field(gt=0, le=3650)
    start_date: datetime.date
    strict_mode: bool = True


class ChallengeRead(ChallengeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int

class ChallengeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    duration_days: int | None = Field(default=None, gt=0, le=3650)
    start_date: datetime.date | None = None
    strict_mode: bool | None = None

class CheckInUpdate(BaseModel):
    status: Literal["done", "slipped"]
    note: str | None = Field(default=None, max_length=500)


class CheckInCreate(CheckInUpdate):
    date: datetime.date | None = None


class CheckInRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    challenge_id: int
    date: datetime.date
    status: str
    note: str | None


class ProgressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    days_completed: int
    days_slipped: int
    days_elapsed: int
    days_left: int
    completion_percent: float
    current_streak: int

class TemplateRead(BaseModel):
    name: str
    description: str
    duration_days: int
    strict_mode: bool
    icon: str

class StatsRead(BaseModel):
    challenges_total: int
    challenges_active: int
    days_done: int
    days_slipped: int
    slip_rate_percent: float
    best_current_streak: int    