"""
state_store.py — Load/save reminder-job run state via Catalyst Data Store

Copied and adapted from functions/monitor-job/state_store.py (same table
pattern, same ~10,000-char truncation gotcha — see that file's docstring for
the full discovery story). This function's table is separate from
monitor-job's so the two crons never contend for the same row.

One-time manual setup required in the Catalyst console (Cloud Scale > Data
Store) before first deploy:
  1. Create a table named "reminder_state" (TABLE_NAME below).
  2. Add one column: "state_json" (type: Large Text / CLOB).
Nothing else needs seeding — the first real run creates the one row itself.

State shape (all keys optional/absent until first populated):
{
  "last_run_at": "2026-08-10T07:00:00+08:00",
  "c1_last_sent_month": "2026-08",
  "c2_sent_training_ids": ["<id>", ...],   (pruned once Start_Date passes)
  "c3_sent_training_ids": ["<id>", ...],   (pruned once Start_Date passes)
  "c4_last_sent": {"<training_id>": "YYYY-MM-DD"},  (pruned once Start_Date passes)
  "c5_sent_training_ids": ["<id>", ...],   (pruned once well past End_Date)
  "c6_sent_training_ids": ["<id>", ...],   (pruned once well past End_Date)
  "p_last_sent": {"<deal_id>": "YYYY-MM-DD"}  (pruned on submission)
}

IMPORTANT — every value stored here MUST stay small and bounded (per-Training
/ per-Deal "last sent" markers that get pruned once no longer relevant), never
a list that only ever grows. See functions/monitor-job/state_store.py's
docstring for what happens when that discipline slips (silent truncation ->
invalid JSON -> state silently resets to baseline). save_state() below
hard-asserts the same safety margin.
"""

import json

import zcatalyst_sdk

TABLE_NAME = "reminder_state"
COLUMN_NAME = "state_json"

# Catalyst Data Store's Large Text column truncates at ~10,000 chars
# (confirmed empirically on monitor-job, 2026-08-10). Leave headroom below
# the real limit.
MAX_STATE_JSON_CHARS = 9000

_EMPTY_STATE = {
    "last_run_at": None,
    "c1_last_sent_month": None,
    "c2_sent_training_ids": [],
    "c3_sent_training_ids": [],
    "c4_last_sent": {},
    "c5_sent_training_ids": [],
    "c6_sent_training_ids": [],
    "p_last_sent": {},
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
    run completes (see reminder.py) so a failed send never marks things as
    "already reported."

    Raises if the serialized payload would exceed the column's known
    truncation point — a hard safety net against silently corrupting all
    stored state (see module docstring). Better to fail this run loudly
    (state stays at its last-good value, since nothing gets written) than to
    write a silently-truncated blob that resets everything on the next read.
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
