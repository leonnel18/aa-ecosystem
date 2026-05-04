# Reminder Engine & Admin Selection Page — Design Spec

**Date:** 2026-05-04  
**Status:** Approved  
**Author:** Gino + Claude

---

## Context

AktivAsia's country teams need automated reminder emails to keep training cycles on track. Without reminders, planned trainings slip (no Training Details form submitted), participant selection stalls after applications close, attendance isn't confirmed, and post-survey completion rates stay low. This spec defines a Python-based reminder engine, a Gmail-powered email sender, and a new admin page for participant stage management.

---

## Scope

Four reminder types:

1. **Training Plan countdown** — remind country team to submit Training Details form (60/45/30 days before plan start)
2. **Selection reminder** — daily reminder to select/reject applicants after application window closes
3. **Attendance confirmation** — daily reminder to confirm who attended after training ends
4. **Post-survey follow-up** — weekly reminder to chase post-survey completion until 90% threshold

Plus: a new **admin page** (`admin.html`) where country teams can manage participant stages for all three action reminders.

---

## CRM Changes Required (Gino to do in Zoho)

Before implementation deploys:

1. **Add `Rejected` picklist value** on `Deals.Stage` — inserted between "Still in Applied Stage" and "Attended Training" in the stage pipeline.
2. **Confirm `Attended Training` spelling** — you updated "Attended Traning" → "Attended Training" on 2026-05-04. Code will use the corrected spelling. Verify this is live before deployment.

**Updated stage pipeline:**
```
Still in Applied Stage → Selected → Rejected → Rejected or Not Attended → Attended Training → Graduated or Post Evaluation Completed
```

