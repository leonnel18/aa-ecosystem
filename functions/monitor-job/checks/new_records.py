"""
checks/new_records.py — Item (1): new-record digest

For each tracked module, compares fetched records' Created_Time against a
stored watermark (the max Created_Time seen last run, minus a small safety
buffer). Anything at or after the buffered watermark is treated as
"potentially new" going forward. Read-only — this check only reads
state.watermarks and returns updates for the caller to persist; it does not
write state itself (monitor.py owns save timing, so a failed downstream step
doesn't lose track of what was actually reported).

Bounded state, and no exact-timestamp tie-breaking (fixed 2026-08-10, two
rounds): an earlier version tracked a set of IDs sharing the exact max
Created_Time, to dedup ties without re-reporting them. Two problems arose in
practice:
  1. It let that set grow by one ID per null-Created_Time record on every
     single run, forever — several CRM modules return Created_Time: null for
     a large fraction of their records (observed live: Solutions, Contacts),
     which blew the state blob past Catalyst Data Store's silent
     10,000-character column truncation within one run, corrupting all
     stored state.
  2. Even after capping that set's size, a real bulk-import scenario (many
     records sharing the exact same Modified_Time/Created_Time down to the
     second — common after CRM data migrations) caused any record beyond the
     cap to be incorrectly re-reported as "new" every single run forever,
     since it could never appear in the capped tie-set (verified via a
     3,600-record synthetic test with 128 exact-timestamp collisions).
Fixed by dropping tie-tracking entirely: instead of "created > last_seen OR
(created == last_seen AND not already seen)", this now uses "created >
(last_seen - TIE_SAFETY_BUFFER)". A record whose Created_Time falls within
the buffer window of the previous watermark gets re-examined on the next
run too — mildly redundant (it may be looked at twice) but never incorrectly
skipped, and needs zero per-record state.

Watermark "spends" its own buffer on write (fixed 2026-08-10, third round):
storing the bare max Created_Time and re-subtracting the buffer on read has
a gap — if Created_Time never advances for a module again (e.g. a one-time
historical batch that's now static), the buffered threshold never moves
forward either, so the same batch re-triggers "new" on every run forever (a
second synthetic test, re-running against an unchanged batch, confirmed
this). Fixed by storing (max_dt + TIE_SAFETY_BUFFER) as the watermark
instead of bare max_dt: the next run's threshold (stored - buffer) then
exactly equals this run's max_dt, so the threshold advances by construction
on every run regardless of whether the underlying data changes.

Null-Created_Time records are handled separately: on the first-ever run
(state has no "last_run_at" yet), every null-timestamp record is silently
counted into "null_ts_baseline_count" and NOT reported, exactly mirroring
graduate_mismatch.py/six_month_due.py's baseline-run handling. On every run
after that, a module's null-timestamp records are simply never reported
again (there is no reliable bounded way to tell "old" from "new" for these
without an unbounded ID set, and Zoho isn't supplying Created_Time for these
modules to enable it anyway) — a known, accepted gap, surfaced explicitly in
the digest email rather than silently hidden.
"""

from datetime import datetime, timedelta

# Records with Created_Time within this window of the last watermark are
# re-examined on the next run rather than tracked individually — see module
# docstring. Wide enough to comfortably cover clock skew and same-second
# bulk-import batches; a record genuinely re-seen here is deduped downstream
# anyway since it's rendered by "new_items", not written back to CRM.
TIE_SAFETY_BUFFER = timedelta(minutes=5)


def _parse_dt(val):
    if not val:
        return None
    try:
        # Zoho Created_Time is ISO 8601 with offset, e.g. "2026-08-09T10:00:00+08:00"
        return datetime.fromisoformat(str(val))
    except ValueError:
        return None


def _name_of(record: dict, module: str) -> str:
    """Best-effort human-readable label per module's known name-ish field."""
    for key in ("Deal_Name", "Solution_Title", "Name", "Full_Name",
                "Funder_Organization_Name", "Organisation_Name"):
        val = record.get(key)
        if isinstance(val, str) and val:
            return val
        if isinstance(val, dict) and val.get("name"):
            return val["name"]
    return record.get("id", "unknown")


