"""
checks/graduate_mismatch.py — Item (3): Graduate_Date consistency check

Scope: Deals where Stage == "Graduated or Post Evaluation Completed" only
(confirmed with Gino — this is the correct, intentional scope; Graduate_Date
is not meaningful outside it). Within that scope, roughly 80% of Deals have
a blank Graduate_Date (measured directly against live CRM during planning),
so this check deliberately does NOT use exact-equality-with-blank-as-
mismatch — that would flag the vast majority of all graduated Deals forever,
which is noise, not signal.

Two distinct, separately-labeled classifications instead of one bucket:
  (a) "missing"   — Graduate_Date is blank.
  (b) "mismatch"  — Graduate_Date is present but differs from the linked
                     training's End_Date by more than MISMATCH_TOLERANCE_DAYS
                     (a tolerance, not exact equality — multi-day trainings
                     and next-business-day paperwork are normal).

State design (fixed 2026-08-10, replacing an original design that stored a
full "already reported" Deal-ID set): tracking every ever-classified Deal ID
individually doesn't fit in Catalyst Data Store's ~10,000-char column once
the backlog is large — the original approach corrupted all stored state on
its very first real run (~3,600 IDs; see progress.md 2026-08-10 for the full
diagnosis). Fixed by using a Modified_Time WATERMARK instead, mirroring
new_records.py's pattern: only Deals modified after (last_watermark - a
small safety buffer) are (re-)classified at all. Modified_Time is used
rather than Created_Time because a Deal is created at application time but
doesn't enter this check's scope until it later transitions to the
Graduated stage — Created_Time would silently skip long-lived Deals that
just graduated.

No exact-timestamp tie-tracking (fixed 2026-08-10, second round): an
in-between version tracked a capped set of Deal IDs sharing the exact max
Modified_Time, to dedup ties precisely. A synthetic test at realistic scale
(3,600 Deals, 128 sharing one exact timestamp) showed this incorrectly
re-reports any Deal beyond the cap as "new" on every subsequent run forever
— exactly the kind of scenario a bulk CRM import/migration produces in
practice. Fixed the same way as new_records.py: drop tie-tracking, use a
time-buffer threshold instead.

Watermark "spends" its own buffer on write (fixed 2026-08-10, third round):
a naive version of the buffer fix above stored the watermark as bare
max_dt, then subtracted the buffer again on read to compute the threshold.
That has a real gap: if Modified_Time never advances past a single static
value (e.g. no Deal in this scope has changed since a one-time batch
update), the buffered threshold never moves forward either, so the same
batch of Deals sharing that timestamp gets re-reported on every run,
forever — a second synthetic test (re-running against the same static
3,600-Deal batch) confirmed this repeats indefinitely rather than settling.
Fixed by storing the watermark as (max_dt + buffer) instead of bare max_dt:
the next run's threshold (stored_watermark - buffer) then exactly equals
this run's max_dt, guaranteeing the threshold advances by construction on
every run regardless of whether the underlying data changes. A Deal
modified within the buffer window of the previous watermark is still
re-examined exactly once (the original intent — handles same-second bulk
writes and clock skew) but never repeats beyond that one extra look.

Baseline run (state has no "last_run_at" yet — i.e. genuinely the first-ever
run): every missing/mismatched Deal found is silently counted but NOT
included in the report, and the watermark is still recorded — mirroring
new_records.py/six_month_due.py's identical baseline-run handling. Without
this guard, a first run against a multi-year historical backlog reports the
entire backlog at once (observed live: ~3,600 names in one digest email).
"""

from datetime import date, datetime, timedelta

MISMATCH_TOLERANCE_DAYS = 7

# See module docstring — a Deal modified within this window of the previous
# watermark is re-examined on the next run rather than tracked individually.
MODIFIED_TIME_SAFETY_BUFFER = timedelta(minutes=5)


def _parse_date(val):
    if not val:
        return None
    try:
        return date.fromisoformat(str(val)[:10])
    except (ValueError, TypeError):
        return None


def _parse_dt(val):
    if not val:
        return None
    try:
        return datetime.fromisoformat(str(val))
    except ValueError:
        return None


