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
import requests
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
        "length":      32000,
    },
]

MODULE_FIELDS = {
    "Solutions": SOLUTIONS_NEW_FIELDS,
    "Deals":     DEALS_NEW_FIELDS,
}
