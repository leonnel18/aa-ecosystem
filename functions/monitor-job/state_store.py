"""
state_store.py — Load/save monitor run state via Catalyst Data Store

Uses Catalyst Data Store (zcatalyst_sdk datastore), not File Store: File
Store's SDK has no "get file by name" or "list files" call (only
get_file_details(file_id), which needs an ID you don't have yet), so a
read-modify-write JSON blob isn't workable there without inventing a second
place to remember the file's ID. Data Store's Table API has no query-by-column
filter either, but that's fine here because this table is designed to hold
exactly one row.

One-time manual setup required in the Catalyst console (Cloud Scale > Data
Store), same spirit as pipeline-job/filestore_upload.py's manually-created
"portaldata" File Store folder:
  1. Create a table named "monitor_state" (TABLE_NAME below).
  2. Add one column: "state_json" (type: Large Text / CLOB) — holds the
     entire state as a single JSON string. No other columns needed; ROWID
     is the table's built-in primary key.
Nothing else needs seeding — the first real run creates the one row itself.

State shape (all keys optional/absent until first populated):
{
  "last_run_at": "2026-08-10T07:00:00+08:00",
  "watermarks": {
    "<module>": {"last_seen_created_time": "...", "tie_ids": ["..."] (capped)}
  },
  "deal_email_seen": {"<deal_id>": ["<message_id>", ...]},  (pruned to Deals
                                                              currently in the
                                                              30-day window)
  "graduate_check_watermark": {"last_seen_modified_time": "...", "tie_ids": [...] (capped)}
}

IMPORTANT — column size limit discovered 2026-08-10: this table's
"state_json" column silently TRUNCATES writes at ~10,000 characters rather
than rejecting them. A truncated write produces invalid JSON, which the next
load_state() correctly detects and falls back to empty state for — but that
means state silently resets instead of erroring loudly. Every value stored
in this state MUST stay small and bounded (watermarks + capped tie-break
sets, not full historical ID lists) — see checks/new_records.py,
checks/graduate_mismatch.py, and checks/six_month_due.py for the specific
redesigns this forced. save_state() below asserts the serialized size stays
under the limit as a hard safety net against this regressing silently again.
"""

import json

import zcatalyst_sdk

TABLE_NAME = "monitor_state"
COLUMN_NAME = "state_json"

# Catalyst Data Store's Large Text column truncates at ~10,000 chars
# (confirmed empirically 2026-08-10). Leave headroom below the real limit.
MAX_STATE_JSON_CHARS = 9000

_EMPTY_STATE = {
    "last_run_at": None,
    "watermarks": {},
    "deal_email_seen": {},
    "graduate_check_watermark": {},
}


def _get_table():
    app = zcatalyst_sdk.initialize()
    return app.datastore().table(TABLE_NAME)


def load_state() -> tuple[dict, str]:
    """
    Return (state_dict, row_id_or_none). row_id is None on the very first
    run (no row exists yet) — save_state() uses it to decide insert vs.
    update. Falls back to a fresh empty state if the table is empty or the
    stored JSON can't be parsed.
    """
    table = _get_table()
    rows = list(table.get_iterable_rows())

    if not rows:
        return dict(_EMPTY_STATE), None

    row = rows[0]  # table holds exactly one row by design
    row_id = row.get("ROWID")
    raw = row.get(COLUMN_NAME)

    if not raw:
        return dict(_EMPTY_STATE), row_id

    try:
        data = json.loads(raw)
    except (ValueError, TypeError) as e:
        # Most likely cause: a prior save_state() wrote a payload that got
        # silently truncated by the column (see module docstring). Falling
        # back to empty state here is a safe recovery, but it does mean a
        # baseline-run reset just happened — logged loudly, not swallowed.
        print(f"  [WARN] state_store: stored state_json failed to parse ({e}); "
              f"resetting to empty state. Raw length was {len(raw)} chars.")
        return dict(_EMPTY_STATE), row_id

    merged = dict(_EMPTY_STATE)
    merged.update(data)
    return merged, row_id


def save_state(state: dict, row_id: str = None) -> None:
    """
    Persist state. Inserts the one-and-only row on first run (row_id is
    None), updates it by ROWID on every subsequent run. Called only after a
    run completes successfully (including the digest email send) — see
    monitor.py — so a failed send never marks things as "already reported."

    Raises if the serialized payload would exceed the column's known
    truncation point — a hard safety net against silently corrupting all
    stored state again the way the original design did (see module
    docstring). Better to fail this run loudly (state stays at its last-good
    value, since nothing gets written) than to write a silently-truncated
    blob that resets everything on the next read.
    """
    table = _get_table()
    payload = json.dumps(state)

    if len(payload) > MAX_STATE_JSON_CHARS:
        raise ValueError(
            f"state_json payload is {len(payload)} chars, over the "
            f"{MAX_STATE_JSON_CHARS}-char safety limit (real column limit is "
            f"~10,000 and truncates silently). Refusing to write — a check's "
            f"state has grown unbounded again; see state_store.py docstring."
        )

    if row_id:
        table.update_row({"ROWID": row_id, COLUMN_NAME: payload})
    else:
        table.insert_row({COLUMN_NAME: payload})