def _solution_id_of(deal: dict):
    ref = deal.get("Training_Applied")
    if isinstance(ref, dict):
        return ref.get("id")
    return ref


def run(graduated_deals: list, solutions: list, state: dict) -> tuple[dict, dict]:
    """
    graduated_deals: Deals already filtered to Stage == "Graduated or Post
                      Evaluation Completed" (see crm_fetch.fetch_deals_for_graduate_check),
                      each carrying Modified_Time.
    solutions: full Solutions snapshot (for the {id: End_Date} lookup).
    state: full monitor state dict — reads "graduate_check_watermark" and
           "last_run_at".

    Returns (report, updated_watermark) where:
      report = {
        "new_missing":   [{"id", "name"}, ...],
        "new_mismatch":  [{"id", "name", "graduate_date", "training_end_date", "days_off"}, ...],
        "baseline_seeded_count": int,   # only non-zero on the baseline run
        "skipped_unwatermarked_count": int,  # Deals with no usable Modified_Time this run
      }
      updated_watermark = {"last_seen_modified_time": iso_str}
                           to store as state["graduate_check_watermark"].
    """
    end_date_by_solution = {s["id"]: _parse_date(s.get("End_Date")) for s in solutions if s.get("id")}
    is_baseline_run = state.get("last_run_at") is None

    watermark = state.get("graduate_check_watermark", {})
    last_seen_str = watermark.get("last_seen_modified_time")
    last_seen = _parse_dt(last_seen_str)
    threshold = (last_seen - MODIFIED_TIME_SAFETY_BUFFER) if last_seen else None

    new_missing = []
    new_mismatch = []
    baseline_seeded_count = 0
    skipped_unwatermarked_count = 0
    max_dt = last_seen

    for deal in graduated_deals:
        deal_id = deal.get("id")
        modified = _parse_dt(deal.get("Modified_Time"))

        if modified is None:
            # No usable Modified_Time — can't place it in watermark ordering.
            # Counted but not classified; a genuinely broken/unusual record,
            # not expected to be common (unlike new_records.py's null
            # Created_Time issue, Modified_Time is a core Zoho system field).
            skipped_unwatermarked_count += 1
            continue

        is_within_scope = threshold is None or modified > threshold

        if max_dt is None or modified > max_dt:
            max_dt = modified

        if not is_within_scope:
            continue  # already checked in a prior run, nothing changed since

        grad_date = _parse_date(deal.get("Graduate_Date"))
        name = deal.get("Deal_Name", deal_id)

        if grad_date is None:
            if is_baseline_run:
                baseline_seeded_count += 1
            else:
                new_missing.append({"id": deal_id, "name": name})
            continue

        solution_id = _solution_id_of(deal)
        end_date = end_date_by_solution.get(solution_id)
        if end_date is None:
            # No linked training or training has no End_Date — can't compare;
            # not classified as a mismatch (nothing to compare against).
            continue

        days_off = abs((grad_date - end_date).days)
        if days_off > MISMATCH_TOLERANCE_DAYS:
            if is_baseline_run:
                baseline_seeded_count += 1
            else:
                new_mismatch.append({
                    "id": deal_id,
                    "name": name,
                    "graduate_date": deal.get("Graduate_Date"),
                    "training_end_date": end_date.isoformat(),
                    "days_off": days_off,
                })

    # Store max_dt + buffer, not bare max_dt — see module docstring "third
    # round" note. This guarantees next run's threshold (stored - buffer)
    # equals this run's max_dt exactly, so the effective threshold always
    # advances by construction, even if Modified_Time itself never does.
    stored_watermark_dt = (max_dt + MODIFIED_TIME_SAFETY_BUFFER) if max_dt else None
    updated_watermark = {
        "last_seen_modified_time": stored_watermark_dt.isoformat() if stored_watermark_dt else last_seen_str,
    }
    report = {
        "new_missing": new_missing,
        "new_mismatch": new_mismatch,
        "baseline_seeded_count": baseline_seeded_count,
        "skipped_unwatermarked_count": skipped_unwatermarked_count,
    }
    return report, updated_watermark
