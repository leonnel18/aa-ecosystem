"""
crm_auth.py — Zoho CRM OAuth2 Token Manager

Provides get_access_token() used by all other pipeline tools.
Caches tokens in data/token_crm.json; refreshes only when expired.
"""

import os
import json
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID     = os.getenv("ZOHO_CRM_CLIENT_ID")
CLIENT_SECRET = os.getenv("ZOHO_CRM_CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("ZOHO_CRM_REFRESH_TOKEN")
REGION        = os.getenv("ZOHO_CRM_REGION", "COM").upper()

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

TOKEN_CACHE = os.path.join(os.path.dirname(__file__), "..", "data", "token_crm.json")


def _refresh():
    """Exchange refresh token for a new access token and cache it."""
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
    os.makedirs(os.path.dirname(TOKEN_CACHE), exist_ok=True)
    with open(TOKEN_CACHE, "w") as f:
        json.dump({"access_token": data["access_token"], "expires_at": expires_at}, f, indent=2)
    return data["access_token"]


def get_access_token() -> str:
    """Return a valid access token (from cache or freshly refreshed)."""
    if os.path.exists(TOKEN_CACHE):
        with open(TOKEN_CACHE) as f:
            cached = json.load(f)
        if cached.get("expires_at", 0) > datetime.now(timezone.utc).timestamp():
            return cached["access_token"]
    return _refresh()


def auth_headers() -> dict:
    """Return Authorization header dict for CRM API requests."""
    return {"Authorization": f"Zoho-oauthtoken {get_access_token()}"}
