"""
checks/six_month_due.py — Item (4): 6-month evaluation due list

Report-only: no CRM write, no Zoho Tags API call (confirmed with Gino — keeps
this job fully read-only despite the original ask being to "tag" people).
The "Due for 6-Month Evaluation" list appears in the daily email body only.

Scope: same as graduate_mismatch.py — Deals where
Stage == "Graduated or Post Evaluation Completed" (confirmed correct scope
with Gino).

Windowing: flags a Deal when Graduate_Date + 6 months falls within
(last_run_date, today] — i.e. relative to the last successful run, not a
fixed lookback band. This is gap-proof by construction: if the job doesn't
run for N days, the next run's window is (last_run_date, today], which still
covers everyone whose 6-month mark passed during the gap, with no arbitrary
window width and no double-reporting.

State (fixed 2026-08-10): an earlier version additionally kept a permanent
state["six_month_already_flagged"] ID set as a "belt and braces" safety net.
That set only ever grows (every graduated Deal with a Graduate_Date gets
added, forever), which is exactly the unbounded-full-ID-list shape that blew
Catalyst Data Store's ~10,000-char column limit for graduate_mismatch.py's
equivalent set (see progress.md 2026-08-10). Removed it: the date-range
check above (last_run_date < six_month_mark <= today) is already sufficient
on its own to prevent double-reporting — once a mark has passed the "<= today"
test in one run, last_run_date only ever advances forward, so that same mark
can never fall inside a later run's window again. The extra set added no
correctness the date-range logic didn't already provide, only unbounded
growth. No state is stored by this check at all now.
"""

from datetime import date


def _parse_date(val):
    if not val:
        return None
    try:
        return date.fromisoformat(str(val)[:10])
    except (ValueError, TypeError):
        return None


def _add_months(d: date, months: int) -> date:
    """Add calendar months to a date, clamping the day if the target month
    is shorter (e.g. Jan 31 + 1 month -> Feb 28/29, not an overflow error)."""
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = d.day
    while True:
        try:
            return date(year, month, day)
        except ValueError:
            day -= 1  # walk back to the last valid day of that month


def run(graduated_deals: list, state: dict, today: date = None) -> list:
    """
    graduated_deals: Deals already filtered to Stage == "Graduated or Post
                      Evaluation Completed".
    state: full monitor state dict — reads "last_run_at" only.

    Returns report = [{"id", "name", "graduate_date", "six_month_mark"}, ...]
    """
    today = today or date.today()
    last_run_at = state.get("last_run_at")
    last_run_date = _parse_date(last_run_at) if last_run_at else None

    report = []

    for deal in graduated_deals:
        grad_date = _parse_date(deal.get("Graduate_Date"))
        if grad_date is None:
            continue

        six_month_mark = _add_months(grad_date, 6)

        # First-ever run (no last_run_date): don't flood the inbox with the
        # entire historical backlog — treat this as a baseline run, only
        # start tracking forward from here. Mirrors new_records.py's and
        # graduate_mismatch.py's identical baseline-run handling.
        if last_run_date is None:
            continue

        if last_run_date < six_month_mark <= today:
            report.append({
                "id": deal.get("id"),
                "name": deal.get("Deal_Name", deal.get("id")),
                "graduate_date": deal.get("Graduate_Date"),
                "six_month_mark": six_month_mark.isoformat(),
            })

    return report
