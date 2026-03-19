"""
crm_extract.py — Zoho CRM Data Extractor

# ══════════════════════════════════════════════════════════════════
# READ-ONLY — NO POST / PUT / PATCH / DELETE TO CRM. EVER.
# All operations are GET requests only.
# ══════════════════════════════════════════════════════════════════

Fetches all records from the 4 pipeline modules using paginated REST GET.
Writes raw JSON to .tmp/{module}_raw.json for transform.py to consume.

Pagination: per_page=200, page=1,2,3... until response has no more pages.

Usage:
  python tools/crm_extract.py
  python tools/crm_extract.py --module Deals   # single module debug
"""

import os
import sys
import json
import argparse
import requests
from dotenv import load_dotenv
from crm_auth import auth_headers, API_BASE

load_dotenv()

TMP_DIR = os.path.join(os.path.dirname(__file__), "..", ".tmp")

# ── Field lists per module ──────────────────────────────────────────────────
# Only fetch the fields the pipeline actually uses. Keeps payloads small.

DEALS_FIELDS = ",".join([
    "id", "Deal_Name", "Stage", "Graduate_Date",
    "Training_Applied", "Training_Type_Applied", "Account_Name",
    "Gender", "Date_of_Birth", "City_Province",
    # Likert — Strategy & Tactics
    "A_Pre_Training_Strategy_Buildings", "A_Post_Training_Strategy_Building", "B_Strategy_Tactics_6",
    # Likert — Communication Strategy
    "B_Pre_Training_Building_Communication", "B_Post_Training_Building_Communication", "C_Communication_Strategy_6",
    # Likert — Facilitating Workshops
    "C_Pre_Training_Confident_facilitator", "C_Post_Training_Confident_facilitator", "D_Facilitating_Workshops_Meetings_6",
    # Likert — Building Connections
    "D_Pre_Training_Confident_connector", "D_Post_Training_Confident_connector", "E_Building_Connections_6",
    # Post Survey — qualitative
    "Best_aspect_of_the_workshop", "Sum_up_what_you_learned_at_our_training",
    "Action_Plans_in_the_next_3_months", "Improvement_Suggestion_for_next_time",
    "Suggestions_in_the_next_workshop", "Willingness_to_provide_a_testimonial",
    # 6M Impact Evaluation
    "How_has_the_training_impacted_your_campaigning",
    "Have_you_applied_the_training_to_run_more_effectiv",
    "I_ve_got_a_new_or_better_job_in_campaigning",
    "I_ve_done_more_campaigning",
    "I_ve_been_able_to_raise_more_funds_for_my_campaign",
    "I_ve_built_connections_to_support_my_campaign",
    "I_ve_got_more_people_supporting_my_campaign",
    "My_campaign_has_achieved_some_objectives_and_goals",
    "What_you_shared_the_content_or_topics",
    "I_ve_stayed_connected_with_campaigners",
    "I_ve_trained_others_to_run_effective_campaigns",
    "I_ve_shared_my_learnings_with_others",
    "Are_you_interested_in_reconnecting_with_AktivAsia",
    "Know_someone_who_could_gain_from_our_training",
    "What_s_alive_in_your_campaign_work_now",
    "Testimonial_for_us_on_how_the_training",
    "Anything_else_you_d_like_to_share_or_ask",
    "Need_support_from_AktivAsia",
    "Key_focus_for_our_national_local_trainings",
    "Shared_learnings_with_how_many_people",
])

SOLUTIONS_FIELDS = ",".join([
    "id", "Solution_Title", "Organised_By", "Training_Type",
    "Start_Date", "End_Date", "Countries_Participated",
    "Target_Participants", "Participants_Until_2023", "Training_Title_Plan",
])

PRODUCTS_FIELDS = ",".join([
    "id", "Product_Name",
])

ACCOUNTS_FIELDS = ",".join([
    "id", "Account_Name",
])

FORMS_FIELDS = ",".join(["id", "Name", "Created_Time", "Owner"])

TRAINING_PLANS_FIELDS = ",".join(["id", "Name", "Start_Date", "End_Date", "Organised_By", "Activity_Type", "Status", "Target_Participants"])

MODULE_CONFIG = {
    "Deals":          DEALS_FIELDS,
    "Solutions":      SOLUTIONS_FIELDS,
    "Products":       PRODUCTS_FIELDS,
    "Accounts":       ACCOUNTS_FIELDS,
    "Forms":          FORMS_FIELDS,
    "Training_Plans": TRAINING_PLANS_FIELDS,
}


# ── Core fetch logic ────────────────────────────────────────────────────────

def fetch_module(module: str, fields: str) -> list:
    """
    Paginate through all records in a CRM module using REST GET.
    Uses page_token cursor pagination (Zoho CRM v2.1+) to bypass the 2000-record
    hard limit on the page parameter. Falls back to page-number pagination for
    small modules where no page_token is returned.
    Returns list of all record dicts.
    """
    all_records = []
    per_page = 200
    params = {"fields": fields, "per_page": per_page}

    print(f"  Fetching {module}...", end="", flush=True)

    while True:
        resp = requests.get(
            f"{API_BASE}/{module}",
            headers=auth_headers(),
            params=params,
        )

        if resp.status_code == 204:
            # No content — module is empty or no more pages
            break

        resp.raise_for_status()
        data = resp.json()
        records = data.get("data", [])
        all_records.extend(records)
        print(f" {len(all_records)}", end="", flush=True)

        info = data.get("info", {})
        if not info.get("more_records", False):
            break

        next_token = info.get("next_page_token")
        if next_token:
            # Cursor-based: drop page param, use page_token
            params = {"fields": fields, "per_page": per_page, "page_token": next_token}
        else:
            # Fallback: increment page (only safe up to 2000 records)
            params["page"] = params.get("page", 1) + 1

    print(f" -> {len(all_records)} total")
    return all_records


def extract_all(modules: list = None) -> dict:
    """
    Fetch all requested modules, write each to .tmp/{module}_raw.json.
    Returns dict of {module: record_count}.
    """
    os.makedirs(TMP_DIR, exist_ok=True)
    targets = modules or list(MODULE_CONFIG.keys())
    summary = {}

    for module in targets:
        if module not in MODULE_CONFIG:
            print(f"  [WARN] Unknown module: {module} - skipping")
            continue
        records = fetch_module(module, MODULE_CONFIG[module])
        out_path = os.path.join(TMP_DIR, f"{module.lower()}_raw.json")
        with open(out_path, "w") as f:
            json.dump(records, f, indent=2)
        summary[module] = len(records)

    return summary


# ── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extract Zoho CRM data to .tmp/")
    parser.add_argument("--module", help="Extract a single module (debug)")
    args = parser.parse_args()

    print("=" * 55)
    print("  crm_extract.py - READ-ONLY CRM data pull")
    print("=" * 55)

    modules = [args.module] if args.module else None
    try:
        summary = extract_all(modules)
    except requests.HTTPError as e:
        print(f"\n[FAIL] HTTP error: {e}")
        sys.exit(1)

    print("\nSummary:")
    for module, count in summary.items():
        out = os.path.join(".tmp", f"{module.lower()}_raw.json")
        print(f"  {module:20s}  {count:5d} records  -> {out}")
    print("\n[DONE] Raw data written to .tmp/")


if __name__ == "__main__":
    main()
