"""
transform.py — CRM raw data → per-portal report payloads

Reads .tmp/{module}_raw.json files produced by crm_extract.py.
Writes .tmp/{portal}_report_payload.json for each of 5 portals.

This module is stateless: same input always produces same output.
All business logic lives here — no logic in data_writer.py or portal JS.

Usage:
  python tools/transform.py
  python tools/transform.py --portal PH   # single portal debug
"""

import os
import re
import json
import argparse
from datetime import date, datetime, timedelta
from collections import defaultdict

TMP_DIR = os.path.join(os.path.dirname(__file__), "..", ".tmp")

# ── Portal → Organised_By mapping ──────────────────────────────────────────
PORTAL_TO_ORG = {
    "PH":       "Philippines",
    "PK":       "Pakistan",
    "KR":       "Korea",
    "ID":       "Indonesia",
    "backbone": "Regional",
}
ORG_TO_PORTAL = {v: k for k, v in PORTAL_TO_ORG.items()}
ALL_PORTALS = list(PORTAL_TO_ORG.keys())

# ── Stage constants (confirmed from CRM data 2026-03-18) ────────────────────
# CRM uses compound stage values, not the individual ones documented in claude.md
STAGE_SELECTED   = "Selected"
STAGE_ATTENDED   = "Attended Traning"          # NB: CRM typo — "Traning" not "Training"
STAGE_GRADUATED  = "Graduated or Post Evaluation Completed"
STAGES_ATTENDED  = {STAGE_ATTENDED, STAGE_GRADUATED}
STAGES_GRADUATED = {STAGE_GRADUATED}

# ── Likert field map ────────────────────────────────────────────────────────
# Each competency: (pre_field, post_field, 6m_field)
LIKERT_FIELDS = {
    "strategy_tactics": (
        "A_Pre_Training_Strategy_Buildings",
        "A_Post_Training_Strategy_Building",
        "B_Strategy_Tactics_6",
    ),
    "communication_strategy": (
        "B_Pre_Training_Building_Communication",
        "B_Post_Training_Building_Communication",
        "C_Communication_Strategy_6",
    ),
    "facilitating_workshop": (
        "C_Pre_Training_Confident_facilitator",
        "C_Post_Training_Confident_facilitator",
        "D_Facilitating_Workshops_Meetings_6",
    ),
    "building_connection": (
        "D_Pre_Training_Confident_connector",
        "D_Post_Training_Confident_connector",
        "E_Building_Connections_6",
    ),
}

# ── Post-survey qualitative field map ───────────────────────────────────────
POST_SURVEY_MAP = {
    "what_went_well":           "Best_aspect_of_the_workshop",
    "sum_up_learning":          "Sum_up_what_you_learned_at_our_training",
    "action_plan":              "Action_Plans_in_the_next_3_months",
    "improvement_suggestion":   "Improvement_Suggestion_for_next_time",
    "next_workshop_suggestion": "Suggestions_in_the_next_workshop",
    "testimonial":              "Willingness_to_provide_a_testimonial",
}

# ── 6M impact evaluation field map ──────────────────────────────────────────
IMPACT_6M_MAP = {
    "training_influence":  "How_has_the_training_impacted_your_campaigning",
    "used_training":       "Have_you_applied_the_training_to_run_more_effectiv",
    "new_job":             "I_ve_got_a_new_or_better_job_in_campaigning",
    "done_more_campaigning": "I_ve_done_more_campaigning",
    "raised_more_funds":   "I_ve_been_able_to_raise_more_funds_for_my_campaign",
    "more_supporters":     "I_ve_built_connections_to_support_my_campaign",
    "built_connections":   "I_ve_got_more_people_supporting_my_campaign",
    "achieved_objectives": "My_campaign_has_achieved_some_objectives_and_goals",
    "what_shared":         "What_you_shared_the_content_or_topics",
    "stayed_connected":    "I_ve_stayed_connected_with_campaigners",
    "trained_others":      "I_ve_trained_others_to_run_effective_campaigns",
    "shared_learnings":    "I_ve_shared_my_learnings_with_others",
    "reconnect_interest":  "Are_you_interested_in_reconnecting_with_AktivAsia",
    "know_someone":        "Know_someone_who_could_gain_from_our_training",
    "whats_alive":         "What_s_alive_in_your_campaign_work_now",
    "testimonial":         "Testimonial_for_us_on_how_the_training",
    "anything_else":       "Anything_else_you_d_like_to_share_or_ask",
    "need_support":        "Need_support_from_AktivAsia",
    "key_focus":           "Key_focus_for_our_national_local_trainings",
    "shared_with_how_many": "Shared_learnings_with_how_many_people",
}


