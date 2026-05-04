# Reminder Engine & Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated email reminder system for AktivAsia country teams covering four training lifecycle stages (training plan countdown, participant selection, attendance confirmation, post-survey follow-up), plus an admin page for country teams to manage participant stages.

**Architecture:** A new `tools/reminder_engine.py` runs daily via Windows Task Scheduler, reuses the existing `crm_extract.fetch_module()` function to read CRM data, and sends emails via Gmail API through a new `tools/gmail_sender.py` wrapper. A new `portal/admin.html` page lets country teams change participant Deal stages directly, backed by a new `PATCH /deals/:id/stage` route in the existing Cloudflare Worker proxy.

**Tech Stack:** Python 3 (`google-auth-oauthlib`, `google-api-python-client`), Vanilla JS, Cloudflare Workers (existing), Windows Task Scheduler (existing), Gmail API (OAuth2), Zoho CRM v8 REST API (existing `crm_auth.py` + `crm_extract.fetch_module()`).

---

## Pre-Implementation Checklist (Gino — do before Task 1)

- [ ] Add `Rejected` picklist value to `Deals.Stage` in Zoho CRM (between "Still in Applied Stage" and "Selected")
- [ ] Confirm `Attended Training` spelling is live in CRM (you updated it 2026-05-04 — verify in CRM UI)
- [ ] Enable Gmail API in Google Cloud Console for `gino@aktivasia.org`
- [ ] Create OAuth2 Desktop App credentials → download `credentials.json` to `tools/credentials.json`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `tools/gmail_auth.py` | Create | One-time OAuth2 setup: exchange credentials.json → refresh token |
| `tools/gmail_sender.py` | Create | Gmail API wrapper: token refresh + send_email() |
| `tools/reminder_engine.py` | Create | Main scheduler: fetch CRM → compute reminders → send emails |
| `data/email_config.json` | Create | Country team email lists + always-CC addresses |
| `portal/admin.html` | Create | Admin page: selection / attendance / post-survey tabs |
| `portal/js/admin.js` | Create | Admin page JS: fetch applicants, submit stage updates |
| `portal/workers/crm-proxy.js` | Modify | Add PATCH /deals/:id/stage route |
| `requirements.txt` | Modify | Add google-auth-oauthlib, google-api-python-client |
| `.env.example` | Modify | Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER |
| `register_reminder_task.bat` | Create | Windows Task Scheduler daily trigger |
| `CLAUDE.md` | Modify | Update stage pipeline to include Rejected stage |

---

## Task 1: Add Gmail dependencies and email config

**Files:**
- Modify: `requirements.txt`
- Modify: `.env.example`
- Create: `data/email_config.json`

- [ ] **Step 1: Update requirements.txt**

Open `requirements.txt` and replace its full contents with:

```
zohocrmsdk8_0
requests
python-dotenv
pandas
google-auth-oauthlib
google-api-python-client
```

- [ ] **Step 2: Install new dependencies**

```
pip install google-auth-oauthlib google-api-python-client
```

Expected output: Successfully installed google-auth-oauthlib-... google-api-python-client-...

- [ ] **Step 3: Add Gmail keys to .env.example**

Open `.env.example` and append after the last line:

```
# Gmail API — OAuth 2.0
# Run tools/gmail_auth.py once to populate GMAIL_REFRESH_TOKEN
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_SENDER=gino@aktivasia.org
```

- [ ] **Step 4: Create data/email_config.json**

```json
{
  "cc_always": [
    "gino@aktivasia.org",
    "nurul@aktivasia.org",
    "regional@aktivasia.org"
  ],
  "country_teams": {
    "Philippines": { "to": ["aktivasia.philippines@gmail.com"] },
    "Pakistan":    { "to": ["aktivasia.pakistan@gmail.com"] },
    "Korea":       { "to": ["aktivasia.korea@gmail.com"] },
    "Indonesia":   { "to": ["aktivasia.indonesia@gmail.com"] },
    "Regional":    { "to": ["aktivasia.backbone@gmail.com"] }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add requirements.txt .env.example data/email_config.json
git commit -m "feat: add Gmail API dependencies and email config"
```

---

## Task 2: Gmail auth setup script

**Files:**
- Create: `tools/gmail_auth.py`

This is a one-time script Gino runs to get a refresh token. It uses `credentials.json` downloaded from Google Cloud Console.

- [ ] **Step 1: Create tools/gmail_auth.py**

```python
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
```

- [ ] **Step 2: Verify credentials.json exists (Gino action)**

Confirm `tools/credentials.json` is present (downloaded from Google Cloud Console). If not, pause here.

- [ ] **Step 3: Run the auth script**

```
python tools/gmail_auth.py
```

Expected: browser opens, sign in as gino@aktivasia.org, grant Gmail send permission, terminal prints `[OK] Gmail credentials written to .env`

- [ ] **Step 4: Confirm .env has new keys**

Open `.env` — verify `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` are populated.

- [ ] **Step 5: Add credentials.json to .gitignore**

Open `.gitignore` and add `tools/credentials.json` if not already present.

- [ ] **Step 6: Commit**

```bash
git add tools/gmail_auth.py .gitignore
git commit -m "feat: add Gmail OAuth2 setup script"
```

---

## Task 3: Gmail sender module

**Files:**
- Create: `tools/gmail_sender.py`
- Create: `tests/test_gmail_sender.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_gmail_sender.py`:

```python
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
```

- [ ] **Step 2: Run test to confirm it fails**

```
python -m pytest tests/test_gmail_sender.py -v
```

