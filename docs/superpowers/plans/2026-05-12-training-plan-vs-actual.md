# Training Plan vs Actual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `training_plan_summary` key to the pipeline output and use it to (A) render an "at a glance" Plan vs Actual table on the main portal landing page, and (B) replace the "Trainings Completed / Planned" two-card widget in country portals with a side-by-side plan vs actual table — both organized by fiscal year (Year 1: Sep 2025–Aug 2026, Year 2: Sep 2026–Aug 2027, Archive: before Sep 2025).

**Architecture:** `transform.py` computes `training_plan_summary` per portal using existing `portal_solutions` (training plans) and `actual_trainings` data, matching by Solution ID. The JSON result is consumed by `app.js` in two places: `initIndex()` (main page) and `renderReport2()` (country portal), each rendering a table with fiscal year tabs.

**Tech Stack:** Python 3 (transform.py), vanilla JS (app.js), HTML5, CSS3 (reusing existing design tokens and classes)

---

## Fiscal Year Helper

All bucketing uses these boundaries (referenced in every task):

| Tab label | Start (inclusive) | End (inclusive) |
|-----------|-------------------|-----------------|
| `year_1`  | 2025-09-01        | 2026-08-31      |
| `year_2`  | 2026-09-01        | 2027-08-31      |
| `archive` | before 2025-09-01 | —               |

---

## File Map

| File | What changes |
|------|-------------|
| `tools/transform.py` | Add `_fiscal_bucket()` helper + `build_training_plan_summary()` function; call it in `build_portal()` |
| `portal/index.html` | Insert new `<section id="plan-vs-actual-section">` between KPI grid and Country Portals |
| `portal/js/app.js` | Add `renderIndexPlanVsActual()` called from `initIndex()`; replace `renderCpby` block in `renderReport2()` with `renderPlanVsActual()` |
| `portal/css/style.css` | Add `.pva-summary-bar`, `.pva-group-header`, `.pva-tfoot` styles |

---

## Task 1: Add `_fiscal_bucket()` helper to transform.py

**Files:**
- Modify: `tools/transform.py`

Read `tools/transform.py` lines 113–164 first to see where helpers live, then insert after the last helper (`_has_6m_data`).

- [ ] **Step 1: Read the helper section of transform.py to find exact insertion point**

  Open `tools/transform.py` and find line numbers for `_has_6m_data`. The new helper goes immediately after it.

- [ ] **Step 2: Insert `_fiscal_bucket()` after `_has_6m_data`**

  Add this function:

  ```python
  def _fiscal_bucket(date_str):
      """Return 'year_1', 'year_2', or 'archive' for a YYYY-MM-DD date string."""
      if not date_str:
          return "archive"
      try:
          d = date.fromisoformat(date_str[:10])
      except ValueError:
          return "archive"
      if date(2025, 9, 1) <= d <= date(2026, 8, 31):
          return "year_1"
      if date(2026, 9, 1) <= d <= date(2027, 8, 31):
          return "year_2"
      return "archive"
  ```

- [ ] **Step 3: Verify no syntax errors**

  ```bash
  python -c "import tools.transform" 2>&1 || python tools/transform.py --help 2>&1 | head -5
  ```

  Expected: no ImportError or SyntaxError.

- [ ] **Step 4: Commit**

  ```bash
  git add tools/transform.py
  git commit -m "feat: add _fiscal_bucket helper to transform.py"
  ```

---

## Task 2: Add `build_training_plan_summary()` to transform.py

**Files:**
- Modify: `tools/transform.py`

This function takes the per-portal `actual_trainings` list (already built by `build_report_2`) and the raw `portal_solutions` (Solutions filtered to this portal), matches them by Solution `id`, and outputs the `training_plan_summary` dict.

