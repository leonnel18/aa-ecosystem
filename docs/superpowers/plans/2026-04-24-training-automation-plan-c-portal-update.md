# Training Automation — Plan C: Portal Dashboard + Pipeline Update

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the data pipeline to fetch form links and availability dates from CRM, and add a "Training Forms" tab to the portal dashboard showing date-aware links for each training's Pre-application form and Post-training survey.

**Architecture:** (1) `crm_extract.py` — add 6 new Solutions fields to the fetch list. (2) `transform.py` — include form links + dates in each training's data object. (3) `portal.html` + `backbone.html` — add new "Training Forms" nav tab + section HTML. (4) `app.js` — add `renderTrainingForms()` function with date-aware link logic.

**Tech Stack:** Python 3 (pipeline), vanilla JS + HTML/CSS (portal), existing `crm_extract.py` / `transform.py` / `data_writer.py` patterns.

**Prerequisites:**
- Plan A complete (CRM fields exist)
- Plan B complete (form links are being saved to CRM Solutions records)
- Pipeline has been run at least once after Plan B to populate `.tmp/solutions_raw.json` with the new fields

---

## File Structure

| File | Action | Changes |
|------|--------|---------|
| `tools/crm_extract.py` | **Modify** | Add 6 fields to `SOLUTIONS_FIELDS` |
| `tools/transform.py` | **Modify** | Include form links + dates in `actual_trainings` entries |
| `portal/portal.html` | **Modify** | Add "Training Forms" nav tab + section HTML |
| `portal/backbone.html` | **Modify** | Same as portal.html |
| `portal/js/app.js` | **Modify** | Add `renderTrainingForms()` + date-aware link renderer |
| `portal/css/style.css` | **Modify** | Add styles for Training Forms tab table + closed state |

---

### Task 1: Update `crm_extract.py` — add Solutions fields

**Files:**
- Modify: `tools/crm_extract.py:73-77`

- [ ] **Step 1: Add 6 new fields to `SOLUTIONS_FIELDS`**

Open `tools/crm_extract.py`. Find the `SOLUTIONS_FIELDS` definition (currently lines 73-77):

```python
SOLUTIONS_FIELDS = ",".join([
    "id", "Solution_Title", "Organised_By", "Training_Type",
    "Start_Date", "End_Date", "Countries_Participated",
    "Target_Participants", "Participants_Until_2023", "Training_Title_Plan",
])
```

Replace with:

```python
SOLUTIONS_FIELDS = ",".join([
    "id", "Solution_Title", "Organised_By", "Training_Type",
    "Start_Date", "End_Date", "Countries_Participated",
    "Target_Participants", "Participants_Until_2023", "Training_Title_Plan",
    # Form links (populated by Training Automation — Plan B)
    "Application_Form", "Evaluation_Form",
    # Form availability windows
    "Application_Form_Open_Date", "Application_Form_Close_Date",
    "Post_Survey_Open_Date", "Post_Survey_Close_Date",
])
```

- [ ] **Step 2: Verify the extract runs without error**

```bash
cd c:\Users\Rimuru\Desktop\github\leonnel18\aa-ecosystem
python tools/crm_extract.py --module Solutions
```

Expected output:
```
  Fetching Solutions... 110 -> 110 total
```
No HTTP errors. Check `.tmp/solutions_raw.json` — records should now include `Application_Form`, `Evaluation_Form`, and the 4 date fields (may be null/empty for existing records without forms).

- [ ] **Step 3: Commit**

```bash
git add tools/crm_extract.py
git commit -m "feat: add form link and date fields to Solutions extraction"
```

---

### Task 2: Update `transform.py` — include form fields in training objects

**Files:**
- Modify: `tools/transform.py`

The `transform.py` builds `actual_trainings` lists in `report_2_training_plan`. We need to include the form links and dates in each training entry.

- [ ] **Step 1: Find the existing `actual_trainings` entry builder**

Search for `actual_trainings` in `transform.py`. The code builds entries like:

