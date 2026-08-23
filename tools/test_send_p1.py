"""
test_send_p1.py — Local test send of the P1/P2 participant reminder emails

Sends ONE real reminder email using a SYNTHETIC deal, so the milestone math
can be verified end-to-end without touching CRM and without waiting for a
real participant to reach their 6-month mark.

Why this exists: functions/reminder-job/reminder.py's __main__ deliberately
refuses real sends locally (it only supports --dry-run, since the deployed
path needs the Catalyst runtime for state_store). That's correct for the
cron job, but leaves no way to eyeball an actual rendered email in a real
inbox. This script fills that gap.

READ-ONLY, and does not touch CRM at all: the deal is a dict built in this
file. Nothing is fetched, nothing is written. Per CLAUDE.md Rule 1.

Neither the deadline nor the "does it fire today" decision is reimplemented
here -- both come from the real production checks (checks/p1_impact_eval_daily
and checks/p2_impact_eval_overdue), so this actually exercises the shipping
date logic rather than a copy of it. The default Graduate_Date is derived per
reminder so that today lands inside that reminder's firing window:

  P1 (daily, until deadline)
      Graduate_Date  = today - 6 months
      six_month_mark = Graduate_Date + 6 months  (= today, day 1 of window)
      Deadline_Date  = six_month_mark + 7 days   (= today + 7 days)

  P2 (weekly, after deadline)
      Graduate_Date  = (today - 14 days) - 6 months
      six_month_mark = today - 14 days
      Deadline_Date  = today - 7 days            (7 days past = weekly boundary)

Usage:
    python tools/test_send_p1.py --dry-run              # P1, render only
    python tools/test_send_p1.py                        # P1, real send
    python tools/test_send_p1.py --email p2             # P2, real send
    python tools/test_send_p1.py --to "a@x.org,b@y.org" # several recipients
    python tools/test_send_p1.py --name "Jane Cruz"
    python tools/test_send_p1.py --grad-date 2026-02-01

Requires .env with GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN
(run tools/gmail_auth.py once to populate them). Sending as
regional@aktivasia.org additionally needs GMAIL_REFRESH_TOKEN_REGIONAL, from
tools/gmail_auth_regional.py -- see gmail_sender.py's docstring for why a
shared token cannot produce that From: address.
"""

import argparse
import os
import sys
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv

# Load .env before importing gmail_sender -- it reads GMAIL_SENDER at import
# time into a module-level constant (same ordering constraint reminder.py
# documents for crm_auth.py).
load_dotenv()

# The Catalyst runtime puts a function's own directory AND its subdirectories
# on sys.path, which is why email_templates.py can `import links` and
# checks/*.py can `from _dates import ...`. Running from tools/ gets none of
# that for free, so replicate it -- same approach as reminder.py's own
# sys.path.insert for local runs.
_REMINDER_JOB = os.path.join(os.path.dirname(__file__), "..", "functions", "reminder-job")
sys.path.insert(0, os.path.abspath(_REMINDER_JOB))
sys.path.insert(0, os.path.abspath(os.path.join(_REMINDER_JOB, "checks")))

import email_templates          # noqa: E402
import gmail_sender             # noqa: E402
from _dates import add_months   # noqa: E402
from checks import p1_impact_eval_daily, p2_impact_eval_overdue  # noqa: E402

# Mirrors reminder.py -- fixed UTC+8 rather than ZoneInfo("Asia/Manila"),
# since the Catalyst runtime has no tzdata (see CLAUDE.md's Timezone gotcha).
# Kept identical here so "today" means the same thing in test and production.
MANILA = timezone(timedelta(hours=8))

# Temporary stand-in "participant" inbox for testing -- NOT a real CRM
# contact, and not the production recipient. Production sends to each
# graduated Deal's own Email field; this address only exists so a rendered
# reminder can be eyeballed in a real inbox during local testing.
DEFAULT_RECIPIENT = "edrichmvalera1@gmail.com"
DEFAULT_PARTICIPANT_NAME = "Edrich Valera"

# Per-reminder wiring, mirroring reminder.py's own P1/P2 blocks so a test
# send reproduces production rather than a guess at it. Both participant
# emails send from regional@aktivasia.org (confirmed with Gino 2026-08-21,
# resolving a stale CLAUDE.md line that had P2 sending from gino@) -- which
# is what reminder.py's PARTICIPANT_GMAIL_SENDER already did for both.
# --from overrides either way.
REMINDERS = {
    "p1": {
        "check": p1_impact_eval_daily,
        "template": lambda deal, deadline, training: email_templates.p1_email(deal, deadline, training),
        "sender": "regional@aktivasia.org",
        "grad_offset_days": 0,    # six_month_mark lands on today
        "label": "P1 -- 6-month evaluation (daily, until deadline)",
    },
    "p2": {
        "check": p2_impact_eval_overdue,
        "template": lambda deal, deadline, training: email_templates.p2_email(deal, deadline, training),
        "sender": "regional@aktivasia.org",
        "grad_offset_days": 14,   # deadline landed 7 days ago = weekly boundary
        "label": "P2 -- 6-month evaluation, overdue (weekly)",
    },
}