- [ ] **Step 1: Read `build_report_2` in transform.py to understand `portal_solutions` and `actual_trainings` shapes**

  Confirm:
  - `portal_solutions` = list of raw Solution dicts from Zoho, each has `id`, `Solution_Title`, `Training_Type.name`, `Start_Date`, `End_Date`, `Target_Participants`
  - `actual_trainings` (built in build_report_2 lines ~438–480) = list of dicts with keys: `id`, `name`, `type`, `date`, `end_date`, `graduates`, `status`

- [ ] **Step 2: Add `build_training_plan_summary()` function after `build_report_2`**

  Insert this complete function:

  ```python
  def build_training_plan_summary(portal_solutions, actual_trainings):
      """
      Build training_plan_summary keyed by fiscal bucket (year_1, year_2, archive).
      Matches plans (Solutions) to actuals by Solution id.
      Plans that have a matching actual → paired row.
      Plans with no actual → plan-only row (Upcoming/Ongoing).
      Actuals not matched to any plan → actual-only row (Completed, unplanned).
      """
      today = date.today().isoformat()

      # Index actuals by solution id for O(1) lookup
      actuals_by_id = {a["id"]: a for a in actual_trainings}
      matched_actual_ids = set()

      buckets = {
          "year_1":  {"target_activities": 0, "actual_activities": 0,
                      "target_participants": 0, "actual_participants": 0, "rows": []},
          "year_2":  {"target_activities": 0, "actual_activities": 0,
                      "target_participants": 0, "actual_participants": 0, "rows": []},
          "archive": {"target_activities": 0, "actual_activities": 0,
                      "target_participants": 0, "actual_participants": 0, "rows": []},
      }

      for sol in portal_solutions:
          sol_id = sol.get("id", "")
          plan_date = sol.get("Start_Date") or ""
          plan_end  = sol.get("End_Date") or ""
          bucket    = _fiscal_bucket(plan_date)
          b         = buckets[bucket]

          target_p  = sol.get("Target_Participants") or 0
          plan_title = sol.get("Solution_Title") or ""
          sol_type   = (sol.get("Training_Type") or {}).get("name", "") if isinstance(sol.get("Training_Type"), dict) else (sol.get("Training_Type") or "")

          b["target_activities"] += 1
          b["target_participants"] += int(target_p) if target_p else 0

          actual = actuals_by_id.get(sol_id)
          if actual:
              matched_actual_ids.add(sol_id)
              b["actual_activities"] += 1
              b["actual_participants"] += actual.get("graduates") or 0
              b["rows"].append({
                  "plan_title":          plan_title,
                  "plan_date":           plan_date,
                  "plan_end_date":       plan_end,
                  "target_participants": int(target_p) if target_p else None,
                  "actual_title":        actual.get("name"),
                  "actual_date":         actual.get("date"),
                  "actual_end_date":     actual.get("end_date"),
                  "actual_participants": actual.get("graduates"),
                  "status":              actual.get("status", "Completed"),
              })
          else:
              # Determine if upcoming or ongoing based on plan date vs today
              if plan_date and plan_date <= today:
                  status = "Ongoing"
              else:
                  status = "Upcoming"
              b["rows"].append({
                  "plan_title":          plan_title,
                  "plan_date":           plan_date,
                  "plan_end_date":       plan_end,
                  "target_participants": int(target_p) if target_p else None,
                  "actual_title":        None,
                  "actual_date":         None,
                  "actual_end_date":     None,
                  "actual_participants": None,
                  "status":              status,
              })

      # Unmatched actuals (no plan in CRM) → actual-only rows
      for actual in actual_trainings:
          if actual["id"] in matched_actual_ids:
              continue
          actual_date = actual.get("date") or ""
          bucket = _fiscal_bucket(actual_date)
          b = buckets[bucket]
          b["actual_activities"] += 1
          b["actual_participants"] += actual.get("graduates") or 0
          b["rows"].append({
              "plan_title":          None,
              "plan_date":           None,
              "plan_end_date":       None,
              "target_participants": None,
              "actual_title":        actual.get("name"),
              "actual_date":         actual_date,
              "actual_end_date":     actual.get("end_date"),
              "actual_participants": actual.get("graduates"),
              "status":              actual.get("status", "Completed"),
          })

      # Sort rows per bucket: completed first (by actual_date desc), then upcoming/ongoing (by plan_date asc)
      def _sort_key(row):
          is_done = row["status"] == "Completed"
          d = row["actual_date"] or row["plan_date"] or ""
          return (0 if is_done else 1, d if is_done else "", "" if is_done else d)

      for b in buckets.values():
          b["rows"].sort(key=_sort_key)

      return buckets
  ```

