# Admin Portal Design Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `admin.html` to match `portal.html`'s design system — brand purple header, sticky gradient-underline tabs, card-wrapped tables, pill buttons, toast saves, and a footer — with minimal new CSS.

**Architecture:** Replace the scoped `<style>` block in `admin.html` with a small admin-override block; restructure HTML to use existing `style.css` component classes (`.site-header`, `.portal-header`, `.portal-nav`, `.chart-card`, `.table-wrap`, `.btn`, etc.). Update `admin.js` to swap the `saving-msg` span for a toast div and fix the tab selector. Add one `.btn:disabled` rule to `style.css`.

**Tech Stack:** Vanilla HTML/CSS/JS. No build step. `portal/css/style.css` is the shared design system already imported by `admin.html`.

---

## File Map

| File | What changes |
|------|-------------|
| `portal/admin.html` | Full HTML restructure + `<style>` block replacement |
| `portal/css/style.css` | Add `.btn:disabled` (one rule) |
| `portal/js/admin.js` | Fix tab selector; replace `savingEl` logic with `showAdminToast()` |

---

### Task 1: Add `.btn:disabled` to style.css

**Files:**
- Modify: `portal/css/style.css` (after the `.btn:hover` rule, around line 97)

- [ ] **Step 1: Open `portal/css/style.css` and locate the `.btn:hover` rule (line 97)**

Current content at that location:
```css
.btn:hover { opacity: .88; transform: translateY(-1px); }
```

- [ ] **Step 2: Add the disabled rule immediately after `.btn:hover`**

Change:
```css
.btn:hover { opacity: .88; transform: translateY(-1px); }
.btn-primary {
```

To:
```css
.btn:hover { opacity: .88; transform: translateY(-1px); }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary {
```

- [ ] **Step 3: Verify the file looks correct**

Open `portal/css/style.css` and confirm the three `.btn` rules appear in sequence:
```
.btn { … }
.btn:hover { … }
.btn:disabled { … }
.btn-primary { … }
```

- [ ] **Step 4: Commit**

```bash
git add portal/css/style.css
git commit -m "feat: add .btn:disabled state to design system"
```

---

### Task 2: Fix tab selector in admin.js

**Files:**
- Modify: `portal/js/admin.js` (line 20)

The current `switchTab()` function targets `.admin-tabs button` which won't exist after the HTML restructure. Fix it now to target `.nav-tab` so it works with the new HTML.

- [ ] **Step 1: Open `portal/js/admin.js` and locate `switchTab()` (lines 18–26)**

Current:
```js
function switchTab(view) {
  document.querySelectorAll(".admin-view").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".admin-tabs button").forEach(el => el.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.getElementById(`tab-${view}`).classList.add("active");
  const url = new URL(window.location);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", url);
}
```

- [ ] **Step 2: Replace `.admin-tabs button` selector with `.nav-tab`**

Change:
```js
  document.querySelectorAll(".admin-tabs button").forEach(el => el.classList.remove("active"));
```

To:
```js
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
```

- [ ] **Step 3: Replace `saveChanges()` saving-msg logic with toast**

Current `saveChanges()` (lines 223–267) uses:
```js
const savingEl = document.getElementById(`${prefix}-saving`);
savingEl.style.display = "inline";
// … later …
savingEl.style.display = "none";
alert(`${successCount} of ${changes.length} changes saved.`);
```

