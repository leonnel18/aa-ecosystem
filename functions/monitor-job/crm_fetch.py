"""
crm_fetch.py — Zoho CRM Data Fetcher (monitor-job)

# ══════════════════════════════════════════════════════════════════
# READ-ONLY — NO POST / PUT / PATCH / DELETE TO THE CRM API. EVER.
# All operations are GET requests only (the one exception, the OAuth
# token refresh in crm_auth.py, hits Zoho's ACCOUNTS host, not the CRM
# API host, and is not a CRM write).
# ══════════════════════════════════════════════════════════════════

Fetches only the fields this job needs per module. Field lists are the
confirmed API names from CLAUDE.md / live CRM checks made during planning,
not guesses (see docs/superpowers/specs or the monitor-job plan for how each
was confirmed).

Pagination: per_page=200, cursor page_token pagination (Zoho CRM v2.1+),
same approach as functions/pipeline-job/crm_extract.py.
"""

import requests
from crm_auth import auth_headers, API_BASE

# ── Field lists per module — minimal, only what this job's checks need ─────

DEALS_NEW_RECORD_FIELDS = ",".join([
    "id", "Deal_Name", "Stage", "Created_Time", "Training_Applied",
])

DEALS_GRADUATE_CHECK_FIELDS = ",".join([
    "id", "Deal_Name", "Stage", "Graduate_Date", "Training_Applied", "Modified_Time",
])

SOLUTIONS_FIELDS = ",".join([
    "id", "Solution_Title", "Organised_By", "Start_Date", "End_Date", "Created_Time",
])

# Training_Plans field list reused verbatim from pipeline-job/crm_extract.py —
# already confirmed and in production use; do not re-derive.
TRAINING_PLANS_FIELDS = ",".join([
    "id", "Name", "Start_Date", "End_Date", "Organised_By",
    "Activity_Type", "Status", "Target_Participants", "Created_Time",
])

CONTACTS_FIELDS = ",".join(["id", "Full_Name", "Email", "Created_Time"])

# Forms = "Practice Sessions" (custom module, confirmed live 2026-08-09)
FORMS_FIELDS = ",".join([
    "id", "Name", "Venue_Name", "Session_Start_Date", "Session_End_Date",
    "Expected_number_of_participants", "Created_Time",
])

# Skill_Session_Participant = "Session Participants" (custom module, confirmed live 2026-08-09)
SESSION_PARTICIPANT_FIELDS = ",".join([
    "id", "Name", "First_Name", "last_Name", "Contact_Name",
    "Skill_Practice_Session_Applied", "Created_Time",
])

# Funders (custom module, confirmed live 2026-08-09 — addressed directly as
# "Funders", NOT "CustomModule10")
FUNDERS_FIELDS = ",".join([
    "id", "Name", "Funder_Organization_Name", "Organisation_Name",
    "Amount_Requested_USD", "Closing_Date", "Created_Time",
])

MODULE_CONFIG = {
    "Solutions":                SOLUTIONS_FIELDS,
    "Training_Plans":           TRAINING_PLANS_FIELDS,
    "Contacts":                 CONTACTS_FIELDS,
    "Forms":                    FORMS_FIELDS,
    "Skill_Session_Participant": SESSION_PARTICIPANT_FIELDS,
    "Funders":                  FUNDERS_FIELDS,
    # Deals is fetched separately per-check (different field needs) via
    # fetch_deals_for_new_records() / fetch_deals_for_graduate_check().
}


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


def fetch_deals_for_new_records() -> list:
    """All Deals, minimal fields, for the new-records diff (item 1)."""
    return fetch_module("Deals", DEALS_NEW_RECORD_FIELDS)


def fetch_deals_for_graduate_check() -> list:
    """
    Only Deals in the graduated stage — this is the correct, confirmed scope
    for both the graduate-date mismatch check (item 3) and the 6-month due
    list (item 4). Narrower than a full Deals sweep.
    """
    return fetch_module(
        "Deals", DEALS_GRADUATE_CHECK_FIELDS,
        extra_params={"criteria": '(Stage:equals:Graduated or Post Evaluation Completed)'},
    )


def fetch_deals_for_email_check(solution_ids: set) -> list:
    """
    Deals linked to a bounded set of Solutions (the 30-day recent-training
    window, computed by the caller) — the scoped population for the email
    activity check (item 2). Avoids sweeping all Deals.
    """
    if not solution_ids:
        return []
    all_deals = fetch_module("Deals", "id,Deal_Name,Stage,Training_Applied")
    return [
        d for d in all_deals
        if (d.get("Training_Applied") or {}).get("id") in solution_ids
    ]


def fetch_deal_emails(deal_id: str) -> list:
    """
    GET the Emails related list for a single Deal.
    Read-only related-list fetch — no bulk endpoint exists for this, so it
    must be called per-Deal (hence why item 2 is scoped to a bounded set of
    Deals rather than swept across all of them).
    Returns [] if the Deal has no emails.
    """
    resp = requests.get(
        f"{API_BASE}/Deals/{deal_id}/Emails",
        headers=auth_headers(),
    )
    if resp.status_code == 204:
        return []
    resp.raise_for_status()
    return resp.json().get("data", [])


def fetch_all_snapshot_modules() -> dict:
    """
    Fetch the 6 non-Deals modules used by the new-records check (item 1).
    Deals is fetched separately since different checks need different fields.
    Returns {module: [records]}.
    """
    return {module: fetch_module(module, fields) for module, fields in MODULE_CONFIG.items()}
