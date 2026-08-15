"""
checks/c3_seven_day.py — C3: 7-day pre-training reminder

Fires once per Training when Start_Date is exactly 7 days out. Dedup via
state["c3_sent_training_ids"], pruned the same way as C2 (see
c2_applications_open.py's prune_state_ids for the shared reasoning).
"""

from datetime import date, timedelta

from _dates import parse_date


def due(solutions: list, state: dict, today: date = None) -> list:
    """Returns [{"training": solution_dict}, ...] for Trainings newly due for C3 today."""
    today = today or date.today()
    already_sent = set(state.get("c3_sent_training_ids", []))

    results = []
    for solution in solutions:
        start = parse_date(solution.get("Start_Date"))
        if not start or (start - today) != timedelta(days=7):
            continue
        if solution.get("id") in already_sent:
            continue
        results.append({"training": solution})

    return results


def prune_state_ids(solutions: list, sent_ids: list, today: date = None) -> list:
    today = today or date.today()
    by_id = {s.get("id"): s for s in solutions}
    kept = []
    for tid in sent_ids:
        s = by_id.get(tid)
        start = parse_date(s.get("Start_Date")) if s else None
        if start and start >= today:
            kept.append(tid)
    return kept
