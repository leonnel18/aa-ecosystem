"""Tests for functions/reminder-job/gmail_sender.py — specifically the
per-sender refresh-token selection added 2026-08-10 (regional@aktivasia.org
turned out not to be a verified Send-As alias on gino@aktivasia.org's Gmail
account — confirmed via a live test send — so P1/P2 need a separate OAuth
refresh token, GMAIL_REFRESH_TOKEN_REGIONAL, not just a different From:
header on the same token).

Loaded via importlib (not sys.path + `import gmail_sender`) to avoid
colliding with tools/gmail_sender.py's identically-named module in
tests/test_gmail_sender.py — see tests/test_reminder_job_checks.py's
_load_checks_package() for the same pattern applied to the checks/ package.
"""
import importlib.util
import os


_REMINDER_JOB_DIR = os.path.join(os.path.dirname(__file__), "..", "functions", "reminder-job")


def _load_reminder_job_gmail_sender():
    spec = importlib.util.spec_from_file_location(
        "reminder_job_gmail_sender", os.path.join(_REMINDER_JOB_DIR, "gmail_sender.py"),
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_default_sender_uses_gino_refresh_token_env():
    gmail_sender = _load_reminder_job_gmail_sender()
    assert gmail_sender._refresh_token_env_for("gino@aktivasia.org") == "GMAIL_REFRESH_TOKEN"


def test_regional_sender_uses_dedicated_refresh_token_env():
    gmail_sender = _load_reminder_job_gmail_sender()
    assert gmail_sender._refresh_token_env_for("regional@aktivasia.org") == "GMAIL_REFRESH_TOKEN_REGIONAL"


def test_unknown_sender_falls_back_to_default_refresh_token_env():
    gmail_sender = _load_reminder_job_gmail_sender()
    assert gmail_sender._refresh_token_env_for("someone-else@aktivasia.org") == "GMAIL_REFRESH_TOKEN"


def test_get_token_reads_the_env_var_selected_for_the_sender(monkeypatch):
    gmail_sender = _load_reminder_job_gmail_sender()

    seen_refresh_tokens = []

    class FakeCreds:
        def __init__(self, token, refresh_token, token_uri, client_id, client_secret):
            seen_refresh_tokens.append(refresh_token)
            self.token = "fake-access-token"

        def refresh(self, request):
            pass

    monkeypatch.setattr(gmail_sender, "Credentials", FakeCreds)
    monkeypatch.setenv("GMAIL_REFRESH_TOKEN", "gino-token")
    monkeypatch.setenv("GMAIL_REFRESH_TOKEN_REGIONAL", "regional-token")

    gmail_sender._get_token("gino@aktivasia.org")
    gmail_sender._get_token("regional@aktivasia.org")

    assert seen_refresh_tokens == ["gino-token", "regional-token"]


def test_send_email_passes_sender_through_to_build_message(monkeypatch):
    gmail_sender = _load_reminder_job_gmail_sender()

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

    seen_senders = []
    monkeypatch.setattr(gmail_sender, "_build_service", fake_build_service)
    monkeypatch.setattr(gmail_sender, "_get_token", lambda sender: seen_senders.append(sender) or "fake-token")

    gmail_sender.send_email(
        to=["participant@example.com"], cc=[], subject="Hi",
        html_body="<p>Hi</p>", sender="regional@aktivasia.org",
    )

    assert seen_senders == ["regional@aktivasia.org"]
    assert sent["userId"] == "me"
