import datetime

from progress import calculate_progress

d = datetime.date


def nov(day):
    return d(2026, 11, day)


def make_statuses(done=(), slipped=()):
    statuses = {}
    for day in done:
        statuses[nov(day)] = "done"
    for day in slipped:
        statuses[nov(day)] = "slipped"
    return statuses


def run(statuses, today, strict=True, duration=30):
    return calculate_progress(nov(1), duration, strict, statuses, today)


def test_no_checkins_gives_zero_progress():
    result = run({}, today=nov(5))
    assert result.days_completed == 0
    assert result.days_elapsed == 5
    assert result.days_left == 25
    assert result.completion_percent == 0.0
    assert result.current_streak == 0


def test_all_done_builds_streak():
    result = run(make_statuses(done=[1, 2, 3, 4, 5]), today=nov(5))
    assert result.days_completed == 5
    assert result.completion_percent == 16.7
    assert result.current_streak == 5


def test_today_not_checked_in_yet_keeps_streak():
    result = run(make_statuses(done=[1, 2, 3, 4]), today=nov(5))
    assert result.current_streak == 4


def test_strict_slip_resets_streak():
    statuses = make_statuses(done=[1, 2, 4, 5], slipped=[3])
    result = run(statuses, today=nov(5), strict=True)
    assert result.days_slipped == 1
    assert result.current_streak == 2


def test_relaxed_slip_does_not_reset_streak():
    statuses = make_statuses(done=[1, 2, 4, 5], slipped=[3])
    result = run(statuses, today=nov(5), strict=False)
    assert result.days_slipped == 1
    assert result.current_streak == 4


def test_missing_day_breaks_streak_even_in_relaxed_mode():
    statuses = make_statuses(done=[1, 2, 4, 5])
    result = run(statuses, today=nov(5), strict=False)
    assert result.current_streak == 2


def test_before_start_date_nothing_has_happened():
    result = run({}, today=d(2026, 10, 25))
    assert result.days_elapsed == 0
    assert result.days_left == 30
    assert result.current_streak == 0


def test_after_challenge_ends_everything_is_capped():
    statuses = make_statuses(done=[1, 2, 3])
    result = run(statuses, today=nov(10), duration=3)
    assert result.days_elapsed == 3
    assert result.days_left == 0
    assert result.completion_percent == 100.0
    assert result.current_streak == 3


def test_after_end_missing_last_day_gives_no_grace():
    statuses = make_statuses(done=[1, 2])
    result = run(statuses, today=nov(10), duration=3)
    assert result.days_completed == 2
    assert result.current_streak == 0


def test_completion_percent_rounds_to_one_decimal():
    result = run(make_statuses(done=[1]), today=nov(2), duration=3)
    assert result.completion_percent == 33.3