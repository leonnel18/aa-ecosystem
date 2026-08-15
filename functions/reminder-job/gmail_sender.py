"""
gmail_sender.py — Gmail API email sender (reminder-job variant)

Same logic as functions/monitor-job/gmail_sender.py, adapted to read
credentials from Catalyst env vars (functions/reminder-job/catalyst-config.json)
instead of a local .env file.

send_email() takes an explicit `sender` argument (defaulting to
GMAIL_SENDER/gino@aktivasia.org) rather than a single module-level constant,
because this job needs two different From: identities from the same
function: gino@aktivasia.org for the country-team emails (C1-C6) and
regional@aktivasia.org for the participant-facing emails (P1/P2), per the
docx's two different reply-to footers.

CONFIRMED 2026-08-10 (live test send): regional@aktivasia.org is NOT a
verified "Send As" alias on gino@aktivasia.org's Gmail account — the send API
call succeeds either way, but Gmail silently rewrites From: back to
gino@aktivasia.org when the requested sender isn't a verified alias on the
authenticated account. So a single shared refresh token cannot produce both
From: identities; this module now authenticates with a DIFFERENT refresh
token per sender:
  - GMAIL_REFRESH_TOKEN          -> gino@aktivasia.org (C1-C6)
  - GMAIL_REFRESH_TOKEN_REGIONAL -> regional@aktivasia.org (P1/P2)
Generate the second token by running tools/gmail_auth_regional.py locally,
signed into regional@aktivasia.org, then copy the resulting refresh token
into functions/reminder-job/catalyst-config.json as GMAIL_REFRESH_TOKEN_REGIONAL.
"""

import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

DEFAULT_SENDER = os.environ.get("GMAIL_SENDER", "gino@aktivasia.org")

# Which refresh-token env var to use for a given From: address. Anything not
# listed here falls back to GMAIL_REFRESH_TOKEN (the gino@aktivasia.org
# token) — see module docstring for why a single token can't cover both.
_REFRESH_TOKEN_ENV_BY_SENDER = {
    "regional@aktivasia.org": "GMAIL_REFRESH_TOKEN_REGIONAL",
}


def _refresh_token_env_for(sender: str) -> str:
    return _REFRESH_TOKEN_ENV_BY_SENDER.get(sender, "GMAIL_REFRESH_TOKEN")


def _get_token(sender: str) -> str:
    refresh_token = os.environ.get(_refresh_token_env_for(sender))
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
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


def build_message(sender: str, to: list, cc: list, subject: str, html_body: str,
                   inline_images: dict = None) -> dict:
    """inline_images: {content_id: raw_bytes}. The HTML body should reference
    each one as <img src="cid:{content_id}">. Uses MIMEMultipart("related")
    when images are present (HTML + its embedded images as one unit) rather
    than "alternative" (which is for interchangeable representations of the
    same content, e.g. plain-text vs. HTML) — "related" is the correct MIME
    structure for an HTML document that references its own inline parts.
    Chosen over a data: URI for the logo because some email clients
    (notably Outlook desktop) strip data: URIs from HTML email but do
    support standard cid: inline attachments."""
    msg = MIMEMultipart("related")
    msg["From"]    = sender
    msg["To"]      = ", ".join(to)
    if cc:
        msg["Cc"]  = ", ".join(cc)
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))
    for content_id, raw_bytes in (inline_images or {}).items():
        img = MIMEImage(raw_bytes)
        img.add_header("Content-ID", f"<{content_id}>")
        img.add_header("Content-Disposition", "inline", filename=f"{content_id}.png")
        msg.attach(img)
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


def send_email(to: list, cc: list, subject: str, html_body: str, sender: str = None,
                inline_images: dict = None) -> None:
    """Send an HTML email via Gmail API. Raises on failure.

    `sender` defaults to DEFAULT_SENDER (GMAIL_SENDER env var, normally
    gino@aktivasia.org). Pass sender="regional@aktivasia.org" for P1/P2 —
    this authenticates with a separate refresh token
    (GMAIL_REFRESH_TOKEN_REGIONAL), not the gino@aktivasia.org one, per the
    module docstring.

    `inline_images`: optional {content_id: raw_bytes} for images the HTML
    references via <img src="cid:{content_id}"> — see build_message().
    """
    sender  = sender or DEFAULT_SENDER
    token   = _get_token(sender)
    service = _build_service(token)
    message = build_message(sender, to, cc or [], subject, html_body, inline_images)
    service.users().messages().send(userId="me", body=message).execute()
