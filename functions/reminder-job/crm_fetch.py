"""
crm_fetch.py — Zoho CRM Data Fetcher (reminder-job)

# ══════════════════════════════════════════════════════════════════
# READ-ONLY — NO POST / PUT / PATCH / DELETE TO THE CRM API. EVER.
# All operations are GET requests only (the one exception, the OAuth
# token refresh in crm_auth.py, hits Zoho's ACCOUNTS host, not the CRM
# API host, and is not a CRM write). See CLAUDE.md Rule 1.
# ══════════════════════════════════════════════════════════════════

Fetches only the fields this job's 8 checks (C1-C6, P1, P2) need. Field lists
are the confirmed API names from CLAUDE.md / live CRM checks, not guesses.

Pagination: per_page=200, cursor page_token pagination (Zoho CRM v2.1+), same
approach as functions/monitor-job/crm_fetch.py and pipeline-job/crm_extract.py.
"""

import requests
from crm_auth import auth_headers, API_BASE

# ── Field lists per module ──────────────────────────────────────────────────

# Training_Plans — same field list already confirmed live and in production
# use by monitor-job/crm_fetch.py; reused verbatim, not re-derived. Used by C1.
TRAINING_PLANS_FIELDS = ",".join([
    "id", "Name", "Start_Date", "End_Date", "Organised_By",
    "Activity_Type", "Status", "Target_Participants", "Created_Time",
])

# Solutions — used by C2-C6 for milestone math (Start_Date/End_Date) and by
# C1 to determine which Training Plans are still "unconfirmed" (no linked
# Solution). Training_Title_Plan is the lookup back to Training_Plans.
SOLUTIONS_FIELDS = ",".join([
    "id", "Solution_Title", "Organised_By", "Start_Date", "End_Date",
    "Training_Title_Plan",
])

# Deals — used by C4 (pending applicants) and P1/P2 (6-month due list).
# Includes the 4 dedicated "_6" Likert fields, which are the purpose-built
# 6-month-completed markers (CLAUDE.md Likert Scale fields) — NOT the larger
# free-text Impact Evaluation Survey block. Any one of these being non-null
# is this job's "6M eval completed" / P1-P2 stop-condition signal.
DEALS_FIELDS = ",".join([
    "id", "Deal_Name", "First_Name", "Last_Name", "Email", "Stage",
    "Graduate_Date", "Training_Applied", "Account_Name",
    "B_Strategy_Tactics_6", "C_Communication_Strategy_6",
    "D_Facilitating_Workshops_Meetings_6", "E_Building_Connections_6",
])


def fetch_module(module: str, fields: str, extra_params: dict = None) -> list:
    """
    Paginate through all records in a CRM module using REST GET.
    Returns list of all record dicts. Read-only — GET requests only.
    """
    all_records = []
    per_page = 200
    params = {"fields": fields, "per_page": per_page}
    if extra_params:
        params.update(extra_params)

    while True:
        resp = requests.get(
            f"{API_BASE}/{module}",
            headers=auth_headers(),
            params=params,
        )
        if resp.status_code == 204:
            break
        resp.raise_for_status()
        data = resp.json()
        records = data.get("data", [])
        all_records.extend(records)

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


def fetch_training_plans() -> list:
    """All Training Plans (C1)."""
    return fetch_module("Training_Plans", TRAINING_PLANS_FIELDS)


def fetch_solutions() -> list:
    """All Trainings/Solutions (C1 linkage check, C2-C6 milestone math)."""
    return fetch_module("Solutions", SOLUTIONS_FIELDS)


def fetch_deals() -> list:
    """All Deals (C4 pending-applicant check, P1/P2 6-month due list)."""
    return fetch_module("Deals", DEALS_FIELDS)
