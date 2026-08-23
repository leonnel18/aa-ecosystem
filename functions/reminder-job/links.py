"""
links.py — Named link config for all 8 reminder emails (C1-C6, P1, P2)

Every link the emails reference is looked up through this one module, whether
the underlying page already exists (real portal URL) or not (placeholder
string, easy to grep for and swap in once Gino builds/sources it — likely a
native Zoho Form for the two still-missing ones). Per Gino's decision, this
is deliberately uniform: nothing in the checks/ or email_templates.py code
needs to know which links are "real" vs. "placeholder".

Portal pages and their param patterns confirmed live in the codebase:
  - apply-{cc}.html?id={solution_id}      -> portal/js/form-apply-*.js (params.get("id"))
  - create-training.html                  -> no param needed
  - admin.html?training_id={solution_id}  -> portal/js/admin.js (params.get("training_id"))

PLACEHOLDER values below (grep "TBD_" to find every one) are for links to
pages that don't exist yet — out of scope for this plan per Gino's decision
to build them separately, likely as native Zoho Forms:
  - post-training survey, generalized beyond the current PH-only
    portal/trainingsurvey-ph.html
  - Google Drive training-photos folder link

The 6-month Impact Evaluation form (P1/P2) is no longer a placeholder — Gino
supplied the live Zoho Form URL on 2026-08-21. See IMPACT_EVAL_FORM_URL.
"""

PORTAL_BASE = "https://aktivasia-portal.pages.dev"

# Country name (as it appears in Solutions.Organised_By / Training_Plans.Organised_By)
# -> portal URL slug, matching create-training.js's COUNTRY_SLUG_MAP.
COUNTRY_SLUG_MAP = {
    "Philippines": "ph",
    "Pakistan":    "pk",
    "Korea":       "kr",
    "Indonesia":   "id",
    "Regional":    "backbone",
}

# Static links (no per-training/per-country substitution needed)
ASSOCIATE_TRAINING_FORM = f"{PORTAL_BASE}/create-training.html"

# Placeholders — pages that don't exist yet. Values are deliberately loud and
# grep-able (TBD_ prefix) so a stale placeholder in a sent email is obvious in
# review rather than looking like a real, broken link.
POST_TRAINING_EVAL_FORM_PLACEHOLDER = "TBD_POST_TRAINING_SURVEY_LINK"
GOOGLE_DRIVE_PHOTO_FOLDER_PLACEHOLDER = "TBD_GOOGLE_DRIVE_LINK"

# Real, live form (supplied by Gino 2026-08-21) — replaces the former
# TBD_IMPACT_EVAL_FORM_LINK placeholder. Native Zoho Form, not a portal page.
#
# NOTE the form's own name says "FoundationalPH": it appears to be scoped to
# the PH Foundational training, while P1/P2 go to graduates of every country
# (PK/PH/KR/ID/Regional) and every training type. Confirm with Gino whether
# one shared form is intended, or whether this needs to become a per-country
# / per-training-type mapping the way application_form_link() already is.
IMPACT_EVAL_FORM_URL = (
    "https://forms.zohopublic.in/aktivasiaforms/form/"
    "6MImpactEvaluationFormFoundationalPH/formperma/"
    "ZWN4mpZk-PSBOscki3THqQm7r2CsUJ1mEGX_UlZNy6c"
)


def application_form_link(country: str) -> str:
    """C2/C3 — per-country application form, keyed by Solution id."""
    slug = COUNTRY_SLUG_MAP.get(country)
    if not slug:
        return "TBD_APPLICATION_FORM_LINK"  # unrecognized country, surface loudly
    return f"{PORTAL_BASE}/apply-{slug}.html"


def participant_selection_form_link(training_id: str) -> str:
    """C3/C4 — select/reject applicants for a specific Training."""
    return f"{PORTAL_BASE}/admin.html?training_id={training_id}"


def participant_confirmation_form_link(training_id: str) -> str:
    """C5 — same admin panel, used post-training to confirm Graduated status."""
    return f"{PORTAL_BASE}/admin.html?training_id={training_id}"


def post_training_eval_form_link(training_id: str) -> str:
    """C5/C6 — placeholder until the survey is generalized beyond PH."""
    return POST_TRAINING_EVAL_FORM_PLACEHOLDER


def google_drive_photo_folder_link(training_id: str) -> str:
    """C5/C6 — placeholder until a per-training (or shared) Drive folder link exists."""
    return GOOGLE_DRIVE_PHOTO_FOLDER_PLACEHOLDER


def impact_eval_form_link(deal_id: str) -> str:
    """P1/P2 — the 6-month Impact Evaluation form. `deal_id` is currently
    unused (the form is a single shared link, not per-participant), but is
    kept in the signature so a prefilled/per-Deal URL can be swapped in
    without touching either email template."""
    return IMPACT_EVAL_FORM_URL