Replace the entire `saveChanges()` function with this version that uses a toast and removes the `alert()`:
```js
async function saveChanges(view) {
  const viewMap = { selection: "sel", attendance: "att", post_survey: "ps" };
  const prefix  = viewMap[view];

  const selects = document.querySelectorAll(`#view-${view} select`);
  const changes = [];
  selects.forEach(sel => {
    if (sel.value !== sel.dataset.original) {
      const dealId = sel.id.replace("stage-", "");
      changes.push({ id: dealId, Stage: sel.value });
    }
  });

  if (changes.length === 0) {
    showAdminToast("No changes to save.");
    return;
  }

  const saveBtn = document.querySelector(`#view-${view} .btn-primary`);
  if (saveBtn) saveBtn.disabled = true;

  let successCount = 0;
  for (const change of changes) {
    try {
      const res = await fetch(`${PROXY_BASE}/deals/${change.id}/stage`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ Stage: change.Stage }),
      });
      if (res.ok) {
        const deal = allDeals.find(d => d.id === change.id);
        if (deal) deal.Stage = change.Stage;
        successCount++;
      } else {
        console.error(`Failed to update deal ${change.id}:`, await res.text());
      }
    } catch (e) {
      console.error(`Error updating deal ${change.id}:`, e);
    }
  }

  if (saveBtn) saveBtn.disabled = false;
  showAdminToast(`${successCount} of ${changes.length} changes saved.`);
  renderAll();
}
```

- [ ] **Step 4: Add `showAdminToast()` helper at the bottom of the file, before the `init` IIFE**

Add after the `bulkSetStage()` function (before line 222):
```js
// ── Toast ─────────────────────────────────────────────────────────────────────
function showAdminToast(msg) {
  const t = document.getElementById("admin-toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}
```

- [ ] **Step 5: Commit**

```bash
git add portal/js/admin.js
git commit -m "feat: replace saving-msg with toast, fix nav-tab selector in admin.js"
```

---

### Task 3: Replace admin.html — head & style block

**Files:**
- Modify: `portal/admin.html` (lines 1–39, the `<head>` and existing `<style>`)

- [ ] **Step 1: Replace the entire `<style>` block (lines 10–39) with the admin-override block**

Remove lines 10–39 (the old `<style>` block) and replace with:
```html
  <style>
    /* Admin view panels */
    .admin-view { display: none; padding: 32px 0; }
    .admin-view.active { display: block; }
    .admin-counter { font-size: .85rem; color: var(--text-meta); margin-bottom: 12px; }

    /* Admin tab: gradient underline to signal admin mode */
    .portal-nav .nav-tab.active {
      color: var(--brand);
      border-bottom-color: transparent;
      border-image: linear-gradient(90deg, var(--grad-start), var(--grad-end)) 1;
    }

    /* Admin modal: gradient top strip */
    .edit-modal-header {
      border-top: 4px solid;
      border-image: linear-gradient(90deg, var(--grad-start), var(--grad-end)) 1;
    }

    /* Manage dropdown restyling */
    .manage-dropdown {
      background: #fff;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,.1);
    }
  </style>
```

- [ ] **Step 2: Verify `<head>` still has the Inter font link and `style.css` link**

The `<head>` should contain exactly:
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — AktivAsia</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <style>
    … (new block from step 1) …
  </style>
</head>
```

- [ ] **Step 3: Commit**

```bash
git add portal/admin.html
git commit -m "feat: replace admin.html style block with portal design system overrides"
```

---

### Task 4: Replace admin.html — header & nav

**Files:**
- Modify: `portal/admin.html` (lines 41–56, the `<body>` opening through `</nav>`)

- [ ] **Step 1: Replace the `<body>` opening through the closing `</nav>` with the new header + nav**

Remove:
```html
<body>

  <div class="admin-header">
    <div class="container">
      <a href="portal.html" id="back-link">← Back to Portal</a>
      <h1 id="training-title">Loading…</h1>
      <div class="meta" id="training-meta"></div>
    </div>
  </div>

  <div class="container">
    <nav class="admin-tabs">
      <button id="tab-selection"   onclick="switchTab('selection')">Selection</button>
      <button id="tab-attendance"  onclick="switchTab('attendance')">Attendance</button>
      <button id="tab-post_survey" onclick="switchTab('post_survey')">Post-Survey</button>
    </nav>
```

Replace with:
```html
<body>

  <header class="site-header">
    <div class="container">
      <a class="logo" href="index.html">Aktiv<span>Asia</span></a>
    </div>
  </header>

  <div class="portal-header">
    <div class="container">
      <a class="back-link" href="portal.html" id="back-link">← Back to Portal</a>
      <h1 id="training-title">Loading…</h1>
      <p class="subtitle" id="training-meta"></p>
    </div>
  </div>

  <nav class="portal-nav">
    <div class="container">
      <button class="nav-tab" id="tab-selection"   onclick="switchTab('selection')">Selection</button>
      <button class="nav-tab" id="tab-attendance"  onclick="switchTab('attendance')">Attendance</button>
      <button class="nav-tab" id="tab-post_survey" onclick="switchTab('post_survey')">Post-Survey</button>
    </div>
  </nav>

  <div class="container">
```

Note: The `<div class="container">` that previously wrapped the tabs now only wraps the view panels — keep it open.

- [ ] **Step 2: Commit**

```bash
git add portal/admin.html
git commit -m "feat: replace admin header and tabs with portal-nav design system components"
```

---

### Task 5: Replace admin.html — Selection view

**Files:**
- Modify: `portal/admin.html` (the `#view-selection` div)

- [ ] **Step 1: Replace the entire `#view-selection` div**

Remove:
```html
    <!-- View 1: Selection -->
    <div class="admin-view" id="view-selection">
      <div class="admin-counter" id="sel-counter"></div>
      <div>
        <button class="btn-bulk" onclick="bulkSetStage('selection', 'Selected')">Select All</button>
        <button class="btn-bulk" onclick="bulkSetStage('selection', 'Rejected')">Reject All</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="sel-tbody"></tbody>
      </table>
      <div class="empty-state" id="sel-empty" style="display:none">No applicants in "Still in Applied Stage".</div>

      <h3 id="sel-rej-header" style="margin:28px 0 8px;font-size:14px;font-weight:700;color:#c0392b;">Rejected (0)</h3>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="sel-rej-tbody"></tbody>
      </table>
      <div class="empty-state" id="sel-rej-empty">No rejected applicants.</div>

      <button class="btn-save" onclick="saveChanges('selection')">Save Changes</button>
      <span class="saving-msg" id="sel-saving">Saving…</span>
    </div>
```

Replace with:
```html
    <!-- View 1: Selection -->
    <div class="admin-view" id="view-selection">
      <p class="admin-counter" id="sel-counter"></p>
      <div class="filter-row" style="margin-bottom:16px">
        <button class="btn btn-outline" onclick="bulkSetStage('selection', 'Selected')">Select All</button>
        <button class="btn btn-outline" onclick="bulkSetStage('selection', 'Rejected')">Reject All</button>
      </div>
      <div class="chart-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
            <tbody id="sel-tbody"></tbody>
          </table>
        </div>
        <div class="empty" id="sel-empty" style="display:none">No applicants in "Still in Applied Stage".</div>
      </div>

      <div class="section-header" style="margin-top:32px">
        <h2 id="sel-rej-header">Rejected (0)</h2>
      </div>
      <div class="chart-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
            <tbody id="sel-rej-tbody"></tbody>
          </table>
        </div>
        <div class="empty" id="sel-rej-empty">No rejected applicants.</div>
      </div>

      <div style="margin-top:20px;display:flex;align-items:center;gap:12px">
        <button class="btn btn-primary" onclick="saveChanges('selection')">Save Changes</button>
      </div>
    </div>
```

- [ ] **Step 2: Verify `stageSelect()` in admin.js outputs `<select class="filter">` for pill styling**

Open `portal/js/admin.js` and find `stageSelect()` (line 38). Update it to add the `filter` class:

Current:
```js
  return `<select id="stage-${dealId}" data-original="${currentStage}">${opts}</select>`;
```

Change to:
```js
  return `<select class="filter" id="stage-${dealId}" data-original="${currentStage}">${opts}</select>`;
```

- [ ] **Step 3: Commit**

```bash
git add portal/admin.html portal/js/admin.js
git commit -m "feat: restructure Selection view to chart-card layout with portal button styles"
```

---

### Task 6: Replace admin.html — Attendance view

**Files:**
- Modify: `portal/admin.html` (the `#view-attendance` div)

- [ ] **Step 1: Replace the entire `#view-attendance` div**

Remove:
```html
    <!-- View 2: Attendance -->
    <div class="admin-view" id="view-attendance">
      <div class="admin-counter" id="att-counter"></div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="att-tbody"></tbody>
      </table>
      <div class="empty-state" id="att-empty" style="display:none">No participants in "Selected" stage.</div>

      <h3 id="att-na-header" style="margin:28px 0 8px;font-size:14px;font-weight:700;color:#c0392b;">Rejected or Not Attended (0)</h3>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="att-na-tbody"></tbody>
      </table>
      <div class="empty-state" id="att-na-empty">No participants marked as not attended.</div>

      <button class="btn-save" onclick="saveChanges('attendance')">Save Changes</button>
      <span class="saving-msg" id="att-saving">Saving…</span>
    </div>
```

Replace with:
```html
    <!-- View 2: Attendance -->
    <div class="admin-view" id="view-attendance">
      <p class="admin-counter" id="att-counter"></p>
      <div class="chart-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
            <tbody id="att-tbody"></tbody>
          </table>
        </div>
        <div class="empty" id="att-empty" style="display:none">No participants in "Selected" stage.</div>
      </div>

      <div class="section-header" style="margin-top:32px">
        <h2 id="att-na-header">Rejected or Not Attended (0)</h2>
      </div>
      <div class="chart-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Stage</th></tr></thead>
            <tbody id="att-na-tbody"></tbody>
          </table>
        </div>
        <div class="empty" id="att-na-empty">No participants marked as not attended.</div>
      </div>

      <div style="margin-top:20px;display:flex;align-items:center;gap:12px">
        <button class="btn btn-primary" onclick="saveChanges('attendance')">Save Changes</button>
      </div>
    </div>
```

- [ ] **Step 2: Commit**

```bash
git add portal/admin.html
git commit -m "feat: restructure Attendance view to chart-card layout with portal button styles"
```

---

### Task 7: Replace admin.html — Post-Survey view

**Files:**
- Modify: `portal/admin.html` (the `#view-post_survey` div)

- [ ] **Step 1: Replace the entire `#view-post_survey` div**

Remove:
```html
    <!-- View 3: Post-Survey -->
    <div class="admin-view" id="view-post_survey">
      <div class="progress-label" id="ps-label"></div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" id="ps-bar" style="width:0%"></div></div>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Stage</th></tr></thead>
        <tbody id="ps-tbody"></tbody>
      </table>
      <div class="empty-state" id="ps-empty" style="display:none">All participants have completed the post-survey.</div>
      <button class="btn-save" onclick="saveChanges('post_survey')">Save Changes</button>
      <span class="saving-msg" id="ps-saving">Saving…</span>
    </div>
```

Replace with:
```html
    <!-- View 3: Post-Survey -->
    <div class="admin-view" id="view-post_survey">
      <p class="admin-counter" id="ps-label"></p>
      <div class="type-bar-wrap" style="margin-bottom:20px"><div class="type-bar" id="ps-bar" style="width:0%"></div></div>
      <div class="chart-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Stage</th></tr></thead>
            <tbody id="ps-tbody"></tbody>
          </table>
        </div>
        <div class="empty" id="ps-empty" style="display:none">All participants have completed the post-survey.</div>
      </div>

      <div style="margin-top:20px;display:flex;align-items:center;gap:12px">
        <button class="btn btn-primary" onclick="saveChanges('post_survey')">Save Changes</button>
      </div>
    </div>
```

- [ ] **Step 2: Update `renderPostSurvey()` in admin.js — `ps-label` is now a `<p>` not a `<div>`**

No change needed — `document.getElementById("ps-label").textContent = …` works on any element type. Confirm line 186 is unchanged:
```js
  document.getElementById("ps-label").textContent =
    `${pct}% complete — ${completed.length} of ${attended.length} participants`;
```

- [ ] **Step 3: Commit**

```bash
git add portal/admin.html
git commit -m "feat: restructure Post-Survey view with gradient progress bar and chart-card layout"
```

---

### Task 8: Add toast div, close container, and footer

**Files:**
- Modify: `portal/admin.html` (closing tags and footer, before `</body>`)

- [ ] **Step 1: Close the container div and add toast + footer before `</body>`**

The current closing of `admin.html` is:
```html
  </div>

  <script src="js/admin.js"></script>
</body>
</html>
```

Replace with:
```html
  </div><!-- /.container -->

  <div class="edit-toast" id="admin-toast"></div>

  <footer class="site-footer">
    <div class="container">
      <strong>AktivAsia</strong> · Admin · Training Management
    </div>
  </footer>

  <script src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add portal/admin.html
git commit -m "feat: add toast div and site footer to admin.html"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Open admin.html in a browser with a valid training ID**

Navigate to: `portal/admin.html?training_id=<any-valid-id>&view=selection`

Or open the deployed URL with a training_id parameter from the manage button on portal.html.

- [ ] **Step 2: Check header**

- Brand purple `.site-header` bar at top with "AktivAsia" logo (gradient text on "Asia")
- Brand purple `.portal-header` band below with training title in white `<h1>` and meta in muted white

- [ ] **Step 3: Check tabs**

- Three sticky tabs: Selection, Attendance, Post-Survey
- Active tab has orange-red gradient underline (not solid purple, not yellow)
- Inactive tabs are muted `var(--text-meta)` gray
- Clicking tabs switches views correctly

- [ ] **Step 4: Check Selection view**

- Counter text is small and muted (`var(--text-meta)`)
- "Select All" and "Reject All" are pill-shaped outline buttons (brand purple border, transparent fill)
- Applicant table is inside a white `.chart-card` with rounded corners and shadow
- Table headers are uppercase, small, gray — matching portal's `th` style
- Table rows highlight on hover
- Stage dropdowns are pill-shaped with brand purple chevron (`.filter` class)
- "Rejected (0)" header is brand purple `<h2>`, not red
- Save Changes is pill-shaped gradient button (orange → red)

- [ ] **Step 5: Check Attendance view**

- Same layout as Selection (no bulk action buttons — verify they are absent)
- "Rejected or Not Attended (0)" header is brand purple `<h2>`
- Save Changes pill gradient button works

- [ ] **Step 6: Check Post-Survey view**

- Progress bar uses orange-red gradient fill (`.type-bar`) — not yellow
- Table in `.chart-card` wrapper
- Save Changes pill gradient button

- [ ] **Step 7: Test save flow**

- Change a stage dropdown value
- Click Save Changes
- Button goes disabled during save
- Toast appears at bottom center: "N of N changes saved."
- Toast fades out after ~2.5 seconds
- No `alert()` popup

- [ ] **Step 8: Check footer**

- Brand purple footer at page bottom: "AktivAsia · Admin · Training Management"

- [ ] **Step 9: Final commit if any last tweaks were made**

```bash
git add portal/admin.html portal/css/style.css portal/js/admin.js
git commit -m "fix: admin portal design parity final tweaks"
```
