"""
data_writer.py — Merge portal payloads into data/dashboard_data.json

Reads .tmp/{portal}_report_payload.json for all 5 portals.
Writes data/dashboard_data.json — the single source of truth for the portal.

Usage:
  python tools/data_writer.py
"""

import os
import json
from datetime import datetime, timezone

TMP_DIR  = os.path.join(os.path.dirname(__file__), "..", ".tmp")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUT_FILE = os.path.join(DATA_DIR, "dashboard_data.json")

ALL_PORTALS = ["PK", "PH", "KR", "ID", "backbone"]


def write_dashboard() -> str:
    """
    Merge all portal payloads into dashboard_data.json.
    Returns output file path.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    portals = {}

    for portal in ALL_PORTALS:
        payload_path = os.path.join(TMP_DIR, f"{portal}_report_payload.json")
        if not os.path.exists(payload_path):
            raise FileNotFoundError(
                f"Missing: {payload_path} — run transform.py first"
            )
        with open(payload_path) as f:
            portals[portal] = json.load(f)
        r1 = portals[portal].get("report_1_overview", {})
        print(f"  {portal:10s}  applicants={r1.get('total_applicants', 0):4d}  "
              f"graduates={r1.get('total_graduates', 0):4d}")

    dashboard = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
        "portals": portals,
    }

    with open(OUT_FILE, "w") as f:
        json.dump(dashboard, f, indent=2)

    return OUT_FILE


def main():
    print("=" * 55)
    print("  data_writer.py - build dashboard_data.json")
    print("=" * 55)

    out = write_dashboard()
    size_kb = os.path.getsize(out) / 1024
    print(f"\n[DONE] Written to {out}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
