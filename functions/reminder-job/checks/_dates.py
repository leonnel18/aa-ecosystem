"""
_dates.py — Shared pure date helpers for all checks/*.py

Leading underscore signals this is a shared internal helper module, not one
of the 8 named checks itself (checks/__init__.py does not import it as a
check). No CRM/network I/O here — every function is pure and unit-testable
with a fixed `today`.
"""

from datetime import date


def parse_date(val) -> date | None:
    """Parse a CRM date value ('YYYY-MM-DD...' or a date already) to date.
    Returns None for missing/unparseable values."""
    if not val:
        return None
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(str(val)[:10])
    except (ValueError, TypeError):
        return None


def add_months(d: date, months: int) -> date:
    """Add calendar months to a date, clamping the day if the target month is
    shorter (e.g. Jan 31 + 1 month -> Feb 28/29, not an overflow error).
    Copied verbatim from functions/monitor-job/checks/six_month_due.py —
    already correct, already proven, no reason to re-derive."""
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = d.day
    while True:
        try:
            return date(year, month, day)
        except ValueError:
            day -= 1  # walk back to the last valid day of that month


def deal_display_name(deal: dict) -> str:
    return f"{deal.get('First_Name', '')} {deal.get('Last_Name', '')}".strip() or deal.get("id", "")


def deal_org(deal: dict) -> str:
    acc = deal.get("Account_Name")
    if isinstance(acc, dict):
        return acc.get("name", "")
    return str(acc or "")


def lookup_id(val) -> str | None:
    """CRM lookup fields come back as {"id": ..., "name": ...} or None."""
    if isinstance(val, dict):
        return val.get("id")
    return None


def lookup_name(val) -> str:
    if isinstance(val, dict):
        return val.get("name", "")
    return str(val or "")


def six_month_completed(deal: dict) -> bool:
    """True if any of the 4 dedicated '_6' Likert fields is non-null — the
    purpose-built 6-month-completed markers (CLAUDE.md Likert Scale fields),
    per Gino's correction. Matches CLAUDE.md's existing rule: '6M eval
    completed' = graduated AND any 6M impact field is not null."""
    return any(
        deal.get(f) not in (None, "")
        for f in (
            "B_Strategy_Tactics_6",
            "C_Communication_Strategy_6",
            "D_Facilitating_Workshops_Meetings_6",
            "E_Building_Connections_6",
        )
    )
