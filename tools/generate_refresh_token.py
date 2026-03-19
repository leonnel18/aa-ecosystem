"""
generate_refresh_token.py — One-time Zoho OAuth setup

PURPOSE: Exchange a grant code for a refresh token and save it to .env

RUN:
  1. Go to https://api-console.zoho.com/ → Self Client → Generate Code
  2. Scope: ZohoCRM.modules.READ,ZohoCRM.settings.READ
  3. Duration: 10 minutes
  4. Paste the generated code when prompted

  python tools/generate_refresh_token.py
"""

import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID     = os.getenv("ZOHO_CRM_CLIENT_ID", "").strip()
CLIENT_SECRET = os.getenv("ZOHO_CRM_CLIENT_SECRET", "").strip()
REGION        = os.getenv("ZOHO_CRM_REGION", "COM").strip().upper()

ACCOUNTS_URL = {
    "COM": "https://accounts.zoho.com/oauth/v2/token",
    "IN":  "https://accounts.zoho.in/oauth/v2/token",
    "EU":  "https://accounts.zoho.eu/oauth/v2/token",
    "AU":  "https://accounts.zoho.com.au/oauth/v2/token",
    "JP":  "https://accounts.zoho.jp/oauth/v2/token",
    "CN":  "https://accounts.zoho.com.cn/oauth/v2/token",
}.get(REGION, "https://accounts.zoho.com/oauth/v2/token")

ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env")


def update_env(key, value):
    """Write or update a key in the .env file."""
    if not os.path.exists(ENV_FILE):
        with open(ENV_FILE, "w") as f:
            f.write(f"{key}={value}\n")
        return

    with open(ENV_FILE, "r") as f:
        content = f.read()

    pattern = rf"^{re.escape(key)}=.*$"
    replacement = f"{key}={value}"

    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        content += f"\n{key}={value}\n"

    with open(ENV_FILE, "w") as f:
        f.write(content)


def main():
    print("=" * 60)
    print("  Zoho CRM — Refresh Token Generator")
    print(f"  Region: {REGION}  |  Endpoint: {ACCOUNTS_URL}")
    print("=" * 60)

    if not CLIENT_ID or not CLIENT_SECRET:
        print("\n[FAIL] ZOHO_CRM_CLIENT_ID or ZOHO_CRM_CLIENT_SECRET not set in .env")
        print("       Fill these in first, then re-run.")
        return

    print(f"\n  Client ID: {CLIENT_ID}")
    print(f"  Client Secret: {'*' * (len(CLIENT_SECRET) - 4)}{CLIENT_SECRET[-4:]}")
    print()
    print("Steps:")
    print("  1. Go to https://api-console.zoho.com/")
    print("  2. Open your Self Client app")
    print("  3. Click 'Generate Code' tab")
    print("  4. Scope: ZohoCRM.modules.READ,ZohoCRM.settings.READ")
    print("  5. Duration: 10 minutes → click Create")
    print("  6. Copy the grant code and paste below")
    print()

    grant_code = input("  Paste grant code here: ").strip()

    if not grant_code:
        print("[FAIL] No code entered.")
        return

    print("\n  Exchanging grant code for refresh token...")

    try:
        resp = requests.post(ACCOUNTS_URL, data={
            "code":          grant_code,
            "client_id":     CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type":    "authorization_code",
        })
        data = resp.json()
    except Exception as e:
        print(f"[FAIL] Request failed: {e}")
        return

    if "refresh_token" in data:
        refresh_token = data["refresh_token"]
        update_env("ZOHO_CRM_REFRESH_TOKEN", refresh_token)
        print(f"\n[PASS] Refresh token obtained and saved to .env")
        print(f"       ZOHO_CRM_REFRESH_TOKEN = {refresh_token[:20]}...")
        print()
        print("  Next: python tools/verify_crm.py")
    else:
        print(f"\n[FAIL] Token exchange failed:")
        print(f"       {data}")
        if data.get("error") == "invalid_client":
            print()
            print("  Troubleshooting:")
            print("  - Double-check ZOHO_CRM_CLIENT_SECRET in .env (paste fresh from API Console)")
            print("  - Make sure ZOHO_CRM_REGION matches your Zoho account region")
            print(f"    (Current: {REGION} → endpoint: {ACCOUNTS_URL})")
            print("  - Generate a brand new grant code — they expire in 10 minutes")


if __name__ == "__main__":
    main()
