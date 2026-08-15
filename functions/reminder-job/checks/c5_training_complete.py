"""
checks/c5_training_complete.py — C5: Training end date (Selected -> Graduated, post-eval, Drive upload)

Fires once per Training, the day after End_Date. Dedup via
state["c5_sent_training_ids"], pruned once well past End_Date (30-day grace
window so a delayed run still catches it, then dropped — bounded, never
grows forever).
"""

from datetime import date, timedelta

from _dates import parse_date

PRUNE_AFTER_DAYS = 30


def due(solutions: list, state: dict, today: date = None) -> list:
    """Returns [{"training": solution_dict}, ...] for Trainings newly due for C5 today."""
    today = today or date.today()
    already_sent = set(state.get("c5_sent_training_ids", []))

    results = []
    for solution in solutions:
        end = parse_date(solution.get("End_Date"))
        if not end or (today - end) != timedelta(days=1):
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
        end = parse_date(s.get("End_Date")) if s else None
        if end and (today - end).days <= PRUNE_AFTER_DAYS:
            kept.append(tid)
    return kept