- [ ] **Step 3: Verify no syntax errors**

  ```bash
  python -c "from tools.transform import build_training_plan_summary; print('ok')" 2>&1
  ```

  Expected: `ok`

- [ ] **Step 4: Commit**

  ```bash
  git add tools/transform.py
  git commit -m "feat: add build_training_plan_summary to transform.py"
  ```

---

## Task 3: Wire `build_training_plan_summary()` into `build_portal()`

**Files:**
- Modify: `tools/transform.py`

Find the function that assembles the final portal dict (it calls `build_report_2`) and add the `training_plan_summary` key.

- [ ] **Step 1: Read `build_portal()` (or equivalent) to find where `report_2_training_plan` is attached**

  Search for the line that does something like `portal["report_2_training_plan"] = build_report_2(...)` to find the exact insertion point.

- [ ] **Step 2: Attach `training_plan_summary` after `report_2_training_plan` is built**

  In `build_portal()`, after the line that builds `report_2_training_plan`, add:

  ```python
  # build_report_2 already filters portal_solutions and builds actual_trainings internally.
  # We pass the same inputs here.
  portal["training_plan_summary"] = build_training_plan_summary(
      portal_solutions,
      r2["actual_trainings"],
  )
  ```

  `portal_solutions` is the list of Solutions filtered to this portal's Organised_By — confirm the variable name by reading the surrounding context in `build_portal()`.

- [ ] **Step 3: Run the pipeline to regenerate dashboard_data.json**

  ```bash
  python tools/orchestrator.py 2>&1 | tail -20
  ```

  Expected: pipeline completes without errors.

