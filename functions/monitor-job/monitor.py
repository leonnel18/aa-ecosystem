"""
monitor.py — Daily CRM Monitor orchestrator (Catalyst cron function copy)

Runs the 4 checks in sequence, builds one digest email, sends it, then
persists updated state — in that order, and state is only saved after the
email send succeeds, so a failed send never marks things as "already
reported" (see state_store.py / checks/*.py).

Timezone: pinned to Asia/Manila throughout (matches .catalystrc's project
timezone) to avoid off-by-one-day flapping at midnight boundaries, since
items 3 and 4 do date-difference math. Manila has no DST and a fixed
UTC+8 offset, so a fixed-offset timezone is used instead of
zoneinfo.ZoneInfo("Asia/Manila") — stdlib zoneinfo depends on an IANA tzdata
database being available (via the OS or the `tzdata` PyPI package), which
is not guaranteed on every deploy target (confirmed missing on this
Catalyst function's Windows-hosted Python 3.9 runtime during first-run
testing: ModuleNotFoundError: No module named 'tzdata'). A fixed offset
needs no external database and can't have this failure mode.
"""

import os
from datetime import datetime, date, timezone, timedelta

import crm_fetch
import state_store
import gmail_sender
import email_report
from checks import new_records, email_activity, graduate_mismatch, six_month_due

MANILA = timezone(timedelta(hours=8))  # Asia/Manila, fixed UTC+8, no DST
RECIPIENT = os.environ.get("MONITOR_RECIPIENT", "gino@aktivasia.org")


def _today_manila() -> date:
    return datetime.now(MANILA).date()


def _now_manila_iso() -> str:
    return datetime.now(MANILA).isoformat()


def _run_check(label: str, fn, *args, **kwargs):
    """Run one check, catching exceptions so one failing check doesn't abort
    the others. Returns the check's normal return value, or the caught
    Exception itself (email_report.py knows how to render either)."""
    try:
        print(f"  Running check: {label}...")
        return fn(*args, **kwargs)
    except Exception as e:
        print(f"  [FAILED] {label}: {e}")
        return e


def run() -> dict:
    today = _today_manila()
    print("=" * 55)
    print(f"  monitor-job — Daily CRM Monitor — {today.isoformat()} (Asia/Manila)")
    print("=" * 55)

    state, row_id = state_store.load_state()
    is_baseline_run = state.get("last_run_at") is None
    print(f"  Loaded state: baseline_run={is_baseline_run} last_run_at={state.get('last_run_at')!r}")

    # ── Fetch shared data up front (each check narrows further as needed) ──
    print("\n-- Fetching CRM snapshots --")
    snapshot_modules = crm_fetch.fetch_all_snapshot_modules()
    deals_new = crm_fetch.fetch_deals_for_new_records()
    deals_graduated = crm_fetch.fetch_deals_for_graduate_check()
    solutions = snapshot_modules.get("Solutions", [])

    module_records_for_diff = dict(snapshot_modules)
    module_records_for_diff["Deals"] = deals_new

    # ── Run the 4 checks, each isolated ─────────────────────────────────────
    print("\n-- Running checks --")

    nr_result = _run_check("new-records", new_records.run, module_records_for_diff, state)
    if isinstance(nr_result, Exception):
        nr_report, updated_watermarks = nr_result, state.get("watermarks", {})
    else:
        nr_report, updated_watermarks = nr_result

    ea_result = _run_check("email-activity", email_activity.run, solutions, state, today)
    if isinstance(ea_result, Exception):
        ea_report, updated_deal_email_seen = ea_result, state.get("deal_email_seen", {})
    else:
        ea_report, updated_deal_email_seen = ea_result

    gm_result = _run_check("graduate-mismatch", graduate_mismatch.run, deals_graduated, solutions, state)
    if isinstance(gm_result, Exception):
        gm_report, updated_graduate_watermark = gm_result, state.get("graduate_check_watermark", {})
    else:
        gm_report, updated_graduate_watermark = gm_result

    sm_report = _run_check("six-month-due", six_month_due.run, deals_graduated, state, today)

    # ── Build and send the digest ────────────────────────────────────────────
    print("\n-- Building digest email --")
    results_for_email = {
        "new_records": nr_report if not isinstance(nr_result, Exception) else nr_result,
        "email_activity": ea_report if not isinstance(ea_result, Exception) else ea_result,
        "graduate_mismatch": gm_report if not isinstance(gm_result, Exception) else gm_result,
        "six_month_due": sm_report,
    }
    subject, html_body = email_report.build_digest(results_for_email, today.isoformat(), is_baseline_run)

    print(f"-- Sending digest to {RECIPIENT} --")
    gmail_sender.send_email(to=[RECIPIENT], cc=[], subject=subject, html_body=html_body)
    print("  Digest sent.")

    # ── Persist state only after the send succeeds ──────────────────────────
    new_state = dict(state)
    new_state["last_run_at"] = _now_manila_iso()
    new_state["watermarks"] = updated_watermarks
    new_state["deal_email_seen"] = updated_deal_email_seen
    new_state["graduate_check_watermark"] = updated_graduate_watermark

    state_store.save_state(new_state, row_id)
    print("\n[DONE] monitor-job run complete. State saved.")

    new_records_count = sum(len(v.get("new", [])) for v in nr_report.values()) if isinstance(nr_report, dict) else 0
    return {
        "new_records_new_count": new_records_count,
        "email_activity_deal_count": len(ea_report) if isinstance(ea_report, list) else 0,
        "graduate_new_missing": len(gm_report.get("new_missing", [])) if isinstance(gm_report, dict) else 0,
        "graduate_new_mismatch": len(gm_report.get("new_mismatch", [])) if isinstance(gm_report, dict) else 0,
        "graduate_baseline_seeded": gm_report.get("baseline_seeded_count", 0) if isinstance(gm_report, dict) else 0,
        "six_month_due_count": len(sm_report) if isinstance(sm_report, list) else 0,
    }
