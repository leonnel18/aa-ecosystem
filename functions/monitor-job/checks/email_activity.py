"""
checks/email_activity.py — Item (2): CRM email activity

Scope (confirmed with Gino): only Deals linked to a Solution whose
Start_Date or End_Date falls within the last ~30 days — trainings active
recently, where a confirmation/follow-up email is actually expected. This is
a bounded population (tens to low hundreds of Deals), not a sweep of every
Deal, since:
  - There is no bulk "all CRM emails" endpoint — GET /Deals/{id}/Emails is
    per-record only.
  - A full sweep across thousands of Deals would risk exceeding Catalyst's
    cron execution time limit.
  - Filtering by "Deal modified since last run" would NOT correctly scope
    this: logging an email against a Deal's related list does not
    necessarily bump the Deal's own Modified_Time, so that filter can
    silently miss the events being asked about. The training-date window
    used here is a real, bounded, and honest scope instead.

The digest email states this scope explicitly so the report never implies
broader coverage than it has.

Response shape confirmed live (2026-08-09) via GET /Deals/{id}/Emails: each
entry has "message_id" (stable unique id per email — used for dedup, more
robust than parsing timestamps), "time" (ISO 8601 with offset, e.g.
"2026-07-12T20:35:28+07:00"), "subject", "from", "to". Dedup is keyed on
message_id, not on the timestamp.
"""

from datetime import date, timedelta

import crm_fetch

RECENT_TRAINING_WINDOW_DAYS = 30


def _parse_date(val):
    if not val:
        return None
    try:
        return date.fromisoformat(str(val)[:10])
    except (ValueError, TypeError):
        return None


def _recent_solution_ids(solutions: list, today: date) -> set:
    cutoff = today - timedelta(days=RECENT_TRAINING_WINDOW_DAYS)
    ids = set()
    for sol in solutions:
        start = _parse_date(sol.get("Start_Date"))
        end = _parse_date(sol.get("End_Date"))
        if (start and start >= cutoff) or (end and end >= cutoff):
            ids.add(sol.get("id"))
    return ids


def run(solutions: list, state: dict, today: date = None) -> tuple[list, dict]:
    """
    Returns (report, updated_deal_email_seen) where:
      report = [{"deal_id", "deal_name", "new_emails": [{"subject", "time"}, ...]}, ...]
               (only Deals with at least one newly-seen email, by message_id)
      updated_deal_email_seen = full {"deal_id": [message_id, ...]} map to
                                 merge back into state.
    """
    today = today or date.today()
    solution_ids = _recent_solution_ids(solutions, today)
    deals = crm_fetch.fetch_deals_for_email_check(solution_ids) if solution_ids else []

    # Prune entries for Deals no longer in the rolling 30-day window — keeps
    # this bounded to roughly "however many Deals are currently in scope"
    # rather than growing forever as old Deals age out but are never
    # forgotten. Deals still in scope keep their remembered message_ids.
    current_deal_ids = {d.get("id") for d in deals}
    seen = {k: list(v) for k, v in state.get("deal_email_seen", {}).items() if k in current_deal_ids}

    if not solution_ids:
        return [], seen

    report = []
    for deal in deals:
        deal_id = deal.get("id")
        try:
            emails = crm_fetch.fetch_deal_emails(deal_id)
        except Exception:
            # Per-deal failure shouldn't abort the whole check; skip and
            # let it be picked up on the next run.
            continue

        if not emails:
            continue

        already_seen_ids = set(seen.get(deal_id, []))
        new_emails = [e for e in emails if e.get("message_id") and e["message_id"] not in already_seen_ids]

        if new_emails:
            report.append({
                "deal_id": deal_id,
                "deal_name": deal.get("Deal_Name", deal_id),
                "new_emails": [{"subject": e.get("subject"), "time": e.get("time")} for e in new_emails],
            })
            seen[deal_id] = list(already_seen_ids | {e["message_id"] for e in new_emails})

    return report, seen
