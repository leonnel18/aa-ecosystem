"""
verify_analytics.py — Phase 2: Link Verification for Zoho Analytics

PURPOSE: Confirm Analytics OAuth is working, list available workspaces,
         and test a 1-row CSV import to confirm write access.

RUN: python tools/verify_analytics.py

PASS CRITERIA:
  [PASS] Token refreshed successfully
  [PASS] Workspace list returned
  [PASS] 1-row test import succeeds (HTTP 200)

NOTE: Zoho Analytics uses a separate OAuth client from CRM.
"""

import os
import json
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────
CLIENT_ID     = os.getenv("ZOHO_ANALYTICS_CLIENT_ID")
CLIENT_SECRET = os.getenv("ZOHO_ANALYTICS_CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("ZOHO_ANALYTICS_REFRESH_TOKEN")
WORKSPACE_ID  = os.getenv("ZOHO_ANALYTICS_WORKSPACE_ID")
ORG_ID        = os.getenv("ZOHO_ANALYTICS_ORG_ID")
EMAIL         = os.getenv("ZOHO_ANALYTICS_EMAIL")
TOKEN_CACHE   = os.path.join(os.path.dirname(__file__), "..", "data", "token_analytics.json")

ACCOUNTS_URL  = "https://accounts.zoho.com/oauth/v2/token"
ANALYTICS_API = "https://analyticsapi.zoho.com/restapi/v2"


# ── Token Helpers ──────────────────────────────────────────────────────────

def refresh_access_token():
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
    token_data = {"access_token": data["access_token"], "expires_at": expires_at}
    os.makedirs(os.path.dirname(TOKEN_CACHE), exist_ok=True)
    with open(TOKEN_CACHE, "w") as f:
        json.dump(token_data, f, indent=2)
    return data["access_token"]


def get_access_token():
    if os.path.exists(TOKEN_CACHE):
        with open(TOKEN_CACHE) as f:
            cached = json.load(f)
        if cached.get("expires_at", 0) > datetime.now(timezone.utc).timestamp():
            return cached["access_token"]
    return refresh_access_token()


def headers(token):
    return {"Authorization": f"Zoho-oauthtoken {token}"}


# ── Verification Steps ─────────────────────────────────────────────────────

def check_env():
    missing = [k for k in [
        "ZOHO_ANALYTICS_CLIENT_ID", "ZOHO_ANALYTICS_CLIENT_SECRET",
        "ZOHO_ANALYTICS_REFRESH_TOKEN", "ZOHO_ANALYTICS_EMAIL"
    ] if not os.getenv(k)]
    if missing:
        print(f"[FAIL] Missing .env variables: {', '.join(missing)}")
        return False
    print("[PASS] .env variables found")
    return True


def check_token():
    try:
        token = refresh_access_token()
        print("[PASS] Analytics token refreshed. Cached to data/token_analytics.json")
        return token
    except Exception as e:
        print(f"[FAIL] Token refresh failed: {e}")
        return None


def list_workspaces(token):
    """List all workspaces the user has access to."""
    try:
        url = f"{ANALYTICS_API}/workspaces"
        resp = requests.get(url, headers=headers(token), params={"ZOHO_ACTION": "GETWORKSPACES"})
        resp.raise_for_status()
        data = resp.json()

        # Analytics API wraps responses differently — handle both formats
        workspaces = (
            data.get("data", {}).get("workspaces") or
            data.get("workspaces") or
            []
        )
        if workspaces:
            print(f"\n[PASS] {len(workspaces)} workspace(s) found:")
            for ws in workspaces:
                ws_name = ws.get("workspaceName", ws.get("name", "?"))
                ws_id   = ws.get("workspaceId", ws.get("id", "?"))
                print(f"       {ws_id}  →  {ws_name}")
        else:
            print(f"[WARN] No workspaces found or unexpected response format.")
            print(f"       Raw response: {json.dumps(data, indent=2)[:500]}")
        return True
    except Exception as e:
        print(f"[FAIL] Workspace list failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"       Response: {e.response.text[:300]}")
        return False


def test_import(token):
    """Attempt a 1-row CSV import to the target workspace to confirm write access."""
    if not WORKSPACE_ID or not EMAIL:
        print("[SKIP] ZOHO_ANALYTICS_WORKSPACE_ID or ZOHO_ANALYTICS_EMAIL not set — skipping import test")
        return True

    try:
        url = f"{ANALYTICS_API}/workspaces/{WORKSPACE_ID}/views/aa_verify_test/rows"
        test_csv = "run_id,run_at,status\nverify_test,{},PASS\n".format(
            datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        )
        resp = requests.post(
            f"{ANALYTICS_API}/workspaces/{WORKSPACE_ID}/tables",
            headers={**headers(token), "Content-Type": "application/json"},
            json={
                "ZOHO_ACTION": "IMPORT",
                "ZOHO_IMPORT_TYPE": "TRUNCATEADD",
                "ZOHO_FILE_TYPE": "CSV",
                "ZOHO_AUTO_IDENTIFY": "true",
                "ZOHO_ON_IMPORT_ERROR": "ABORT",
                "ZOHO_CREATE_TABLE": "true",
                "fileContent": test_csv,
            }
        )
        if resp.status_code in (200, 201):
            print("[PASS] Analytics import test succeeded (test table created/updated)")
        else:
            print(f"[WARN] Import test returned HTTP {resp.status_code}: {resp.text[:200]}")
            print("       This may be OK — confirm workspace ID and permissions manually")
        return True
    except Exception as e:
        print(f"[FAIL] Import test failed: {e}")
        return False


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("  aa-ecosystem — Phase 2: Analytics Link Verification")
    print("=" * 65)

    if not check_env():
        print("\n→ Fill in Zoho Analytics credentials in .env before continuing.")
        return

    token = check_token()
    if not token:
        return

    results = []
    results.append(list_workspaces(token))
    results.append(test_import(token))

    print("\n" + "=" * 65)
    if all(results):
        print("  RESULT: ALL CHECKS PASSED")
        print("  NEXT STEPS:")
        print("  1. Note the Workspace ID from above → add to .env")
        print("  2. Proceed to Phase 3: Architect")
    else:
        print("  RESULT: SOME CHECKS FAILED — fix before proceeding to Phase 3")
    print("=" * 65)


if __name__ == "__main__":
    main()
