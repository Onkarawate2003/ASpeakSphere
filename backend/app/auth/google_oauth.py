"""Google ID token verification (Google Authentication / OAuth 2.0).

Verifies tokens using Google's own ``google-auth`` library rather than
manually decoding/validating the JWT — this checks the signature against
Google's published keys, the issuer, expiry, and the audience (our OAuth
client id) in one call. See ``POST /api/v1/auth/google`` in
``app/api/v1/auth.py`` for how the returned claims are used.
"""

import os
from typing import Any, Optional

from google.auth import exceptions as google_auth_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

# Reused across calls — this just wraps a `requests` session for fetching
# Google's public certs (and caches them internally).
_google_request = google_requests.Request()


def verify_google_id_token(token: str) -> Optional[dict[str, Any]]:
    """Verify a Google-issued ID token and return its decoded claims.

    Returns ``None`` (never raises) for any invalid, expired, or
    wrong-audience token — including when ``GOOGLE_CLIENT_ID`` is not
    configured — so the caller can treat every failure mode uniformly,
    mirroring ``verify_reset_token``'s convention.
    """
    if not GOOGLE_CLIENT_ID or not token:
        return None

    try:
        return google_id_token.verify_oauth2_token(
            token, _google_request, GOOGLE_CLIENT_ID
        )
    except (ValueError, google_auth_exceptions.GoogleAuthError):
        return None


__all__ = ["GOOGLE_CLIENT_ID", "verify_google_id_token"]
