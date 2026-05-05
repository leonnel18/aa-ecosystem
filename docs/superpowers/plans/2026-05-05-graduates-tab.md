# Graduates Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "Post-Survey" tab to "Graduates" and add a "List of Graduates" section below the existing attended table, with Post Survey and 6-Month status columns, a stage dropdown, and A–Z sorting.

**Architecture:** Three files change in sequence — proxy first (data), then JS (logic), then HTML (structure). The proxy adds two new fields to the deals fetch. The JS `renderPostSurvey()` function gains a second sub-render for graduates with sort state and a badge helper. The HTML gains Section 2 markup and the renamed tab button.

**Tech Stack:** Vanilla JS, HTML, Cloudflare Workers (crm-proxy.js)

---

## File Map

| File | What changes |
|------|-------------|
| `portal/workers/crm-proxy.js` | Add `Graduate_Date` and `Have_you_applied_the_training_to_run_more_effectiv` to the fields string in `/deals/search` |
| `portal/js/admin.js` | Add `sixMonthStatus()` helper; update `renderPostSurvey()` to render Section 2; add `toggleGradSort()` function |
| `portal/admin.html` | Rename tab button label; add Section 2 HTML inside `#view-post_survey` |

---

## Task 1: Proxy — add Graduate_Date and 6M sentinel field

**Files:**
- Modify: `portal/workers/crm-proxy.js:164`

- [ ] **Step 1: Open the file and locate the fields string**

In [portal/workers/crm-proxy.js](portal/workers/crm-proxy.js), find line 164:

```js
const fields = "First_Name,Last_Name,Email,Account_Name,Training_Applied,Stage";
```

- [ ] **Step 2: Add the two new fields**

Replace that line with:

```js
const fields = "First_Name,Last_Name,Email,Account_Name,Training_Applied,Stage,Graduate_Date,Have_you_applied_the_training_to_run_more_effectiv";
```

- [ ] **Step 3: Verify no other fields strings exist for /deals/search**

Grep to confirm there's only one `fields` constant in the `/deals/search` handler:

```bash
grep -n "const fields" portal/workers/crm-proxy.js
```

Expected: multiple lines, but the one at ~164 is the only one inside the `if (path === "/deals/search")` block. No other changes needed.

- [ ] **Step 4: Commit**

```bash
git add portal/workers/crm-proxy.js
git commit -m "feat: add Graduate_Date and 6M sentinel field to deals/search proxy"
```

---

## Task 2: JS — add sixMonthStatus() helper

**Files:**
- Modify: `portal/js/admin.js` (after the `stageSelect` helper, before `loadTrainingInfo`)

- [ ] **Step 1: Add the helper function**

In [portal/js/admin.js](portal/js/admin.js), insert this after the `stageSelect()` function (after line 43):

```js
function sixMonthStatus(d) {
  if (d.Have_you_applied_the_training_to_run_more_effectiv != null &&
      d.Have_you_applied_the_training_to_run_more_effectiv !== "") {
    return { label: "Complete", cls: "badge-green" };
  }
  if (d.Graduate_Date) {
    const sendDate = new Date(d.Graduate_Date);
    sendDate.setMonth(sendDate.getMonth() + 6);
    if (sendDate > new Date()) {
      const fmt = sendDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      return { label: `For sending on ${fmt}`, cls: "badge-grey" };
    }
  }
  return { label: "Incomplete", cls: "badge-yellow" };
}
```

- [ ] **Step 2: Verify the function is reachable**

The function is module-level (no wrapping), so it will be in scope for `renderPostSurvey()`. No import needed — this is plain vanilla JS in a single file.

- [ ] **Step 3: Commit**

```bash
git add portal/js/admin.js
git commit -m "feat: add sixMonthStatus() helper for graduates section"
```

---

## Task 3: JS — add sort state and toggleGradSort()

**Files:**
- Modify: `portal/js/admin.js`

- [ ] **Step 1: Add sort state variable**

After the `let allDeals = [];` declaration (line 73), add:

```js
let gradSortAsc = true;
```

- [ ] **Step 2: Add the toggle function**

After `toggleGradSort` will be called from HTML. Add it after `bulkSetStage()`:

```js
function toggleGradSort() {
  gradSortAsc = !gradSortAsc;
  const btn = document.getElementById("grad-sort-btn");
  if (btn) btn.textContent = gradSortAsc ? "A → Z" : "Z → A";
  renderGraduates();
}
```

- [ ] **Step 3: Commit**

```bash
git add portal/js/admin.js
git commit -m "feat: add grad sort state and toggleGradSort() function"
```

---

## Task 4: JS — add renderGraduates() and wire into renderPostSurvey()

**Files:**
- Modify: `portal/js/admin.js`

- [ ] **Step 1: Add renderGraduates() function**

Add this new function after `renderPostSurvey()`:

```js
function renderGraduates() {
  const graduates = allDeals.filter(d => d.Stage === "Graduated or Post Evaluation Completed");
  const header    = document.getElementById("grad-header");
  const tbody     = document.getElementById("grad-tbody");
  const empty     = document.getElementById("grad-empty");

  if (header) header.textContent = `List of Graduates (${graduates.length})`;

  if (graduates.length === 0) {
    if (tbody)  tbody.innerHTML = "";
    if (empty)  empty.style.display = "";
    return;
  }

  const sorted = [...graduates].sort((a, b) => {
    const nameA = dealName(a).toLowerCase();
    const nameB = dealName(b).toLowerCase();
    return gradSortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  if (empty) empty.style.display = "none";
  if (tbody) tbody.innerHTML = sorted.map(d => {
    const sm = sixMonthStatus(d);
    return `
      <tr>
        <td>${dealName(d)}</td>
        <td>${d.Email ?? ""}</td>
        <td>${stageSelect(d.id, d.Stage, "post_survey")}</td>
        <td><span class="status-badge ${sm.cls}">${sm.label}</span></td>
        <td><span class="status-badge badge-green">Complete</span></td>
      </tr>`;
  }).join("");
}
```