# ── Helpers ─────────────────────────────────────────────────────────────────

def _load(module: str) -> list:
    path = os.path.join(TMP_DIR, f"{module.lower()}_raw.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing: {path} — run crm_extract.py first")
    with open(path) as f:
        return json.load(f)


def _parse_likert(value) -> int | None:
    """Extract leading integer from Zoho picklist value e.g. '4 - Agree' → 4."""
    if not value:
        return None
    m = re.match(r"^(\d+)", str(value).strip())
    return int(m.group(1)) if m else None


def _avg(values: list) -> float | None:
    nums = [v for v in values if v is not None]
    return round(sum(nums) / len(nums), 2) if nums else None


def _lookup_id(field_value) -> str | None:
    """Extract id from a Zoho lookup field value (dict with 'id' key)."""
    if isinstance(field_value, dict):
        return field_value.get("id")
    return None


def _year_from_date(date_str: str | None) -> int | None:
    if not date_str:
        return None
    try:
        return int(date_str[:4])
    except (ValueError, TypeError):
        return None


def _age_group(dob_str: str | None) -> str:
    if not dob_str:
        return "Unknown"
    try:
        dob = date.fromisoformat(dob_str)
        age = (date.today() - dob).days // 365
        if age < 18:
            return "<18"
        elif age <= 24:
            return "18-24"
        elif age <= 34:
            return "25-34"
        elif age <= 44:
            return "35-44"
        else:
            return "45+"
    except (ValueError, TypeError):
        return "Unknown"


def _has_6m_data(deal: dict) -> bool:
    """Return True if any 6M impact field is non-null."""
    return any(deal.get(f) for f in IMPACT_6M_MAP.values())


def _fiscal_bucket(date_str):
    """Return 'year_1', 'year_2', or 'archive' for a YYYY-MM-DD date string."""
    if not date_str:
        return "archive"
    try:
        d = date.fromisoformat(date_str[:10])
    except ValueError:
        return "archive"
    if date(2025, 9, 1) <= d <= date(2026, 8, 31):
        return "year_1"
    if date(2026, 9, 1) <= d <= date(2027, 8, 31):
        return "year_2"
    return "archive"


# ── Report builders ─────────────────────────────────────────────────────────

