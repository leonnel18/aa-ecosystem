"""
crm_field_setup.py — Create new CRM fields for Training Automation feature

Idempotent: checks existing fields before creating. Safe to run multiple times.

Usage:
  python tools/crm_field_setup.py
  python tools/crm_field_setup.py --module Solutions   # single module
  python tools/crm_field_setup.py --dry-run            # list without creating

# ══════════════════════════════════════════════════════════════════
# WRITE OPERATION — authorized by Gino 2026-04-24
# Only creates fields (POST /settings/fields). No record changes.
# DELETE requires explicit re-authorization.
# ══════════════════════════════════════════════════════════════════
"""

import argparse
import sys

import requests
from dotenv import load_dotenv

from crm_auth import auth_headers, API_BASE

# ── New fields: Solutions module ────────────────────────────────────────────
# 4 date fields for form availability windows
SOLUTIONS_NEW_FIELDS = [
    {
        "field_label": "Application Form Open Date",
        "api_name":    "Application_Form_Open_Date",
        "data_type":   "date",
    },
    {
        "field_label": "Application Form Close Date",
        "api_name":    "Application_Form_Close_Date",
        "data_type":   "date",
    },
    {
        "field_label": "Post Survey Open Date",
        "api_name":    "Post_Survey_Open_Date",
        "data_type":   "date",
    },
    {
        "field_label": "Post Survey Close Date",
        "api_name":    "Post_Survey_Close_Date",
        "data_type":   "date",
    },
]

# ── New fields: Deals module ────────────────────────────────────────────────
# Year_of_Birth (integer, new field — stores year only, alongside existing Date_of_Birth)
# Custom_Responses (long text, JSON array of custom Q&A per submission)
DEALS_NEW_FIELDS = [
    {
        "field_label": "Year of Birth",
        "api_name":    "Year_of_Birth",
        "data_type":   "integer",
    },
    {
        "field_label": "Custom Responses",
        "api_name":    "Custom_Responses",
        "data_type":   "textarea",
        "textarea":    {"type": "large"},
    },
]

MODULE_FIELDS = {
    "Solutions": SOLUTIONS_NEW_FIELDS,
    "Deals":     DEALS_NEW_FIELDS,
}


def get_existing_fields(module: str) -> set:
    """Return set of existing API names for a module (all pages)."""
    url = f"{API_BASE}/settings/fields"
    all_api_names: set = set()
    page = 1
    while True:
        params = {"module": module, "per_page": 200, "page": page}
        resp = requests.get(url, headers=auth_headers(), params=params)
        resp.raise_for_status()
        data = resp.json()
        for f in data.get("fields", []):
            all_api_names.add(f["api_name"])
        if not data.get("info", {}).get("more_records", False):
            break
        page += 1
    return all_api_names


def create_field(module: str, field_def: dict) -> dict:
    """
    Create a single custom field on a CRM module.
    Returns the API response dict.
    """
    url = f"{API_BASE}/settings/fields"
    params = {"module": module}

    payload_field = {
        "field_label": field_def["field_label"],
        "api_name":    field_def["api_name"],
        "data_type":   field_def["data_type"],
    }
    if field_def.get("length") is not None:
        payload_field["length"] = field_def["length"]
    if field_def.get("textarea") is not None:
        payload_field["textarea"] = field_def["textarea"]

    payload = {"fields": [payload_field]}
    resp = requests.post(url, headers=auth_headers(), params=params, json=payload)
    resp.raise_for_status()
    return resp.json()


def setup_module_fields(module: str, dry_run: bool = False) -> dict:
    """
    Check existing fields and create any missing ones.
    Returns summary dict: {field_api_name: "created" | "exists" | "would_create" | "error: ..."}.
    """
    print(f"\n[{module}] Fetching existing fields...")
    try:
        existing = get_existing_fields(module)
    except requests.HTTPError as e:
        print(f"  [FAIL] Could not fetch fields: {e}")
        return {f["api_name"]: f"error: fetch failed — {e}" for f in MODULE_FIELDS[module]}
    print(f"  {len(existing)} existing fields found")

    results = {}
    for field_def in MODULE_FIELDS[module]:
        api_name = field_def["api_name"]
        if api_name in existing:
            print(f"  [SKIP]   {api_name} — already exists")
            results[api_name] = "exists"
            continue

        if dry_run:
            print(f"  [DRY]    {api_name} — would create ({field_def['data_type']})")
            results[api_name] = "would_create"
            continue

        print(f"  [CREATE] {api_name}...", end="", flush=True)
        try:
            create_field(module, field_def)
            print(" OK")
            results[api_name] = "created"
        except requests.HTTPError as e:
            print(f" FAIL: {e}")
            results[api_name] = f"error: {e}"

    return results


def main():
    parser = argparse.ArgumentParser(description="Create new CRM fields for Training Automation")
    parser.add_argument("--module", choices=list(MODULE_FIELDS.keys()),
                        help="Run for a single module only")
    parser.add_argument("--dry-run", action="store_true",
                        help="List fields that would be created without creating them "
                             "(still queries CRM to check existing fields)")
    args = parser.parse_args()

    load_dotenv()  # crm_auth.py also calls this at import time; kept here for explicit .env loading

    print("=" * 55)
    print("  crm_field_setup.py — CRM Field Scaffolding")
    if args.dry_run:
        print("  MODE: DRY RUN (no changes will be made)")
    print("=" * 55)

    modules = [args.module] if args.module else list(MODULE_FIELDS.keys())
    all_results = {}

    for module in modules:
        results = setup_module_fields(module, dry_run=args.dry_run)
        all_results[module] = results

    print("\n── Summary ─────────────────────────────────────────")
    for module, results in all_results.items():
        for api_name, status in results.items():
            print(f"  {module:12s}  {api_name:35s}  {status}")

    errors = [
        f"{m}/{k}" for m, r in all_results.items()
        for k, v in r.items() if v.startswith("error")
    ]
    if errors:
        print(f"\n[FAIL] {len(errors)} field(s) failed: {', '.join(errors)}")
        sys.exit(1)
    else:
        print("\n[DONE] All fields verified.")


if __name__ == "__main__":
    main()
