import datetime

import pytest

from challenge_templates import TEMPLATES

TODAY = datetime.date.today()
ONE_DAY = datetime.timedelta(days=1)


def make_challenge(client, **overrides):
    payload = {
        "name": "Test challenge",
        "description": "",
        "duration_days": 30,
        "start_date": (TODAY - 2 * ONE_DAY).isoformat(),
        "strict_mode": True,
    }
    payload.update(overrides)
    return client.post("/challenges", json=payload)


def add_checkin(client, challenge_id, day, status="done"):
    return client.post(
        f"/challenges/{challenge_id}/checkins",
        json={"status": status, "date": day.isoformat()},
    )


def test_create_challenge(client):
    response = make_challenge(client, name="30 days no sugar")
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["name"] == "30 days no sugar"


def test_create_challenge_rejects_zero_duration(client):
    response = make_challenge(client, duration_days=0)
    assert response.status_code == 422


def test_list_challenges(client):
    make_challenge(client, name="One")
    make_challenge(client, name="Two")
    response = client.get("/challenges")
    assert response.status_code == 200
    names = [c["name"] for c in response.json()]
    assert names == ["One", "Two"]


def test_get_missing_challenge_returns_404(client):
    response = client.get("/challenges/999")
    assert response.status_code == 404


def test_delete_challenge(client):
    challenge_id = make_challenge(client).json()["id"]
    assert client.delete(f"/challenges/{challenge_id}").status_code == 204
    assert client.get(f"/challenges/{challenge_id}").status_code == 404


def test_create_checkin(client):
    challenge_id = make_challenge(client).json()["id"]
    response = add_checkin(client, challenge_id, TODAY - ONE_DAY)
    assert response.status_code == 201
    assert response.json()["status"] == "done"


def test_duplicate_checkin_returns_409(client):
    challenge_id = make_challenge(client).json()["id"]
    add_checkin(client, challenge_id, TODAY - ONE_DAY)
    response = add_checkin(client, challenge_id, TODAY - ONE_DAY)
    assert response.status_code == 409


def test_checkin_before_start_returns_400(client):
    challenge_id = make_challenge(client).json()["id"]
    response = add_checkin(client, challenge_id, TODAY - 3 * ONE_DAY)
    assert response.status_code == 400
    assert "between" in response.json()["detail"]


def test_checkin_in_future_returns_400(client):
    challenge_id = make_challenge(client).json()["id"]
    response = add_checkin(client, challenge_id, TODAY + ONE_DAY)
    assert response.status_code == 400
    assert "future" in response.json()["detail"]


def test_invalid_status_returns_422(client):
    challenge_id = make_challenge(client).json()["id"]
    response = add_checkin(client, challenge_id, TODAY, status="skipped")
    assert response.status_code == 422


def test_progress_endpoint_counts_checkins(client):
    challenge_id = make_challenge(client).json()["id"]
    add_checkin(client, challenge_id, TODAY - 2 * ONE_DAY)
    add_checkin(client, challenge_id, TODAY - ONE_DAY)
    response = client.get(f"/challenges/{challenge_id}/progress")
    assert response.status_code == 200
    body = response.json()
    assert body["days_completed"] == 2
    assert body["days_elapsed"] == 3
    assert body["days_left"] == 27
    assert body["completion_percent"] == 6.7
    assert body["current_streak"] == 2


def test_strict_slip_today_resets_streak(client):
    challenge_id = make_challenge(client, strict_mode=True).json()["id"]
    add_checkin(client, challenge_id, TODAY - ONE_DAY)
    add_checkin(client, challenge_id, TODAY, status="slipped")
    body = client.get(f"/challenges/{challenge_id}/progress").json()
    assert body["current_streak"] == 0


def test_relaxed_slip_today_keeps_streak(client):
    challenge_id = make_challenge(client, strict_mode=False).json()["id"]
    add_checkin(client, challenge_id, TODAY - ONE_DAY)
    add_checkin(client, challenge_id, TODAY, status="slipped")
    body = client.get(f"/challenges/{challenge_id}/progress").json()
    assert body["current_streak"] == 1


def test_progress_for_missing_challenge_returns_404(client):
    response = client.get("/challenges/999/progress")
    assert response.status_code == 404