def build_report_1(deals: list, solutions: list, solutions_by_id: dict,
                   products_by_id: dict, deal_counts: dict, portal: str) -> dict:
    """Overview Training Report — funnel + YoY trend + community impact + training categories."""
    portal_deals = [d for d in deals if _deal_portal(d, solutions_by_id) == portal]

    by_year = defaultdict(lambda: {"applicants": 0, "graduates": 0})
    funnel = {"total_applicants": 0, "attended_training": 0, "graduated": 0, "impact_evaluation_completed": 0}
    total_ongoing = 0

    # Community impact: sum of Shared_learnings_with_how_many_people
    community_impact = 0
    # Touched organizations: unique Account_Name ids
    org_ids_seen = set()

    for deal in portal_deals:
        stage = deal.get("Stage", "")
        funnel["total_applicants"] += 1
        if stage == STAGE_SELECTED:
            total_ongoing += 1
        if stage in STAGES_ATTENDED:
            funnel["attended_training"] += 1
        if stage in STAGES_GRADUATED:
            funnel["graduated"] += 1
            if _has_6m_data(deal):
                funnel["impact_evaluation_completed"] += 1

        # Community impact
        shared = deal.get("Shared_learnings_with_how_many_people")
        if shared is not None:
            try:
                community_impact += int(shared)
            except (ValueError, TypeError):
                pass

        # Touched organizations
        acct = deal.get("Account_Name")
        acct_id = _lookup_id(acct)
        if acct_id:
            org_ids_seen.add(acct_id)

        # Use training End_Date/Start_Date/Created_Time for YoY grouping
        sol_id = _lookup_id(deal.get("Training_Applied"))
        sol = solutions_by_id.get(sol_id, {}) if sol_id else {}
        year_key = (sol.get("End_Date") or sol.get("Start_Date") or sol.get("Created_Time") or "")[:4]
        if not year_key:
            continue
        by_year[year_key]["applicants"] += 1
        if stage in STAGES_GRADUATED:
            by_year[year_key]["graduates"] += 1

    yoy_trend = [
        {"year": yr, "applicants": v["applicants"], "graduates": v["graduates"]}
        for yr, v in sorted(by_year.items())
    ]

    # Build training_categories
    today_str = date.today().isoformat()
    today_90 = (date.today() + timedelta(days=90)).isoformat()

    portal_solutions = [s for s in solutions
                        if ORG_TO_PORTAL.get(s.get("Organised_By", "")) == portal]

    completed_trainings = []
    ongoing_trainings = []
    upcoming_trainings = []

    for sol in portal_solutions:
        sol_id = sol.get("id")
        start = sol.get("Start_Date") or ""
        end = sol.get("End_Date") or ""
        type_id = _lookup_id(sol.get("Training_Type"))
        type_name = products_by_id.get(type_id, "Unknown") if type_id else "Unknown"
        dc = deal_counts.get(sol_id, {"applicants": 0, "graduates": 0})
        training_dict = {
            "name": sol.get("Solution_Title", ""),
            "type": type_name,
            "start_date": start,
            "end_date": end,
            "applicants": dc["applicants"],
            "graduates": dc["graduates"],
        }

        if end and end < today_str:
            # Completed: End_Date in past
            completed_trainings.append(training_dict)
        elif start and end and start <= today_str and end >= today_str:
            # Ongoing: Start_Date <= today AND End_Date >= today
            ongoing_trainings.append(training_dict)
        elif start and start > today_90:
            # Upcoming: Start_Date > today + 90 days
            upcoming_trainings.append(training_dict)

    # Sort completed desc by End_Date, take 3
    completed_trainings.sort(key=lambda x: x["end_date"] or "", reverse=True)
    completed_trainings = completed_trainings[:3]

    return {
        "total_applicants": funnel["total_applicants"],
        "total_graduates": funnel["graduated"],
        "total_ongoing": total_ongoing,
        "application_funnel": funnel,
        "yoy_trend": yoy_trend,
        "community_impact": community_impact,
        "touched_organizations": len(org_ids_seen),
        "training_categories": {
            "completed": completed_trainings,
            "ongoing": ongoing_trainings,
            "upcoming": upcoming_trainings,
        },
    }


def build_trainings_by_type_by_year(deals: list, solutions: list, solutions_by_id: dict,
                                    products_by_id: dict, portal: str) -> dict:
    """Returns dict: {year_str: [{type, conducted, total_planned}]}"""
    portal_solutions = [s for s in solutions
                        if ORG_TO_PORTAL.get(s.get("Organised_By", "")) == portal]
    today_str = date.today().isoformat()

    # {year: {type_name: {conducted, total_planned}}}
    by_year_type = defaultdict(lambda: defaultdict(lambda: {"conducted": 0, "total_planned": 0}))

    for sol in portal_solutions:
        start = sol.get("Start_Date") or ""
        year = start[:4] if len(start) >= 4 else None
        if not year:
            continue
        type_id = _lookup_id(sol.get("Training_Type"))
        type_name = products_by_id.get(type_id, "Unknown") if type_id else "Unknown"
        is_conducted = bool(start) and start <= today_str

        by_year_type[year][type_name]["total_planned"] += 1
        if is_conducted:
            by_year_type[year][type_name]["conducted"] += 1

    result = {}
    for year in sorted(by_year_type.keys()):
        result[year] = [
            {"type": t, "conducted": v["conducted"], "total_planned": v["total_planned"]}
            for t, v in sorted(by_year_type[year].items())
        ]
    return result


