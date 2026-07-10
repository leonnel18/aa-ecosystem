# Design: Training Plan vs Actual — At-a-Glance Table & Country Portal Revamp

**Date:** 2026-05-12
**Status:** Approved

---

## Context

Gino currently maintains a monthly Google Slides report showing Training Plan vs Actual training data per country (see screenshot: "2026 Training and Skills Sessions Plans — a/o Apr 28"). The goal is to surface this data in two places in the portal:

1. **Main portal (index.html)** — an "at a glance" table visible to all viewers before the Country Portals section
2. **Country portals (portal.html)** — replace the current "Trainings Completed / Planned" two-card widget with a proper side-by-side plan vs actual comparison table

This removes the need to manually update Google Slides each month, as the data already flows from Zoho CRM through the pipeline.

---

## Fiscal Year Definition

All date bucketing uses **fiscal years**, not calendar years:

| Tab | Date Range |
|-----|-----------|
| Year 1 | Sep 1, 2025 – Aug 31, 2026 |
| Year 2 | Sep 1, 2026 – Aug 31, 2027 |
| Archive | Before Sep 1, 2025 |

A training is bucketed by its `start_date` (for actual trainings) or `Start_Date` (for training plans).

---

## Architecture

**Approach: Pipeline-computed summary (Option 1)**

- `transform.py` computes a new `training_plan_summary` key per portal entry
- `dashboard_data.json` carries the pre-aggregated data
- `index.html` JS reads the backbone/per-country summaries to render the at-a-glance table
- `portal.html` JS reads per-portal `training_plan_summary` to render the revamped table
- No changes to existing `report_2_training_plan` shape — `training_plan_summary` is additive

---

## Data Shape

Added to each portal entry (`PH`, `PK`, `KR`, `ID`, `backbone`) in `dashboard_data.json`:

```json
"training_plan_summary": {
  "year_1": {
    "target_activities": 15,
    "actual_activities": 3,
    "target_participants": 100,
    "actual_participants": 70,
    "rows": [
      {
        "plan_title": "Foundational 2.1",
        "plan_date": "2025-10-01",
        "plan_end_date": "2025-10-03",
        "target_participants": 30,
        "actual_title": "Foundational South",
        "actual_date": "2025-10-02",
        "actual_end_date": "2025-10-04",
        "actual_participants": 28,
        "status": "Completed"
      },
      {
        "plan_title": "TOT North",
        "plan_date": "2026-02-01",
        "plan_end_date": "2026-02-03",
        "target_participants": 25,
        "actual_title": null,
        "actual_date": null,
        "actual_end_date": null,
        "actual_participants": null,
        "status": "Upcoming"
      },
      {
        "plan_title": null,
        "plan_date": null,
        "plan_end_date": null,
        "target_participants": null,
        "actual_title": "Alumni Gathering",
        "actual_date": "2025-12-10",
        "actual_end_date": "2025-12-10",
        "actual_participants": 15,
        "status": "Completed"
      }
    ]
  },
  "year_2": { ... },
  "archive": { ... }
}
```

**Row matching logic:**
- If a plan has a matching actual training → one row with both sides filled
- If a plan has no matching actual → one row, actual side is `null` (status: Upcoming/Ongoing)
- If an actual has no matching plan → one row, plan side is `null` (status: Completed, unplanned)
- Matching: use Solution ID — each actual training in `actual_trainings` has an `id` field that matches the Solutions record; training plans come from Solutions directly. Match on `id`. No fuzzy heuristics needed.

**Aggregates:**
- `target_activities` = count of non-null plan rows in that fiscal window
- `actual_activities` = count of non-null actual rows in that fiscal window
- `target_participants` = sum of `Target_Participants` from Solutions (plans)
- `actual_participants` = sum of graduates from Deals (actual completions)

---

## Feature A: At-a-Glance Table (index.html)

### Placement
Between the KPI cards section and the "Country Portals" section.

### Structure
- Section heading: "Training Plan vs Actual" with subtitle "Year 1: Sep 2025 – Aug 2026"
- Three fiscal year tabs using existing `.year-tab` pill styles: **Year 1 | Year 2 | Archive**
- Table below tabs using existing `.table-wrap` / `th` / `td` styles

### Columns

| Country | Target Activities | Actual Activities | Target Participants | Actual Participants | Training Titles |
|---|---|---|---|---|---|

- **Country**: Flag emoji (same flags as country portal cards) + country name
- **Target / Actual Activities**: Numbers, center-aligned
- **Target / Actual Participants**: Numbers, center-aligned
- **Training Titles**: Single cell, completed trainings first (`.badge-completed` green badge), then planned (`.badge-upcoming` yellow badge), stacked vertically
- **Total row**: Bottom row in `<tfoot>`, sums all numeric columns across countries, bold

### Country Order
Philippines → Pakistan → Korea → Indonesia → Regional (backbone)

### Flag Mapping (match existing portal cards)
```
PH → 🇵🇭
PK → 🇵🇰
KR → 🇰🇷
ID → 🇮🇩
backbone → 🌏
```

---

## Feature B: Revamped Country Portal Table (portal.html)

### Replaces
The current `.cpby-grid` card widget inside the "Trainings Completed / Planned" `.chart-card`.

### Structure
- Same three fiscal year tabs: **Year 1 | Year 2 | Archive**
- Summary bar above table: "X Conducted · Y Planned" for the selected fiscal year (preserves the at-a-glance numbers)
- Side-by-side comparison table using existing `.table-wrap` styles

### Columns

```
| ——— Training Plan ———                          | ——— Actual Training ———              | Status  |
| Plan Title | Planned Date | Target Participants | Actual Title | Actual Date | Actual Participants |         |
```

- Column group headers ("Training Plan" / "Actual Training") span their sub-columns, styled with a lighter background
- Null plan side → show `—` in all plan cells
- Null actual side → show `—` in all actual cells
- Dates formatted as "Oct 1–3, 2025" (abbreviated month, range if start ≠ end)
- Status column uses existing `.badge` styles:
  - `badge-completed` (green): actual training exists
  - `badge-upcoming` (yellow): plan exists, no actual, date in future
  - `badge-ongoing` (blue): plan exists, no actual, date has passed / is current
- Rows sorted: completed first (by actual date desc), then upcoming (by plan date asc)

---

## Files to Modify

| File | Change |
|------|--------|
| `tools/transform.py` | Add `build_training_plan_summary(plans, actuals, graduates)` function; call it per portal; attach result to portal dict |
| `portal/index.html` | Add "Training Plan vs Actual" section between KPI cards and country portals |
| `portal/js/app.js` | Add `renderTrainingPlanSummary()` for index.html; replace `renderCpby()` with `renderPlanVsActual()` in portal.html flow |
| `portal/css/style.css` | Add column-group header styles, summary bar styles; reuse existing `.badge`, `.table-wrap`, `.year-tab` |

---

## Verification

1. Run pipeline: `python tools/orchestrator.py` — confirm `training_plan_summary` appears in `portal/data/dashboard_data.json` for all 5 portals
2. Open `portal/index.html` in browser — confirm at-a-glance table renders with Year 1 tab active, correct flags, correct totals row
3. Switch to Year 2 and Archive tabs — confirm data updates correctly
4. Open `portal/portal.html?country=PH` — confirm old two-card widget is replaced by side-by-side table
5. Check a row where plan exists but no actual → actual side shows `—`, status = Upcoming/Ongoing
6. Check a row where actual exists but no plan → plan side shows `—`, status = Completed
7. Repeat spot-check for PK, KR, ID, backbone portals
