# Spec: Graduates Tab — admin.html

**Date:** 2026-05-05
**Status:** Approved

---

## Summary

Rename the "Post-Survey" tab to "Graduates" and add a second section ("List of Graduates") below the existing attended-but-not-yet-graduated table. The new section lists all graduates with Post Survey and 6-Month evaluation status columns, a stage dropdown, and A–Z sorting.

---

## Tab Rename

- Button label: `"Post-Survey"` → `"Graduates"`
- Internal ID (`post_survey`) and URL param (`?view=post_survey`) stay unchanged to avoid regressions.

---

## Section 1 — No Changes

Shows participants in `"Attended Training"` stage. Dropdown to move them to `"Graduated or Post Evaluation Completed"`. Progress bar and counter stay as-is.

---

## Section 2 — List of Graduates

**Header:** `List of Graduates (N)` where N = count of people in `"Graduated or Post Evaluation Completed"` stage.

### Columns

| Column | Source | Notes |
|--------|--------|-------|
| Name | `First_Name + Last_Name` | Used for A–Z sort |
| Email | `Email` | |
| Stage | `Stage` dropdown | Options: `["Attended Training", "Graduated or Post Evaluation Completed"]` — allows moving back |
| Post Survey | Derived from Stage | Always `Complete` (reaching this stage implies survey done) — green badge |
| 6-Month | Derived (see logic below) | Badge: green / yellow / grey |

### 6-Month Status Logic

Sentinel field: `Have_you_applied_the_training_to_run_more_effectiv`

```
if Have_you_applied... is non-null:
  → green  "Complete"
else if Graduate_Date is non-null AND Graduate_Date + 6 months > today:
  → grey   "For sending on YYYY-MMM-DD"
else:
  → yellow "Incomplete"   (covers: date past, or Graduate_Date is null)
```

Date format example: `"For sending on 2025-Nov-18"`

### Sorting

- Default: A → Z by name
- Toggle button in section header: flips between A→Z and Z→A
- Sort is client-side, applied on render

### Empty State

If no graduates: show `"No graduates yet."` text, no table.

---

## Data Layer

### crm-proxy.js — `/deals/search` fields string

Add two fields to the existing comma-separated `fields` constant:

```
Graduate_Date
Have_you_applied_the_training_to_run_more_effectiv
```

Full updated fields string:
```
First_Name,Last_Name,Email,Account_Name,Training_Applied,Stage,Graduate_Date,Have_you_applied_the_training_to_run_more_effectiv
```

No other proxy changes required.

---

## Save Changes

The existing `saveChanges('post_survey')` button at the bottom covers both sections — it already queries all `<select>` elements inside `#view-post_survey`, so Section 2 dropdowns are automatically included.

---

## Files Changed

| File | Change |
|------|--------|
| `portal/admin.html` | Rename tab label; add Section 2 HTML (header, sort button, table, empty state) |
| `portal/js/admin.js` | Update `renderPostSurvey()` to populate Section 2; add sort logic; add 6M badge helper |
| `portal/workers/crm-proxy.js` | Add `Graduate_Date` and `Have_you_applied_...` to fields string |