def _build_practice_sessions(forms: list, portal: str) -> dict:
    """Build practice_sessions payload for a portal from Forms records."""
    sessions = []
    for form in forms:
        owner = form.get("Owner") or {}
        email = (owner.get("email") or "").lower()
        form_portal = FORM_OWNER_TO_PORTAL.get(email)
        if form_portal != portal:
            continue
        created = form.get("Created_Time", "")
        date_str = created[:10] if created else ""  # YYYY-MM-DD from ISO timestamp
        sessions.append({
            "name": form.get("Name", ""),
            "date": date_str,
        })
    sessions.sort(key=lambda x: x["date"] or "", reverse=True)
    return {"total_sessions": len(sessions), "sessions": sessions}


# Practice session owner email -> portal key
FORM_OWNER_TO_PORTAL = {
    "pilipinas@aktivasia.org":  "PH",
    "pilipinas@aktivasaia.org": "PH",   # CRM typo variant
    "korea@aktivasia.org":      "KR",
    "indonesia@aktivasia.org":  "ID",
    "pakistan@aktivasia.org":   "PK",
    "regional@aktivasia.org":   "backbone",
}


def build_report_2(deals: list, solutions: list, solutions_by_id: dict,
                   products_by_id: dict, portal: str, forms: list = None,
                   training_plans: list = None) -> dict:
    """Training Plan Report — trainings by type, training list."""
    portal_solutions = [s for s in solutions
                        if ORG_TO_PORTAL.get(s.get("Organised_By", "")) == portal]

    portal_deals = [d for d in deals if _deal_portal(d, solutions_by_id) == portal]
    deal_counts = defaultdict(lambda: {"applicants": 0, "graduates": 0})
    for deal in portal_deals:
        sol_id = _lookup_id(deal.get("Training_Applied"))
        if sol_id:
            deal_counts[sol_id]["applicants"] += 1
            if deal.get("Stage") in STAGES_GRADUATED:
                deal_counts[sol_id]["graduates"] += 1

    # Demographics for portal deals
    by_gender_r2 = defaultdict(int)
    by_age_r2 = defaultdict(int)
    for deal in portal_deals:
        raw_gender = deal.get("Gender") or "Unknown"
        g_lower = raw_gender.lower()
        if "female" in g_lower:
            gender = "Female"
        elif "male" in g_lower:
            gender = "Male"
        else:
            gender = raw_gender
        by_gender_r2[gender] += 1
        by_age_r2[_age_group(deal.get("Date_of_Birth"))] += 1

    # Build solution lookup: sol_id -> (title, year, training_type)
    sol_info = {}
    for sol in portal_solutions:
        yr = (sol.get("End_Date") or sol.get("Start_Date") or "")[:4]
        type_id = _lookup_id(sol.get("Training_Type"))
        type_name = products_by_id.get(type_id, "") if type_id else ""
        sol_info[sol.get("id")] = {"title": sol.get("Solution_Title", ""), "year": yr, "training_type": type_name}

    org_map = {}
    unattributed_applicants = 0
    unattributed_impact = 0
    for deal in portal_deals:
        acct = deal.get("Account_Name")
        if not isinstance(acct, dict) or not acct.get("name", ""):
            unattributed_applicants += 1
            shared = deal.get("Shared_learnings_with_how_many_people")
            if shared is not None:
                try:
                    unattributed_impact += int(shared)
                except (ValueError, TypeError):
                    pass
            continue
        name = acct.get("name", "")
        if not name:
            continue
            
        # Parse shared learnings
        shared = deal.get("Shared_learnings_with_how_many_people")
        impact_val = 0
        if shared is not None:
            try:
                impact_val = int(shared)
            except (ValueError, TypeError):
                pass

        sol_id = _lookup_id(deal.get("Training_Applied"))
        info = sol_info.get(sol_id, {})
        title = info.get("title", "")
        year = info.get("year", "")
        training_type = info.get("training_type", "")
        is_graduated = deal.get("Stage") == "Graduated or Post Evaluation Completed"

        key = (name, title, year)
        if key not in org_map:
            org_map[key] = {
                "name": name,
                "training": title,
                "training_type": training_type,
                "year": year,
                "total_impact": 0,
                "applicant_count": 0,
                "graduate_count": 0
            }

        org_map[key]["total_impact"] += impact_val
        org_map[key]["applicant_count"] += 1
        if is_graduated:
            org_map[key]["graduate_count"] += 1

    org_list = list(org_map.values())
    organizations = sorted(org_list, key=lambda x: (x["name"], x["year"]))

    # Trainings by type
    type_counts = defaultdict(lambda: {"conducted": 0, "total_planned": 0})
    actual_trainings = []
    today = date.today().isoformat()

    for sol in portal_solutions:
        type_lookup = sol.get("Training_Type")
        type_id = _lookup_id(type_lookup)
        type_name = products_by_id.get(type_id, "Unknown") if type_id else "Unknown"
        start = sol.get("Start_Date", "")
        end = sol.get("End_Date", "")
        is_completed = bool(start) and start <= today

        type_counts[type_name]["total_planned"] += 1
        if is_completed:
            type_counts[type_name]["conducted"] += 1

        sol_id = sol.get("id")
        actual_trainings.append({
            "id":         sol_id,
            "name":       sol.get("Solution_Title", ""),
            "type":       type_name,
            "date":       start,
            "end_date":   end,
            "applicants": deal_counts[sol_id]["applicants"],
            "graduates":  deal_counts[sol_id]["graduates"],
            "status":     "Completed" if is_completed else "Upcoming",
            # Training Automation form links + date windows
            "pre_app_link":    sol.get("Application_Form") or "",
            "post_app_link":   sol.get("Evaluation_Form") or "",
            "app_open_date":   sol.get("Application_Form_Open_Date") or "",
            "app_close_date":  sol.get("Application_Form_Close_Date") or "",
            "post_open_date":  sol.get("Post_Survey_Open_Date") or "",
            "post_close_date": sol.get("Post_Survey_Close_Date") or "",
        })

    trainings_by_type = [
        {"type": t, "conducted": v["conducted"], "total_planned": v["total_planned"]}
        for t, v in sorted(type_counts.items())
    ]

    trainings_by_type_by_year = build_trainings_by_type_by_year(
        deals, solutions, solutions_by_id, products_by_id, portal
    )

    # Training Plans filtered by portal
    portal_plans = [p for p in (training_plans or []) if ORG_TO_PORTAL.get(p.get("Organised_By", "")) == portal]
    plans_list = [{
        "name": p.get("Name", ""),
        "type": p.get("Activity_Type", ""),
        "start_date": p.get("Start_Date") or "",
        "end_date": p.get("End_Date") or "",
        "status": p.get("Status") or "",
        "organised_by": p.get("Organised_By", ""),
    } for p in portal_plans]

    # Completed vs planned by year
    today_iso = date.today().isoformat()
    cpby = {}
    for yr in ["2024", "2025", "2026"]:
        yr_plans = [p for p in portal_plans if (p.get("Start_Date") or "")[:4] == yr]
        yr_actual = [s for s in portal_solutions if (s.get("Start_Date") or "")[:4] == yr and (s.get("Start_Date") or "") <= today_iso]
        cpby[yr] = {"planned": len(yr_plans), "conducted": len(yr_actual)}

    return {
        "trainings_by_type": trainings_by_type,
        "trainings_by_type_by_year": trainings_by_type_by_year,
        "practice_sessions": _build_practice_sessions(forms or [], portal),
        "training_plans": plans_list,
        "completed_vs_planned_by_year": cpby,
        "actual_trainings": sorted(actual_trainings, key=lambda x: x["date"] or "", reverse=True),
        "organizations": organizations,
        "unattributed_applicants": unattributed_applicants,
        "unattributed_impact": unattributed_impact,
        "demographics": {
            "by_gender": dict(by_gender_r2),
            "by_age_group": dict(by_age_r2),
        },
    }


