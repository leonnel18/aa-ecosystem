"""
gmail_sender.py — Gmail API email sender (monitor-job variant)

Same logic as tools/gmail_sender.py, adapted to read credentials from
Catalyst env vars (functions/monitor-job/catalyst-config.json) instead of a
local .env file — Catalyst functions don't have access to this repo's .env.
"""

import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SENDER = os.environ.get("GMAIL_SENDER", "gino@aktivasia.org")


def _get_token() -> str:
    creds = Credentials(
        token=None,
        refresh_token=os.environ.get("GMAIL_REFRESH_TOKEN"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("GMAIL_CLIENT_ID"),
        client_secret=os.environ.get("GMAIL_CLIENT_SECRET"),
    )
    from google.auth.transport.requests import Request
    creds.refresh(Request())
    return creds.token


def _build_service(token: str):
    creds = Credentials(token=token)
    return build("gmail", "v1", credentials=creds)


def build_message(sender: str, to: list, cc: list, subject: str, html_body: str) -> dict:
    msg = MIMEMultipart("alternative")
    msg["From"]    = sender
    msg["To"]      = ", ".join(to)
    if cc:
        msg["Cc"]  = ", ".join(cc)
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


def send_email(to: list, cc: list, subject: str, html_body: str) -> None:
    """Send an HTML email via Gmail API. Raises on failure."""
    token   = _get_token()
    service = _build_service(token)
    message = build_message(SENDER, to, cc or [], subject, html_body)
    service.users().messages().send(userId="me", body=message).execute()
