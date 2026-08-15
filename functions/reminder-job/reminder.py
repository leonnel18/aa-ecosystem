"""
reminder.py — Reminder-job orchestrator (Catalyst cron function copy)

Unlike monitor-job (one digest email per run), this job sends many
individual emails — one per due Training/country (C1-C6) or per due Deal
(P1/P2) — so state is updated and persisted incrementally, per email sent,
not once at the end. This means a failure partway through a run (e.g. Gmail
API hiccups on email #7 of 12) leaves the first 6 correctly marked as sent
and doesn't re-send them on retry; only the state accumulated so far is
saved once, at the end of the run (mirrors monitor-job's "persist only after
sends succeed" ordering, just tracked per-email in memory first).

Timezone: fixed UTC+8 (Asia/Manila), same reasoning as monitor-job — avoids
the zoneinfo/tzdata dependency that's missing on this Catalyst runtime (see
CLAUDE.md's Timezone gotcha).
"""

import json
import os
import sys
from datetime import datetime, date, timezone, timedelta

# Local-run support: crm_auth.py reads ZOHO_CRM_* from os.environ at IMPORT
# time (module-level constants), and the `import crm_fetch` below transitively
# imports crm_auth — so .env must be loaded before that import happens, not
# later in __main__ (too late; the constants would already be None/"COM").
# Under the real Catalyst runtime this load_dotenv() is a harmless no-op
# (no .env file there; env vars are pre-populated by the platform itself).
from dotenv import load_dotenv
load_dotenv()

# The Catalyst runtime puts each function's own directory AND its
# subdirectories on sys.path, which is why checks/*.py can do a bare
# `from _dates import ...` / `import crm_fetch` (see functions/monitor-job's
# identical pattern, e.g. checks/email_activity.py's `import crm_fetch`).
# Running this file directly (`python reminder.py`, for local --dry-run use)
# doesn't get that behavior for free, so add checks/ to sys.path ourselves —
# harmless no-op under the real Catalyst runtime, where it's already there.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "checks"))

import crm_fetch
import gmail_sender
import email_templates
from checks import (
    c1_training_plan, c2_applications_open, c3_seven_day,
    c4_confirm_participants, c5_training_complete, c6_post_eval_nudge,
    p1_impact_eval_daily, p2_impact_eval_overdue,
)

MANILA = timezone(timedelta(hours=8))

# Local copy, NOT ../../data/email_config.json — Catalyst deploys
# functions/reminder-job/ and the rest of the repo as separate artifacts
# (see catalyst.json's "slate" vs. "functions" sections), so a path reaching
# outside this directory resolves locally (repo checkout) but would be
# missing entirely in the deployed function's runtime. Same reasoning as
# email_templates.py's logo path. Keep in sync with data/email_config.json
# if country team emails change.
EMAIL_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "email_config.json")

COUNTRY_TEAM_GMAIL_SENDER = "gino@aktivasia.org"
PARTICIPANT_GMAIL_SENDER = os.environ.get("GMAIL_SENDER_PARTICIPANT", "regional@aktivasia.org")

# Loaded once at import time and attached to every send — see
# email_templates.py's LOGO_CONTENT_ID / read_logo_bytes() docstring for why
# this is a local copy inside functions/reminder-job/, not portal/img/.
_LOGO_BYTES = email_templates.read_logo_bytes()

# Mirrors state_store._EMPTY_STATE. Duplicated (not imported) so dry-run mode
# never needs to import state_store at all — that module imports
# zcatalyst_sdk at the top level, which is only installed inside the
# Catalyst runtime and isn't available for a local `python reminder.py
# --dry-run` run. Keep in sync with state_store.py's _EMPTY_STATE if that
# shape changes.
_DRY_RUN_EMPTY_STATE = {
    "last_run_at": None,
    "c1_last_sent_month": None,
    "c2_sent_training_ids": [],
    "c3_sent_training_ids": [],
    "c4_last_sent": {},
    "c5_sent_training_ids": [],
    "c6_sent_training_ids": [],
    "p_last_sent": {},
}


def _today_manila() -> date:
    return datetime.now(MANILA).date()


def _now_manila_iso() -> str:
    return datetime.now(MANILA).isoformat()