def build_training_plan_summary(portal_solutions, actual_trainings):
    """
    Build training_plan_summary keyed by fiscal bucket (year_1, year_2, archive).
    Matches plans (Solutions) to actuals by Solution id.
    Plans that have a matching actual → paired row.
    Plans with no actual → plan-only row (Upcoming/Ongoing).
    Actuals not matched to any plan → actual-only row (Completed, unplanned).
    """
    today = date.today().isoformat()

    # Index actuals by solution id for O(1) lookup
    actuals_by_id = {a["id"]: a for a in actual_trainings}
    matched_actual_ids = set()

    buckets = {
        "year_1":  {"target_activities": 0, "actual_activities": 0,
                    "target_participants": 0, "actual_participants": 0, "rows": []},
        "year_2":  {"target_activities": 0, "actual_activities": 0,
                    "target_participants": 0, "actual_participants": 0, "rows": []},
        "archive": {"target_activities": 0, "actual_activities": 0,
                    "target_participants": 0, "actual_participants": 0, "rows": []},
    }

    for sol in portal_solutions:
        sol_id = sol.get("id", "")
        plan_date = sol.get("Start_Date") or ""
        plan_end  = sol.get("End_Date") or ""
        bucket    = _fiscal_bucket(plan_date)
        b         = buckets[bucket]

        target_p  = sol.get("Target_Participants") or 0
        plan_title = sol.get("Solution_Title") or ""

        b["target_activities"] += 1
        b["target_participants"] += int(target_p) if target_p else 0

        actual = actuals_by_id.get(sol_id)
        if actual:
            matched_actual_ids.add(sol_id)
            b["actual_activities"] += 1
            b["actual_participants"] += actual.get("graduates") or 0
            b["rows"].append({
                "plan_title":          plan_title,
                "plan_date":           plan_date,
                "plan_end_date":       plan_end,
                "target_participants": int(target_p) if target_p else None,
                "actual_title":        actual.get("name"),
                "actual_date":         actual.get("date"),
                "actual_end_date":     actual.get("end_date"),
                "actual_participants": actual.get("graduates"),
                "status":              actual.get("status", "Completed"),
            })
        else:
            if plan_end and plan_end < today:
                status = "Missed"
            elif plan_date and plan_date <= today:
                status = "Ongoing"
            else:
                status = "Upcoming"
            b["rows"].append({
                "plan_title":          plan_title,
                "plan_date":           plan_date,
                "plan_end_date":       plan_end,
                "target_participants": int(target_p) if target_p else None,
                "actual_title":        None,
                "actual_date":         None,
                "actual_end_date":     None,
                "actual_participants": None,
                "status":              status,
            })

    # Unmatched actuals (no plan in CRM) → actual-only rows
    for actual in actual_trainings:
        if actual["id"] in matched_actual_ids:
            continue
        actual_date = actual.get("date") or ""
        bucket = _fiscal_bucket(actual_date)
        b = buckets[bucket]
        b["actual_activities"] += 1
        b["actual_participants"] += actual.get("graduates") or 0
        b["rows"].append({
            "plan_title":          None,
            "plan_date":           None,
            "plan_end_date":       None,
            "target_participants": None,
            "actual_title":        actual.get("name"),
            "actual_date":         actual_date,
            "actual_end_date":     actual.get("end_date"),
            "actual_participants": actual.get("graduates"),
            "status":              actual.get("status", "Completed"),
        })

    # Sort rows: completed first (by actual_date desc), then upcoming/ongoing (by plan_date asc)
    def _sort_key(row):
        is_done = row["status"] == "Completed"
        d = row["actual_date"] or row["plan_date"] or ""
        return (0 if is_done else 1, d if is_done else "", "" if is_done else d)

    for b in buckets.values():
        b["rows"].sort(key=_sort_key)

    return buckets


