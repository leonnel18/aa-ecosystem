"""
gmail_auth.py — One-time Gmail OAuth2 setup

Run this once to get a refresh token for the Gmail API.
Requires tools/credentials.json downloaded from Google Cloud Console
(OAuth 2.0 Desktop App credentials).

Usage:
    python tools/gmail_auth.py

Opens a browser for Google sign-in, then writes GMAIL_CLIENT_ID,
GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env.
"""

import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv, set_key

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env")


def main():
    if not os.path.exists(CREDENTIALS_FILE):
        print("[ERROR] tools/credentials.json not found.")
        print("Download OAuth2 Desktop App credentials from Google Cloud Console.")
        return

    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(CREDENTIALS_FILE) as f:
        raw = json.load(f)
    client = raw.get("installed") or raw.get("web", {})

    set_key(ENV_FILE, "GMAIL_CLIENT_ID",     client["client_id"])
    set_key(ENV_FILE, "GMAIL_CLIENT_SECRET", client["client_secret"])
    set_key(ENV_FILE, "GMAIL_REFRESH_TOKEN", creds.refresh_token)

    print("[OK] Gmail credentials written to .env")
    print(f"     Client ID: {client['client_id'][:20]}...")
    print(f"     Refresh token: {creds.refresh_token[:20]}...")


if __name__ == "__main__":
    main()
