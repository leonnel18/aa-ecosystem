"""
state_store.py — Load/save reminder run state as a JSON file

Replaces the Catalyst Data Store table "reminder_state". The GitHub Actions workflow
(.github/workflows/reminder.yml) checks out the `bot-state` branch into ./_state
before the run, points STATE_FILE at _state/reminder_state.json, and commits the
file back after a successful run — so state survives between runs without any
database.

Local runs default to .tmp/reminder_state.json (.tmp/ is ephemeral and
git-ignored).

State shape (all keys optional/absent until first populated):
{
  "last_run_at": "2026-08-10T09:00:00+08:00",
  "c1_last_sent_month": "2026-08",
  "c2_sent_training_ids": ["<id>", ...],
  "c3_sent_training_ids": ["<id>", ...],
  "c4_last_sent": {"<training_id>": "YYYY-MM-DD"},
  "c5_sent_training_ids": ["<id>", ...],
  "c6_sent_training_ids": ["<id>", ...],
  "p_last_sent": {"<deal_id>": "YYYY-MM-DD"}
}

Keep every value small and bounded (per-record "last seen/sent" markers that
get pruned once no longer relevant) — never a list that only ever grows. The
Catalyst column used to truncate silently at ~10,000 chars; a file has no such
limit, but unbounded state still means slow runs and noisy commits, so
save_state() refuses to write anything over MAX_STATE_JSON_CHARS.

The (state, row_id) return shape and save_state(state, row_id) signature are
kept from the Catalyst version so callers did not need to change; row_id is
always None now.
"""

import json
import os

_DEFAULT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", ".tmp", "reminder_state.json"
)

MAX_STATE_JSON_CHARS = 200_000

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


def _path() -> str:
    return os.environ.get("STATE_FILE") or os.path.normpath(_DEFAULT_PATH)


def load_state() -> tuple[dict, None]:
    """Return (state_dict, None). A missing file is a normal first run; an
    unreadable one is reported loudly and treated as empty."""
    path = _path()
    if not os.path.exists(path):
        print(f"  state_store: no state file at {path} — starting from empty state.")
        return json.loads(json.dumps(_EMPTY_STATE)), None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (ValueError, OSError) as e:
        print(f"  [WARN] state_store: could not read {path} ({e}); starting from empty state.")
        return json.loads(json.dumps(_EMPTY_STATE)), None
    merged = json.loads(json.dumps(_EMPTY_STATE))
    merged.update(data)
    return merged, None


def save_state(state: dict, row_id=None) -> None:
    """Persist state atomically (write temp file, then rename)."""
    payload = json.dumps(state, indent=2, sort_keys=True)
    if len(payload) > MAX_STATE_JSON_CHARS:
        raise ValueError(
            f"state is {len(payload)} chars, over the {MAX_STATE_JSON_CHARS} limit — "
            f"something is growing unbounded; see state_store.py docstring."
        )
    path = _path()
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(payload)
    os.replace(tmp, path)