```python
{"name": s.get("Solution_Title"), "type": ..., "date": ..., "applicants": ..., "graduates": ..., "status": ...}
```

Find this block and add the 6 new fields. The exact diff to apply:

Find this pattern (look for where each solution dict entry is built for `actual_trainings`):

```python
{
    "name":       s.get("Solution_Title"),
    "type":       type_name,
    "start_date": s.get("Start_Date") or "",
    "end_date":   s.get("End_Date") or "",
    "applicants": agg["applicants"],
    "graduates":  agg["graduates"],
    "status":     status,
}
```

Replace with:

```python
{
    "name":            s.get("Solution_Title"),
    "type":            type_name,
    "start_date":      s.get("Start_Date") or "",
    "end_date":        s.get("End_Date") or "",
    "applicants":      agg["applicants"],
    "graduates":       agg["graduates"],
    "status":          status,
    "pre_app_link":    s.get("Application_Form") or "",
    "post_app_link":   s.get("Evaluation_Form") or "",
    "app_open_date":   s.get("Application_Form_Open_Date") or "",
    "app_close_date":  s.get("Application_Form_Close_Date") or "",
    "post_open_date":  s.get("Post_Survey_Open_Date") or "",
    "post_close_date": s.get("Post_Survey_Close_Date") or "",
}
```

> If the transform.py builds the entry differently, apply the same 6 new keys to whatever dict structure is used for each training in `actual_trainings`.

- [ ] **Step 2: Run transform on cached data to verify**

```bash
python tools/transform.py --portal PH
```

Expected:
```
  Transformed PH: applicants=667 graduates=514
```