> Note: "Rejected or Not Attended" is retained for the attendance phase (participant was selected but didn't show up). "Rejected" is new, for the selection phase (applicant was rejected before training).

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `tools/reminder_engine.py` | Main scheduler — reads CRM, computes due reminders, sends emails |
| `tools/gmail_sender.py` | Gmail API wrapper — OAuth2 token refresh + send |
| `tools/gmail_auth.py` | One-time setup script to obtain Gmail refresh token |
| `data/email_config.json` | Country team email lists + always-CC addresses |
| `portal/admin.html` | Admin page — selection, attendance, post-survey views |
| `portal/js/admin.js` | Admin page JS — fetches applicants, submits stage updates |
| `register_reminder_task.bat` | Windows Task Scheduler daily trigger for reminder engine |

### Modified Files

| File | Change |
|------|--------|
| `portal/workers/crm-proxy.js` | Add `PATCH /deals/:id/stage` route for stage-only updates |
| `.env.example` | Add Gmail OAuth keys and sender address |
| `CLAUDE.md` | Update stage pipeline, add Rejected stage definition |

---

## Email Configuration (`data/email_config.json`)

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

`to` is an array to support multiple recipients per country team. `cc_always` is appended to every outgoing email. Sender is always `gino@aktivasia.org`.

---

## Gmail API Setup

### One-Time Setup (Gino)

1. Enable Gmail API in Google Cloud Console for the `gino@aktivasia.org` Google Workspace account.
2. Create OAuth2 credentials (type: Desktop App). Download `credentials.json`.
3. Run `python tools/gmail_auth.py` — browser auth flow → writes refresh token to `.env`.

### `.env` Keys Added

```
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_SENDER=gino@aktivasia.org
```

### `gmail_sender.py` Interface

```python
def send_email(to: list[str], cc: list[str], subject: str, html_body: str) -> None:
    """Refreshes token if needed, sends via Gmail API users.messages.send."""
```

Token refresh uses `google-auth` library. Token cached in memory per process run (no file cache needed since the engine runs and exits).

**New dependency:** `google-auth-oauthlib`, `google-api-python-client` (add to `requirements.txt`).

---

## Reminder Engine (`tools/reminder_engine.py`)

### Run Schedule

- **Trigger:** Windows Task Scheduler, daily at 08:00 AM local time
- **Task name:** `AktivAsiaAA_Reminders`
- **Command:** `python tools/reminder_engine.py`

### Internal Flow

```
1. Load data/email_config.json
2. Fetch CRM data (reuse crm_extract.fetch_module()):
   a. Training_Plans — fields: id, Name, Start_Date, Organised_By, Status
   b. Solutions — fields: id, Solution_Title, Organised_By, Training_Title_Plan,
                           Application_Form_Close_Date, End_Date, Start_Date
   c. Deals — fields: id, First_Name, Last_Name, Email, Stage, Training_Applied
3. Build lookup: solution_id → solution record
4. Build lookup: solution_id → list of deals
5. For each country (Philippines, Pakistan, Korea, Indonesia, Regional):
   a. Check Reminder 1 (Training Plans)
   b. Check Reminder 2 (Selection)
   c. Check Reminder 3 (Attendance)
   d. Check Reminder 4 (Post-Survey, Mondays only)
6. For each queued email: gmail_sender.send_email()
7. Log all sent reminders to progress.md
```

---

## Reminder 1 — Training Plan Countdown

**Logic:**
```python
days_until_start = (training_plan.Start_Date - today).days
if days_until_start in (60, 45, 30):
    # Check if a Solutions record already references this plan
    linked = any(s.Training_Title_Plan == training_plan.Name for s in solutions)
    if not linked:
        send_reminder_1(training_plan, country)
```

**Stop condition:** A Solutions record with `Training_Title_Plan == plan.Name` exists → no email.

**Email content:**
- Subject: `[AktivAsia] Reminder: Training Plan "{Name}" starts in {days} days`
- Body:
  - Training plan name, start date, organised by
  - Count of days remaining
  - Link to `create-training.html` (pre-fill not required for MVP)
  - CC: `cc_always`

---

## Reminder 2 — Selection Reminder

**Logic:**
```python
if training.Application_Form_Close_Date < today:
    pending = [d for d in deals if d.Training_Applied.id == training.id
               and d.Stage == "Still in Applied Stage"]
    if len(pending) > 0:
        send_reminder_2(training, pending, country)
```

**Stop condition:** Zero applicants remain in "Still in Applied Stage" (all resolved as Selected or Rejected).

**Email content:**
- Subject: `[AktivAsia] Action Required: Select participants for "{Training_Title}"`
- Body:
  - Training name, application close date
  - Count of pending applicants
  - Table of pending applicants: Name | Organization | Email
  - Link to `admin.html?training_id={id}&view=selection`
  - CC: `cc_always`

---

## Reminder 3 — Attendance Confirmation

**Logic:**
```python
if today > training.End_Date:
    selected_pending = [d for d in deals if d.Training_Applied.id == training.id
                        and d.Stage == "Selected"]
    if len(selected_pending) > 0:
        send_reminder_3(training, selected_pending, country)
```

**Stop condition:** Zero applicants remain in "Selected" (all moved to "Attended Training", "Rejected or Not Attended", or another terminal stage).

**Email content:**
- Subject: `[AktivAsia] Action Required: Confirm attendance for "{Training_Title}"`
- Body:
  - Training name, end date
  - Count of participants still in "Selected" stage
  - Table of pending participants: Name | Organization | Email
  - Link to `admin.html?training_id={id}&view=attendance`
  - CC: `cc_always`

---

## Reminder 4 — Post-Survey Follow-up

**Logic (Mondays only):**
```python
if today.weekday() == 0 and today > training.End_Date:
    attended = [d for d in deals if d.Training_Applied.id == training.id
                and d.Stage in ("Attended Training", "Graduated or Post Evaluation Completed")]
    completed = [d for d in attended if d.Stage == "Graduated or Post Evaluation Completed"]
    if len(attended) > 0 and len(completed) / len(attended) < 0.90:
        incomplete = [d for d in attended if d.Stage != "Graduated or Post Evaluation Completed"]
        send_reminder_4(training, incomplete, len(completed), len(attended), country)
```

**Stop condition:** `completed / attended >= 0.90` (90% threshold met).

**Email content:**
- Subject: `[AktivAsia] Weekly: Post-survey follow-up for "{Training_Title}" ({pct}% complete)`
- Body:
  - Training name
  - Progress: X of Y attended participants have completed post-survey (Z%)
  - Table of incomplete participants: Name | Email | Current Stage
  - Link to `admin.html?training_id={id}&view=post_survey`
  - CC: `cc_always`

---

## Admin Page (`portal/admin.html`)

**URL pattern:** `admin.html?training_id={id}&view={selection|attendance|post_survey}`

**Access:** Linked from:
- Reminder emails (direct link per training + view)
- `portal.html` — "Manage" button per training row (country team view)

**No login required** — consistent with current portal access pattern.

### Shared Page Elements

- Training name + dates in header
- Tab bar: Selection | Attendance | Post-Survey
- Active tab determined by `?view=` param (defaults to `selection`)
- Save button per view: sends all pending stage changes to CRM via proxy

### View 1 — Selection (`?view=selection`)

- Lists all applicants with Stage = "Still in Applied Stage"
- Per row: Name | Organization | Email | Stage dropdown
- Stage dropdown options: "Still in Applied Stage", "Selected", "Rejected"
- Bulk actions: "Select All", "Reject All"
- Counter: "X of Y resolved"
- Save button: loops through changed rows, calls `PATCH /deals/:id/stage`

### View 2 — Attendance (`?view=attendance`)

- Lists all applicants with Stage = "Selected"
- Per row: Name | Organization | Email | Stage dropdown
- Stage dropdown options: "Selected", "Attended Training", "Rejected or Not Attended"
- Counter: "X of Y confirmed"
- Save button: loops through changed rows, calls `PATCH /deals/:id/stage`

### View 3 — Post-Survey (`?view=post_survey`)

- Progress bar: "X% complete (Y of Z participants)"
- Lists all "Attended Training" participants NOT yet at "Graduated or Post Evaluation Completed"
- Per row: Name | Email | Current Stage | Stage dropdown (editable)
- Stage dropdown options: "Attended Training", "Graduated or Post Evaluation Completed"
- Save button: loops through changed rows, calls `PATCH /deals/:id/stage`

### CRM Proxy Route Added

```
PATCH /deals/:id/stage
Body: { "Stage": "<new_stage_value>" }
Forwards to: PUT /crm/v6/Deals/:id with { "data": [{ "Stage": "..." }] }
```

Reuses existing Zoho OAuth logic in `crm-proxy.js`.

---

## Windows Task Scheduler

**File:** `register_reminder_task.bat`

```bat
schtasks /create /tn "AktivAsiaAA_Reminders" /tr "python tools/reminder_engine.py" /sc daily /st 08:00 /ru SYSTEM /f
```

Run once to register. Logs to `progress.md` same as orchestrator.

---

## Error Handling

- If Gmail send fails: log error to `progress.md`, continue processing other reminders (don't abort run)
- If CRM fetch fails: log error, skip affected reminder type for that run
- If a Solutions record has no `Application_Form_Close_Date`: skip Reminder 2 for that training
- If a Solutions record has no `End_Date`: skip Reminders 3 and 4 for that training

---

## Verification Plan

1. **Unit test reminder logic:** Mock CRM data with known dates, assert correct reminders are generated
2. **Gmail send test:** Run `tools/gmail_auth.py`, then `tools/gmail_sender.py` with a test recipient
3. **Reminder 1 end-to-end:** Create a Training Plan with Start_Date = today + 30 days, run engine, verify email received
4. **Admin page:** Open `admin.html?training_id=X&view=selection`, select a participant, save — verify Stage updated in CRM
5. **Stage update proxy:** Verify `PATCH /deals/:id/stage` route works via browser devtools Network tab
6. **Confirm CRM stage:** After admin page save, check Deal record in Zoho CRM to confirm Stage field updated