def _load_email_config() -> dict:
    with open(EMAIL_CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def _country_recipients(config: dict, country: str) -> tuple[list, list]:
    """Returns (to_list, cc_list) for a country team. Falls back to cc_always
    only (no `to`) if the country isn't in email_config.json, so a misnamed
    Organised_By value doesn't silently drop the email — it'll fail loudly
    with an empty `to`, which _send() logs and skips."""
    team = config.get("country_teams", {}).get(country, {})
    to = team.get("to", [])
    cc = config.get("cc_always", [])
    return to, cc


def _send(label: str, to: list, cc: list, subject: str, html_body: str, sender: str,
          dry_run: bool = False) -> bool:
    """Send one email, catching exceptions so one failed send doesn't abort
    the rest of the run. Returns True on success (or on a dry-run "would
    send", so callers can still exercise their state-update logic)."""
    if not to:
        print(f"  [SKIP] {label}: no recipient configured")
        return False
    if dry_run:
        print(f"  [DRY-RUN] would send {label} -> {to} (cc={cc}) from {sender}\n"
              f"            subject: {subject}")
        return True
    try:
        gmail_sender.send_email(
            to=to, cc=cc, subject=subject, html_body=html_body, sender=sender,
            inline_images={email_templates.LOGO_CONTENT_ID: _LOGO_BYTES},
        )
        print(f"  [SENT] {label} -> {to}")
        return True
    except Exception as e:
        print(f"  [FAILED] {label}: {e}")
        return False


def run(dry_run: bool = False) -> dict:
    """Run one full pass of all 8 checks. dry_run=True prints what would be
    sent instead of calling Gmail, and skips state persistence entirely
    (loads/evaluates against a fresh empty state each time) — for sanity-
    checking the milestone math against live CRM data locally, per the
    reminder-job design doc's verification steps. Not used by the deployed
    Catalyst cron path (main.py always calls run() with dry_run=False)."""
    today = _today_manila()
    print("=" * 55)
    print(f"  reminder-job — Daily Reminder Engine — {today.isoformat()} (Asia/Manila)"
          f"{'  [DRY RUN]' if dry_run else ''}")
    print("=" * 55)

    if dry_run:
        state, row_id = dict(_DRY_RUN_EMPTY_STATE), None
    else:
        import state_store  # lazy: only needed (and only importable) in the real Catalyst run
        state, row_id = state_store.load_state()
    config = _load_email_config()

    print("\n-- Fetching CRM data --")
    training_plans = crm_fetch.fetch_training_plans()
    solutions = crm_fetch.fetch_solutions()
    deals = crm_fetch.fetch_deals()

    sent_counts = {k: 0 for k in ("c1", "c2", "c3", "c4", "c5", "c6", "p1", "p2")}

    # ── C1 — Training Plan check-in (monthly) ───────────────────────────────
    print("\n-- C1: Training Plan check-in --")
    c1_due = c1_training_plan.due(training_plans, solutions, state, today)
    any_c1_sent = False
    for country, plans in c1_due.items():
        to, cc = _country_recipients(config, country)
        subj, body = email_templates.c1_email(country, today.year, plans)
        if _send(f"C1/{country}", to, cc, subj, body, COUNTRY_TEAM_GMAIL_SENDER, dry_run):
            sent_counts["c1"] += 1
            any_c1_sent = True
    if any_c1_sent:
        state["c1_last_sent_month"] = today.strftime("%Y-%m")

    # ── C2 — Applications open (8-7 weeks out) ──────────────────────────────
    print("\n-- C2: Applications open --")
    c2_sent_ids = list(state.get("c2_sent_training_ids", []))
    for item in c2_applications_open.due(solutions, state, today):
        training = item["training"]
        country = training.get("Organised_By", "")
        to, cc = _country_recipients(config, country)
        subj, body = email_templates.c2_email(training)
        if _send(f"C2/{training.get('Solution_Title')}", to, cc, subj, body, COUNTRY_TEAM_GMAIL_SENDER, dry_run):
            sent_counts["c2"] += 1
            c2_sent_ids.append(training.get("id"))
    state["c2_sent_training_ids"] = c2_applications_open.prune_state_ids(solutions, c2_sent_ids, today)

    # ── C3 — 7-day pre-training reminder ────────────────────────────────────
    print("\n-- C3: 7-day pre-training reminder --")
    c3_sent_ids = list(state.get("c3_sent_training_ids", []))
    for item in c3_seven_day.due(solutions, state, today):
        training = item["training"]
        country = training.get("Organised_By", "")
        to, cc = _country_recipients(config, country)
        subj, body = email_templates.c3_email(training)
        if _send(f"C3/{training.get('Solution_Title')}", to, cc, subj, body, COUNTRY_TEAM_GMAIL_SENDER, dry_run):
            sent_counts["c3"] += 1
            c3_sent_ids.append(training.get("id"))
    state["c3_sent_training_ids"] = c3_seven_day.prune_state_ids(solutions, c3_sent_ids, today)

    # ── C4 — Participant confirmation (5-1 days out, while pending remain) ──
    print("\n-- C4: Participant confirmation --")
    c4_last_sent = dict(state.get("c4_last_sent", {}))
    for item in c4_confirm_participants.due(solutions, deals, state, today):
        training = item["training"]
        country = training.get("Organised_By", "")
        to, cc = _country_recipients(config, country)
        subj, body = email_templates.c4_email(training, item["pending"])
        if _send(f"C4/{training.get('Solution_Title')}", to, cc, subj, body, COUNTRY_TEAM_GMAIL_SENDER, dry_run):
            sent_counts["c4"] += 1
            c4_last_sent[training.get("id")] = today.isoformat()
    state["c4_last_sent"] = c4_confirm_participants.prune_state(solutions, c4_last_sent, today)

    # ── C5 — Training end date ───────────────────────────────────────────────
    print("\n-- C5: Training complete --")
    c5_sent_ids = list(state.get("c5_sent_training_ids", []))
    for item in c5_training_complete.due(solutions, state, today):
        training = item["training"]
        country = training.get("Organised_By", "")
        to, cc = _country_recipients(config, country)
        subj, body = email_templates.c5_email(training)
        if _send(f"C5/{training.get('Solution_Title')}", to, cc, subj, body, COUNTRY_TEAM_GMAIL_SENDER, dry_run):
            sent_counts["c5"] += 1
            c5_sent_ids.append(training.get("id"))
    state["c5_sent_training_ids"] = c5_training_complete.prune_state_ids(solutions, c5_sent_ids, today)

    # ── C6 — Post-eval nudge (7 days after training end) ───────────────────
    print("\n-- C6: Post-eval nudge --")
    c6_sent_ids = list(state.get("c6_sent_training_ids", []))
    for item in c6_post_eval_nudge.due(solutions, state, today):
        training = item["training"]
        country = training.get("Organised_By", "")
        to, cc = _country_recipients(config, country)
        subj, body = email_templates.c6_email(training)
        if _send(f"C6/{training.get('Solution_Title')}", to, cc, subj, body, COUNTRY_TEAM_GMAIL_SENDER, dry_run):
            sent_counts["c6"] += 1
            c6_sent_ids.append(training.get("id"))
    state["c6_sent_training_ids"] = c6_post_eval_nudge.prune_state_ids(solutions, c6_sent_ids, today)

    # ── P1/P2 — 6-month Impact Evaluation (participant-facing) ─────────────
    print("\n-- P1: 6-month evaluation (daily) --")
    p_last_sent = dict(state.get("p_last_sent", {}))
    for item in p1_impact_eval_daily.due(deals, state, today):
        deal = item["deal"]
        subj, body = email_templates.p1_email(deal, item["deadline"], item["training_name"])
        if _send(f"P1/{deal.get('id')}", [deal.get("Email")], [], subj, body, PARTICIPANT_GMAIL_SENDER, dry_run):
            sent_counts["p1"] += 1
            p_last_sent[deal.get("id")] = today.isoformat()

    print("\n-- P2: 6-month evaluation, overdue (weekly) --")
    for item in p2_impact_eval_overdue.due(deals, state, today):
        deal = item["deal"]
        subj, body = email_templates.p2_email(deal, item["deadline"], item["training_name"])
        if _send(f"P2/{deal.get('id')}", [deal.get("Email")], [], subj, body, PARTICIPANT_GMAIL_SENDER, dry_run):
            sent_counts["p2"] += 1
            p_last_sent[deal.get("id")] = today.isoformat()

    state["p_last_sent"] = p1_impact_eval_daily.prune_state(deals, p_last_sent)

    # ── Persist state ────────────────────────────────────────────────────────
    state["last_run_at"] = _now_manila_iso()
    if dry_run:
        print("\n[DONE] reminder-job dry run complete. State NOT saved (dry-run).")
    else:
        import state_store  # lazy: see the load_state() call above for why
        state_store.save_state(state, row_id)
        print("\n[DONE] reminder-job run complete. State saved.")
    print(f"  Sent counts: {sent_counts}")

    return sent_counts


if __name__ == "__main__":
    # Local dry-run entrypoint: `python reminder.py [--dry-run]`. .env is
    # already loaded at module import time above (needed before `import
    # crm_fetch` pulls in crm_auth.py's module-level env reads). state_store.py's
    # zcatalyst_sdk calls only work inside Catalyst, so this path is
    # dry-run-only by construction; it does not support a real send locally.
    if "--dry-run" not in sys.argv:
        print("Local runs only support --dry-run (state_store/gmail_sender "
              "require the Catalyst runtime and real OAuth secrets).")
        print("Usage: python reminder.py --dry-run")
        sys.exit(1)

    run(dry_run=True)
