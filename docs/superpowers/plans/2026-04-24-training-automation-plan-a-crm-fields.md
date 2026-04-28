# Training Automation — Plan A: CRM Field Scaffolding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 6 new CRM fields (4 on Solutions, 2 on Deals) needed by the Training Details Form and Pre/Post application forms.

**Architecture:** A standalone Python script `tools/crm_field_setup.py` that calls Zoho CRM's Settings API (`POST /settings/fields`) to create each field. Script is idempotent — checks if a field exists before creating it. Run once manually.

**Tech Stack:** Python 3, `requests`, existing `crm_auth.py` for auth headers, `.env` for credentials.

**Execution order:** Run this plan BEFORE Plan B (Creator forms) or Plan C (portal).

**IMPORTANT — CRM Write Authorization:** POST/PUT/PATCH to CRM is authorized by Gino as of 2026-04-24. DELETE requires explicit re-authorization. This script only creates fields (POST to settings endpoint) — no record deletion.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `tools/crm_field_setup.py` | **Create** | Idempotent script to create new CRM fields on Solutions + Deals |
| `tools/crm_auth.py` | Read-only | Provides `auth_headers()` and `API_BASE` — do not modify |

---

### Task 1: Create `tools/crm_field_setup.py` — field definitions

**Files:**
- Create: `tools/crm_field_setup.py`

- [ ] **Step 1: Create the file with field definitions**

```python
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

import os
import sys
import json
import argparse
import requests
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from crm_auth import auth_headers, API_BASE

load_dotenv()

# ── New fields: Solutions module ────────────────────────────────────────────
# 4 date fields for form availability windows
SOLUTIONS_NEW_FIELDS = [
    {
        "field_label": "Application Form Open Date",
        "api_name":    "Application_Form_Open_Date",
        "data_type":   "date",
        "length":      None,
    },
    {
        "field_label": "Application Form Close Date",
        "api_name":    "Application_Form_Close_Date",
        "data_type":   "date",
        "length":      None,
    },
    {
        "field_label": "Post Survey Open Date",
        "api_name":    "Post_Survey_Open_Date",
        "data_type":   "date",
        "length":      None,
    },
    {
        "field_label": "Post Survey Close Date",
        "api_name":    "Post_Survey_Close_Date",
        "data_type":   "date",
        "length":      None,
    },
]

# ── New fields: Deals module ────────────────────────────────────────────────
# Year_of_Birth (integer) + Custom_Responses (long text JSON)
DEALS_NEW_FIELDS = [
    {
        "field_label": "Year of Birth",
        "api_name":    "Year_of_Birth",
        "data_type":   "integer",
        "length":      None,
    },
    {
        "field_label": "Custom Responses",
        "api_name":    "Custom_Responses",
        "data_type":   "textarea",
        "length":      32000,
    },
]

MODULE_FIELDS = {
    "Solutions": SOLUTIONS_NEW_FIELDS,
    "Deals":     DEALS_NEW_FIELDS,
}
```

- [ ] **Step 2: Commit skeleton**

```bash
git add tools/crm_field_setup.py
git commit -m "feat: add crm_field_setup.py skeleton with field definitions"
```

---

### Task 2: Add field existence check + field creation logic

**Files:**
- Modify: `tools/crm_field_setup.py`

- [ ] **Step 1: Add `get_existing_fields()` function**

Append after the `MODULE_FIELDS` dict:

```python
def get_existing_fields(module: str) -> set:
    """Return set of existing API names for a module."""
    url = f"{API_BASE}/settings/fields"
    params = {"module": module}
    resp = requests.get(url, headers=auth_headers(), params=params)
    resp.raise_for_status()
    data = resp.json()
    fields = data.get("fields", [])
    return {f["api_name"] for f in fields}
```

- [ ] **Step 2: Add `create_field()` function**

```python
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
    if field_def.get("length"):
        payload_field["length"] = field_def["length"]

    payload = {"fields": [payload_field]}
    resp = requests.post(url, headers=auth_headers(), params=params, json=payload)
    resp.raise_for_status()
    return resp.json()
```

- [ ] **Step 3: Add `setup_module_fields()` orchestrator**

```python
def setup_module_fields(module: str, dry_run: bool = False) -> dict:
    """
    Check existing fields and create any missing ones.
    Returns summary dict: {field_api_name: "created" | "exists" | "error"}.
    """
    print(f"\n[{module}] Fetching existing fields...")
    existing = get_existing_fields(module)
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
```

- [ ] **Step 4: Add `main()` and CLI**

```python
def main():
    parser = argparse.ArgumentParser(description="Create new CRM fields for Training Automation")
    parser.add_argument("--module", choices=list(MODULE_FIELDS.keys()),
                        help="Run for a single module only")
    parser.add_argument("--dry-run", action="store_true",
                        help="List fields that would be created without creating them")
    args = parser.parse_args()

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
```

