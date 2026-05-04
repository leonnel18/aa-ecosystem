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

from crm_extract import fetch_module
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
        print(f"  R1 -> {country}: {item['plan']['Name']} ({item['days']}d)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R1 sent: {country} / {item['plan']['Name']} ({item['days']}d)")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R1 FAILED: {country} / {item['plan']['Name']} -- {e}")

    # ── Reminder 2: Selection Reminder ───────────────────────────────────────
    r2_due = check_reminder2(trainings, deals, today=today)
    for item in r2_due:
        country = item["country"]
        to, cc  = country_emails(config, country)
        if not to:
            continue
        subj, body = reminder2_email(item["training"], item["pending"])
        print(f"  R2 -> {country}: {item['training']['Solution_Title']} ({len(item['pending'])} pending)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R2 sent: {country} / {item['training']['Solution_Title']}")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R2 FAILED: {country} / {item['training']['Solution_Title']} -- {e}")

    # ── Reminder 3: Attendance Confirmation ──────────────────────────────────
    r3_due = check_reminder3(trainings, deals, today=today)
    for item in r3_due:
        country = item["country"]
        to, cc  = country_emails(config, country)
        if not to:
            continue
        subj, body = reminder3_email(item["training"], item["pending"])
        print(f"  R3 -> {country}: {item['training']['Solution_Title']} ({len(item['pending'])} unconfirmed)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R3 sent: {country} / {item['training']['Solution_Title']}")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R3 FAILED: {country} / {item['training']['Solution_Title']} -- {e}")

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
        print(f"  R4 -> {country}: {item['training']['Solution_Title']} ({item['pct']}%)")
        if not dry_run:
            try:
                gmail_sender.send_email(to=to, cc=cc, subject=subj, html_body=body)
                log_lines.append(f"- R4 sent: {country} / {item['training']['Solution_Title']} ({item['pct']}%)")
                sent_count += 1
            except Exception as e:
                print(f"  [ERROR] Gmail send failed: {e}")
                log_lines.append(f"- R4 FAILED: {country} / {item['training']['Solution_Title']} -- {e}")

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
