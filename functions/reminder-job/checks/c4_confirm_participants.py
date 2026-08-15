"""
checks/c4_confirm_participants.py — C4: Participant confirmation (5-1 days before training)

Per the docx's build note ("Consider sending once at day 5, then only
re-sending if applicants remain in the Applied stage, rather than daily for
all five days"): fires on any day in [Start_Date - 5d, Start_Date - 1d]
*only if* >=1 linked Deal is still "Still in Applied Stage" — so a country
team that clears its list on day 5 gets no further nagging on days 4-1.

Dedup is per-day (state["c4_last_sent"][training_id] = last date sent), not
per-Training-forever, since this one is allowed to re-fire within the window
as long as the pending condition still holds — but never more than once per
calendar day for the same Training.
"""

from datetime import date, timedelta

from _dates import parse_date


def due(solutions: list, deals: list, state: dict, today: date = None) -> list:
    """Returns [{"training": solution_dict, "pending": [deal, ...]}, ...]."""
    today = today or date.today()
    last_sent = state.get("c4_last_sent", {})

    deals_by_training: dict[str, list] = {}
    for d in deals:
        tid = (d.get("Training_Applied") or {}).get("id")
        if tid:
            deals_by_training.setdefault(tid, []).append(d)

    results = []
    for solution in solutions:
        start = parse_date(solution.get("Start_Date"))
        if not start:
            continue
        days_out = (start - today).days
        if not (1 <= days_out <= 5):
            continue

        tid = solution.get("id")
        if last_sent.get(tid) == today.isoformat():
            continue  # already sent today for this Training

        pending = [
            d for d in deals_by_training.get(tid, [])
            if d.get("Stage") == "Still in Applied Stage"
        ]
        if not pending:
            continue

        results.append({"training": solution, "pending": pending})

    return results


def prune_state(solutions: list, last_sent: dict, today: date = None) -> dict:
    """Drop entries for Trainings whose Start_Date has already passed —
    keeps c4_last_sent bounded (same discipline as C2/C3's list pruning)."""
    today = today or date.today()
    by_id = {s.get("id"): s for s in solutions}
    kept = {}
    for tid, sent_date in last_sent.items():
        s = by_id.get(tid)
        start = parse_date(s.get("Start_Date")) if s else None
        if start and start >= today:
            kept[tid] = sent_date
    return kept
