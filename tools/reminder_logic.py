"""
reminder_logic.py — Pure reminder computation (no I/O)

All functions take plain dicts (as returned by crm_extract.fetch_module)
and return lists of reminder dicts. No CRM calls, no email sends here.
"""

from datetime import date


def _parse_date(val) -> date | None:
    """Parse ISO date string 'YYYY-MM-DD' to date. Returns None if missing."""
    if not val:
        return None
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(str(val)[:10])
    except (ValueError, TypeError):
        return None


def _deal_org(deal: dict) -> str:
    acc = deal.get("Account_Name")
    if isinstance(acc, dict):
        return acc.get("name", "")
    return str(acc or "")


def check_reminder1(training_plans: list, solutions: list, today: date = None) -> list:
    """
    Returns list of dicts for Training Plans whose start is exactly 60, 45, or 30 days away
    and that have no linked Solutions record.

    Each dict: { "plan": plan_dict, "days": int, "country": str }
    """
    today = today or date.today()
    # Training_Title_Plan is a lookup dict {"name": ..., "id": ...} from CRM
    def _plan_ref(val):
        if isinstance(val, dict):
            return val.get("id") or val.get("name")
        return val
    linked_plan_ids = {_plan_ref(s.get("Training_Title_Plan")) for s in solutions
                       if s.get("Training_Title_Plan")}
    results = []
    for plan in training_plans:
        start = _parse_date(plan.get("Start_Date"))
        if not start:
            continue
        days = (start - today).days
        if days not in (60, 45, 30):
            continue
        if plan.get("id") in linked_plan_ids or plan.get("Name") in linked_plan_ids:
            continue
        results.append({"plan": plan, "days": days, "country": plan.get("Organised_By", "")})
    return results


def check_reminder2(trainings: list, deals: list, today: date = None) -> list:
    """
    Returns list of dicts for Trainings whose application window has closed
    and that still have applicants in 'Still in Applied Stage'.

    Each dict: { "training": training_dict, "pending": [deal, ...], "country": str }
    """
    today = today or date.today()
    results = []
    for training in trainings:
        close = _parse_date(training.get("Application_Form_Close_Date"))
        if not close or close >= today:
            continue
        pending = [
            d for d in deals
            if (d.get("Training_Applied") or {}).get("id") == training["id"]
            and d.get("Stage") == "Still in Applied Stage"
        ]
        if not pending:
            continue
        results.append({"training": training, "pending": pending, "country": training.get("Organised_By", "")})
    return results


def check_reminder3(trainings: list, deals: list, today: date = None) -> list:
    """
    Returns list of dicts for Trainings that have ended and still have
    participants in 'Selected' stage (attendance not yet confirmed).

    Each dict: { "training": training_dict, "pending": [deal, ...], "country": str }
    """
    today = today or date.today()
    results = []
    for training in trainings:
        end = _parse_date(training.get("End_Date"))
        if not end or end >= today:
            continue
        pending = [
            d for d in deals
            if (d.get("Training_Applied") or {}).get("id") == training["id"]
            and d.get("Stage") == "Selected"
        ]
        if not pending:
            continue
        results.append({"training": training, "pending": pending, "country": training.get("Organised_By", "")})
    return results


def check_reminder4(trainings: list, deals: list, today: date = None) -> list:
    """
    Returns list of dicts for Trainings (Mondays only) where post-survey
    completion is below 90%.

    Each dict: {
        "training": training_dict, "incomplete": [deal, ...],
        "completed": int, "attended_total": int, "pct": int, "country": str
    }
    """
    today = today or date.today()
    if today.weekday() != 0:  # only Mondays
        return []
    results = []
    for training in trainings:
        end = _parse_date(training.get("End_Date"))
        if not end or end >= today:
            continue
        attended = [
            d for d in deals
            if (d.get("Training_Applied") or {}).get("id") == training["id"]
            and d.get("Stage") in ("Attended Training", "Graduated or Post Evaluation Completed")
        ]
        if not attended:
            continue
        completed  = [d for d in attended if d.get("Stage") == "Graduated or Post Evaluation Completed"]
        pct        = int(len(completed) / len(attended) * 100)
        if pct >= 90:
            continue
        incomplete = [d for d in attended if d.get("Stage") != "Graduated or Post Evaluation Completed"]
        results.append({
            "training":      training,
            "incomplete":    incomplete,
            "completed":     len(completed),
            "attended_total": len(attended),
            "pct":           pct,
            "country":       training.get("Organised_By", ""),
        })
    return results