def build_report_3(deals: list, solutions_by_id: dict, portal: str) -> dict:
    """Training Impact Qualitative — Likert averages + feedback per training."""
    portal_deals = [d for d in deals if _deal_portal(d, solutions_by_id) == portal]

    # Group deals by training
    by_training = defaultdict(list)
    for deal in portal_deals:
        sol_id = _lookup_id(deal.get("Training_Applied"))
        sol = solutions_by_id.get(sol_id, {})
        title = sol.get("Solution_Title", "Unknown Training")
        by_training[title].append(deal)

    likert_by_training = []
    post_survey_feedback = []
    impact_evaluation_feedback = []

    for title, training_deals in sorted(by_training.items()):
        # Likert averages
        likert = {}
        for competency, (pre_f, post_f, sixm_f) in LIKERT_FIELDS.items():
            pre_vals  = [_parse_likert(d.get(pre_f))  for d in training_deals]
            post_vals = [_parse_likert(d.get(post_f)) for d in training_deals]
            sixm_vals = [_parse_likert(d.get(sixm_f)) for d in training_deals]
            likert[competency] = {
                "pre":  _avg(pre_vals),
                "post": _avg(post_vals),
                "6m":   _avg(sixm_vals),
            }
        likert_by_training.append({"training_name": title, "likert": likert})

        # Post survey responses (non-null entries only)
        post_responses = []
        for deal in training_deals:
            row = {k: deal.get(v) for k, v in POST_SURVEY_MAP.items()}
            row["applicant_name"] = deal.get("Deal_Name", "")
            if any(v for k, v in row.items() if k != "applicant_name"):
                post_responses.append(row)
        if post_responses:
            post_survey_feedback.append({"training_name": title, "responses": post_responses})

        # 6M impact responses
        impact_responses = []
        for deal in training_deals:
            row = {k: deal.get(v) for k, v in IMPACT_6M_MAP.items()}
            row["applicant_name"] = deal.get("Deal_Name", "")
            if any(v for k, v in row.items() if k != "applicant_name"):
                impact_responses.append(row)
        if impact_responses:
            impact_evaluation_feedback.append({"training_name": title, "responses": impact_responses})

    # Build flat testimonials list
    testimonials = []
    for grp in post_survey_feedback:
        for resp in grp["responses"]:
            t = resp.get("testimonial")
            if t:
                testimonials.append({
                    "applicant_name": resp.get("applicant_name", ""),
                    "training_name": grp["training_name"],
                    "testimonial": t,
                    "source": "Post-survey",
                })
    for grp in impact_evaluation_feedback:
        for resp in grp["responses"]:
            t = resp.get("testimonial")
            if t:
                testimonials.append({
                    "applicant_name": resp.get("applicant_name", ""),
                    "training_name": grp["training_name"],
                    "testimonial": t,
                    "source": "6-Month",
                })

    return {
        "likert_by_training": likert_by_training,
        "post_survey_feedback": post_survey_feedback,
        "impact_evaluation_feedback": impact_evaluation_feedback,
        "testimonials": testimonials,
    }