def test_update_checkin_changes_status_and_note(client):
    challenge_id = make_challenge(client).json()["id"]
    checkin_id = add_checkin(client, challenge_id, TODAY - ONE_DAY).json()["id"]
    response = client.put(
        f"/challenges/{challenge_id}/checkins/{checkin_id}",
        json={"status": "slipped", "note": "Cake at a party"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "slipped"
    assert body["note"] == "Cake at a party"
    assert body["date"] == (TODAY - ONE_DAY).isoformat()


def test_update_checkin_changes_progress(client):
    challenge_id = make_challenge(client).json()["id"]
    checkin_id = add_checkin(client, challenge_id, TODAY - ONE_DAY).json()["id"]
    client.put(
        f"/challenges/{challenge_id}/checkins/{checkin_id}",
        json={"status": "slipped"},
    )
    body = client.get(f"/challenges/{challenge_id}/progress").json()
    assert body["days_completed"] == 0
    assert body["days_slipped"] == 1


def test_update_checkin_rejects_invalid_status(client):
    challenge_id = make_challenge(client).json()["id"]
    checkin_id = add_checkin(client, challenge_id, TODAY - ONE_DAY).json()["id"]
    response = client.put(
        f"/challenges/{challenge_id}/checkins/{checkin_id}",
        json={"status": "skipped"},
    )
    assert response.status_code == 422


def test_update_missing_checkin_returns_404(client):
    challenge_id = make_challenge(client).json()["id"]
    response = client.put(
        f"/challenges/{challenge_id}/checkins/999",
        json={"status": "done"},
    )
    assert response.status_code == 404


def test_delete_checkin_removes_it(client):
    challenge_id = make_challenge(client).json()["id"]
    checkin_id = add_checkin(client, challenge_id, TODAY - ONE_DAY).json()["id"]
    response = client.delete(f"/challenges/{challenge_id}/checkins/{checkin_id}")
    assert response.status_code == 204
    assert client.get(f"/challenges/{challenge_id}/checkins").json() == []


def test_checkin_of_another_challenge_returns_404(client):
    first = make_challenge(client, name="First").json()["id"]
    second = make_challenge(client, name="Second").json()["id"]
    checkin_id = add_checkin(client, first, TODAY - ONE_DAY).json()["id"]
    response = client.delete(f"/challenges/{second}/checkins/{checkin_id}")
    assert response.status_code == 404
    assert len(client.get(f"/challenges/{first}/checkins").json()) == 1


def test_patch_changes_only_sent_fields(client):
    challenge_id = make_challenge(client, name="Old", description="keep me").json()["id"]
    response = client.patch(f"/challenges/{challenge_id}", json={"name": "New"})
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "New"
    assert body["description"] == "keep me"
    assert body["duration_days"] == 30


def test_patch_can_switch_to_relaxed_mode(client):
    challenge_id = make_challenge(client, strict_mode=True).json()["id"]
    response = client.patch(f"/challenges/{challenge_id}", json={"strict_mode": False})
    assert response.status_code == 200
    assert response.json()["strict_mode"] is False


def test_patch_mode_switch_changes_streak(client):
    challenge_id = make_challenge(client, strict_mode=True).json()["id"]
    add_checkin(client, challenge_id, TODAY - 2 * ONE_DAY)
    add_checkin(client, challenge_id, TODAY - ONE_DAY, status="slipped")
    add_checkin(client, challenge_id, TODAY)
    progress_url = f"/challenges/{challenge_id}/progress"
    assert client.get(progress_url).json()["current_streak"] == 1
    client.patch(f"/challenges/{challenge_id}", json={"strict_mode": False})
    assert client.get(progress_url).json()["current_streak"] == 2


def test_patch_missing_challenge_returns_404(client):
    response = client.patch("/challenges/999", json={"name": "Nope"})
    assert response.status_code == 404


def test_patch_rejects_invalid_values(client):
    challenge_id = make_challenge(client).json()["id"]
    url = f"/challenges/{challenge_id}"
    assert client.patch(url, json={"duration_days": 0}).status_code == 422
    assert client.patch(url, json={"name": ""}).status_code == 422


def test_patch_rejects_null_for_a_field(client):
    challenge_id = make_challenge(client).json()["id"]
    response = client.patch(f"/challenges/{challenge_id}", json={"name": None})
    assert response.status_code == 422


def test_patch_shortening_below_existing_checkin_returns_400(client):
    challenge_id = make_challenge(client).json()["id"]
    add_checkin(client, challenge_id, TODAY - ONE_DAY)
    response = client.patch(f"/challenges/{challenge_id}", json={"duration_days": 1})
    assert response.status_code == 400


def test_patch_moving_start_after_checkin_returns_400(client):
    challenge_id = make_challenge(client).json()["id"]
    add_checkin(client, challenge_id, TODAY - 2 * ONE_DAY)
    response = client.patch(
        f"/challenges/{challenge_id}",
        json={"start_date": (TODAY - ONE_DAY).isoformat()},
    )
    assert response.status_code == 400


def test_patch_extending_duration_is_allowed(client):
    challenge_id = make_challenge(client).json()["id"]
    add_checkin(client, challenge_id, TODAY - ONE_DAY)
    response = client.patch(f"/challenges/{challenge_id}", json={"duration_days": 60})
    assert response.status_code == 200
    progress = client.get(f"/challenges/{challenge_id}/progress").json()
    assert progress["days_left"] == 57


def test_patch_with_empty_body_changes_nothing(client):
    challenge_id = make_challenge(client, name="Same").json()["id"]
    response = client.patch(f"/challenges/{challenge_id}", json={})
    assert response.status_code == 200
    assert response.json()["name"] == "Same"


def test_list_templates(client):
    response = client.get("/templates")
    assert response.status_code == 200
    names = [template["name"] for template in response.json()]
    assert "30 days no sugar" in names
    assert len(names) == len(TEMPLATES)


def test_template_names_are_unique():
    names = [template["name"] for template in TEMPLATES]
    assert len(names) == len(set(names))


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda t: t["name"])
def test_every_template_can_create_a_challenge(client, template):
    response = client.post(
        "/challenges",
        json={
            "name": template["name"],
            "description": template["description"],
            "duration_days": template["duration_days"],
            "start_date": TODAY.isoformat(),
            "strict_mode": template["strict_mode"],
        },
    )
    assert response.status_code == 201