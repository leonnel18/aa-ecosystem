"""
checks/c2_applications_open.py — C2: Pre-training reminder (applications open early)

Fires once per Training when today falls 8 or 7 weeks before Start_Date
(a 14-day band: [Start_Date - 8wk, Start_Date - 7wk + 6d]), per the docx's
recommended Training Cycle timeline. Dedup via state["c2_sent_training_ids"].

State pruning: a Training's id is dropped from c2_sent_training_ids once its
Start_Date has passed — it can never re-enter the 8-7-week band again, so
keeping it around forever would only grow the list unboundedly for no
correctness benefit (same discipline as monitor-job's watermark pruning).
"""

from datetime import date, timedelta

from _dates import parse_date


def due(solutions: list, state: dict, today: date = None) -> list:
    """Returns [{"training": solution_dict}, ...] for Trainings newly due for C2 today."""
    today = today or date.today()
    already_sent = set(state.get("c2_sent_training_ids", []))

    results = []
    for solution in solutions:
        start = parse_date(solution.get("Start_Date"))
        if not start:
            continue
        band_start = start - timedelta(weeks=8)
        band_end = start - timedelta(weeks=7) + timedelta(days=6)
        if not (band_start <= today <= band_end):
            continue
        if solution.get("id") in already_sent:
            continue
        results.append({"training": solution})

    return results


def prune_state_ids(solutions: list, sent_ids: list, today: date = None) -> list:
    """Drop ids for Trainings whose Start_Date has already passed — keeps
    c2_sent_training_ids bounded (see module docstring)."""
    today = today or date.today()
    by_id = {s.get("id"): s for s in solutions}
    kept = []
    for tid in sent_ids:
        s = by_id.get(tid)
        start = parse_date(s.get("Start_Date")) if s else None
        if start and start >= today:
            kept.append(tid)
    return kept