def build_report_4(deals: list, solutions_by_id: dict, portal: str) -> dict:
    """Training Impact Quantitative — demographics."""
    portal_deals = [d for d in deals if _deal_portal(d, solutions_by_id) == portal]

    by_gender = defaultdict(int)
    by_age    = defaultdict(int)
    by_region = defaultdict(int)

    for deal in portal_deals:
        raw_gender = deal.get("Gender") or "Unknown"
        # Normalize gender: check "female" before "male" to avoid false match
        g_lower = raw_gender.lower()
        if "female" in g_lower:
            gender = "Female"
        elif "male" in g_lower:
            gender = "Male"
        else:
            gender = raw_gender
        by_gender[gender] += 1
        by_age[_age_group(deal.get("Date_of_Birth"))] += 1
        by_region[deal.get("City_Province") or "Unknown"] += 1

    return {
        "demographics": {
            "by_gender":    dict(by_gender),
            "by_age_group": dict(by_age),
            "by_region":    dict(by_region),
        }
    }


def _deal_portal(deal: dict, solutions_by_id: dict) -> str | None:
    """Resolve which portal a Deal belongs to via Training_Applied → Solutions.Organised_By."""
    sol_id = _lookup_id(deal.get("Training_Applied"))
    if not sol_id:
        return None
    sol = solutions_by_id.get(sol_id, {})
    org_by = sol.get("Organised_By", "")
    return ORG_TO_PORTAL.get(org_by)


# ── Main transform ───────────────────────────────────────────────────────────

