import datetime

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