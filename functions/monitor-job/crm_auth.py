"""
crm_auth.py — Zoho CRM OAuth2 Token Manager (monitor-job variant)

Same refresh-token exchange as functions/pipeline-job/crm_auth.py, but caches
the access token in a MODULE-LEVEL IN-MEMORY variable instead of a file.

Why different from pipeline-job: this job's email-activity check (item 2)
makes many more CRM requests per run than pipeline-job's single extract pass.
auth_headers() is called on every request; a file-based cache that may not
persist reliably across a Catalyst function's ephemeral filesystem would risk
refreshing the token on every request within a single run, which can trip
Zoho's OAuth refresh-rate limit. An in-memory cache refreshes at most once
per process invocation, which is exactly what a single-run cron job needs.
"""

import os
import requests
from datetime import datetime, timezone

CLIENT_ID     = os.environ.get("ZOHO_CRM_CLIENT_ID")
CLIENT_SECRET = os.environ.get("ZOHO_CRM_CLIENT_SECRET")
REFRESH_TOKEN = os.environ.get("ZOHO_CRM_REFRESH_TOKEN")
REGION        = os.environ.get("ZOHO_CRM_REGION", "COM").upper()

ACCOUNTS_URL = {
    "COM": "https://accounts.zoho.com/oauth/v2/token",
    "IN":  "https://accounts.zoho.in/oauth/v2/token",
    "EU":  "https://accounts.zoho.eu/oauth/v2/token",
    "AU":  "https://accounts.zoho.com.au/oauth/v2/token",
    "JP":  "https://accounts.zoho.jp/oauth/v2/token",
    "CN":  "https://accounts.zoho.com.cn/oauth/v2/token",
}.get(REGION, "https://accounts.zoho.com/oauth/v2/token")

API_BASE = {
    "COM": "https://www.zohoapis.com/crm/v8",
    "IN":  "https://www.zohoapis.in/crm/v8",
    "EU":  "https://www.zohoapis.eu/crm/v8",
    "AU":  "https://www.zohoapis.com.au/crm/v8",
    "JP":  "https://www.zohoapis.jp/crm/v8",
    "CN":  "https://www.zohoapis.com.cn/crm/v8",
}.get(REGION, "https://www.zohoapis.com/crm/v8")

# In-memory cache: {"access_token": str, "expires_at": float epoch seconds}
# Lives for the lifetime of this process (one cron invocation).
_token_cache = {}


def _refresh() -> str:
    """Exchange refresh token for a new access token. Calls Zoho's ACCOUNTS
    endpoint (not the CRM API) — this POST is the OAuth handshake itself,
    not a CRM write, and is unavoidable (Zoho's only token mechanism)."""
    resp = requests.post(ACCOUNTS_URL, params={
        "refresh_token": REFRESH_TOKEN,
        "client_id":     CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type":    "refresh_token",
    })
    resp.raise_for_status()
    data = resp.json()
    if "access_token" not in data:
        raise RuntimeError(f"Token refresh failed: {data}")
    expires_at = datetime.now(timezone.utc).timestamp() + data.get("expires_in", 3600) - 60
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = expires_at
    return data["access_token"]


def get_access_token() -> str:
    """Return a valid access token (from in-memory cache or freshly refreshed)."""
    if _token_cache.get("expires_at", 0) > datetime.now(timezone.utc).timestamp():
        return _token_cache["access_token"]
    return _refresh()


def auth_headers() -> dict:
    """Return Authorization header dict for CRM API requests."""
    return {"Authorization": f"Zoho-oauthtoken {get_access_token()}"}
