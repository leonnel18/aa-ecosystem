"""
backfill_graduate_date.py — One-time manual backfill of Deals.Graduate_Date

# ══════════════════════════════════════════════════════════════════════
# THIS IS THE ONE SCRIPT IN THIS REPO THAT WRITES TO ZOHO CRM.
# Every other tool/function is READ-ONLY (see CLAUDE.md Rule 1). This
# script is the explicit, Gino-approved exception: PUT /Deals/:id, one
# field only (Graduate_Date), run manually and once — never on a cron
# schedule, never called from functions/reminder-job or any other
# automated path.
# ══════════════════════════════════════════════════════════════════════

Why this exists: functions/reminder-job's P1/P2 checks (6-month Impact
Evaluation reminders) anchor their "half a year since training" math to
Deal.Graduate_Date. ~80% of Deals with Stage == "Graduated or Post
Evaluation Completed" have this field blank (confirmed live, documented in
CLAUDE.md) — without a value there, P1/P2 can never compute a six-month
mark for those participants and they'd simply never receive the reminder.

Per Gino's decision: for every such Deal, set Graduate_Date to the linked
Training's (Solutions) End_Date. This script does that, once, safely:

  1. Fetch Deals where Stage == "Graduated or Post Evaluation Completed"
     and Graduate_Date is blank.
  2. Resolve each Deal's Training_Applied -> Solutions.End_Date.
  3. Print a preview table of every planned change (dry-run is the DEFAULT
     — no CRM write happens unless --apply is passed).
  4. With --apply: PUT /Deals/:id { Graduate_Date: end_date } for each.

Usage:
  python tools/backfill_graduate_date.py            # dry-run, prints preview only
  python tools/backfill_graduate_date.py --apply     # actually writes to CRM
"""

import os
import sys
import argparse
import requests
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from crm_auth import auth_headers, API_BASE

load_dotenv()

GRADUATED_STAGE = "Graduated or Post Evaluation Completed"

DEALS_FIELDS = "id,Deal_Name,Stage,Graduate_Date,Training_Applied"
SOLUTIONS_FIELDS = "id,Solution_Title,End_Date"


def fetch_module(module: str, fields: str, extra_params: dict = None) -> list:
    """Paginated REST GET — read-only, same pagination shape as every other
    fetch in this repo (see tools/crm_extract.py)."""
    all_records = []
    per_page = 200
    params = {"fields": fields, "per_page": per_page}
    if extra_params:
        params.update(extra_params)

    while True:
        resp = requests.get(f"{API_BASE}/{module}", headers=auth_headers(), params=params)
        if resp.status_code == 204:
            break
        resp.raise_for_status()
        data = resp.json()
        all_records.extend(data.get("data", []))

        info = data.get("info", {})
        if not info.get("more_records", False):
            break
        next_token = info.get("next_page_token")
        if next_token:
            params = {"fields": fields, "per_page": per_page, "page_token": next_token}
            if extra_params:
                params.update(extra_params)
        else:
            params["page"] = params.get("page", 1) + 1

    return all_records


def fetch_graduated_deals_missing_graduate_date() -> list:
    return fetch_module(
        "Deals", DEALS_FIELDS,
        extra_params={"criteria": f'(Stage:equals:{GRADUATED_STAGE})'},
    )


def fetch_solutions_end_dates() -> dict:
    """Returns {solution_id: end_date_str}."""
    solutions = fetch_module("Solutions", SOLUTIONS_FIELDS)
    return {s["id"]: s.get("End_Date") for s in solutions if s.get("End_Date")}


def compute_backfill_plan(deals: list, solution_end_dates: dict) -> list:
    """Returns [{"deal_id", "deal_name", "training_name", "end_date"}, ...]
    for every Deal that (a) is graduated, (b) has a blank Graduate_Date, and
    (c) has a linked Training with a known End_Date to backfill from."""
    plan = []
    for deal in deals:
        if deal.get("Graduate_Date"):
            continue  # already has a value — never overwrite an existing one
        training = deal.get("Training_Applied") or {}
        tid = training.get("id")
        end_date = solution_end_dates.get(tid)
        if not end_date:
            continue  # no linked Training or no End_Date to backfill from — skip, don't guess
        plan.append({
            "deal_id": deal["id"],
            "deal_name": deal.get("Deal_Name", deal["id"]),
            "training_name": training.get("name", tid),
            "end_date": end_date,
        })
    return plan


def apply_backfill(plan: list) -> tuple[int, int]:
    """PUT /Deals/:id for each planned change. Returns (success_count, fail_count)."""
    ok, failed = 0, 0
    for item in plan:
        try:
            resp = requests.put(
                f"{API_BASE}/Deals/{item['deal_id']}",
                headers=auth_headers(),
                json={"data": [{"id": item["deal_id"], "Graduate_Date": item["end_date"]}]},
            )
            resp.raise_for_status()
            result = resp.json().get("data", [{}])[0]
            if result.get("status") == "success":
                ok += 1
                print(f"  [OK]   {item['deal_name']} -> Graduate_Date = {item['end_date']}")
            else:
                failed += 1
                print(f"  [FAIL] {item['deal_name']}: {result}")
        except requests.HTTPError as e:
            failed += 1
            print(f"  [FAIL] {item['deal_name']}: {e}")
    return ok, failed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                         help="Actually write to CRM. Without this flag, only a preview is printed.")
    args = parser.parse_args()

    print("Fetching graduated Deals...")
    deals = fetch_graduated_deals_missing_graduate_date()
    print(f"  {len(deals)} Deal(s) in stage \"{GRADUATED_STAGE}\"")

    print("Fetching Solutions (for End_Date lookup)...")
    solution_end_dates = fetch_solutions_end_dates()

    plan = compute_backfill_plan(deals, solution_end_dates)

    print(f"\n{len(plan)} Deal(s) need Graduate_Date backfilled:\n")
    for item in plan:
        print(f"  {item['deal_name']:40s}  <- {item['training_name']:30s}  Graduate_Date = {item['end_date']}")

    if not plan:
        print("\nNothing to do.")
        return

    if not args.apply:
        print(f"\n[DRY RUN] {len(plan)} change(s) would be written. Re-run with --apply to write them.")
        return

    print(f"\n[APPLY] Writing {len(plan)} change(s) to CRM...")
    ok, failed = apply_backfill(plan)
    print(f"\n[DONE] {ok} succeeded, {failed} failed.")


if __name__ == "__main__":
    main()
