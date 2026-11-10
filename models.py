import datetime

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    duration_days: Mapped[int]
    start_date: Mapped[datetime.date]
    strict_mode: Mapped[bool] = mapped_column(default=True)

    checkins: Mapped[list["CheckIn"]] = relationship(
        back_populates="challenge", cascade="all, delete-orphan"
    )


class CheckIn(Base):
    __tablename__ = "checkins"
    __table_args__ = (UniqueConstraint("challenge_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    challenge_id: Mapped[int] = mapped_column(ForeignKey("challenges.id"))
    date: Mapped[datetime.date]
    status: Mapped[str] = mapped_column(String(10))
    note: Mapped[str | None] = mapped_column(Text, default=None)

    challenge: Mapped["Challenge"] = relationship(back_populates="checkins")