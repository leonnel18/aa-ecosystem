"""
checks/p2_impact_eval_overdue.py — P2: 6-month post-evaluation, overdue (weekly)

Same population and same stop condition as P1 (checks/p1_impact_eval_daily.py
— see that module's docstring for the six_month_mark/deadline math and the
"_6" field completion check), but fires for Deals PAST the deadline instead
of before it, and weekly instead of daily.

Weekly cadence anchored to the deadline itself (deadline, deadline+7,
deadline+14, ...) rather than to whenever the first P2 happened to send —
same "state-relative, gap-proof" reasoning CLAUDE.md documents for
monitor-job's six_month_due check: a missed run of any length still catches
every Deal on its next correct weekly boundary, no double-sends.

That gap-proofing cuts both ways, though, so the cadence is also BOUNDED:
see MAX_DAYS_PAST_DEADLINE below. Deals whose deadline passed long ago —
including every graduate who passed their 6-month mark before this job
existed — are deliberately left alone rather than swept into a first-run
backlog blast.
"""

from datetime import date, timedelta

from _dates import parse_date, add_months, six_month_completed

# Upper bound on how long after the deadline P2 keeps nudging. Without one,
# "weekly until they respond" means weekly FOREVER for anyone who never
# responds -- and, worse, the first run of this job would have swept up every
# graduate whose deadline had already quietly passed while the job didn't
# exist yet.
#
# Measured against production on 2026-08-21, before this cap existed: 81
# Deals were due for P2 on day one, with deadlines 182-287 days past. None of
# them had ever received a P1, because nothing had ever run -- so their first
# ever contact would have been an overdue notice for a deadline they were
# never told about, repeating weekly with no end.
#
# 56 days = 8 weekly nudges after the deadline, then silence. Anyone whose
# deadline is older than that is treated as historical and left alone; a
# fresh graduate still gets the full P1 window plus 8 P2 reminders.
MAX_DAYS_PAST_DEADLINE = 56


def due(deals: list, state: dict, today: date = None) -> list:
    """Returns [{"deal": deal_dict, "deadline": date, "training_name": str}, ...]
    for Deals newly due for a P2 send today."""
    today = today or date.today()
    last_sent = state.get("p_last_sent", {})

    results = []
    for deal in deals:
        if deal.get("Stage") != "Graduated or Post Evaluation Completed":
            continue
        if six_month_completed(deal):
            continue
        if not deal.get("Email"):
            continue

        grad_date = parse_date(deal.get("Graduate_Date"))
        if not grad_date:
            continue

        six_month_mark = add_months(grad_date, 6)
        deadline = six_month_mark + timedelta(days=7)

        if today <= deadline:
            continue  # still within P1's window, or not due yet

        days_past_deadline = (today - deadline).days
        if days_past_deadline > MAX_DAYS_PAST_DEADLINE:
            continue  # historical backlog -- see MAX_DAYS_PAST_DEADLINE
        if days_past_deadline % 7 != 0:
            continue  # not a weekly boundary

        did = deal.get("id")
        if last_sent.get(did) == today.isoformat():
            continue  # already sent today (e.g. retried run)

        results.append({
            "deal": deal,
            "deadline": deadline,
            "training_name": (deal.get("Training_Applied") or {}).get("name", ""),
        })

    return results
