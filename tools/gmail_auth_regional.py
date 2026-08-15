"""
gmail_auth_regional.py — One-time Gmail OAuth2 setup for regional@aktivasia.org

Same flow as gmail_auth.py, but for a SECOND Gmail account (regional@aktivasia.org)
rather than the existing gino@aktivasia.org token — needed because reminder-job's
P1/P2 participant emails must send From: regional@aktivasia.org (per the docx), and
that address turned out NOT to be a verified "Send As" alias on gino@aktivasia.org's
account (confirmed via a live test send on 2026-08-10 — the API call succeeded but
Gmail silently rewrote From: back to gino@aktivasia.org).

Writes to DIFFERENT .env keys than gmail_auth.py (GMAIL_REFRESH_TOKEN_REGIONAL, not
GMAIL_REFRESH_TOKEN) so running this does not clobber the existing gino@aktivasia.org
token that other tools (tools/reminder_engine.py's replacement, monitor-job, etc.)
still rely on. Reuses the same tools/credentials.json OAuth app — only the signed-in
Google account differs, not the client app.

Usage:
    python tools/gmail_auth_regional.py

Opens a browser for Google sign-in — IMPORTANT: sign in as regional@aktivasia.org,
not gino@aktivasia.org, when the browser prompts. Writes GMAIL_REFRESH_TOKEN_REGIONAL
to .env (GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET are reused as-is since it's the same
OAuth app either way).
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

    print("A browser window will open for Google sign-in.")
    print("IMPORTANT: sign in as regional@aktivasia.org, not gino@aktivasia.org.\n")

    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(CREDENTIALS_FILE) as f:
        raw = json.load(f)
    client = raw.get("installed") or raw.get("web", {})

    # GMAIL_CLIENT_ID/SECRET are the OAuth app itself, shared across accounts —
    # only the refresh token differs per signed-in account, so only it gets a
    # distinct env var name. Re-writing CLIENT_ID/SECRET here is harmless (same
    # values) but skipped to avoid implying they're regional-specific.
    set_key(ENV_FILE, "GMAIL_REFRESH_TOKEN_REGIONAL", creds.refresh_token)

    print("[OK] regional@aktivasia.org's refresh token written to .env as GMAIL_REFRESH_TOKEN_REGIONAL")
    print(f"     Refresh token: {creds.refresh_token[:20]}...")
    print("\nNext: copy this same value into")
    print("functions/reminder-job/catalyst-config.json as a new env var,")
    print("e.g. GMAIL_REFRESH_TOKEN_REGIONAL, and update gmail_sender.py's")
    print("_get_token() to pick the right refresh token per sender.")


if __name__ == "__main__":
    main()
