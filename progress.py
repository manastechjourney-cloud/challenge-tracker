import datetime
from dataclasses import dataclass


@dataclass
class Progress:
    days_completed: int
    days_slipped: int
    days_elapsed: int
    days_left: int
    completion_percent: float
    current_streak: int


def calculate_progress(
    start_date: datetime.date,
    duration_days: int,
    strict_mode: bool,
    statuses: dict[datetime.date, str],
    today: datetime.date,
) -> Progress:
    one_day = datetime.timedelta(days=1)
    last_day = start_date + datetime.timedelta(days=duration_days - 1)

    days_elapsed = (today - start_date).days + 1
    days_elapsed = max(0, min(days_elapsed, duration_days))
    days_left = duration_days - days_elapsed

    days_completed = sum(1 for s in statuses.values() if s == "done")
    days_slipped = sum(1 for s in statuses.values() if s == "slipped")
    completion_percent = round(days_completed / duration_days * 100, 1)

    day = min(today, last_day)
    if today <= last_day and day not in statuses:
        day -= one_day

    current_streak = 0
    while day >= start_date:
        status = statuses.get(day)
        if status == "done":
            current_streak += 1
        elif status == "slipped" and not strict_mode:
            pass
        else:
            break
        day -= one_day

    return Progress(
        days_completed=days_completed,
        days_slipped=days_slipped,
        days_elapsed=days_elapsed,
        days_left=days_left,
        completion_percent=completion_percent,
        current_streak=current_streak,
    )