Expected: ModuleNotFoundError or ImportError (gmail_sender doesn't exist yet)

- [ ] **Step 3: Create tools/gmail_sender.py**

```python
"""
gmail_sender.py — Gmail API email sender

Provides send_email() used by reminder_engine.py.
Authenticates via GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN in .env.
Token is refreshed in-memory per process run.
"""

import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

load_dotenv()

SENDER = os.getenv("GMAIL_SENDER", "gino@aktivasia.org")


def _get_token() -> str:
    creds = Credentials(
        token=None,
        refresh_token=os.getenv("GMAIL_REFRESH_TOKEN"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GMAIL_CLIENT_ID"),
        client_secret=os.getenv("GMAIL_CLIENT_SECRET"),
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
    msg["Cc"]      = ", ".join(cc)
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


def send_email(to: list, cc: list, subject: str, html_body: str) -> None:
    """Send an HTML email via Gmail API. Raises on failure."""
    token   = _get_token()
    service = _build_service(token)
    message = build_message(SENDER, to, cc, subject, html_body)
    service.users().messages().send(userId="me", body=message).execute()
```

- [ ] **Step 4: Run tests to confirm they pass**

```
python -m pytest tests/test_gmail_sender.py -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add tools/gmail_sender.py tests/test_gmail_sender.py
git commit -m "feat: add Gmail sender module with tests"
```

---

## Task 4: Reminder logic module

**Files:**
- Create: `tools/reminder_logic.py`
- Create: `tests/test_reminder_logic.py`

This module is pure business logic — no CRM calls, no email sends. `reminder_engine.py` (Task 5) wires it together with real data. Keeping it separate makes it fully testable.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_reminder_logic.py`:

```python
"""Tests for reminder_logic.py — pure date logic, no CRM or Gmail calls."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

from datetime import date
import reminder_logic as rl


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_plan(name, start_date, organised_by="Philippines"):
    return {"id": "p1", "Name": name, "Start_Date": start_date, "Organised_By": organised_by}

def make_training(id_, title, organised_by, close_date=None, end_date=None, plan_name=None):
    return {
        "id": id_, "Solution_Title": title, "Organised_By": organised_by,
        "Application_Form_Close_Date": close_date,
        "End_Date": end_date,
        "Training_Title_Plan": plan_name,
    }

def make_deal(id_, training_id, stage, email="a@b.com", first="Ann", last="Lee", org="Org"):
    return {
        "id": id_, "Training_Applied": {"id": training_id},
        "Stage": stage, "Email": email,
        "First_Name": first, "Last_Name": last,
        "Account_Name": {"name": org},
    }


# ── Reminder 1 ────────────────────────────────────────────────────────────────

def test_reminder1_fires_at_60_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Alpha Training", date(2026, 3, 2))  # 60 days away
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert len(result) == 1
    assert result[0]["plan"]["Name"] == "Alpha Training"
    assert result[0]["days"] == 60

def test_reminder1_fires_at_45_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Beta Training", date(2026, 2, 15))  # 45 days away
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert len(result) == 1
    assert result[0]["days"] == 45

def test_reminder1_fires_at_30_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Gamma Training", date(2026, 1, 31))  # 30 days away
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert len(result) == 1
    assert result[0]["days"] == 30

def test_reminder1_suppressed_if_linked_solution_exists():
    today = date(2026, 1, 1)
    plan  = make_plan("Alpha Training", date(2026, 3, 2))
    sol   = make_training("s1", "Alpha Training Session", "Philippines", plan_name="Alpha Training")
    result = rl.check_reminder1([plan], solutions=[sol], today=today)
    assert result == []

def test_reminder1_does_not_fire_on_other_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Alpha Training", date(2026, 2, 20))  # 50 days away — not a trigger day
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert result == []


# ── Reminder 2 ────────────────────────────────────────────────────────────────

def test_reminder2_fires_when_window_closed_and_pending_exist():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=date(2026, 5, 9))
    deal     = make_deal("d1", "t1", "Still in Applied Stage")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert len(result) == 1
    assert result[0]["training"]["id"] == "t1"
    assert len(result[0]["pending"]) == 1

def test_reminder2_suppressed_when_all_resolved():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=date(2026, 5, 9))
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert result == []

def test_reminder2_suppressed_when_window_still_open():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=date(2026, 5, 11))
    deal     = make_deal("d1", "t1", "Still in Applied Stage")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert result == []

def test_reminder2_skipped_if_no_close_date():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=None)
    deal     = make_deal("d1", "t1", "Still in Applied Stage")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert result == []


# ── Reminder 3 ────────────────────────────────────────────────────────────────

def test_reminder3_fires_when_training_ended_and_selected_remain():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 6, 4))
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert len(result) == 1
    assert len(result[0]["pending"]) == 1

def test_reminder3_suppressed_when_no_selected_remain():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 6, 4))
    deal     = make_deal("d1", "t1", "Attended Training")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert result == []

def test_reminder3_suppressed_when_training_not_ended():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 6, 6))
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert result == []

def test_reminder3_skipped_if_no_end_date():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=None)
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert result == []


# ── Reminder 4 ────────────────────────────────────────────────────────────────

def test_reminder4_fires_on_monday_below_90pct():
    monday   = date(2026, 5, 4)   # weekday() == 0
    assert monday.weekday() == 0
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 4, 30))
    attended  = make_deal("d1", "t1", "Attended Training")
    graduated = make_deal("d2", "t1", "Graduated or Post Evaluation Completed")
    result = rl.check_reminder4([training], [attended, graduated], today=monday)
    # 1 of 2 completed = 50% → below 90%
    assert len(result) == 1
    assert result[0]["pct"] == 50
    assert len(result[0]["incomplete"]) == 1

def test_reminder4_suppressed_when_90pct_met():
    monday   = date(2026, 5, 4)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 4, 30))
    deals = [make_deal(f"d{i}", "t1", "Graduated or Post Evaluation Completed") for i in range(9)]
    deals.append(make_deal("d9", "t1", "Attended Training"))
    result = rl.check_reminder4([training], deals, today=monday)
    # 9 of 10 = 90% → threshold met → no reminder
    assert result == []

def test_reminder4_does_not_fire_on_non_monday():
    tuesday  = date(2026, 5, 5)   # weekday() == 1
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 4, 30))
    deal     = make_deal("d1", "t1", "Attended Training")
    result   = rl.check_reminder4([training], [deal], today=tuesday)
    assert result == []

def test_reminder4_skipped_if_no_end_date():
    monday   = date(2026, 5, 4)
    training = make_training("t1", "PH Training", "Philippines", end_date=None)
    deal     = make_deal("d1", "t1", "Attended Training")
    result   = rl.check_reminder4([training], [deal], today=monday)
    assert result == []
```

- [ ] **Step 2: Run tests to confirm they fail**

```
python -m pytest tests/test_reminder_logic.py -v
```

Expected: ModuleNotFoundError (reminder_logic not yet created)

- [ ] **Step 3: Create tools/reminder_logic.py**

```python
"""
reminder_logic.py — Pure reminder computation (no I/O)

All functions take plain dicts (as returned by crm_extract.fetch_module)
and return lists of reminder dicts. No CRM calls, no email sends here.
"""

from datetime import date


def _parse_date(val) -> date | None:
    """Parse ISO date string 'YYYY-MM-DD' to date. Returns None if missing."""
    if not val:
        return None
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(str(val)[:10])
    except (ValueError, TypeError):
        return None


def _deal_org(deal: dict) -> str:
    acc = deal.get("Account_Name")
    if isinstance(acc, dict):
        return acc.get("name", "")
    return str(acc or "")


def check_reminder1(training_plans: list, solutions: list, today: date = None) -> list:
    """
    Returns list of dicts for Training Plans whose start is exactly 60, 45, or 30 days away
    and that have no linked Solutions record.

    Each dict: { "plan": plan_dict, "days": int, "country": str }
    """
    today = today or date.today()
    linked_names = {s.get("Training_Title_Plan") for s in solutions if s.get("Training_Title_Plan")}
    results = []
    for plan in training_plans:
        start = _parse_date(plan.get("Start_Date"))
        if not start:
            continue
        days = (start - today).days
        if days not in (60, 45, 30):
            continue
        if plan.get("Name") in linked_names:
            continue
        results.append({"plan": plan, "days": days, "country": plan.get("Organised_By", "")})
    return results


def check_reminder2(trainings: list, deals: list, today: date = None) -> list:
    """
    Returns list of dicts for Trainings whose application window has closed
    and that still have applicants in 'Still in Applied Stage'.

    Each dict: { "training": training_dict, "pending": [deal, ...], "country": str }
    """
    today = today or date.today()
    results = []
    for training in trainings:
        close = _parse_date(training.get("Application_Form_Close_Date"))
        if not close or close >= today:
            continue
        pending = [
            d for d in deals
            if (d.get("Training_Applied") or {}).get("id") == training["id"]
            and d.get("Stage") == "Still in Applied Stage"
        ]
        if not pending:
            continue
        results.append({"training": training, "pending": pending, "country": training.get("Organised_By", "")})
    return results


def check_reminder3(trainings: list, deals: list, today: date = None) -> list:
    """
    Returns list of dicts for Trainings that have ended and still have
    participants in 'Selected' stage (attendance not yet confirmed).

    Each dict: { "training": training_dict, "pending": [deal, ...], "country": str }
    """
    today = today or date.today()
    results = []
    for training in trainings:
        end = _parse_date(training.get("End_Date"))
        if not end or end >= today:
            continue
        pending = [
            d for d in deals
            if (d.get("Training_Applied") or {}).get("id") == training["id"]
            and d.get("Stage") == "Selected"
        ]
        if not pending:
            continue
        results.append({"training": training, "pending": pending, "country": training.get("Organised_By", "")})
    return results


def check_reminder4(trainings: list, deals: list, today: date = None) -> list:
    """
    Returns list of dicts for Trainings (Mondays only) where post-survey
    completion is below 90%.

    Each dict: {
        "training": training_dict, "incomplete": [deal, ...],
        "completed": int, "attended_total": int, "pct": int, "country": str
    }
    """
    today = today or date.today()
    if today.weekday() != 0:  # only Mondays
        return []
    results = []
    for training in trainings:
        end = _parse_date(training.get("End_Date"))
        if not end or end >= today:
            continue
        attended = [
            d for d in deals
            if (d.get("Training_Applied") or {}).get("id") == training["id"]
            and d.get("Stage") in ("Attended Training", "Graduated or Post Evaluation Completed")
        ]
        if not attended:
            continue
        completed  = [d for d in attended if d.get("Stage") == "Graduated or Post Evaluation Completed"]
        pct        = int(len(completed) / len(attended) * 100)
        if pct >= 90:
            continue
        incomplete = [d for d in attended if d.get("Stage") != "Graduated or Post Evaluation Completed"]
        results.append({
            "training":      training,
            "incomplete":    incomplete,
            "completed":     len(completed),
            "attended_total": len(attended),
            "pct":           pct,
            "country":       training.get("Organised_By", ""),
        })
    return results
```

- [ ] **Step 4: Run tests to confirm they pass**

```
python -m pytest tests/test_reminder_logic.py -v
```

Expected: 16 passed

- [ ] **Step 5: Commit**

```bash
git add tools/reminder_logic.py tests/test_reminder_logic.py
git commit -m "feat: add reminder logic module with full test coverage"
```

---

## Task 5: Email template builder

**Files:**
- Create: `tools/email_templates.py`
- Create: `tests/test_email_templates.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_email_templates.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

from email_templates import (
    reminder1_email, reminder2_email, reminder3_email, reminder4_email
)

PORTAL_BASE = "https://aktivasia-portal.pages.dev"

def make_plan():
    from datetime import date
    return {"id": "p1", "Name": "PH Foundational 2026", "Start_Date": date(2026, 7, 1), "Organised_By": "Philippines"}

def make_training():
    from datetime import date
    return {"id": "t1", "Solution_Title": "PH Foundational July", "Organised_By": "Philippines",
            "Application_Form_Close_Date": date(2026, 5, 15), "End_Date": date(2026, 7, 10)}

def make_deal(stage="Still in Applied Stage"):
    return {"id": "d1", "First_Name": "Ana", "Last_Name": "Reyes", "Email": "ana@example.com",
            "Account_Name": {"name": "GreenOrg"}, "Stage": stage,
            "Training_Applied": {"id": "t1"}}


def test_reminder1_subject():
    subj, _ = reminder1_email(make_plan(), days=30)
    assert "PH Foundational 2026" in subj
    assert "30" in subj

def test_reminder1_body_has_create_link():
    _, body = reminder1_email(make_plan(), days=30)
    assert "create-training.html" in body

def test_reminder2_subject():
    subj, _ = reminder2_email(make_training(), pending=[make_deal()])
    assert "PH Foundational July" in subj

def test_reminder2_body_has_participant_table():
    _, body = reminder2_email(make_training(), pending=[make_deal()])
    assert "Ana Reyes" in body
    assert "ana@example.com" in body
    assert "admin.html" in body

def test_reminder3_subject():
    subj, _ = reminder3_email(make_training(), pending=[make_deal("Selected")])
    assert "PH Foundational July" in subj

def test_reminder3_body_has_participant_table():
    _, body = reminder3_email(make_training(), pending=[make_deal("Selected")])
    assert "Ana Reyes" in body
    assert "admin.html" in body

def test_reminder4_subject_has_pct():
    subj, _ = reminder4_email(make_training(), incomplete=[make_deal("Attended Training")],
                               completed=1, attended_total=2, pct=50)
    assert "50%" in subj

def test_reminder4_body_has_email_column():
    _, body = reminder4_email(make_training(), incomplete=[make_deal("Attended Training")],
                               completed=1, attended_total=2, pct=50)
    assert "ana@example.com" in body
    assert "admin.html" in body
```

- [ ] **Step 2: Run tests to confirm they fail**

```
python -m pytest tests/test_email_templates.py -v
```

Expected: ModuleNotFoundError

- [ ] **Step 3: Create tools/email_templates.py**

```python
"""
email_templates.py — HTML email builders for each reminder type

Each function returns (subject: str, html_body: str).
"""

PORTAL_BASE = "https://aktivasia-portal.pages.dev"

_STYLE = """
<style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; }
  .header { background: #1a1a1a; color: #fff; padding: 16px 24px; }
  .header span { color: #f5c842; font-weight: 700; }
  .content { padding: 24px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .btn { display: inline-block; background: #f5c842; color: #1a1a1a;
         padding: 10px 20px; text-decoration: none; border-radius: 4px;
         font-weight: 700; margin-top: 16px; }
</style>
"""

def _header() -> str:
    return '<div class="header">Aktiv<span>Asia</span> — Training Reminder</div>'

def _fmt_date(val) -> str:
    return str(val)[:10] if val else "—"

def _deal_name(d: dict) -> str:
    return f"{d.get('First_Name', '')} {d.get('Last_Name', '')}".strip()

def _deal_org(d: dict) -> str:
    acc = d.get("Account_Name")
    if isinstance(acc, dict):
        return acc.get("name", "")
    return str(acc or "")


def reminder1_email(plan: dict, days: int) -> tuple[str, str]:
    name  = plan.get("Name", "")
    start = _fmt_date(plan.get("Start_Date"))
    subj  = f"[AktivAsia] Reminder: Training Plan \"{name}\" starts in {days} days"
    body  = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p>This is a reminder that the training plan <strong>{name}</strong> is starting in <strong>{days} days</strong> ({start}).</p>
  <p>Please submit the Training Details form so participants can apply.</p>
  <p><strong>Training Plan:</strong> {name}<br>
     <strong>Country:</strong> {plan.get("Organised_By", "")}<br>
     <strong>Planned Start Date:</strong> {start}</p>
  <a class="btn" href="{PORTAL_BASE}/create-training.html">Submit Training Details</a>
  <p style="margin-top:24px; color:#888; font-size:12px;">
    This reminder was sent automatically. You will receive this at 60, 45, and 30 days before the planned start date.
  </p>
</div>
"""
    return subj, body


def reminder2_email(training: dict, pending: list) -> tuple[str, str]:
    title    = training.get("Solution_Title", "")
    close    = _fmt_date(training.get("Application_Form_Close_Date"))
    tid      = training.get("id", "")
    subj     = f"[AktivAsia] Action Required: Select participants for \"{title}\""
    rows     = "".join(
        f"<tr><td>{_deal_name(d)}</td><td>{_deal_org(d)}</td><td>{d.get('Email', '')}</td></tr>"
        for d in pending
    )
    body     = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p>The application window for <strong>{title}</strong> closed on {close}.</p>
  <p>There are <strong>{len(pending)} applicant(s)</strong> still awaiting your selection decision:</p>
  <table>
    <tr><th>Name</th><th>Organization</th><th>Email</th></tr>
    {rows}
  </table>
  <a class="btn" href="{PORTAL_BASE}/admin.html?training_id={tid}&view=selection">Go to Selection Page</a>
</div>
"""
    return subj, body


def reminder3_email(training: dict, pending: list) -> tuple[str, str]:
    title = training.get("Solution_Title", "")
    end   = _fmt_date(training.get("End_Date"))
    tid   = training.get("id", "")
    subj  = f"[AktivAsia] Action Required: Confirm attendance for \"{title}\""
    rows  = "".join(
        f"<tr><td>{_deal_name(d)}</td><td>{_deal_org(d)}</td><td>{d.get('Email', '')}</td></tr>"
        for d in pending
    )
    body  = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p><strong>{title}</strong> ended on {end}.</p>
  <p>Please confirm attendance for the <strong>{len(pending)} participant(s)</strong> still in "Selected" status:</p>
  <table>
    <tr><th>Name</th><th>Organization</th><th>Email</th></tr>
    {rows}
  </table>
  <a class="btn" href="{PORTAL_BASE}/admin.html?training_id={tid}&view=attendance">Confirm Attendance</a>
  <p style="margin-top:24px; color:#888; font-size:12px;">
    This reminder is sent daily until all selected participants have been confirmed.
  </p>
</div>
"""
    return subj, body


def reminder4_email(training: dict, incomplete: list, completed: int,
                    attended_total: int, pct: int) -> tuple[str, str]:
    title = training.get("Solution_Title", "")
    tid   = training.get("id", "")
    subj  = f"[AktivAsia] Weekly: Post-survey follow-up for \"{title}\" ({pct}% complete)"
    rows  = "".join(
        f"<tr><td>{_deal_name(d)}</td><td>{d.get('Email', '')}</td><td>{d.get('Stage', '')}</td></tr>"
        for d in incomplete
    )
    body  = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p>Post-survey completion for <strong>{title}</strong>:</p>
  <p style="font-size:24px; font-weight:700;">{pct}% <span style="font-size:14px; font-weight:400;">({completed} of {attended_total} participants)</span></p>
  <p>The following <strong>{len(incomplete)} participant(s)</strong> have not yet completed the post-survey:</p>
  <table>
    <tr><th>Name</th><th>Email</th><th>Current Stage</th></tr>
    {rows}
  </table>
  <a class="btn" href="{PORTAL_BASE}/admin.html?training_id={tid}&view=post_survey">View Post-Survey Status</a>
  <p style="margin-top:24px; color:#888; font-size:12px;">
    This reminder is sent weekly on Mondays until 90% of participants complete the post-survey.
  </p>
</div>
"""
    return subj, body
```

- [ ] **Step 4: Run tests to confirm they pass**

```
python -m pytest tests/test_email_templates.py -v
```

Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add tools/email_templates.py tests/test_email_templates.py
git commit -m "feat: add email template module with tests"
```

---

## Task 6: Reminder engine (main orchestrator)

**Files:**
- Create: `tools/reminder_engine.py`

- [ ] **Step 1: Create tools/reminder_engine.py**

```python
"""
reminder_engine.py — Daily reminder orchestrator

Run daily via Windows Task Scheduler (register_reminder_task.bat).
Fetches CRM data, computes due reminders, sends Gmail emails.

Usage:
    python tools/reminder_engine.py
    python tools/reminder_engine.py --dry-run   # print reminders, don't send
"""

import os
import sys
import json
import argparse
from datetime import date, datetime, timezone

# Allow running from any directory
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from crm_extract import fetch_module, MODULE_CONFIG
from reminder_logic import check_reminder1, check_reminder2, check_reminder3, check_reminder4
from email_templates import reminder1_email, reminder2_email, reminder3_email, reminder4_email
import gmail_sender

ROOT        = os.path.join(os.path.dirname(__file__), "..")
CONFIG_PATH = os.path.join(ROOT, "data", "email_config.json")
PROGRESS    = os.path.join(ROOT, "progress.md")

REMINDER_FIELDS = {
    "Training_Plans": "id,Name,Start_Date,Organised_By,Status",
    "Solutions":      "id,Solution_Title,Organised_By,Training_Title_Plan,"
                      "Application_Form_Close_Date,End_Date,Start_Date",
    "Deals":          "id,First_Name,Last_Name,Email,Stage,Training_Applied,Account_Name",
}


def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def fetch_crm_data() -> tuple[list, list, list]:
    print("Fetching CRM data...")
    plans     = fetch_module("Training_Plans", REMINDER_FIELDS["Training_Plans"])
    trainings = fetch_module("Solutions",      REMINDER_FIELDS["Solutions"])
    deals     = fetch_module("Deals",          REMINDER_FIELDS["Deals"])
    return plans, trainings, deals


def country_emails(config: dict, country: str) -> tuple[list, list]:
    """Returns (to_list, cc_list) for a given country."""
    team = config.get("country_teams", {}).get(country, {})
    to   = team.get("to", [])
    cc   = config.get("cc_always", [])
    return to, cc


def log_progress(message: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    entry = f"\n## [{ts}] reminder_engine.py\n\n{message}\n"
    with open(PROGRESS, "a", encoding="utf-8") as f:
        f.write(entry)


def run(dry_run: bool = False) -> None:
    print("=" * 55)
    print("  reminder_engine.py")
    print("=" * 55)

    config              = load_config()
    plans, trainings, deals = fetch_crm_data()
    today               = date.today()
    sent_count          = 0
    log_lines           = []

    # ── Reminder 1: Training Plan Countdown ──────────────────────────────────
    r1_due = check_reminder1(plans, trainings, today=today)
    for item in r1_due:
        country = item["country"]
        to, cc  = country_emails(config, country)
        if not to:
            print(f"  [WARN] No email configured for country: {country}")
            continue
        subj, body = reminder1_email(item["plan"], item["days"])
        print(f"  R1 → {country}: {item['plan']['Name']} ({item['days']}d)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R1 sent: {country} / {item['plan']['Name']} ({item['days']}d)")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R1 FAILED: {country} / {item['plan']['Name']} — {e}")

    # ── Reminder 2: Selection Reminder ───────────────────────────────────────
    r2_due = check_reminder2(trainings, deals, today=today)
    for item in r2_due:
        country = item["country"]
        to, cc  = country_emails(config, country)
        if not to:
            continue
        subj, body = reminder2_email(item["training"], item["pending"])
        print(f"  R2 → {country}: {item['training']['Solution_Title']} ({len(item['pending'])} pending)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R2 sent: {country} / {item['training']['Solution_Title']}")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R2 FAILED: {country} / {item['training']['Solution_Title']} — {e}")

    # ── Reminder 3: Attendance Confirmation ──────────────────────────────────
    r3_due = check_reminder3(trainings, deals, today=today)
    for item in r3_due:
        country = item["country"]
        to, cc  = country_emails(config, country)
        if not to:
            continue
        subj, body = reminder3_email(item["training"], item["pending"])
        print(f"  R3 → {country}: {item['training']['Solution_Title']} ({len(item['pending'])} unconfirmed)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R3 sent: {country} / {item['training']['Solution_Title']}")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R3 FAILED: {country} / {item['training']['Solution_Title']} — {e}")

    # ── Reminder 4: Post-Survey Follow-up (Mondays only) ─────────────────────
    r4_due = check_reminder4(trainings, deals, today=today)
    for item in r4_due:
        country = item["country"]
        to, cc  = country_emails(config, country)
        if not to:
            continue
        subj, body = reminder4_email(
            item["training"], item["incomplete"],
            item["completed"], item["attended_total"], item["pct"]
        )
        print(f"  R4 → {country}: {item['training']['Solution_Title']} ({item['pct']}%)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R4 sent: {country} / {item['training']['Solution_Title']} ({item['pct']}%)")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R4 FAILED: {country} / {item['training']['Solution_Title']} — {e}")

    summary = f"Reminders sent: {sent_count}"
    if dry_run:
        summary = f"[DRY RUN] Would send: {sent_count} reminder(s)"
    print(f"\n{summary}")

    if log_lines:
        log_progress("\n".join(log_lines) + f"\n\n{summary}")


def main():
    parser = argparse.ArgumentParser(description="Send training lifecycle reminder emails")
    parser.add_argument("--dry-run", action="store_true", help="Print reminders without sending")
    args = parser.parse_args()
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Smoke test with dry-run**

```
python tools/reminder_engine.py --dry-run
```

Expected: Fetches CRM data, prints any due reminders, outputs `[DRY RUN] Would send: N reminder(s)` — no emails sent.

- [ ] **Step 3: Commit**

```bash
git add tools/reminder_engine.py
git commit -m "feat: add reminder engine orchestrator"
```

---

## Task 7: Windows Task Scheduler registration

**Files:**
- Create: `register_reminder_task.bat`

- [ ] **Step 1: Create register_reminder_task.bat**

```bat
@echo off
REM register_reminder_task.bat — Register daily reminder engine trigger
REM Run once as Administrator.

set PYTHON=python
set SCRIPT=%~dp0tools\reminder_engine.py

schtasks /create ^
  /tn "AktivAsiaAA_Reminders" ^
  /tr "\"%PYTHON%\" \"%SCRIPT%\"" ^
  /sc daily ^
  /st 08:00 ^
  /ru SYSTEM ^
  /f

if %errorlevel% equ 0 (
    echo [OK] Task "AktivAsiaAA_Reminders" registered - runs daily at 08:00.
) else (
    echo [FAIL] Task registration failed. Run as Administrator.
)
```

- [ ] **Step 2: Register the task (run as Administrator)**

```
register_reminder_task.bat
```

Expected: `[OK] Task "AktivAsiaAA_Reminders" registered - runs daily at 08:00.`

- [ ] **Step 3: Verify in Task Scheduler**

Open Windows Task Scheduler, confirm `AktivAsiaAA_Reminders` is listed and enabled.

- [ ] **Step 4: Commit**

```bash
git add register_reminder_task.bat
git commit -m "feat: add Windows Task Scheduler registration for reminder engine"
```

---

## Task 8: CRM proxy — add stage update route

**Files:**
- Modify: `portal/workers/crm-proxy.js`

- [ ] **Step 1: Add PATCH /deals/:id/stage route**

Open `portal/workers/crm-proxy.js`. After the PUT /deals/:id block (after line 213), insert the new route. Also update the `corsHeaders` function to include `PATCH` in allowed methods.

Find this line (line 59):
```javascript
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
```

Replace with:
```javascript
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
```

Then find the PUT /deals/:id block ending (after line 213):
```javascript
      }

      // ── POST /deals/:id/files?field=... ───────────────────────────────────────
```

Insert the new route between those two blocks:
```javascript
      // ── PATCH /deals/:id/stage ────────────────────────────────────────────────
      const dealStageMatch = path.match(/^\/deals\/([^/]+)\/stage$/);
      if (request.method === "PATCH" && dealStageMatch) {
        const id      = dealStageMatch[1];
        const { Stage } = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Deals/${id}`, {
          method:  "PUT",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify({ data: [{ Stage }] }),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

```

- [ ] **Step 2: Test the new route locally**

Deploy to local Wrangler dev server and test with curl:

```bash
npx wrangler dev portal/workers/crm-proxy.js
```

In a new terminal (replace DEAL_ID with a real Deal ID from CRM):
```bash
curl -X PATCH http://localhost:8787/deals/DEAL_ID/stage \
  -H "Content-Type: application/json" \
  -d '{"Stage": "Selected"}'
```

Expected: JSON response from CRM with updated Deal data, HTTP 200.

- [ ] **Step 3: Deploy the updated worker**

```bash
npx wrangler pages deploy portal --project-name aktivasia-portal
```

- [ ] **Step 4: Commit**

```bash
git add portal/workers/crm-proxy.js
git commit -m "feat: add PATCH /deals/:id/stage route to CRM proxy"
```

---

## Task 9: Admin page — HTML shell and tab routing

**Files:**
- Create: `portal/admin.html`

- [ ] **Step 1: Create portal/admin.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — AktivAsia</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <style>
    .admin-header { background:#1a1a1a; color:#fff; padding:16px 24px; }
    .admin-header a { color:#f5c842; text-decoration:none; font-size:13px; }
    .admin-header h1 { margin:4px 0 0; font-size:20px; }
    .admin-header .meta { color:#aaa; font-size:13px; margin-top:4px; }
    .admin-tabs { display:flex; gap:0; border-bottom:2px solid #e5e5e5; margin:24px 0 0; padding:0 24px; }
    .admin-tabs button { background:none; border:none; padding:10px 20px; cursor:pointer;
                         font-size:14px; font-weight:600; color:#666; border-bottom:2px solid transparent;
                         margin-bottom:-2px; }
    .admin-tabs button.active { color:#1a1a1a; border-bottom-color:#f5c842; }
    .admin-view { display:none; padding:24px; }
    .admin-view.active { display:block; }
    .admin-table { width:100%; border-collapse:collapse; margin-top:12px; }
    .admin-table th { background:#f5f5f5; text-align:left; padding:10px 12px; font-size:12px;
                      font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
    .admin-table td { padding:10px 12px; border-bottom:1px solid #eee; font-size:14px; vertical-align:middle; }
    .admin-table select { padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; }
    .admin-counter { font-size:14px; color:#666; margin-bottom:8px; }
    .btn-save { background:#f5c842; border:none; padding:10px 24px; font-weight:700;
                font-size:14px; border-radius:4px; cursor:pointer; margin-top:16px; }
    .btn-save:hover { background:#e6b800; }
    .btn-bulk { background:#eee; border:none; padding:6px 14px; font-size:13px;
                border-radius:4px; cursor:pointer; margin-right:8px; }
    .btn-bulk:hover { background:#ddd; }
    .progress-bar-wrap { background:#eee; border-radius:8px; height:16px; margin:12px 0; overflow:hidden; }
    .progress-bar-fill { background:#f5c842; height:100%; transition:width .3s; }
    .progress-label { font-size:14px; color:#444; margin-bottom:4px; }
    .empty-state { color:#888; font-style:italic; padding:24px 0; }
    .saving-msg { display:none; color:#888; font-size:13px; margin-left:12px; }
  </style>
</head>
<body>

  <div class="admin-header">
    <div class="container">
      <a href="portal.html" id="back-link">← Back to Portal</a>
      <h1 id="training-title">Loading…</h1>
      <div class="meta" id="training-meta"></div>
    </div>
  </div>

  <div class="container">
    <nav class="admin-tabs">
      <button id="tab-selection"   onclick="switchTab('selection')">Selection</button>
      <button id="tab-attendance"  onclick="switchTab('attendance')">Attendance</button>
      <button id="tab-post_survey" onclick="switchTab('post_survey')">Post-Survey</button>
    </nav>

    <!-- View 1: Selection -->
    <div class="admin-view" id="view-selection">
      <div class="admin-counter" id="sel-counter"></div>
      <div>
        <button class="btn-bulk" onclick="bulkSetStage('selection', 'Selected')">Select All</button>
        <button class="btn-bulk" onclick="bulkSetStage('selection', 'Rejected')">Reject All</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="sel-tbody"></tbody>
      </table>
      <div class="empty-state" id="sel-empty" style="display:none">No applicants in "Still in Applied Stage".</div>
      <button class="btn-save" onclick="saveChanges('selection')">Save Changes</button>
      <span class="saving-msg" id="sel-saving">Saving…</span>
    </div>

    <!-- View 2: Attendance -->
    <div class="admin-view" id="view-attendance">
      <div class="admin-counter" id="att-counter"></div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="att-tbody"></tbody>
      </table>
      <div class="empty-state" id="att-empty" style="display:none">No participants in "Selected" stage.</div>
      <button class="btn-save" onclick="saveChanges('attendance')">Save Changes</button>
      <span class="saving-msg" id="att-saving">Saving…</span>
    </div>

    <!-- View 3: Post-Survey -->
    <div class="admin-view" id="view-post_survey">
      <div class="progress-label" id="ps-label"></div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" id="ps-bar" style="width:0%"></div></div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="ps-tbody"></tbody>
      </table>
      <div class="empty-state" id="ps-empty" style="display:none">All participants have completed the post-survey.</div>
      <button class="btn-save" onclick="saveChanges('post_survey')">Save Changes</button>
      <span class="saving-msg" id="ps-saving">Saving…</span>
    </div>
  </div>

  <script src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open admin.html in browser to confirm it renders without JS errors**

Open `portal/admin.html?training_id=test&view=selection` in a browser. Expected: page loads, shows "Loading…" heading, three tabs visible.

- [ ] **Step 3: Commit**

```bash
git add portal/admin.html
git commit -m "feat: add admin.html shell with three-tab layout"
```

---

## Task 10: Admin page — JavaScript logic

**Files:**
- Create: `portal/js/admin.js`

- [ ] **Step 1: Create portal/js/admin.js**

```javascript
"use strict";

const PROXY_BASE  = "https://crm-proxy.gideon-valera.workers.dev";
const PORTAL_BASE = "https://aktivasia-portal.pages.dev";

const params      = new URLSearchParams(window.location.search);
const TRAINING_ID = params.get("training_id") ?? "";
const INIT_VIEW   = params.get("view") ?? "selection";

// ── Stage options per view ────────────────────────────────────────────────────
const STAGE_OPTIONS = {
  selection:   ["Still in Applied Stage", "Selected", "Rejected"],
  attendance:  ["Selected", "Attended Training", "Rejected or Not Attended"],
  post_survey: ["Attended Training", "Graduated or Post Evaluation Completed"],
};

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(view) {
  document.querySelectorAll(".admin-view").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".admin-tabs button").forEach(el => el.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.getElementById(`tab-${view}`).classList.add("active");
  // Update URL without reloading
  const url = new URL(window.location);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", url);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function dealName(d) {
  return `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim();
}

function dealOrg(d) {
  const acc = d.Account_Name;
  return (acc && typeof acc === "object") ? (acc.name ?? "") : String(acc ?? "");
}

function stageSelect(dealId, currentStage, view) {
  const opts = STAGE_OPTIONS[view]
    .map(s => `<option value="${s}"${s === currentStage ? " selected" : ""}>${s}</option>`)
    .join("");
  return `<select id="stage-${dealId}" data-original="${currentStage}">${opts}</select>`;
}

// ── Fetch training info ───────────────────────────────────────────────────────
async function loadTrainingInfo() {
  if (!TRAINING_ID) {
    document.getElementById("training-title").textContent = "No training ID specified";
    return;
  }
  try {
    const res  = await fetch(`${PROXY_BASE}/solutions/${TRAINING_ID}?fields=Solution_Title,Start_Date,End_Date,Organised_By`);
    const json = await res.json();
    const t    = (json.data ?? [json])[0] ?? {};
    document.getElementById("training-title").textContent = t.Solution_Title ?? "Training";
    document.getElementById("training-meta").textContent  =
      `${t.Organised_By ?? ""} · ${t.Start_Date ?? "—"} → ${t.End_Date ?? "—"}`;
    document.getElementById("back-link").href =
      `portal.html?country=${encodeURIComponent(t.Organised_By ?? "")}`;
  } catch (e) {
    document.getElementById("training-title").textContent = "Could not load training";
  }
}

// ── Fetch all deals for this training ─────────────────────────────────────────
let allDeals = [];

async function loadDeals() {
  if (!TRAINING_ID) return;
  try {
    const res  = await fetch(`${PROXY_BASE}/deals/search?training_id=${TRAINING_ID}&q=`);
    const json = await res.json();
    allDeals   = json.data ?? [];
    renderAll();
  } catch (e) {
    console.error("Failed to load deals:", e);
  }
}

// ── Render all three views ────────────────────────────────────────────────────
function renderAll() {
  renderSelection();
  renderAttendance();
  renderPostSurvey();
}

function renderSelection() {
  const pending = allDeals.filter(d => d.Stage === "Still in Applied Stage");
  const tbody   = document.getElementById("sel-tbody");
  const empty   = document.getElementById("sel-empty");
  const counter = document.getElementById("sel-counter");

  const resolved = allDeals.filter(d =>
    d.Stage === "Selected" || d.Stage === "Rejected").length;
  counter.textContent = `${resolved} of ${allDeals.length} resolved`;

  if (pending.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = pending.map(d => `
    <tr>
      <td>${dealName(d)}</td>
      <td>${dealOrg(d)}</td>
      <td>${d.Email ?? ""}</td>
      <td>${stageSelect(d.id, d.Stage, "selection")}</td>
    </tr>`).join("");
}

function renderAttendance() {
  const selected = allDeals.filter(d => d.Stage === "Selected");
  const tbody    = document.getElementById("att-tbody");
  const empty    = document.getElementById("att-empty");
  const counter  = document.getElementById("att-counter");

  const confirmed = allDeals.filter(d =>
    d.Stage === "Attended Training" || d.Stage === "Rejected or Not Attended").length;
  counter.textContent = `${confirmed} of ${allDeals.length} confirmed`;

  if (selected.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = selected.map(d => `
    <tr>
      <td>${dealName(d)}</td>
      <td>${dealOrg(d)}</td>
      <td>${d.Email ?? ""}</td>
      <td>${stageSelect(d.id, d.Stage, "attendance")}</td>
    </tr>`).join("");
}

function renderPostSurvey() {
  const attended   = allDeals.filter(d =>
    d.Stage === "Attended Training" || d.Stage === "Graduated or Post Evaluation Completed");
  const completed  = allDeals.filter(d => d.Stage === "Graduated or Post Evaluation Completed");
  const incomplete = allDeals.filter(d => d.Stage === "Attended Training");
  const pct        = attended.length > 0 ? Math.round(completed.length / attended.length * 100) : 0;

  document.getElementById("ps-label").textContent =
    `${pct}% complete — ${completed.length} of ${attended.length} participants`;
  document.getElementById("ps-bar").style.width = `${pct}%`;

  const tbody = document.getElementById("ps-tbody");
  const empty = document.getElementById("ps-empty");

  if (incomplete.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = incomplete.map(d => `
    <tr>
      <td>${dealName(d)}</td>
      <td>${d.Email ?? ""}</td>
      <td>${stageSelect(d.id, d.Stage, "post_survey")}</td>
    </tr>`).join("");
}

// ── Bulk set stage ────────────────────────────────────────────────────────────
function bulkSetStage(view, stage) {
  const pending = allDeals.filter(d => d.Stage === "Still in Applied Stage");
  pending.forEach(d => {
    const sel = document.getElementById(`stage-${d.id}`);
    if (sel) sel.value = stage;
  });
}

// ── Save changes ──────────────────────────────────────────────────────────────
async function saveChanges(view) {
  const viewMap = { selection: "sel", attendance: "att", post_survey: "ps" };
  const prefix  = viewMap[view];
  const savingEl = document.getElementById(`${prefix}-saving`);
  savingEl.style.display = "inline";

  const selects = document.querySelectorAll(`#view-${view} select`);
  const changes = [];
  selects.forEach(sel => {
    if (sel.value !== sel.dataset.original) {
      const dealId = sel.id.replace("stage-", "");
      changes.push({ id: dealId, Stage: sel.value });
    }
  });

  if (changes.length === 0) {
    savingEl.style.display = "none";
    alert("No changes to save.");
    return;
  }

  let successCount = 0;
  for (const change of changes) {
    try {
      const res = await fetch(`${PROXY_BASE}/deals/${change.id}/stage`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ Stage: change.Stage }),
      });
      if (res.ok) {
        // Update local state
        const deal = allDeals.find(d => d.id === change.id);
        if (deal) deal.Stage = change.Stage;
        successCount++;
      } else {
        console.error(`Failed to update deal ${change.id}:`, await res.text());
      }
    } catch (e) {
      console.error(`Error updating deal ${change.id}:`, e);
    }
  }

  savingEl.style.display = "none";
  alert(`${successCount} of ${changes.length} changes saved.`);
  renderAll();
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  await loadTrainingInfo();
  await loadDeals();
  switchTab(INIT_VIEW);
})();
```

- [ ] **Step 2: Test admin page end-to-end**

1. Open `portal/admin.html?training_id=REAL_ID&view=selection` (replace REAL_ID with an actual Solutions record ID from CRM)
2. Verify training title loads in header
3. Verify applicant table populates
4. Change one applicant's stage dropdown
5. Click "Save Changes"
6. Verify the alert says "1 of 1 changes saved"
7. Open that Deal in Zoho CRM → confirm Stage field was updated

- [ ] **Step 3: Commit**

```bash
git add portal/js/admin.js
git commit -m "feat: add admin page JavaScript with selection, attendance, and post-survey views"
```

---

## Task 11: Update CLAUDE.md stage pipeline

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the stage pipeline in CLAUDE.md**

Find this block in `CLAUDE.md`:

```
**Stage Pipeline (confirmed CRM values 2026-03-18):**
```
Still in Applied Stage → Selected → Rejected or Not Attended → Attended Traning → Graduated or Post Evaluation Completed
```
> ⚠️ CRM typo: "Attended Traning" (missing 'i') — match exactly in code.
```

Replace with:

```
**Stage Pipeline (updated 2026-05-04):**
```
Still in Applied Stage → Selected → Rejected → Rejected or Not Attended → Attended Training → Graduated or Post Evaluation Completed
```
> Note: "Rejected" (new stage, 2026-05-04) = applicant rejected during selection phase (pre-training).
> Note: "Rejected or Not Attended" = participant was selected but did not attend.
> Note: CRM typo "Attended Traning" was corrected to "Attended Training" on 2026-05-04.
```

Also update the stage logic section:

Find:
```
- `attended_training` = `Stage` in [`"Attended Traning"`, `"Graduated or Post Evaluation Completed"`]
```

Replace with:
```
- `attended_training` = `Stage` in [`"Attended Training"`, `"Graduated or Post Evaluation Completed"`]
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update stage pipeline — add Rejected stage, fix Attended Training typo"
```

---

## Task 12: Add portal.html "Manage" button per training

**Files:**
- Modify: `portal/js/app.js`
- Modify: `tools/transform.py` (add `id` field to `actual_trainings` output)

- [ ] **Step 1: Add `id` field to actual_trainings in transform.py**

Open `tools/transform.py` at approximately line 454. The `actual_trainings.append({...})` block currently omits the Solutions record `id`. Add it as the first key:

Find:
```python
        actual_trainings.append({
            "name":       sol.get("Solution_Title", ""),
```

Replace with:
```python
        actual_trainings.append({
            "id":         sol_id,
            "name":       sol.get("Solution_Title", ""),
```

- [ ] **Step 3: Add Manage button to the training row renderer**

Open `portal/js/app.js`. Find the `renderRowFn` at approximately line 526. It currently returns:

```javascript
        return `<tr>
          <td>${t.name}</td>
          <td>${t.type}</td>
          <td>${t.date || '—'}</td>
          <td>${t.end_date || '—'}</td>
          <td style="text-align:right">${t.applicants}</td>
          <td style="text-align:right">${t.graduates}</td>
          <td><span class="badge badge-${sClass}">${t.status || '—'}</span></td>
        </tr>`;
```

Replace with:

```javascript
        return `<tr>
          <td>${t.name}</td>
          <td>${t.type}</td>
          <td>${t.date || '—'}</td>
          <td>${t.end_date || '—'}</td>
          <td style="text-align:right">${t.applicants}</td>
          <td style="text-align:right">${t.graduates}</td>
          <td><span class="badge badge-${sClass}">${t.status || '—'}</span></td>
          <td>${t.id ? `<a href="admin.html?training_id=${t.id}&view=selection" style="background:#f5c842;padding:4px 10px;border-radius:3px;text-decoration:none;color:#1a1a1a;font-size:12px;font-weight:700;">Manage</a>` : '—'}</td>
        </tr>`;
```

- [ ] **Step 4: Add Manage column header**

In the same file, find the table header for this row (search for `Applicants` or `Graduates` near the trainings table header). Add `<th>Manage</th>` as the last `<th>` in that header row.

- [ ] **Step 5: Verify in browser**

Open `portal.html` for any country, go to the Training Report tab. Each training row should now show a "Manage" button that links to `admin.html?training_id=...&view=selection`.

- [ ] **Step 6: Commit**

```bash
git add tools/transform.py portal/js/app.js
git commit -m "feat: expose training id in dashboard data; add Manage button to training rows"
```

---

## Task 13: Deploy and end-to-end verification

- [ ] **Step 1: Run full test suite**

```
python -m pytest tests/ -v
```

Expected: All tests pass (test_gmail_sender.py, test_reminder_logic.py, test_email_templates.py)

- [ ] **Step 2: Run reminder engine dry-run against real CRM**

```
python tools/reminder_engine.py --dry-run
```

Expected: Fetches real CRM data, prints any due reminders (may be 0 if no trainings/plans meet today's trigger conditions), no emails sent.

- [ ] **Step 3: Test Gmail send manually**

Create a quick test script (don't commit):

```python
# test_send.py — delete after testing
import sys; sys.path.insert(0, "tools")
from gmail_sender import send_email
send_email(
    to=["gino@aktivasia.org"],
    cc=[],
    subject="[TEST] AktivAsia reminder engine Gmail test",
    html_body="<p>Gmail API is working correctly.</p>"
)
print("Sent!")
```

Run: `python test_send.py`  
Expected: email arrives in gino@aktivasia.org inbox.

- [ ] **Step 4: Deploy updated Worker**

```bash
npx wrangler pages deploy portal --project-name aktivasia-portal
```

- [ ] **Step 5: Test admin page on deployed URL**

Open `https://aktivasia-portal.pages.dev/admin.html?training_id=REAL_ID&view=selection`

Verify: training loads, applicants list, stage dropdown works, save triggers CRM update.

- [ ] **Step 6: Verify CRM stage update**

After saving a stage change via admin page, open the Deal in Zoho CRM. Confirm Stage field matches what was saved.

- [ ] **Step 7: Final commit — update progress.md**

Add an entry to `progress.md`:

```
## [2026-05-04] Reminder Engine + Admin Page — COMPLETE

Features shipped:
- tools/reminder_engine.py — daily scheduler (4 reminder types)
- tools/gmail_sender.py — Gmail API sender (gino@aktivasia.org)
- tools/reminder_logic.py — pure business logic, fully tested
- tools/email_templates.py — HTML email builders, fully tested
- portal/admin.html + portal/js/admin.js — participant stage management
- portal/workers/crm-proxy.js — PATCH /deals/:id/stage added
- register_reminder_task.bat — Windows Task Scheduler daily 08:00

CRM changes applied:
- Added "Rejected" stage picklist value
- Corrected "Attended Traning" → "Attended Training"
```

```bash
git add progress.md
git commit -m "docs: mark reminder engine and admin page complete in progress.md"
```

---

## Summary

**Total tasks:** 13  
**New Python files:** 5 (`gmail_auth.py`, `gmail_sender.py`, `reminder_logic.py`, `email_templates.py`, `reminder_engine.py`)  
**New test files:** 3 (`test_gmail_sender.py`, `test_reminder_logic.py`, `test_email_templates.py`)  
**New portal files:** 2 (`admin.html`, `js/admin.js`)  
**Modified files:** 5 (`crm-proxy.js`, `requirements.txt`, `.env.example`, `CLAUDE.md`, `app.js`)  
**New config/bat files:** 2 (`email_config.json`, `register_reminder_task.bat`)
