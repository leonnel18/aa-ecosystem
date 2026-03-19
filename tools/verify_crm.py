"""
verify_crm.py — Phase 2: Link Verification for Zoho CRM

PURPOSE: Confirm CRM OAuth is working, list all module API names,
         print all field API names for the Deals module, and fetch 1 sample record.

RUN: python tools/verify_crm.py

PASS CRITERIA:
  [PASS] Token refreshed successfully
  [PASS] Module list printed
  [PASS] Deals field list printed (update claude.md with confirmed field names)
  [PASS] Sample Deal record fetched

This script is READ-ONLY. It never writes, updates, or deletes CRM data.
"""

import os
import json
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────
CLIENT_ID     = os.getenv("ZOHO_CRM_CLIENT_ID")
CLIENT_SECRET = os.getenv("ZOHO_CRM_CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("ZOHO_CRM_REFRESH_TOKEN")
REGION        = os.getenv("ZOHO_CRM_REGION", "COM").upper()
TOKEN_CACHE   = os.path.join(os.path.dirname(__file__), "..", "data", "token_crm.json")

REGION_BASE = {
    "COM": "https://accounts.zoho.com",
    "IN":  "https://accounts.zoho.in",
    "EU":  "https://accounts.zoho.eu",
    "AU":  "https://accounts.zoho.com.au",
    "JP":  "https://accounts.zoho.jp",
    "CN":  "https://accounts.zoho.com.cn",
}

API_BASE = {
    "COM": "https://www.zohoapis.com/crm/v8",
    "IN":  "https://www.zohoapis.in/crm/v8",
    "EU":  "https://www.zohoapis.eu/crm/v8",
    "AU":  "https://www.zohoapis.com.au/crm/v8",
    "JP":  "https://www.zohoapis.jp/crm/v8",
    "CN":  "https://www.zohoapis.com.cn/crm/v8",
}

ACCOUNTS_URL = REGION_BASE.get(REGION, REGION_BASE["COM"]) + "/oauth/v2/token"
API_URL      = API_BASE.get(REGION, API_BASE["COM"])


# ── Token Helpers ──────────────────────────────────────────────────────────

def refresh_access_token():
    """Get a fresh access token using the refresh token."""
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
    """Return cached token if valid, otherwise refresh."""
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
    missing = [k for k in ["ZOHO_CRM_CLIENT_ID", "ZOHO_CRM_CLIENT_SECRET", "ZOHO_CRM_REFRESH_TOKEN"]
               if not os.getenv(k)]
    if missing:
        print(f"[FAIL] Missing .env variables: {', '.join(missing)}")
        return False
    print("[PASS] .env variables found")
    return True


def check_token():
    try:
        token = refresh_access_token()
        print(f"[PASS] Token refreshed. Cached to data/token_crm.json")
        return token
    except Exception as e:
        print(f"[FAIL] Token refresh failed: {e}")
        return None


def list_modules(token):
    try:
        resp = requests.get(f"{API_URL}/settings/modules", headers=headers(token))
        resp.raise_for_status()
        modules = resp.json().get("modules", [])
        print(f"\n[PASS] {len(modules)} modules found in CRM:")
        for m in sorted(modules, key=lambda x: x.get("api_name", "")):
            print(f"       {m.get('api_name', '?'):40s}  → {m.get('module_name', '?')}")
        return True
    except Exception as e:
        print(f"[FAIL] Module list failed: {e}")
        return False


def list_deals_fields(token):
    try:
        resp = requests.get(f"{API_URL}/settings/fields?module=Deals", headers=headers(token))
        resp.raise_for_status()
        fields = resp.json().get("fields", [])
        print(f"\n[PASS] {len(fields)} fields found on Deals module:")
        print(f"       {'API Name':50s}  {'Display Label':40s}  {'Data Type'}")
        print(f"       {'-'*50}  {'-'*40}  {'-'*15}")
        for f in sorted(fields, key=lambda x: x.get("api_name", "")):
            print(f"       {f.get('api_name','?'):50s}  {f.get('field_label','?'):40s}  {f.get('data_type','?')}")

        # Save field list to .tmp/ for reference
        os.makedirs(os.path.join(os.path.dirname(__file__), "..", ".tmp"), exist_ok=True)
        out_path = os.path.join(os.path.dirname(__file__), "..", ".tmp", "deals_fields.json")
        with open(out_path, "w") as fp:
            json.dump(fields, fp, indent=2)
        print(f"\n       → Full field list saved to .tmp/deals_fields.json")
        print(f"       → Use this to update the [TBC] placeholders in claude.md")
        return True
    except Exception as e:
        print(f"[FAIL] Deals field list failed: {e}")
        return False


def check_token_scopes(token):
    """Call Zoho tokeninfo to see exactly what scopes this token has."""
    try:
        info_url = ACCOUNTS_URL.replace("/token", "/tokeninfo")
        resp = requests.get(info_url, params={"access_token": token})
        data = resp.json()
        scope = data.get("scope", data.get("scopes", "not found"))
        print(f"\n[INFO] Token scopes granted: {scope}")
        if "modules" not in str(scope):
            print(f"[WARN] Token does NOT have ZohoCRM.modules scope — record reads will fail")
            print(f"       Regenerate token with scope: ZohoCRM.modules.ALL,ZohoCRM.settings.ALL")
        return scope
    except Exception as e:
        print(f"[WARN] Could not check token scopes: {e}")
        return None


def fetch_sample_deal(token):
    """Fetch a sample Deal via REST GET (verifies ZohoCRM.modules.deals.READ scope)."""
    try:
        resp = requests.get(
            f"{API_URL}/Deals",
            headers=headers(token),
            params={"fields": "id,Deal_Name,Stage,Training_Applied", "per_page": 1}
        )
        data = resp.json()
        if resp.status_code == 200 and data.get("data"):
            rec = data["data"][0]
            print(f"\n[PASS] Sample Deal fetched via REST GET:")
            print(f"       ID:    {rec.get('id', '?')}")
            print(f"       Name:  {rec.get('Deal_Name', '?')}")
            print(f"       Stage: {rec.get('Stage', '?')}")
            out_path = os.path.join(os.path.dirname(__file__), "..", ".tmp", "sample_deal.json")
            with open(out_path, "w") as fp:
                json.dump(rec, fp, indent=2)
            print(f"       → Full record saved to .tmp/sample_deal.json")
            return True
        else:
            print(f"[FAIL] Sample Deal fetch failed: HTTP {resp.status_code}")
            print(f"       Response: {json.dumps(data)[:200]}")
            return False
    except Exception as e:
        print(f"[FAIL] Sample Deal fetch failed: {e}")
        return False


def fetch_sample_solutions(token):
    """Fetch a sample Training via REST GET (verifies ZohoCRM.modules.solutions.READ scope)."""
    try:
        resp = requests.get(
            f"{API_URL}/Solutions",
            headers=headers(token),
            params={"fields": "id,Solution_Title,Organised_By,Start_Date", "per_page": 1}
        )
        data = resp.json()
        if resp.status_code == 200 and data.get("data"):
            rec = data["data"][0]
            print(f"[PASS] Sample Training fetched via REST GET:")
            print(f"       ID:           {rec.get('id', '?')}")
            print(f"       Title:        {rec.get('Solution_Title', '?')}")
            print(f"       Organised By: {rec.get('Organised_By', '?')}")
            return True
        else:
            print(f"[FAIL] Solutions fetch failed: HTTP {resp.status_code}")
            print(f"       Response: {json.dumps(data)[:200]}")
            return False
    except Exception as e:
        print(f"[FAIL] Solutions fetch failed: {e}")
        return False


def list_solutions_fields(token):
    """Print field list for Solutions (Trainings) module."""
    try:
        resp = requests.get(f"{API_URL}/settings/fields?module=Solutions", headers=headers(token))
        resp.raise_for_status()
        fields = resp.json().get("fields", [])
        print(f"\n[PASS] {len(fields)} fields on Solutions module:")
        for f in sorted(fields, key=lambda x: x.get("api_name", "")):
            print(f"       {f.get('api_name','?'):50s}  {f.get('field_label','?')}")
        out_path = os.path.join(os.path.dirname(__file__), "..", ".tmp", "solutions_fields.json")
        with open(out_path, "w") as fp:
            json.dump(fields, fp, indent=2)
        print(f"       → Saved to .tmp/solutions_fields.json")
        return True
    except Exception as e:
        print(f"[FAIL] Solutions field list failed: {e}")
        return False


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("  aa-ecosystem — Phase 2: CRM Link Verification")
    print(f"  Region: {REGION}  |  API: {API_URL}")
    print("=" * 65)

    if not check_env():
        print("\n→ Fix .env before continuing.")
        return

    token = check_token()
    if not token:
        print("\n→ Fix OAuth credentials before continuing.")
        return

    check_token_scopes(token)

    results = []
    results.append(list_modules(token))
    results.append(list_deals_fields(token))
    results.append(fetch_sample_deal(token))
    results.append(fetch_sample_solutions(token))
    results.append(list_solutions_fields(token))

    print("\n" + "=" * 65)
    if all(results):
        print("  RESULT: ALL CHECKS PASSED")
        print("  NEXT STEPS:")
        print("  1. Open .tmp/deals_fields.json")
        print("  2. Map each [TBC] placeholder in claude.md to the real API name")
        print("  3. Run verify_analytics.py")
    else:
        print("  RESULT: SOME CHECKS FAILED — fix before proceeding to Phase 3")
    print("=" * 65)


if __name__ == "__main__":
    main()