- [ ] **Step 2: Wire renderGraduates() into renderPostSurvey() and renderAll()**

In `renderPostSurvey()`, add a call to `renderGraduates()` at the end of the function (before the closing `}`):

```js
  renderGraduates();
```

Also add it to `renderAll()` — find that function and add the call:

```js
function renderAll() {
  renderSelection();
  renderAttendance();
  renderPostSurvey();   // renderPostSurvey already calls renderGraduates internally
}
```

`renderPostSurvey()` already calls `renderGraduates()` at the end, so `renderAll()` itself doesn't need a separate call. Just confirm `renderAll()` still calls `renderPostSurvey()`.

- [ ] **Step 3: Commit**

```bash
git add portal/js/admin.js
git commit -m "feat: add renderGraduates() and wire into renderPostSurvey()"
```

---

## Task 5: HTML — add badge styles

**Files:**
- Modify: `portal/admin.html` (`<style>` block)

- [ ] **Step 1: Add badge CSS**

Inside the `<style>` block in [portal/admin.html](portal/admin.html) (before the closing `</style>`), add:

```css
.status-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:600; }
.badge-green  { background:#d4edda; color:#155724; }
.badge-yellow { background:#fff3cd; color:#856404; }
.badge-grey   { background:#e2e3e5; color:#383d41; }
```

- [ ] **Step 2: Commit**

```bash
git add portal/admin.html
git commit -m "style: add status badge styles for graduates section"
```

---

## Task 6: HTML — rename tab button and add Section 2 markup

**Files:**
- Modify: `portal/admin.html`

- [ ] **Step 1: Rename the tab button label**

Find line 53:

```html
      <button id="tab-post_survey" onclick="switchTab('post_survey')">Post-Survey</button>
```

Change to:

```html
      <button id="tab-post_survey" onclick="switchTab('post_survey')">Graduates</button>
```

- [ ] **Step 2: Add Section 2 HTML inside #view-post_survey**

Find the closing of the existing first `chart-card` div and the Save button block inside `#view-post_survey` (currently lines 126–138):

```html
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
```

Replace with:

```html
      <div class="chart-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Stage</th></tr></thead>
            <tbody id="ps-tbody"></tbody>
          </table>
        </div>
        <div class="empty" id="ps-empty" style="display:none">All participants have completed the post-survey.</div>
      </div>

      <div class="section-header" style="margin-top:32px;display:flex;align-items:center;gap:16px">
        <h2 id="grad-header">List of Graduates (0)</h2>
        <button class="btn btn-outline" id="grad-sort-btn" onclick="toggleGradSort()" style="font-size:13px;padding:4px 12px">A → Z</button>
      </div>
      <div class="chart-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Stage</th><th>6-Month</th><th>Post Survey</th></tr></thead>
            <tbody id="grad-tbody"></tbody>
          </table>
        </div>
        <div class="empty" id="grad-empty" style="display:none">No graduates yet.</div>
      </div>

      <div style="margin-top:20px;display:flex;align-items:center;gap:12px">
        <button class="btn btn-primary" onclick="saveChanges('post_survey')">Save Changes</button>
      </div>
```

- [ ] **Step 3: Verify the tab still opens on `?view=post_survey`**

Open `admin.html?training_id=<any_id>&view=post_survey` in a browser. The tab button should read "Graduates" and be active. The page should load without JS errors.

- [ ] **Step 4: Commit**

```bash
git add portal/admin.html
git commit -m "feat: rename Post-Survey tab to Graduates, add List of Graduates section"
```

---

## Task 7: Manual smoke test

**No code changes — verification only.**

- [ ] **Step 1: Open admin page for a training that has graduates**

```
admin.html?training_id=<id_of_training_with_graduates>&view=post_survey
```

- [ ] **Step 2: Verify Section 1 (unchanged)**
  - Progress bar shows correct percentage
  - "Attended Training" participants appear with dropdown
  - Dropdown options: `["Attended Training", "Graduated or Post Evaluation Completed"]`

- [ ] **Step 3: Verify Section 2 (List of Graduates)**
  - Header shows correct count: `List of Graduates (N)`
  - Table columns: Name, Email, Stage, 6-Month, Post Survey
  - Post Survey column: all rows show green `Complete` badge
  - 6-Month column: at least one of green/yellow/grey badge per row depending on data
  - Stage dropdown options: `["Attended Training", "Graduated or Post Evaluation Completed"]`
  - Default sort: A → Z by name
  - Clicking "A → Z" button toggles to "Z → A" and re-sorts the table

- [ ] **Step 4: Verify Save Changes covers Section 2**
  - Change a Stage dropdown in the graduates section
  - Click Save Changes
  - Toast should report 1 change saved
  - Table re-renders with updated stage

- [ ] **Step 5: Deploy proxy update**

The proxy change (Task 1) requires redeployment to take effect:

```bash
npx wrangler pages deploy portal --project-name aktivasia-portal
```

Wait for deploy confirmation before testing against live data.
