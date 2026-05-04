"""Tests for gmail_sender.py — uses monkeypatching, no real Gmail calls."""
import base64
import email as stdlib_email
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

import pytest


def test_build_message_structure(monkeypatch):
    """build_message() returns base64url-encoded RFC822 with correct headers."""
    from gmail_sender import build_message

    raw = build_message(
        sender="gino@aktivasia.org",
        to=["alice@example.com", "bob@example.com"],
        cc=["gino@aktivasia.org"],
        subject="Test subject",
        html_body="<p>Hello</p>",
    )

    decoded = base64.urlsafe_b64decode(raw["raw"] + "==")
    msg = stdlib_email.message_from_bytes(decoded)

    assert msg["To"] == "alice@example.com, bob@example.com"
    assert "gino@aktivasia.org" in msg["Cc"]
    assert msg["Subject"] == "Test subject"
    assert msg["From"] == "gino@aktivasia.org"


def test_send_email_calls_gmail_api(monkeypatch):
    """send_email() calls the Gmail API users.messages.send with correct args."""
    import gmail_sender

    sent = {}

    def fake_build_service(token):
        class FakeMessages:
            def send(self, userId, body):
                sent["userId"] = userId
                sent["body"] = body
                class Req:
                    def execute(self):
                        return {"id": "msg123"}
                return Req()
        class FakeGmail:
            def users(self):
                class FakeUsers:
                    def messages(self):
                        return FakeMessages()
                return FakeUsers()
        return FakeGmail()

    monkeypatch.setattr(gmail_sender, "_build_service", fake_build_service)
    monkeypatch.setattr(gmail_sender, "_get_token", lambda: "fake-token")

    gmail_sender.send_email(
        to=["team@example.com"],
        cc=["cc@example.com"],
        subject="Hello",
        html_body="<p>World</p>",
    )

    assert sent["userId"] == "me"
    assert "raw" in sent["body"]
