"""
diagnose_field_types.py — Print data_type for every field in a CRM module.

Usage:
  python tools/diagnose_field_types.py --module Solutions
  python tools/diagnose_field_types.py --module Deals --filter textarea
"""

import argparse
import sys

import requests
from dotenv import load_dotenv

load_dotenv()
from crm_auth import auth_headers, API_BASE


def list_field_types(module: str, filter_str: str = "") -> None:
    url = f"{API_BASE}/settings/fields"
    page = 1
    rows = []
    while True:
        params = {"module": module, "per_page": 200, "page": page}
        resp = requests.get(url, headers=auth_headers(), params=params)
        resp.raise_for_status()
        data = resp.json()
        for f in data.get("fields", []):
            rows.append((f.get("api_name", ""), f.get("data_type", ""), f.get("field_label", "")))
        if not data.get("info", {}).get("more_records", False):
            break
        page += 1

    rows.sort(key=lambda r: r[1])  # sort by data_type
    print(f"\n{'API Name':<50} {'data_type':<20} {'Label'}")
    print("-" * 100)
    for api_name, dt, label in rows:
        if filter_str and filter_str.lower() not in dt.lower():
            continue
        print(f"{api_name:<50} {dt:<20} {label}")
    print(f"\nTotal: {len(rows)} fields")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)
    parser.add_argument("--filter", default="", help="Only show rows where data_type contains this string")
    args = parser.parse_args()
    list_field_types(args.module, args.filter)


if __name__ == "__main__":
    main()