- [ ] **Step 4: Verify `training_plan_summary` appears in output**

  ```bash
  python -c "
  import json
  d = json.load(open('portal/data/dashboard_data.json'))
  pk = d['portals']['PK']
  tps = pk['training_plan_summary']
  print('Keys:', list(tps.keys()))
  print('Year1 rows:', len(tps['year_1']['rows']))
  print('Archive rows:', len(tps['archive']['rows']))
  print('Sample row:', tps['year_1']['rows'][0] if tps['year_1']['rows'] else tps['archive']['rows'][0])
  "
  ```

  Expected: `Keys: ['year_1', 'year_2', 'archive']`, row counts > 0, sample row has `plan_title`, `actual_title`, `status` keys.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/transform.py portal/data/dashboard_data.json
  git commit -m "feat: wire training_plan_summary into portal pipeline output"
  ```

---

## Task 4: Add CSS for new UI elements

**Files:**
- Modify: `portal/css/style.css`

Three new CSS rules needed. Append them at the end of the file to avoid touching existing rules.

- [ ] **Step 1: Append new styles to style.css**

  Add at the very end of `portal/css/style.css`:

  ```css
  /* ── Plan vs Actual table — column group headers ────────────────────── */
  .pva-group-header th {
    background: var(--brand);
    color: #fff;
    text-align: center;
    font-size: .75rem;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    padding: 8px 14px;
    border-bottom: 2px solid var(--brand-dark);
  }

  .pva-group-header th.pva-status-header {
    background: var(--bg-alt);
    color: var(--text-meta);
    border-bottom: 2px solid var(--border);
  }

  /* ── Summary bar above the plan vs actual table ─────────────────────── */
  .pva-summary-bar {
    display: flex;
    gap: 24px;
    padding: 10px 0 16px;
    font-size: .9rem;
    color: var(--text-meta);
  }

  .pva-summary-bar strong {
    color: var(--brand);
    font-size: 1.1rem;
    font-weight: 800;
  }

  /* ── Total footer row ────────────────────────────────────────────────── */
  .pva-tfoot td {
    font-weight: 700;
    background: var(--bg-alt);
    border-top: 2px solid var(--border);
    border-bottom: none;
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add portal/css/style.css
  git commit -m "feat: add pva-group-header, pva-summary-bar, pva-tfoot CSS"
  ```

---

## Task 5: Add "Training Plan vs Actual" section to index.html

**Files:**
- Modify: `portal/index.html`

Insert a new section between the KPI grid (`#grand-kpi`) and the Country Portals section-header. The JS (`initIndex`) will populate it.

- [ ] **Step 1: Read index.html to find exact insertion point**

  The KPI grid ends with `</div>` closing `.kpi-grid.kpi-glance#grand-kpi`. The Country Portals section starts with `<div class="section-header">`. Insert the new section between them.

- [ ] **Step 2: Insert new HTML section**

  After the closing `</div>` of `#grand-kpi` and before `<!-- Country grid -->` section-header div, insert:

  ```html
    <!-- Training Plan vs Actual at-a-glance -->
    <div class="section-header" style="justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>Training Plan vs Actual</h2>
      <span class="section-badge" id="pva-year-label">Year 1: Sep 2025 – Aug 2026</span>
    </div>
    <div class="chart-card" style="margin-bottom:32px">
      <div class="year-tabs" id="pva-index-tabs"></div>
      <div class="pva-summary-bar" id="pva-index-summary" style="display:none"></div>
      <div id="pva-index-table"></div>
    </div>
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add portal/index.html
  git commit -m "feat: add training plan vs actual section scaffold to index.html"
  ```

---

## Task 6: Add `renderIndexPlanVsActual()` to app.js

**Files:**
- Modify: `portal/js/app.js`

Add a new function that renders the at-a-glance table on the main page, and call it from `initIndex()`.

- [ ] **Step 1: Read `initIndex()` in app.js to find where to add the call**

  Find the end of `initIndex()` — after the country card rendering loop.

- [ ] **Step 2: Add `renderIndexPlanVsActual()` function before `initIndex()`**

  Insert this complete function:

  ```javascript
  function renderIndexPlanVsActual(data) {
    const tabsEl   = document.getElementById('pva-index-tabs');
    const tableEl  = document.getElementById('pva-index-table');
    const summaryEl = document.getElementById('pva-index-summary');
    const labelEl  = document.getElementById('pva-year-label');
    if (!tabsEl || !tableEl) return;

    const PORTALS = ['PH', 'PK', 'KR', 'ID', 'backbone'];
    const FLAGS   = { PH: '🇵🇭', PK: '🇵🇰', KR: '🇰🇷', ID: '🇮🇩', backbone: '🌏' };
    const NAMES   = { PH: 'Philippines', PK: 'Pakistan', KR: 'Korea', ID: 'Indonesia', backbone: 'Regional' };
    const TAB_LABELS = {
      year_1:  'Year 1',
      year_2:  'Year 2',
      archive: 'Archive',
    };
    const YEAR_SUBTITLES = {
      year_1:  'Year 1: Sep 2025 – Aug 2026',
      year_2:  'Year 2: Sep 2026 – Aug 2027',
      archive: 'Archive: Before Sep 2025',
    };

    const TABS = ['year_1', 'year_2', 'archive'];

    function getPortalBucket(portalCode, bucketKey) {
      return ((data.portals[portalCode] || {}).training_plan_summary || {})[bucketKey] || {
        target_activities: 0, actual_activities: 0,
        target_participants: 0, actual_participants: 0, rows: []
      };
    }

    function renderTable(bucketKey) {
      if (labelEl) labelEl.textContent = YEAR_SUBTITLES[bucketKey];

      let totalTargetAct = 0, totalActualAct = 0, totalTargetPart = 0, totalActualPart = 0;

      const rows = PORTALS.map(code => {
        const b = getPortalBucket(code, bucketKey);
        totalTargetAct   += b.target_activities;
        totalActualAct   += b.actual_activities;
        totalTargetPart  += b.target_participants;
        totalActualPart  += b.actual_participants;

        const completedTitles = b.rows
          .filter(r => r.status === 'Completed' && r.actual_title)
          .map(r => `<span class="badge badge-completed">${r.actual_title}</span>`)
          .join(' ');
        const plannedTitles = b.rows
          .filter(r => r.status !== 'Completed' && r.plan_title)
          .map(r => `<span class="badge badge-upcoming">${r.plan_title}</span>`)
          .join(' ');

        return `<tr>
          <td><span style="font-size:1.4rem;margin-right:6px">${FLAGS[code]}</span>${NAMES[code]}</td>
          <td style="text-align:center">${b.target_activities}</td>
          <td style="text-align:center">${b.actual_activities}</td>
          <td style="text-align:center">${b.target_participants}</td>
          <td style="text-align:center">${b.actual_participants}</td>
          <td style="line-height:2">${completedTitles} ${plannedTitles}</td>
        </tr>`;
      }).join('');

      tableEl.innerHTML = `<div class="table-wrap"><table>
        <thead>
          <tr>
            <th>Country</th>
            <th style="text-align:center">Target<br>Activities</th>
            <th style="text-align:center">Actual<br>Activities</th>
            <th style="text-align:center">Target<br>Participants</th>
            <th style="text-align:center">Actual<br>Participants</th>
            <th>Training Titles</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="pva-tfoot">
            <td><strong>Total</strong></td>
            <td style="text-align:center"><strong>${totalTargetAct}</strong></td>
            <td style="text-align:center"><strong>${totalActualAct}</strong></td>
            <td style="text-align:center"><strong>${totalTargetPart}</strong></td>
            <td style="text-align:center"><strong>${totalActualPart}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table></div>`;
    }

    // Build tabs
    TABS.forEach((key, i) => {
      const btn = document.createElement('button');
      btn.className = 'year-tab' + (i === 0 ? ' active' : '');
      btn.textContent = TAB_LABELS[key];
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.year-tab').forEach(b => b.classList.toggle('active', b === btn));
        renderTable(key);
      });
      tabsEl.appendChild(btn);
    });

    renderTable('year_1');
  }
  ```

- [ ] **Step 3: Call `renderIndexPlanVsActual(data)` at the end of `initIndex()`**

  Inside `initIndex()`, after the country card rendering loop (after the `PORTALS.forEach` block), add:

  ```javascript
  renderIndexPlanVsActual(data);
  ```

- [ ] **Step 4: Open portal/index.html in browser and verify**

  - Year 1 tab is active by default
  - Table shows 5 country rows + Total row
  - Switching tabs updates data
  - Completed titles show green badges, planned show yellow

- [ ] **Step 5: Commit**

  ```bash
  git add portal/js/app.js
  git commit -m "feat: add renderIndexPlanVsActual to app.js, wire into initIndex"
  ```

---

## Task 7: Add HTML scaffold for plan-vs-actual in portal.html

**Files:**
- Modify: `portal/portal.html`

Replace the existing `.cpby-grid` card content with new scaffold elements for the plan-vs-actual table.

- [ ] **Step 1: Read the current "Trainings Completed / Planned" chart-card in portal.html**

  Find the block:
  ```html
  <div class="chart-card" style="margin-bottom:24px">
    <h3>Trainings Completed / Planned</h3>
    <div class="year-tabs" id="r2-cpby-tabs"></div>
    <div id="r2-cpby-grid" style="margin-top:12px"></div>
  </div>
  ```

- [ ] **Step 2: Replace that block with the new scaffold**

  ```html
  <div class="chart-card" style="margin-bottom:24px">
    <h3>Training Plan vs Actual</h3>
    <div class="year-tabs" id="r2-pva-tabs"></div>
    <div class="pva-summary-bar" id="r2-pva-summary"></div>
    <div id="r2-pva-table"></div>
  </div>
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add portal/portal.html
  git commit -m "feat: replace cpby scaffold with pva scaffold in portal.html"
  ```

---

## Task 8: Replace `renderCpby` with `renderPlanVsActual()` in app.js

**Files:**
- Modify: `portal/js/app.js`

Remove the old `renderCpby` block (lines ~389–412) and replace with a new `renderPlanVsActual()` function that reads `training_plan_summary` from the portal data.

- [ ] **Step 1: Read the exact cpby block in app.js to identify start/end lines**

  Look for:
  ```javascript
  const cpby = r2.completed_vs_planned_by_year || {};
  const cpbyTabsEl = document.getElementById('r2-cpby-tabs');
  const cpbyGridEl = document.getElementById('r2-cpby-grid');
  ```
  Note the exact line range so you can replace precisely.

- [ ] **Step 2: Replace the entire cpby block with `renderPlanVsActual()`**

  Delete from `const cpby = r2.completed_vs_planned_by_year...` through the closing `}` of the `if (cpbyTabsEl && cpbyGridEl)` block, and replace with:

  ```javascript
  // Plan vs Actual table (fiscal year tabs)
  (function renderPlanVsActual() {
    const tabsEl    = document.getElementById('r2-pva-tabs');
    const tableEl   = document.getElementById('r2-pva-table');
    const summaryEl = document.getElementById('r2-pva-summary');
    if (!tabsEl || !tableEl) return;

    const pva = (window._portalData || {}).training_plan_summary || {};

    const TABS = [
      { key: 'year_1',  label: 'Year 1'  },
      { key: 'year_2',  label: 'Year 2'  },
      { key: 'archive', label: 'Archive' },
    ];

    function fmtDate(start, end) {
      if (!start) return '—';
      const s = new Date(start + 'T00:00:00');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const sm = months[s.getMonth()];
      const sd = s.getDate();
      const sy = s.getFullYear();
      if (!end || end === start) return `${sm} ${sd}, ${sy}`;
      const e = new Date(end + 'T00:00:00');
      if (e.getMonth() === s.getMonth() && e.getFullYear() === s.getFullYear()) {
        return `${sm} ${sd}–${e.getDate()}, ${sy}`;
      }
      return `${sm} ${sd} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
    }

    function renderBucket(key) {
      const b = pva[key] || { target_activities: 0, actual_activities: 0,
                               target_participants: 0, actual_participants: 0, rows: [] };
      if (summaryEl) {
        summaryEl.innerHTML =
          `<span><strong>${b.actual_activities}</strong> Conducted</span>` +
          `<span><strong>${b.target_activities}</strong> Planned</span>`;
      }

      if (!b.rows.length) {
        tableEl.innerHTML = '<div class="empty" style="padding:16px;color:var(--text-meta)">No trainings in this period</div>';
        return;
      }

      const rowsHtml = b.rows.map(row => {
        const sClass = (row.status || '').toLowerCase().replace(/\s+/g, '-');
        return `<tr>
          <td>${row.plan_title || '—'}</td>
          <td>${fmtDate(row.plan_date, row.plan_end_date)}</td>
          <td style="text-align:center">${row.target_participants != null ? row.target_participants : '—'}</td>
          <td>${row.actual_title || '—'}</td>
          <td>${fmtDate(row.actual_date, row.actual_end_date)}</td>
          <td style="text-align:center">${row.actual_participants != null ? row.actual_participants : '—'}</td>
          <td><span class="badge badge-${sClass}">${row.status || '—'}</span></td>
        </tr>`;
      }).join('');

      tableEl.innerHTML = `<div class="table-wrap"><table>
        <thead>
          <tr class="pva-group-header">
            <th colspan="3">Training Plan</th>
            <th colspan="3">Actual Training</th>
            <th class="pva-status-header">Status</th>
          </tr>
          <tr>
            <th>Plan Title</th>
            <th>Planned Date</th>
            <th style="text-align:center">Target</th>
            <th>Actual Title</th>
            <th>Actual Date</th>
            <th style="text-align:center">Actual</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table></div>`;
    }

    TABS.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.className = 'year-tab' + (i === 0 ? ' active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.year-tab').forEach(b => b.classList.toggle('active', b === btn));
        renderBucket(tab.key);
      });
      tabsEl.appendChild(btn);
    });

    renderBucket('year_1');
  })();
  ```

  Note: `window._portalData` must be set. See Step 3.

- [ ] **Step 3: Set `window._portalData` in `initPortal()`**

  `renderPlanVsActual` needs access to the full portal object (not just `r2`). In `initPortal()`, find where `portal` is extracted from `data.portals[code]` and add:

  ```javascript
  window._portalData = portal;
  ```

  immediately after that extraction, before `renderReport2` is called.

- [ ] **Step 4: Open portal.html?country=PH in browser and verify**

  - Old two-card widget is gone
  - Three fiscal year tabs render
  - Summary bar shows "X Conducted · Y Planned"
  - Table shows grouped column headers: "Training Plan" | "Actual Training" | "Status"
  - Rows with no actual show `—` in actual columns
  - Rows with no plan show `—` in plan columns

- [ ] **Step 5: Spot-check PK, KR, ID, backbone**

  Open each portal and confirm the table renders with correct data.

- [ ] **Step 6: Commit**

  ```bash
  git add portal/js/app.js
  git commit -m "feat: replace renderCpby with renderPlanVsActual in portal.html flow"
  ```

---

## Task 9: Deploy

**Files:** None changed — deploy only.

- [ ] **Step 1: Run pipeline one final time to ensure latest data is in dashboard_data.json**

  ```bash
  python tools/orchestrator.py 2>&1 | tail -10
  ```

  Expected: no errors.

- [ ] **Step 2: Deploy to Cloudflare Pages**

  ```bash
  npx wrangler pages deploy portal --project-name aktivasia-portal
  ```

  Expected: deployment URL printed, no errors.

- [ ] **Step 3: Verify live site**

  - Open `https://aktivasia-portal.pages.dev/` — at-a-glance table visible between KPI cards and country portals
  - Open `https://aktivasia-portal.pages.dev/portal.html?country=PH` → Training Report tab → plan-vs-actual table shows
  - Switch fiscal year tabs on both pages

---

## Verification Checklist

- [ ] `training_plan_summary` key present in `portal/data/dashboard_data.json` for all 5 portals (PH, PK, KR, ID, backbone)
- [ ] Each portal has `year_1`, `year_2`, `archive` buckets with `rows` arrays
- [ ] Index page: at-a-glance table shows all 5 countries + Total row
- [ ] Index page: Year 1 / Year 2 / Archive tabs switch correctly
- [ ] Index page: completed titles show green badges, upcoming show yellow
- [ ] Country portal: old two-card widget replaced
- [ ] Country portal: summary bar shows conducted / planned counts
- [ ] Country portal: plan-vs-actual table renders with column group headers
- [ ] Unmatched plan row: actual columns show `—`, status = Upcoming or Ongoing
- [ ] Unmatched actual row: plan columns show `—`, status = Completed
- [ ] All 5 country portals render without JS errors in console
