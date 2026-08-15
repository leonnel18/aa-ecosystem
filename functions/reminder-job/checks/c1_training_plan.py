"""
checks/c1_training_plan.py — C1: Training Plan check-in (sent 1st of every month)

"Unconfirmed" = a Training Plan for the current year that has no linked
Solutions record yet (Solutions.Training_Title_Plan is the lookup back to
Training_Plans). Same linkage logic the old, retired
tools/reminder_logic.py::check_reminder1 used to detect this — reused here,
not re-derived from scratch.

Cadence: fires once per calendar month, gated on state["c1_last_sent_month"]
(a single "YYYY-MM" string — O(1), never grows). reminder.py only calls
due() on/after the 1st; due() itself re-checks the date so a late/retried
run on, say, the 3rd still fires if the month hasn't been sent yet.
"""

from datetime import date

from _dates import parse_date


def _plan_ref(val):
    """Solutions.Training_Title_Plan lookup -> the Training_Plans id it points to."""
    if isinstance(val, dict):
        return val.get("id") or val.get("name")
    return val


def due(training_plans: list, solutions: list, state: dict, today: date = None) -> dict:
    """
    Returns {country: [ {name, planned_month, status}, ... ]} for every
    country that has >=1 unconfirmed Training Plan for the current year, or
    {} if C1 isn't due today (already sent this month, or today isn't the 1st).
    """
    today = today or date.today()
    if today.day != 1:
        return {}

    month_key = today.strftime("%Y-%m")
    if state.get("c1_last_sent_month") == month_key:
        return {}

    linked_plan_ids = {
        pid for pid in (_plan_ref(s.get("Training_Title_Plan")) for s in solutions) if pid
    }

    by_country: dict[str, list] = {}
    for plan in training_plans:
        start = parse_date(plan.get("Start_Date"))
        if not start or start.year != today.year:
            continue
        if plan.get("id") in linked_plan_ids or plan.get("Name") in linked_plan_ids:
            continue
        country = plan.get("Organised_By", "")
        if not country:
            continue
        by_country.setdefault(country, []).append({
            "name": plan.get("Name", ""),
            "planned_month": start.strftime("%B"),
            "status": plan.get("Status") or "Unconfirmed",
        })

    return by_country