def _today_manila() -> date:
    return datetime.now(MANILA).date()


def build_synthetic_deal(grad_date: date, email: str, full_name: str) -> dict:
    """A fake CRM Deal shaped exactly as crm_fetch returns them, tuned so the
    chosen reminder fires today. The four '_6' Likert fields are deliberately
    absent: any one of them being non-null marks the 6-month evaluation as
    completed, which is P1/P2's shared stop condition (see
    _dates.six_month_completed)."""
    first, _, last = full_name.partition(" ")
    return {
        "id": "TEST_DEAL_P1",
        "First_Name": first,
        "Last_Name": last,
        "Email": email,
        "Stage": "Graduated or Post Evaluation Completed",
        "Graduate_Date": grad_date.isoformat(),
        "Training_Applied": {
            "id": "TEST_TRAINING",
            "name": "Campaign Strategy & Tactics Training",
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Send one test P1/P2 reminder email.")
    ap.add_argument("--email", choices=sorted(REMINDERS), default="p1",
                    help="Which participant reminder to test (default: p1)")
    ap.add_argument("--to", default=DEFAULT_RECIPIENT,
                    help=f"Recipient address, or several comma-separated "
                         f"(default: {DEFAULT_RECIPIENT})")
    ap.add_argument("--from", dest="sender", default=None,
                    help="From: address (default: the chosen reminder's "
                         "production sender)")
    ap.add_argument("--name", default=DEFAULT_PARTICIPANT_NAME,
                    help=f"Test participant's name, as it appears in the email "
                         f"body and subject (default: {DEFAULT_PARTICIPANT_NAME})")
    ap.add_argument("--grad-date", dest="grad_date",
                    help="Override Graduate_Date (YYYY-MM-DD). Default: "
                         "derived so the chosen reminder fires today.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Render and print the email without sending it.")
    args = ap.parse_args()

    spec = REMINDERS[args.email]
    sender = args.sender or spec["sender"]
    today = _today_manila()

    if args.grad_date:
        grad_date = date.fromisoformat(args.grad_date)
    else:
        grad_date = add_months(today - timedelta(days=spec["grad_offset_days"]), -6)

    # --to accepts a comma-separated list so one send can go to several test
    # inboxes at once. The synthetic deal carries only the first address --
    # a real CRM Deal has exactly one Email -- but the send goes to all of
    # them, which is what makes the extra addresses useful for review.
    recipients = [addr.strip() for addr in args.to.split(",") if addr.strip()]
    deal = build_synthetic_deal(grad_date, recipients[0], args.name)

    # Run the REAL production check rather than recomputing the window here,
    # so a regression in the shipping date logic actually shows up in this test.
    due = spec["check"].due([deal], state={}, today=today)

    print("=" * 62)
    print(f"  Test send -- {spec['label']}")
    print("=" * 62)
    print(f"  today (Asia/Manila) : {today.isoformat()}")
    print(f"  Graduate_Date       : {grad_date.isoformat()}")
    print(f"  six_month_mark      : {add_months(grad_date, 6).isoformat()}")

    if not due:
        print(f"\n[FAIL] {args.email.upper()} did not fire for this deal -- nothing to send.")
        print("       Drop --grad-date to let the script derive a date that fires today.")
        return 1

    item = due[0]
    deadline = item["deadline"]
    past = (today - deadline).days
    when = f"{past} days ago" if past > 0 else f"in {-past} days"
    print(f"  Deadline_Date       : {deadline.isoformat()} ({when})   <-- appears in the email body")
    print(f"  From                : {sender}")
    print(f"  To                  : {', '.join(recipients)}")

    subject, html = spec["template"](deal, deadline, item["training_name"])
    print(f"\n  Subject: {subject}")

    if args.dry_run:
        out = os.path.join(os.path.dirname(__file__), "..", ".tmp",
                           f"{args.email}_preview.html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"\n[DRY RUN] Nothing sent. HTML preview written to {os.path.relpath(out)}")
        print("          (the inline logo won't render in a browser -- it's a cid: "
              "reference that only resolves inside an email client)")
        return 0

    gmail_sender.send_email(
        to=recipients,
        cc=[],
        subject=subject,
        html_body=html,
        sender=sender,
        inline_images={email_templates.LOGO_CONTENT_ID: email_templates.read_logo_bytes()},
    )
    print(f"\n[SENT] {args.email.upper()} test email delivered to {', '.join(recipients)}")
    print(f"       Check that the body shows deadline {deadline.isoformat()}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