def transform(portals: list = None) -> dict:
    """
    Load raw data from .tmp/, build report payloads for requested portals.
    Returns dict of {portal: payload}.
    """
    targets = portals or ALL_PORTALS

    deals    = _load("deals")
    solutions = _load("solutions")
    products  = _load("products")
    accounts  = _load("accounts")

    # Forms module — optional, use empty list if not yet extracted
    try:
        forms = _load("forms")
    except FileNotFoundError:
        forms = []

    # Training_Plans module — optional, use empty list if not yet extracted
    try:
        training_plans_raw = _load("training_plans")
    except FileNotFoundError:
        training_plans_raw = []

    solutions_by_id = {s["id"]: s for s in solutions}
    products_by_id  = {p["id"]: p.get("Product_Name", "") for p in products}

    results = {}
    for portal in targets:
        print(f"  Transforming {portal}...", end="", flush=True)

        # Build deal_counts per solution for reuse in report_1
        portal_deals_for_counts = [d for d in deals if _deal_portal(d, solutions_by_id) == portal]
        deal_counts = defaultdict(lambda: {"applicants": 0, "graduates": 0})
        for deal in portal_deals_for_counts:
            sol_id = _lookup_id(deal.get("Training_Applied"))
            if sol_id:
                deal_counts[sol_id]["applicants"] += 1
                if deal.get("Stage") in STAGES_GRADUATED:
                    deal_counts[sol_id]["graduates"] += 1

        # Same filter as inside build_report_2 — must stay in sync if filter logic changes
        portal_solutions = [s for s in solutions
                            if ORG_TO_PORTAL.get(s.get("Organised_By", "")) == portal]

        r2 = build_report_2(deals, solutions, solutions_by_id, products_by_id, portal, forms, training_plans_raw)

        payload = {
            "portal": portal,
            "report_1_overview": build_report_1(
                deals, solutions, solutions_by_id, products_by_id, deal_counts, portal
            ),
            "report_2_training_plan":      r2,
            "report_3_impact_qualitative": build_report_3(deals, solutions_by_id, portal),
            "report_4_impact_quantitative": build_report_4(deals, solutions_by_id, portal),
            "training_plan_summary": build_training_plan_summary(
                portal_solutions,
                r2["actual_trainings"],
            ),
        }

        # backbone also gets per-country aggregate
        if portal == "backbone":
            per_country = {}
            for country_portal in ["PK", "PH", "KR", "ID"]:
                per_country[country_portal] = {
                    "total_applicants": results.get(country_portal, {})
                        .get("report_1_overview", {}).get("total_applicants", 0),
                    "total_graduates": results.get(country_portal, {})
                        .get("report_1_overview", {}).get("total_graduates", 0),
                }
            payload["aggregate"] = {
                "total_applicants": sum(v["total_applicants"] for v in per_country.values()),
                "total_graduates":  sum(v["total_graduates"]  for v in per_country.values()),
            }
            payload["per_country"] = per_country

        out_path = os.path.join(TMP_DIR, f"{portal}_report_payload.json")
        with open(out_path, "w") as f:
            json.dump(payload, f, indent=2)
        r1 = payload["report_1_overview"]
        print(f" applicants={r1['total_applicants']} graduates={r1['total_graduates']}"
              f" community_impact={r1['community_impact']} orgs={r1['touched_organizations']}")
        results[portal] = payload

    return results


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Transform CRM raw data to report payloads")
    parser.add_argument("--portal", help="Transform single portal (debug): PK|PH|KR|ID|backbone")
    args = parser.parse_args()

    print("=" * 55)
    print("  transform.py - build report payloads")
    print("=" * 55)

    portals = [args.portal] if args.portal else None
    results = transform(portals)

    print("\nSummary:")
    for portal, payload in results.items():
        out = os.path.join(".tmp", f"{portal}_report_payload.json")
        r1 = payload["report_1_overview"]
        print(f"  {portal:10s}  applicants={r1['total_applicants']:4d}  graduates={r1['total_graduates']:4d}  -> {out}")
    print("\n[DONE] Report payloads written to .tmp/")


if __name__ == "__main__":
    main()