- [ ] **Step 5: Run dry-run to verify field list**

From the project root (where `.env` lives):

```bash
cd c:\Users\Rimuru\Desktop\github\leonnel18\aa-ecosystem
python tools/crm_field_setup.py --dry-run
```

Expected output:
```
=======================================================
  crm_field_setup.py — CRM Field Scaffolding
  MODE: DRY RUN (no changes will be made)
=======================================================

[Solutions] Fetching existing fields...
  64 existing fields found
  [SKIP]   ... (any pre-existing fields)
  [DRY]    Application_Form_Open_Date — would create (date)
  [DRY]    Application_Form_Close_Date — would create (date)
  [DRY]    Post_Survey_Open_Date — would create (date)
  [DRY]    Post_Survey_Close_Date — would create (date)

[Deals] Fetching existing fields...
  204 existing fields found
  [DRY]    Year_of_Birth — would create (integer)
  [DRY]    Custom_Responses — would create (textarea)

── Summary ─────────────────────────────────────────
  Solutions    Application_Form_Open_Date         would_create
  Solutions    Application_Form_Close_Date        would_create
  Solutions    Post_Survey_Open_Date              would_create
  Solutions    Post_Survey_Close_Date             would_create
  Deals        Year_of_Birth                      would_create
  Deals        Custom_Responses                   would_create

[DONE] All fields verified.
```

If `get_existing_fields` returns 0 fields or throws, check that `ZOHO_CRM_REGION` in `.env` matches your Zoho account region (IN for India datacenter).

- [ ] **Step 6: Commit**

```bash
git add tools/crm_field_setup.py
git commit -m "feat: add field existence check and creation logic to crm_field_setup.py"
```

---

### Task 3: Run the field creation against live CRM

**Files:**
- Read: `tools/crm_field_setup.py` (no changes)
- Read: `.env` (verify credentials are present)

- [ ] **Step 1: Verify `.env` has required credentials**

Open `.env` and confirm these are set (non-empty):
```
ZOHO_CRM_CLIENT_ID=
ZOHO_CRM_CLIENT_SECRET=
ZOHO_CRM_REFRESH_TOKEN=
ZOHO_CRM_REGION=IN
```

- [ ] **Step 2: Run for Solutions only first**

```bash
python tools/crm_field_setup.py --module Solutions
```

Expected: 4 date fields created on Solutions module. No errors.

- [ ] **Step 3: Verify in Zoho CRM UI**

In Zoho CRM: Settings → Modules → Solutions → Fields. Confirm these 4 fields now appear:
- Application Form Open Date (Date)
- Application Form Close Date (Date)
- Post Survey Open Date (Date)
- Post Survey Close Date (Date)

- [ ] **Step 4: Run for Deals**

```bash
python tools/crm_field_setup.py --module Deals
```

Expected: `Year_of_Birth` (Integer) and `Custom_Responses` (Textarea) created on Deals module. No errors.

- [ ] **Step 5: Verify in Zoho CRM UI**

Settings → Modules → Deals → Fields. Confirm:
- Year of Birth (Integer)
- Custom Responses (Textarea / Long Text)

- [ ] **Step 6: Run full idempotency check**

```bash
python tools/crm_field_setup.py
```

Expected: All 6 fields show as `exists` this time — no new fields created. Confirms idempotency.

- [ ] **Step 7: Commit**

```bash
git add tools/crm_field_setup.py
git commit -m "feat: crm_field_setup.py complete — 6 new CRM fields scaffolded"
```

---

### Task 4: Update progress.md

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Append entry to progress.md**

Open `progress.md` and append:

```
[2026-04-24] Plan A — CRM Field Scaffolding: COMPLETE

Tools created:
- tools/crm_field_setup.py — idempotent field creator (POST /settings/fields)

New fields created:
- Solutions: Application_Form_Open_Date, Application_Form_Close_Date,
             Post_Survey_Open_Date, Post_Survey_Close_Date (all date type)
- Deals: Year_of_Birth (integer), Custom_Responses (textarea, 32000 chars)

Next: Plan B — Zoho Creator forms + Deluge scripts
```

- [ ] **Step 2: Commit**

```bash
git add progress.md
git commit -m "docs: log Plan A CRM field scaffolding complete"
```

---

## Verification Checklist

- [ ] `python tools/crm_field_setup.py --dry-run` lists 6 fields without errors
- [ ] `python tools/crm_field_setup.py` creates all 6 fields successfully
- [ ] Running again shows all 6 as `exists` (idempotent)
- [ ] All 6 fields visible in Zoho CRM UI under correct modules
- [ ] Existing pipeline unaffected: `python tools/orchestrator.py --skip-extract --portal PH` still completes without error
