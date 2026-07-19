def test_xp_award_updates_progress_and_is_idempotent(client, auth_headers):
    payload = {"source": "test", "reference": "award-1", "amount": 25, "reason": "Test award"}
    first = client.post("/api/v1/progress/award", json=payload, headers=auth_headers)
    assert first.status_code == 200 and first.json()["awarded"] is True
    assert first.json()["progress"]["total_xp"] == 25
    second = client.post("/api/v1/progress/award", json=payload, headers=auth_headers)
    assert second.status_code == 200 and second.json()["awarded"] is False
    assert second.json()["progress"]["total_xp"] == 25
