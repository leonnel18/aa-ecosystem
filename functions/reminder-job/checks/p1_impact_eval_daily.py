"""
checks/p1_impact_eval_daily.py — P1: 6-month post-evaluation (daily, until deadline)

Anchored to Deal.Graduate_Date (per Gino: Graduate_Date should be backfilled
to the Training's End_Date for graduated Deals where it's blank — see
tools/backfill_graduate_date.py; this check just reads Graduate_Date as-is
and does not itself write anything).

Window: six_month_mark = Graduate_Date + 6 months (calendar-safe, see
_dates.add_months). Deadline = six_month_mark + 7 days, per the docx
("complete it within one week of receiving this email, and no later than
{{Deadline_Date}}") — the deadline is anchored to the mark itself, not to
whenever the first email happened to send, so it's stable even if a run is
missed.

Fires daily for any Deal where today is in [six_month_mark, deadline], AND
the Deal hasn't completed its 6-month evaluation yet (see
_dates.six_month_completed — checks the 4 dedicated "_6" Likert fields).
Stops the instant those fields go non-null: no explicit "stop" state needed,
the completion check itself is the stop condition, re-evaluated fresh every
run straight from CRM data (matches the docx's build note: "Wire a stop
condition on form submission so participants don't receive seven emails in a
row after responding").

state["p_last_sent"] is used only to avoid a same-day double-send (e.g. a
retried run), not for cadence logic — the date-range test above is what
actually drives "daily until deadline".
"""

from datetime import date, timedelta

from _dates import parse_date, add_months, six_month_completed


def due(deals: list, state: dict, today: date = None) -> list:
    """Returns [{"deal": deal_dict, "deadline": date, "training_name": str}, ...]
    for Deals newly due for a P1 send today."""
    today = today or date.today()
    last_sent = state.get("p_last_sent", {})

    results = []
    for deal in deals:
        if deal.get("Stage") != "Graduated or Post Evaluation Completed":
            continue
        if six_month_completed(deal):
            continue
        if not deal.get("Email"):
            continue  # nothing to send to

        grad_date = parse_date(deal.get("Graduate_Date"))
        if not grad_date:
            continue  # not yet backfilled — see tools/backfill_graduate_date.py

        six_month_mark = add_months(grad_date, 6)
        deadline = six_month_mark + timedelta(days=7)

        if not (six_month_mark <= today <= deadline):
            continue

        did = deal.get("id")
        if last_sent.get(did) == today.isoformat():
            continue  # already sent today (e.g. retried run)

        results.append({
            "deal": deal,
            "deadline": deadline,
            "training_name": (deal.get("Training_Applied") or {}).get("name", ""),
        })

    return results


def prune_state(deals: list, p_last_sent: dict) -> dict:
    """Drop a Deal's entry from p_last_sent once it has completed its
    6-month evaluation — keeps this dict bounded (it would otherwise grow by
    one entry per graduated Deal forever). Shared by P1 and P2 since they
    both read/write the same state key."""
    completed_ids = {d.get("id") for d in deals if six_month_completed(d)}
    return {did: v for did, v in p_last_sent.items() if did not in completed_ids}
