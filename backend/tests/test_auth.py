def _register_and_capture_otp(client, monkeypatch, user_payload, module="app.crud.users"):
    """Register a user, capturing the plaintext verification OTP that would
    normally only ever reach the user's inbox (only its bcrypt hash is
    stored)."""
    captured: dict[str, str] = {}

    def fake_send(to_email, otp):
        captured["otp"] = otp

    monkeypatch.setattr(f"{module}.send_email_verification_otp", fake_send)

    response = client.post("/api/v1/auth/register", json=user_payload)
    return response, captured


def test_register_does_not_auto_login(client, user_payload, monkeypatch):
    response, captured = _register_and_capture_otp(client, monkeypatch, user_payload)
    assert response.status_code == 201
    body = response.json()
    assert body["verification_required"] is True
    assert body["email"] == user_payload["email"]
    assert "access_token" not in body
    assert "otp" in captured and len(captured["otp"]) == 6


def test_login_before_verification_requires_verification(client, user_payload, monkeypatch):
    _register_and_capture_otp(client, monkeypatch, user_payload)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": user_payload["email"], "password": user_payload["password"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verification_required"] is True
    assert body["access_token"] is None
    assert body["email"] == user_payload["email"]


def test_verify_email_then_login_succeeds(client, user_payload, monkeypatch):
    _, captured = _register_and_capture_otp(client, monkeypatch, user_payload)

    verify = client.post(
        "/api/v1/auth/verify-email",
        json={"email": user_payload["email"], "otp": captured["otp"]},
    )
    assert verify.status_code == 200
    token = verify.json()["access_token"]
    assert token

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == user_payload["email"]

    login_after = client.post(
        "/api/v1/auth/login",
        json={"email": user_payload["email"], "password": user_payload["password"]},
    )
    assert login_after.status_code == 200
    login_body = login_after.json()
    assert login_body["verification_required"] is False
    assert login_body["access_token"]


def test_verify_email_wrong_otp_then_too_many_attempts(client, user_payload, monkeypatch):
    _register_and_capture_otp(client, monkeypatch, user_payload)

    for _ in range(5):
        response = client.post(
            "/api/v1/auth/verify-email",
            json={"email": user_payload["email"], "otp": "000000"},
        )
        assert response.status_code == 400

    locked_out = client.post(
        "/api/v1/auth/verify-email",
        json={"email": user_payload["email"], "otp": "000000"},
    )
    assert locked_out.status_code == 429


def test_resend_verification_is_generic_and_respects_cooldown(client, user_payload, monkeypatch):
    _, captured = _register_and_capture_otp(client, monkeypatch, user_payload)
    first_otp = captured["otp"]

    # Known account: the generic message is returned, and the cooldown
    # (just started by register) blocks a second OTP from being issued.
    resend = client.post("/api/v1/auth/resend-verification", json={"email": user_payload["email"]})
    assert resend.status_code == 200
    assert "otp" not in captured or captured["otp"] == first_otp

    # Unknown account: identical response shape — never reveals registration status.
    unknown = client.post("/api/v1/auth/resend-verification", json={"email": "nobody@example.com"})
    assert unknown.status_code == 200
    assert unknown.json() == resend.json()


def test_verification_status(client, user_payload, monkeypatch):
    _, captured = _register_and_capture_otp(client, monkeypatch, user_payload)

    before = client.get(f"/api/v1/auth/verification-status?email={user_payload['email']}")
    assert before.status_code == 200
    assert before.json()["is_email_verified"] is False

    client.post(
        "/api/v1/auth/verify-email",
        json={"email": user_payload["email"], "otp": captured["otp"]},
    )

    after = client.get(f"/api/v1/auth/verification-status?email={user_payload['email']}")
    assert after.json()["is_email_verified"] is True

    unknown = client.get("/api/v1/auth/verification-status?email=nobody@example.com")
    assert unknown.status_code == 200
    assert unknown.json()["is_email_verified"] is False


def test_register_login_and_protected_endpoint(client, auth_headers):
    # `auth_headers` registers, verifies, and logs in a user via the normal
    # endpoints (see conftest.py) — this exercises the full chain end to end.
    me = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me.status_code == 200


def test_protected_endpoint_rejects_invalid_token(client):
    assert client.get("/api/v1/progress", headers={"Authorization": "Bearer invalid"}).status_code == 401


# --------------------------------------------------------------------- #
# Forgot Password (Email OTP) — regression check: unaffected by Email
# Verification sharing the same OTP engine underneath.
# --------------------------------------------------------------------- #


def test_forgot_password_flow_still_works(client, auth_headers, user_payload, monkeypatch):
    captured: dict[str, str] = {}

    def fake_send(to_email, otp):
        captured["otp"] = otp

    monkeypatch.setattr("app.crud.users.send_password_reset_otp", fake_send)

    forgot = client.post("/api/v1/auth/forgot-password", json={"email": user_payload["email"]})
    assert forgot.status_code == 200
    assert "otp" in captured

    verify = client.post(
        "/api/v1/auth/verify-reset-otp",
        json={"email": user_payload["email"], "otp": captured["otp"]},
    )
    assert verify.status_code == 200
    reset_token = verify.json()["reset_token"]

    reset = client.post(
        "/api/v1/auth/reset-password",
        json={
            "reset_token": reset_token,
            "new_password": "new-secure-password",
            "confirm_password": "new-secure-password",
        },
    )
    assert reset.status_code == 200

    relogin = client.post(
        "/api/v1/auth/login",
        json={"email": user_payload["email"], "password": "new-secure-password"},
    )
    assert relogin.status_code == 200
    assert relogin.json()["access_token"]