def diff_module(module: str, records: list, watermark: dict, is_baseline_run: bool) -> tuple[list, dict, int]:
    """
    Returns (new_records_summary, updated_watermark, null_ts_baseline_count)
    for a single module.
    new_records_summary: [{"id", "name", "created_time"}, ...] — only records
      with a usable Created_Time. Null-Created_Time records are handled
      separately (see module docstring) and never appear here.
    updated_watermark: {"last_seen_created_time": iso_str} — no per-record
      state at all (see module docstring for why tie-tracking was removed).
    null_ts_baseline_count: count of null-Created_Time records seen on a
      baseline run (0 on any non-baseline run) — reported once, in aggregate,
      never as individual "new" items, and never re-derived after baseline.
    """
    last_seen_str = watermark.get("last_seen_created_time")
    last_seen = _parse_dt(last_seen_str)
    threshold = (last_seen - TIE_SAFETY_BUFFER) if last_seen else None

    new_items = []
    max_dt = last_seen
    null_ts_baseline_count = 0

    for rec in records:
        rec_id = rec.get("id")
        created = _parse_dt(rec.get("Created_Time"))

        if created is None:
            # No usable timestamp. On the baseline run, silently count it
            # (not reported individually — see module docstring). On any
            # later run, ignore it entirely: there's no bounded way to tell
            # "seen before" from "genuinely new" for these without an
            # unbounded ID set, which is exactly what caused the state
            # blob to blow past Catalyst's column limit (2026-08-10).
            if is_baseline_run:
                null_ts_baseline_count += 1
            continue

        if threshold is None or created > threshold:
            new_items.append({"id": rec_id, "name": _name_of(rec, module), "created_time": rec.get("Created_Time")})

        if created and (max_dt is None or created > max_dt):
            max_dt = created

    # Store max_dt + buffer, not bare max_dt — guarantees next run's
    # threshold (stored - buffer) equals this run's max_dt exactly, so the
    # effective threshold always advances by construction even if
    # Created_Time itself never does for this module again (e.g. a static
    # historical batch). See graduate_mismatch.py's docstring "third round"
    # note for the synthetic test that caught this without it.
    stored_dt = (max_dt + TIE_SAFETY_BUFFER) if max_dt else None
    updated_watermark = {
        "last_seen_created_time": stored_dt.isoformat() if stored_dt else last_seen_str,
    }
    # On a baseline run, new_items would otherwise dump the entire
    # timestamped backlog too (same flood problem as graduate_mismatch.py's
    # first-run bug, fixed 2026-08-10) — suppress it here for consistency.
    if is_baseline_run:
        new_items = []
    return new_items, updated_watermark, null_ts_baseline_count


def run(module_records: dict, state: dict) -> tuple[dict, dict]:
    """
    module_records: {module_name: [record, ...]} — already-fetched snapshots.
    state: full monitor state dict (reads state["watermarks"] and
           "last_run_at" only).

    Returns (report, updated_watermarks) where:
      report = {
        module_name: {
          "new": [new_record_summary, ...],
          "null_ts_baseline_count": int,  # only non-zero on the baseline run
        }
      } — only present for modules with something to report.
      updated_watermarks = full watermarks dict to merge back into state.
    """
    is_baseline_run = state.get("last_run_at") is None
    report = {}
    updated_watermarks = dict(state.get("watermarks", {}))

    for module, records in module_records.items():
        watermark = state.get("watermarks", {}).get(module, {})
        new_items, new_watermark, null_ts_baseline_count = diff_module(
            module, records, watermark, is_baseline_run
        )
        updated_watermarks[module] = new_watermark
        if new_items or null_ts_baseline_count:
            report[module] = {"new": new_items, "null_ts_baseline_count": null_ts_baseline_count}

    return report, updated_watermarks