No errors. Check `.tmp/PH_report_payload.json` → open and find `actual_trainings` array. Verify entries now include `pre_app_link`, `post_app_link`, `app_open_date`, `app_close_date`, `post_open_date`, `post_close_date` keys (values will be empty strings for old records without forms — that's expected).

- [ ] **Step 3: Run full pipeline to regenerate `dashboard_data.json`**

```bash
python tools/orchestrator.py --skip-extract
```

Expected: All 5 portals transform + `dashboard_data.json` written. No errors.

- [ ] **Step 4: Verify dashboard_data.json schema**

Open `data/dashboard_data.json`. Navigate to:
`portals → PH → report_2_training_plan → actual_trainings → [0]`

Verify the first training entry contains the 6 new keys.

- [ ] **Step 5: Commit**

```bash
git add tools/transform.py data/dashboard_data.json
git commit -m "feat: add form links and availability dates to training objects in transform"
```

---

### Task 3: Add "Training Forms" tab to `portal.html`

**Files:**
- Modify: `portal/portal.html`

- [ ] **Step 1: Add nav tab**

Find the `<nav class="portal-nav">` block in `portal.html` (around line 27-34). Add the new tab:

```html
<nav class="portal-nav">
  <div class="container">
    <a class="nav-tab" data-tab="section-r1">Overview</a>
    <a class="nav-tab" data-tab="section-r2">Training Report</a>
    <a class="nav-tab" data-tab="section-r-orgs">Organization Stats</a>
    <a class="nav-tab" data-tab="section-r3">Qualitative Insights</a>
    <a class="nav-tab" data-tab="section-r-forms">Training Forms</a>
  </div>
</nav>
```

- [ ] **Step 2: Add Training Forms section HTML**

Inside `<main class="container">`, append this new section after the last existing `</section>` closing tag (after the Qualitative Insights section):

```html
<!-- ── Training Forms Tab ──────────────────────────────────────────────── -->
<section class="report-section" id="section-r-forms">

  <div class="section-header">
    <h2>Training Forms</h2>
    <span class="section-badge">Links</span>
  </div>

  <p class="section-desc">Pre-application and post-training survey links for each training. Links are only active within their set date range.</p>

  <div class="table-controls">
    <div class="filter-group">
      <label for="forms-filter-year">Year</label>
      <select id="forms-filter-year"><option value="">All Years</option></select>
    </div>
    <div class="filter-group">
      <label for="forms-filter-type">Training Type</label>
      <select id="forms-filter-type"><option value="">All Types</option></select>
    </div>
  </div>

  <div class="table-wrap">
    <table class="data-table" id="forms-table">
      <thead>
        <tr>
          <th>Training Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Pre-Application Form</th>
          <th>Post-Training Survey</th>
        </tr>
      </thead>
      <tbody id="forms-table-body">
        <tr><td colspan="5" class="table-empty">Loading...</td></tr>
      </tbody>
    </table>
  </div>

</section>
```

- [ ] **Step 3: Commit**

```bash
git add portal/portal.html
git commit -m "feat: add Training Forms tab to portal.html"
```

---

### Task 4: Add "Training Forms" tab to `backbone.html`

**Files:**
- Modify: `portal/backbone.html`

- [ ] **Step 1: Apply same changes as Task 3 to backbone.html**

Open `portal/backbone.html` and apply identical changes:
1. Add `<a class="nav-tab" data-tab="section-r-forms">Training Forms</a>` to the nav
2. Add the same `<section class="report-section" id="section-r-forms">` block at the end of `<main>`

The HTML is identical to what was added in Task 3 — no changes to IDs or content needed (the JS function handles both portals the same way).

- [ ] **Step 2: Commit**

```bash
git add portal/backbone.html
git commit -m "feat: add Training Forms tab to backbone.html"
```

---

### Task 5: Add CSS for Training Forms tab

**Files:**
- Modify: `portal/css/style.css`

- [ ] **Step 1: Append styles to end of style.css**

Open `portal/css/style.css` and append at the very end:

```css
/* ── Training Forms Tab ────────────────────────────────────────────────────── */

.form-link-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  background: linear-gradient(135deg, #ff960b, #f93a3a);
  color: #ffffff;
  transition: opacity 0.2s;
  width: fit-content;
}

.form-link-btn:hover { opacity: 0.85; }

.form-link-date {
  font-size: 11px;
  color: #788099;
  padding-left: 4px;
}

.form-link-closed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  background: #f5f4ee;
  color: #788099;
  border: 1.5px solid #e2e0dc;
  width: fit-content;
}

.form-link-opens-soon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  background: #f3e8ff;
  color: #821545;
  border: 1.5px solid #d4b8cc;
  width: fit-content;
}

.form-link-none {
  font-size: 13px;
  color: #c0bdb7;
}

/* Closed form landing message (shown via JS when form URL is expired) */
.form-closed-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
  padding: 60px 24px;
}

.form-closed-banner h2 {
  color: #821545;
  font-weight: 800;
  margin-bottom: 12px;
}

.form-closed-banner p {
  color: #788099;
  max-width: 480px;
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/css/style.css
git commit -m "feat: add Training Forms tab CSS styles"
```

---

### Task 6: Add `renderTrainingForms()` to `app.js`

**Files:**
- Modify: `portal/js/app.js`

- [ ] **Step 1: Add date-aware link helper function**

Find the end of the utility/helper functions section in `app.js` (after `showError`, before `initIndex`). Insert:

```javascript
// ── Training Forms helpers ────────────────────────────────────────────────────

function formLinkCell(link, openDate, closeDate, label) {
  if (!link) {
    return `<div class="form-link-none">—</div>`;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const open  = openDate  ? new Date(openDate)  : null;
  const close = closeDate ? new Date(closeDate) : null;

  const fmt = d => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (open && today < open) {
    return `
      <div class="form-link-cell">
        <span class="form-link-opens-soon">Opens ${fmt(open)}</span>
      </div>`;
  }

  if (close && today > close) {
    return `
      <div class="form-link-cell">
        <span class="form-link-closed">Closed ${fmt(close)}</span>
      </div>`;
  }

  const dateRange = (open && close)
    ? `${fmt(open)} — ${fmt(close)}`
    : (open ? `From ${fmt(open)}` : '');

  return `
    <div class="form-link-cell">
      <a class="form-link-btn" href="${link}" target="_blank" rel="noopener">${label} →</a>
      ${dateRange ? `<span class="form-link-date">${dateRange}</span>` : ''}
    </div>`;
}
```

- [ ] **Step 2: Add `renderTrainingForms()` function**

After `formLinkCell`, add:

```javascript
function renderTrainingForms(trainings) {
  const tbody = document.getElementById('forms-table-body');
  if (!tbody) return;

  // Populate year filter
  const yearSel = document.getElementById('forms-filter-year');
  const typeSel = document.getElementById('forms-filter-type');
  const years   = [...new Set(trainings.map(t => (t.start_date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const types   = [...new Set(trainings.map(t => t.type).filter(Boolean))].sort();

  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    yearSel.appendChild(opt);
  });
  types.forEach(tp => {
    const opt = document.createElement('option');
    opt.value = tp; opt.textContent = tp;
    typeSel.appendChild(opt);
  });

  function render() {
    const selectedYear = yearSel.value;
    const selectedType = typeSel.value;

    const filtered = trainings.filter(t => {
      const year = (t.start_date || '').slice(0, 4);
      return (!selectedYear || year === selectedYear) &&
             (!selectedType || t.type === selectedType);
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No trainings found for the selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const preCell  = formLinkCell(t.pre_app_link,  t.app_open_date,  t.app_close_date,  'Apply');
      const postCell = formLinkCell(t.post_app_link, t.post_open_date, t.post_close_date, 'Survey');
      const statusBadge = t.status === 'Completed'
        ? `<span class="badge badge-completed">Completed</span>`
        : t.status === 'Ongoing'
          ? `<span class="badge badge-ongoing">Ongoing</span>`
          : `<span class="badge badge-upcoming">Upcoming</span>`;

      return `
        <tr>
          <td><strong>${t.name || '—'}</strong></td>
          <td>${t.type || '—'}</td>
          <td>${statusBadge}</td>
          <td>${preCell}</td>
          <td>${postCell}</td>
        </tr>`;
    }).join('');
  }

  yearSel.addEventListener('change', render);
  typeSel.addEventListener('change', render);
  render();
}
```

- [ ] **Step 3: Wire `renderTrainingForms` into `initPortal`**

Find the `initPortal()` function and its `initTabs()` call. The `onActivate` callback currently handles chart rendering for the R2 tab. Extend it to also render the forms tab when activated.

Find the `initTabs` call in `initPortal` — it looks like:

```javascript
initTabs('section-r1', (tabId) => {
  if (tabId === 'section-r2' && _renderR2Charts) _renderR2Charts();
});
```

Replace with:

```javascript
const r2trainings = portal.report_2_training_plan?.actual_trainings || [];
initTabs('section-r1', (tabId) => {
  if (tabId === 'section-r2' && _renderR2Charts) _renderR2Charts();
  if (tabId === 'section-r-forms') renderTrainingForms(r2trainings);
});
```

> If `initPortal` already passes `r2trainings` to other functions, reuse that variable instead of declaring a new one.

- [ ] **Step 4: Add badge styles to style.css for status badges**

Append to `portal/css/style.css`:

```css
/* Status badges for Training Forms tab */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.badge-completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-ongoing {
  background: #fff3e0;
  color: #e65100;
}

.badge-upcoming {
  background: #f3e8ff;
  color: #821545;
}
```

- [ ] **Step 5: Commit**

```bash
git add portal/js/app.js portal/css/style.css
git commit -m "feat: add renderTrainingForms with date-aware link logic to app.js"
```

---

### Task 7: Manual browser test

- [ ] **Step 1: Start local server**

```bash
cd c:\Users\Rimuru\Desktop\github\leonnel18\aa-ecosystem
python -m http.server 8000
```

- [ ] **Step 2: Open portal**

Navigate to: `http://localhost:8000/portal/portal.html?country=PH`

- [ ] **Step 3: Verify Training Forms tab appears**

Click the "Training Forms" nav tab. Verify:
- Tab activates (underline/highlight)
- Table renders with training rows
- Filters for Year and Training Type work

- [ ] **Step 4: Test date-range logic**

The existing training records likely have empty form links (Plan B hasn't run yet for real). Verify:
- Trainings with no `pre_app_link`: shows "—" cell
- Verify the `formLinkCell` function returns correct HTML for all 3 states by temporarily injecting test data in the browser console:

```javascript
// In browser console on portal page — test all 3 link states
console.log(formLinkCell('https://example.com', '2026-01-01', '2026-12-31', 'Apply'));  // Should show active button
console.log(formLinkCell('https://example.com', '2025-01-01', '2025-06-30', 'Apply'));  // Should show "Closed Jun 30, 2025"
console.log(formLinkCell('https://example.com', '2026-12-01', '2026-12-31', 'Apply'));  // Should show "Opens Dec 1, 2026"
```

- [ ] **Step 5: Test backbone.html**

Navigate to: `http://localhost:8000/portal/backbone.html`

Click "Training Forms" tab. Verify same rendering works for the backbone portal.

- [ ] **Step 6: Commit**

```bash
git commit -m "test: verified Training Forms tab renders correctly in browser"
```

---

### Task 8: Run full pipeline and regenerate dashboard data

- [ ] **Step 1: Run full pipeline (with live CRM extract)**

```bash
python tools/orchestrator.py
```

This fetches fresh data from CRM including any form links added via Plan B. Takes ~9 minutes. If you want to skip the CRM extract and just use cached data:

```bash
python tools/orchestrator.py --skip-extract
```

- [ ] **Step 2: Verify output**

Expected:
```
  Extracted Deals: 3842 records
  Extracted Solutions: 110 records
  ...
  Transformed PH: applicants=667 graduates=514
  ...
  dashboard_data.json written (XXX KB)
  Pipeline complete in XXs
```

No errors. The file size should be slightly larger than before (6 new string fields per training).

- [ ] **Step 3: Reload browser and verify Training Forms tab with real data**

Stop and restart the HTTP server, reload the portal. Click Training Forms tab — verify any trainings that have form links (set up via Plan B) now show active or date-appropriate link buttons.

- [ ] **Step 4: Update progress.md**

Append to `progress.md`:

```
[2026-04-24] Plan C — Portal Dashboard + Pipeline Update: COMPLETE

Files modified:
- tools/crm_extract.py — added 6 Solutions fields (Application_Form, Evaluation_Form, 4 date fields)
- tools/transform.py — added pre_app_link, post_app_link, app_open_date, app_close_date, post_open_date, post_close_date to actual_trainings entries
- portal/portal.html — added Training Forms nav tab + section
- portal/backbone.html — same
- portal/js/app.js — added formLinkCell() + renderTrainingForms() with date-aware rendering
- portal/css/style.css — added form link button + status badge styles

Next: Deploy to Cloudflare Pages (Plan D, TBD)
```

- [ ] **Step 5: Commit**

```bash
git add tools/crm_extract.py tools/transform.py portal/ progress.md data/dashboard_data.json
git commit -m "feat: Plan C complete — Training Forms tab live with date-aware form links"
```

---

## Verification Checklist

- [ ] `python tools/crm_extract.py --module Solutions` runs without error; solutions_raw.json has `Application_Form` key
- [ ] `python tools/transform.py --portal PH` runs; `.tmp/PH_report_payload.json` `actual_trainings[0]` has `pre_app_link` key
- [ ] `python tools/orchestrator.py --skip-extract` runs; `dashboard_data.json` updated with no errors
- [ ] Portal at `http://localhost:8000/portal/portal.html?country=PH` shows "Training Forms" tab
- [ ] Year and Type filters work on Training Forms table
- [ ] Active links render as orange gradient button
- [ ] Past dates render as "Closed {date}" grey pill
- [ ] Future open dates render as "Opens {date}" plum accent pill
- [ ] Empty links render as "—"
- [ ] backbone.html Training Forms tab works identically
- [ ] All existing tabs (Overview, Training Report, Org Stats, Qualitative) still work — no regressions
