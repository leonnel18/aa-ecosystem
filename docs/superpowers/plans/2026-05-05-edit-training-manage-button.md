# Edit Training — Manage Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Training Report table's Manage link with an Edit button + dropdown that lets users edit training details via a pre-filled accordion modal or navigate to admin.html for participant management.

**Architecture:** The Edit button and its dropdown are rendered inline in `app.js`'s `renderRowFn`. Clicking "Edit Training Details" opens a full-screen modal injected into `portal.html`; the modal fetches the Solution record from the existing CRM proxy, pre-fills an accordion form, and saves via `PUT /solutions/:id`. No new files, no proxy changes.

**Tech Stack:** Vanilla JS, HTML/CSS in-page modal, existing Cloudflare Worker proxy at `https://crm-proxy.gideon-valera.workers.dev`

---

## File Map

| File | Change |
|------|--------|
| `portal/portal.html` | Add modal HTML after `</main>`, add `<style>` block for modal/dropdown/accordion/toast CSS |
| `portal/js/app.js` | Replace Manage cell at line 536; add all edit modal JS functions after `renderTrainingsTable` |

---

## Task 1: Add CSS for dropdown, modal, accordion, toast

**Files:**
- Modify: `portal/portal.html` — add `<style>` block inside `<head>` (before `</head>`)

- [ ] **Step 1: Add the style block**

Open `portal/portal.html`. Immediately before `</head>` (line ~10), add:

```html
  <style>
    /* ── Edit dropdown ── */
    .edit-cell { position: relative; display: inline-block; }
    .btn-edit {
      background: #f5c842; border: none; border-radius: 3px;
      padding: 4px 10px; font-size: 12px; font-weight: 700;
      color: #1a1a1a; cursor: pointer; white-space: nowrap;
    }
    .btn-edit:hover { background: #e6b830; }
    .edit-dropdown {
      position: absolute; right: 0; top: calc(100% + 4px);
      background: #fff; border: 1.5px solid #e2e0d8; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.12); z-index: 200;
      min-width: 210px; overflow: hidden;
    }
    .edit-dropdown a,
    .edit-dropdown button {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 10px 14px; background: none; border: none;
      text-align: left; font-size: 13px; font-weight: 600; color: #131625;
      cursor: pointer; text-decoration: none;
    }
    .edit-dropdown a:hover,
    .edit-dropdown button:hover { background: #f5f4ee; }

    /* ── Modal overlay ── */
    .edit-modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,.45); z-index: 500;
      align-items: center; justify-content: center;
    }
    .edit-modal-overlay.open { display: flex; }
    .edit-modal {
      background: #fff; border-radius: 16px;
      width: 90vw; max-width: 760px; max-height: 90vh;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,.2);
    }
    .edit-modal-header {
      padding: 20px 24px 16px; border-bottom: 1px solid #e2e0d8;
      display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0;
    }
    .edit-modal-header h2 { font-size: 18px; font-weight: 800; margin: 0 0 2px; }
    .edit-modal-header p  { font-size: 13px; color: #788099; margin: 0; }
    .btn-close-modal {
      background: none; border: none; font-size: 20px; cursor: pointer;
      color: #788099; line-height: 1; padding: 0 0 0 12px; flex-shrink: 0;
    }
    .edit-modal-body {
      overflow-y: auto; flex: 1; padding: 20px 24px;
    }
    .edit-modal-footer {
      padding: 14px 24px; border-top: 1px solid #e2e0d8;
      display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;
    }

    /* ── Accordion section cards ── */
    .acc-card {
      background: #fff; border: 1.5px solid #e2e0d8;
      border-radius: 12px; margin-bottom: 12px; overflow: hidden;
    }
    .acc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; cursor: pointer; user-select: none;
    }
    .acc-header:hover { background: #f9f8f4; }
    .acc-title { font-size: 15px; font-weight: 700; }
    .acc-chevron { font-size: 12px; color: #788099; transition: transform .2s; }
    .acc-card.open .acc-chevron { transform: rotate(90deg); }
    .acc-body { padding: 0 18px 18px; display: none; }
    .acc-card.open .acc-body { display: block; }

    /* ── Form fields inside modal ── */
    .edit-field { margin-bottom: 16px; }
    .edit-label { font-size: 13px; font-weight: 600; display: block; margin-bottom: 5px; }
    .edit-field input[type="text"],
    .edit-field input[type="number"],
    .edit-field input[type="date"],
    .edit-field select,
    .edit-field textarea {
      width: 100%; border: 1.5px solid #e2e0d8; border-radius: 8px;
      padding: 9px 12px; font-family: inherit; font-size: 14px;
      color: #131625; background: #fff; appearance: none;
    }
    .edit-field input:focus,
    .edit-field select:focus,
    .edit-field textarea:focus { outline: none; border-color: #821545; }
    .edit-field textarea { min-height: 72px; resize: vertical; }
    .edit-date-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }
    .edit-date-group-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: #788099; margin-bottom: 8px;
      padding-bottom: 6px; border-bottom: 1px solid #e2e0d8;
    }
    .edit-fac-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;
    }

    /* ── Buttons (modal) ── */
    .btn-save-edit {
      background: linear-gradient(135deg, #ff960b, #f93a3a);
      color: #fff; border: none; border-radius: 9999px;
      padding: 0 24px; height: 44px; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .btn-save-edit:disabled { opacity: .45; cursor: not-allowed; }
    .btn-cancel-edit {
      background: #f5f4ee; color: #131625; border: 1.5px solid #e2e0d8;
      border-radius: 9999px; padding: 0 20px; height: 44px;
      font-size: 14px; font-weight: 700; cursor: pointer;
    }

    /* ── Skeleton loader ── */
    .edit-skeleton { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
    .skel-line {
      height: 14px; border-radius: 6px; background: linear-gradient(90deg, #e2e0d8 25%, #f0ede6 50%, #e2e0d8 75%);
      background-size: 200% 100%; animation: shimmer 1.2s infinite;
    }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* ── Toast ── */
    .edit-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #131625; color: #fff; padding: 10px 20px; border-radius: 9999px;
      font-size: 13px; font-weight: 600; z-index: 600;
      opacity: 0; transition: opacity .3s; pointer-events: none;
    }
    .edit-toast.show { opacity: 1; }

    /* ── Footer error ── */
    .edit-footer-error {
      font-size: 12px; color: #e53e3e; margin-right: auto; align-self: center; display: none;
    }
  </style>
```

- [ ] **Step 2: Verify portal.html still loads correctly**

Open `portal/portal.html` in a browser (or `npx wrangler pages dev portal`). The page should render identically to before — no visible style changes yet.

---

## Task 2: Add modal HTML to portal.html

**Files:**
- Modify: `portal/portal.html` — add modal markup between `</main>` and `<footer>`

- [ ] **Step 1: Insert modal HTML**

In `portal/portal.html`, immediately after `</main>` (line 390) and before `<footer`, add:

```html
  <!-- ── Edit Training Modal ──────────────────────────────────────────── -->
  <div class="edit-modal-overlay" id="edit-modal-overlay">
    <div class="edit-modal" role="dialog" aria-modal="true">

      <div class="edit-modal-header">
        <div>
          <h2>Edit Training Details</h2>
          <p id="edit-modal-subtitle">—</p>
        </div>
        <button class="btn-close-modal" onclick="closeEditModal()" aria-label="Close">✕</button>
      </div>

      <div class="edit-modal-body" id="edit-modal-body">
        <!-- populated by JS -->
      </div>

      <div class="edit-modal-footer">
        <span class="edit-footer-error" id="edit-footer-error"></span>
        <button class="btn-cancel-edit" onclick="closeEditModal()">Cancel</button>
        <button class="btn-save-edit" id="btn-save-edit" onclick="saveTrainingEdit()">Save Changes</button>
      </div>

    </div>
  </div>

  <!-- Toast -->
  <div class="edit-toast" id="edit-toast"></div>
```

- [ ] **Step 2: Confirm modal is hidden on load**

Reload the portal page — the modal overlay should not be visible (it has `display:none` via the CSS from Task 1).

---

## Task 3: Replace Manage cell with Edit button + dropdown in app.js

**Files:**
- Modify: `portal/js/app.js:536`

- [ ] **Step 1: Replace the Manage cell**

In `portal/js/app.js`, find line 536:

```javascript
          <td>${t.id ? `<a href="admin.html?training_id=${t.id}&view=selection" style="background:#f5c842;padding:4px 10px;border-radius:3px;text-decoration:none;color:#1a1a1a;font-size:12px;font-weight:700;">Manage</a>` : '—'}</td>
```

Replace with:

```javascript
          <td>${t.id ? `<div class="edit-cell">
            <button class="btn-edit" onclick="toggleEditDropdown('${t.id}', event)">Edit ▾</button>
            <div class="edit-dropdown" id="edit-dd-${t.id}" style="display:none">
              <button onclick="openEditModal('${t.id}', ${JSON.stringify(t.name)})">✏️ Edit Training Details</button>
              <a href="admin.html?training_id=${t.id}&view=selection">👥 Edit Participant Status</a>
            </div>
          </div>` : '—'}</td>
```

- [ ] **Step 2: Add dropdown toggle + click-outside functions**

After the closing `}` of `renderTrainingsTable` (around line 540), add:

```javascript
  // ── Edit dropdown ──────────────────────────────────────────────────────────

  let _openDropdownId = null;

  function toggleEditDropdown(id, e) {
    e.stopPropagation();
    const dd = document.getElementById(`edit-dd-${id}`);
    if (!dd) return;
    const isOpen = dd.style.display !== 'none';
    closeAllEditDropdowns();
    if (!isOpen) {
      dd.style.display = 'block';
      _openDropdownId = id;
    }
  }

  function closeAllEditDropdowns() {
    if (_openDropdownId) {
      const dd = document.getElementById(`edit-dd-${_openDropdownId}`);
      if (dd) dd.style.display = 'none';
      _openDropdownId = null;
    }
  }

  document.addEventListener('click', closeAllEditDropdowns);
```

- [ ] **Step 3: Verify in browser**

Open the portal Training Report tab. Each training row with an ID should show an "Edit ▾" button. Clicking it should show a dropdown with two items. Clicking outside should close it. Clicking "👥 Edit Participant Status" should navigate to admin.html.

- [ ] **Step 4: Commit**

```bash
git add portal/portal.html portal/js/app.js
git commit -m "feat: add Edit button with dropdown to Training Report manage column"
```

---

## Task 4: Add modal open/close + skeleton loader functions

**Files:**
- Modify: `portal/js/app.js` — add after `closeAllEditDropdowns`

- [ ] **Step 1: Add constants and helper functions**

```javascript
  // ── Edit modal — constants ─────────────────────────────────────────────────

  const EDIT_PROXY = 'https://crm-proxy.gideon-valera.workers.dev';

  const EDIT_FIELDS = [
    'Solution_Title','Training_Title_Plan','Training_Type','Organised_By','Format',
    'Target_Participants','Start_Date','End_Date',
    'Application_Form_Open_Date','Application_Form_Close_Date',
    'Post_Survey_Open_Date','Post_Survey_Close_Date',
    'Venue','Venue_Address','Language_of_Delivery','Co_host','Countries_Participated',
    'Who_is_this_training_for','Training_Objectives','Approach_Pedagogy',
    'Costs_Covered','Costs_Not_Covered','Course_Access_Information',
    'Facilitator','Name_2','Name_3','Name_4','Name_5','Name_6','Name_7','Name_8','Name_9','Name_10',
    'Facilitator_Type_for_Trainer_1','Facilitator_Type_for_Trainer_2','Facilitator_Type_for_Trainer_3',
    'Facilitator_Type_for_Trainer_4','Facilitator_Type_for_Trainer_5',
    'Facilitator_Type_6','Facilitator_Type_7','Facilitator_Type_8','Facilitator_Type_9','Facilitator_Type_10',
  ].join(',');

  const FAC_NAME_KEYS      = ['Facilitator','Name_2','Name_3','Name_4','Name_5','Name_6','Name_7','Name_8','Name_9','Name_10'];
  const FAC_ROLE_KEYS_1_5  = ['Facilitator_Type_for_Trainer_1','Facilitator_Type_for_Trainer_2','Facilitator_Type_for_Trainer_3','Facilitator_Type_for_Trainer_4','Facilitator_Type_for_Trainer_5'];
  const FAC_ROLE_KEYS_6_10 = ['Facilitator_Type_6','Facilitator_Type_7','Facilitator_Type_8','Facilitator_Type_9','Facilitator_Type_10'];

  const TRAINING_TYPE_IDS = {
    'Foundational':               '773031000000354510',
    'Training of Trainers (TOT)': '773031000000354567',
    'Feminist Leadership':        '773031000000354572',
    'Public Narrative':           '773031000000354577',
  };

  const ROLE_OPTIONS_HTML = `
    <option value="">— Select role —</option>
    <option value="Lead Facilitator">Lead Facilitator</option>
    <option value="Senior Facilitator">Senior Facilitator</option>
    <option value="Co-Facilitator">Co-Facilitator</option>
    <option value="Junior/ Peer Facilitator">Junior/ Peer Facilitator</option>
    <option value="Guest/ External Facilitator">Guest/ External Facilitator</option>
    <option value="Coach">Coach</option>
    <option value="Shadow Coach">Shadow Coach</option>
    <option value="Support">Support</option>
  `.trim();

  let _editTrainingId = null;

  function showEditSkeleton() {
    document.getElementById('edit-modal-body').innerHTML = `
      <div class="edit-skeleton">
        <div class="skel-line" style="width:60%"></div>
        <div class="skel-line" style="width:100%"></div>
        <div class="skel-line" style="width:80%"></div>
        <div class="skel-line" style="width:100%"></div>
        <div class="skel-line" style="width:50%"></div>
        <div class="skel-line" style="width:100%"></div>
      </div>`;
  }

  function showEditToast(msg) {
    const t = document.getElementById('edit-toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  function setEditFooterError(msg) {
    const el = document.getElementById('edit-footer-error');
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function openEditModal(id, name) {
    closeAllEditDropdowns();
    _editTrainingId = id;
    document.getElementById('edit-modal-subtitle').textContent = name;
    document.getElementById('edit-modal-overlay').classList.add('open');
    setEditFooterError('');
    showEditSkeleton();
    loadTrainingForEdit(id);
  }

  function closeEditModal() {
    document.getElementById('edit-modal-overlay').classList.remove('open');
    _editTrainingId = null;
    document.getElementById('edit-modal-body').innerHTML = '';
  }
```

- [ ] **Step 2: Close modal on overlay click**

Add to the end of the same block (after `closeEditModal`):

```javascript
  document.getElementById('edit-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
```

- [ ] **Step 3: Verify modal opens/closes**

In the portal Training Report tab, click "Edit ▾" then "✏️ Edit Training Details". The modal should appear with the training name in the subtitle and a shimmer skeleton in the body. Clicking outside the modal panel or the ✕ button should close it. (The skeleton will stay since `loadTrainingForEdit` isn't implemented yet — that's fine.)

---

## Task 5: Implement loadTrainingForEdit — fetch + render accordion form

**Files:**
- Modify: `portal/js/app.js` — add after `closeEditModal` event listener

- [ ] **Step 1: Add accordion builder helper**

```javascript
  function makeAccSection(id, title, bodyHtml, openByDefault) {
    return `
      <div class="acc-card${openByDefault ? ' open' : ''}" id="acc-${id}">
        <div class="acc-header" onclick="toggleAcc('${id}')">
          <span class="acc-title">${title}</span>
          <span class="acc-chevron">▶</span>
        </div>
        <div class="acc-body">${bodyHtml}</div>
      </div>`;
  }

  function toggleAcc(id) {
    document.getElementById(`acc-${id}`).classList.toggle('open');
  }

  function field(label, inputHtml) {
    return `<div class="edit-field"><label class="edit-label">${label}</label>${inputHtml}</div>`;
  }

  function textInput(id, val) {
    const safe = (val ?? '').toString().replace(/"/g, '&quot;');
    return `<input type="text" id="ef-${id}" value="${safe}">`;
  }

  function dateInput(id, val) {
    const safe = (val ?? '').toString().replace(/"/g, '&quot;');
    return `<input type="date" id="ef-${id}" value="${safe}">`;
  }

  function numberInput(id, val) {
    return `<input type="number" id="ef-${id}" value="${val ?? ''}">`;
  }

  function textareaInput(id, val) {
    const safe = (val ?? '').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<textarea id="ef-${id}">${safe}</textarea>`;
  }

  function selectInput(id, options, selected) {
    const opts = options.map(o => {
      const sel = o.value === selected ? ' selected' : '';
      return `<option value="${o.value}"${sel}>${o.label}</option>`;
    }).join('');
    return `<select id="ef-${id}">${opts}</select>`;
  }
```

- [ ] **Step 2: Add loadTrainingForEdit**

```javascript
  async function loadTrainingForEdit(id) {
    try {
      const [solRes, plansRes] = await Promise.all([
        fetch(`${EDIT_PROXY}/solutions/${id}?fields=${EDIT_FIELDS}`),
        fetch(`${EDIT_PROXY}/training-plans/search?organised_by=`),
      ]);
      if (!solRes.ok) throw new Error(`CRM error ${solRes.status}`);
      const solJson   = await solRes.json();
      const plansJson = plansRes.ok ? await plansRes.json() : { data: [] };
      const d = solJson.data ?? solJson; // CRM returns { data: {...} } for single-record GET
      renderEditForm(d, plansJson.data ?? []);
    } catch (err) {
      document.getElementById('edit-modal-body').innerHTML = `
        <p style="color:#e53e3e;padding:24px 0">Failed to load training: ${err.message}</p>
        <button class="btn-cancel-edit" onclick="loadTrainingForEdit('${id}')">Retry</button>`;
    }
  }
```

- [ ] **Step 3: Add renderEditForm**

```javascript
  function renderEditForm(d, plans) {
    // ── Plan options ──
    const currentPlanId = d.Training_Title_Plan?.id ?? '';
    const planOpts = [{ value: '', label: '— None —' }].concat(
      plans.map(p => ({ value: p.id, label: p.Name }))
    );

    // ── Training type options ──
    const typeOpts = [
      { value: '', label: '— Select —' },
      { value: 'Foundational', label: 'Foundational' },
      { value: 'Training of Trainers (TOT)', label: 'Training of Trainers (TOT)' },
      { value: 'Feminist Leadership', label: 'Feminist Leadership' },
      { value: 'Public Narrative', label: 'Public Narrative' },
    ];
    const currentType = d.Training_Type?.name ?? d.Training_Type ?? '';

    // ── Organised By options ──
    const orgOpts = [
      { value: '', label: '— Select —' },
      { value: 'Philippines', label: 'Philippines' },
      { value: 'Pakistan', label: 'Pakistan' },
      { value: 'Korea', label: 'Korea' },
      { value: 'Indonesia', label: 'Indonesia' },
      { value: 'Regional', label: 'Regional' },
    ];
    const currentOrg = d.Organised_By ?? '';

    // ── Format options ──
    const formatOpts = [
      { value: '', label: '— None —' },
      { value: 'In-Person', label: 'In-Person' },
      { value: 'Online', label: 'Online' },
      { value: 'Hybrid', label: 'Hybrid' },
    ];

    // ── Section 1: Basic Info ──
    const basicHtml = [
      field('Training Plan', selectInput('Training_Title_Plan', planOpts, currentPlanId)),
      field('Training Title', textInput('Solution_Title', d.Solution_Title)),
      field('Training Type', selectInput('Training_Type', typeOpts, currentType)),
      field('Organised By',
        `<select id="ef-Organised_By" onchange="onEditOrgChange(this.value)">${
          orgOpts.map(o => `<option value="${o.value}"${o.value === currentOrg ? ' selected' : ''}>${o.label}</option>`).join('')
        }</select>`
      ),
      field('Format', selectInput('Format', formatOpts, d.Format ?? '')),
      field('Target Participants', numberInput('Target_Participants', d.Target_Participants)),
    ].join('');

    // ── Section 2: Dates ──
    const datesHtml = `
      <div class="edit-date-group-label">Training</div>
      <div class="edit-date-grid" style="margin-bottom:16px">
        ${field('Start Date', dateInput('Start_Date', d.Start_Date))}
        ${field('End Date', dateInput('End_Date', d.End_Date))}
      </div>
      <div class="edit-date-group-label">Application Form</div>
      <div class="edit-date-grid" style="margin-bottom:16px">
        ${field('Open Date', dateInput('Application_Form_Open_Date', d.Application_Form_Open_Date))}
        ${field('Close Date', dateInput('Application_Form_Close_Date', d.Application_Form_Close_Date))}
      </div>
      <div class="edit-date-group-label">Post Survey</div>
      <div class="edit-date-grid">
        ${field('Open Date', dateInput('Post_Survey_Open_Date', d.Post_Survey_Open_Date))}
        ${field('Close Date', dateInput('Post_Survey_Close_Date', d.Post_Survey_Close_Date))}
      </div>`;

    // ── Section 3: Location & Logistics ──
    const isRegional = currentOrg === 'Regional';
    const countriesAll = ['Philippines','Pakistan','Korea','Indonesia','Regional','India','Bangladesh','Myanmar','Sri Lanka','Nepal'];
    const selectedCountries = Array.isArray(d.Countries_Participated) ? d.Countries_Participated : [];
    const countriesHtml = `
      <select id="ef-Countries_Participated" multiple size="6" style="width:100%;border:1.5px solid #e2e0d8;border-radius:8px;padding:6px">
        ${countriesAll.map(c => `<option value="${c}"${selectedCountries.includes(c) ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
      <div style="font-size:11px;color:#788099;margin-top:4px">Hold Ctrl/Cmd to select multiple</div>`;
    const logisticsHtml = [
      field('Venue', textInput('Venue', d.Venue)),
      field('Venue Address', textInput('Venue_Address', d.Venue_Address)),
      field('Language of Delivery', textInput('Language_of_Delivery', d.Language_of_Delivery)),
      field('Co-host', textInput('Co_host', d.Co_host)),
      `<div class="edit-field" id="ef-countries-wrap" style="${isRegional ? '' : 'display:none'}">
        <label class="edit-label">Countries Participated</label>${countriesHtml}
      </div>`,
    ].join('');

    // ── Section 4: Training Content ──
    const contentHtml = [
      field('Who is this training for?', textareaInput('Who_is_this_training_for', d.Who_is_this_training_for)),
      field('Training Objectives', textareaInput('Training_Objectives', d.Training_Objectives)),
      field('Approach / Pedagogy', textareaInput('Approach_Pedagogy', d.Approach_Pedagogy)),
      field('Costs Covered', textareaInput('Costs_Covered', d.Costs_Covered)),
      field('Costs Not Covered', textareaInput('Costs_Not_Covered', d.Costs_Not_Covered)),
      field('Course Access Information', textareaInput('Course_Access_Information', d.Course_Access_Information)),
    ].join('');

    // ── Section 5: Facilitators ──
    let facHtml = '<div id="edit-fac-container">';
    for (let i = 0; i < 10; i++) {
      const nameKey = FAC_NAME_KEYS[i];
      const roleKey = i < 5 ? FAC_ROLE_KEYS_1_5[i] : FAC_ROLE_KEYS_6_10[i - 5];
      const nameVal = typeof d[nameKey] === 'object' ? (d[nameKey]?.name ?? '') : (d[nameKey] ?? '');
      const nameId  = typeof d[nameKey] === 'object' ? (d[nameKey]?.id ?? '') : '';
      const roleVal = d[roleKey] ?? '';
      facHtml += `
        <div class="edit-fac-row" data-slot="${i}">
          <div class="edit-field" style="margin-bottom:0">
            <label class="edit-label">Facilitator ${i + 1} Name</label>
            <input type="text" class="ef-fac-name" data-slot="${i}" value="${(nameVal).replace(/"/g,'&quot;')}" placeholder="Name">
            <input type="hidden" class="ef-fac-id"   data-slot="${i}" value="${nameId}">
          </div>
          <div class="edit-field" style="margin-bottom:0">
            <label class="edit-label">Role ${i + 1}</label>
            <select class="ef-fac-role" data-slot="${i}">
              ${ROLE_OPTIONS_HTML.replace(`value="${roleVal}"`, `value="${roleVal}" selected`)}
            </select>
          </div>
        </div>`;
    }
    facHtml += '</div>';

    // ── Render all sections ──
    document.getElementById('edit-modal-body').innerHTML = [
      makeAccSection('basic',      'Basic Info',            basicHtml,    true),
      makeAccSection('dates',      'Dates',                 datesHtml,    false),
      makeAccSection('logistics',  'Location & Logistics',  logisticsHtml,false),
      makeAccSection('content',    'Training Content',      contentHtml,  false),
      makeAccSection('facilitators','Facilitators',         facHtml,      false),
    ].join('');
  }

  function onEditOrgChange(val) {
    const wrap = document.getElementById('ef-countries-wrap');
    if (wrap) wrap.style.display = val === 'Regional' ? 'block' : 'none';
  }
```

- [ ] **Step 4: Verify form renders**

Open the modal for a training that has a CRM ID. After the skeleton, the accordion form should appear with all fields pre-filled. Expand each section to verify the fields are there. Verify Countries Participated is hidden unless Organised By = Regional.

---

## Task 6: Implement saveTrainingEdit — collect payload + PUT

**Files:**
- Modify: `portal/js/app.js` — add after `onEditOrgChange`

- [ ] **Step 1: Add saveTrainingEdit**

```javascript
  async function saveTrainingEdit() {
    if (!_editTrainingId) return;
    const saveBtn = document.getElementById('btn-save-edit');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    setEditFooterError('');

    try {
      // Collect facilitators
      const facPayload = {};
      document.querySelectorAll('.ef-fac-name').forEach((input, i) => {
        const name = input.value.trim();
        const id   = document.querySelector(`.ef-fac-id[data-slot="${i}"]`).value.trim();
        const role = document.querySelector(`.ef-fac-role[data-slot="${i}"]`).value;
        const nameKey = FAC_NAME_KEYS[i];
        const roleKey = i < 5 ? FAC_ROLE_KEYS_1_5[i] : FAC_ROLE_KEYS_6_10[i - 5];
        if (i < 8) {
          if (id) facPayload[nameKey] = { id };
        } else {
          if (name) facPayload[nameKey] = name;
        }
        if (role) facPayload[roleKey] = role;
      });

      // Collect Countries Participated (multi-select)
      const countriesSel = document.getElementById('ef-Countries_Participated');
      const selectedCountries = countriesSel
        ? [...countriesSel.selectedOptions].map(o => o.value)
        : [];

      // Collect Training Type as lookup id
      const typeLabel = document.getElementById('ef-Training_Type')?.value ?? '';
      const typeId    = TRAINING_TYPE_IDS[typeLabel];

      // Collect Training Plan as lookup id
      const planId = document.getElementById('ef-Training_Title_Plan')?.value ?? '';

      const v = id => (document.getElementById(`ef-${id}`)?.value ?? '').trim();

      const rawPayload = {
        Solution_Title:              v('Solution_Title') || undefined,
        Training_Type:               typeId ? { id: typeId } : undefined,
        Organised_By:                v('Organised_By') || undefined,
        Format:                      v('Format') || undefined,
        Target_Participants:         parseInt(v('Target_Participants'), 10) || undefined,
        Start_Date:                  v('Start_Date') || undefined,
        End_Date:                    v('End_Date') || undefined,
        Application_Form_Open_Date:  v('Application_Form_Open_Date') || undefined,
        Application_Form_Close_Date: v('Application_Form_Close_Date') || undefined,
        Post_Survey_Open_Date:       v('Post_Survey_Open_Date') || undefined,
        Post_Survey_Close_Date:      v('Post_Survey_Close_Date') || undefined,
        Venue:                       v('Venue') || undefined,
        Venue_Address:               v('Venue_Address') || undefined,
        Language_of_Delivery:        v('Language_of_Delivery') || undefined,
        Co_host:                     v('Co_host') || undefined,
        Countries_Participated:      selectedCountries.length ? selectedCountries : undefined,
        Training_Title_Plan:         planId ? { id: planId } : undefined,
        Who_is_this_training_for:    v('Who_is_this_training_for') || undefined,
        Training_Objectives:         v('Training_Objectives') || undefined,
        Approach_Pedagogy:           v('Approach_Pedagogy') || undefined,
        Costs_Covered:               v('Costs_Covered') || undefined,
        Costs_Not_Covered:           v('Costs_Not_Covered') || undefined,
        Course_Access_Information:   v('Course_Access_Information') || undefined,
        ...facPayload,
      };

      // Strip undefined
      const cleanPayload = Object.fromEntries(
        Object.entries(rawPayload).filter(([, val]) => val !== undefined)
      );

      const res  = await fetch(`${EDIT_PROXY}/solutions/${_editTrainingId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: [cleanPayload] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? `CRM error ${res.status}`);

      // Update the visible table row values from the form
      const newName = v('Solution_Title');
      const newStart = v('Start_Date');
      const newEnd   = v('End_Date');
      const newType  = typeLabel;
      const row = document.querySelector(`#edit-dd-${_editTrainingId}`)?.closest('tr');
      if (row) {
        const cells = row.querySelectorAll('td');
        if (newName  && cells[0]) cells[0].textContent = newName;
        if (newType  && cells[1]) cells[1].textContent = newType;
        if (newStart && cells[2]) cells[2].textContent = newStart;
        if (newEnd   && cells[3]) cells[3].textContent = newEnd;
      }

      showEditToast('Training updated ✓');
      setTimeout(closeEditModal, 1500);

    } catch (err) {
      setEditFooterError(`Save failed: ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }
```

- [ ] **Step 2: End-to-end test**

1. Open portal Training Report tab
2. Click "Edit ▾" → "✏️ Edit Training Details" on a training with applicants
3. Wait for the form to load — verify all fields are pre-filled
4. Change the Training Title to something recognizable (e.g. append " TEST")
5. Click "Save Changes"
6. Verify: spinner appears on button, success toast appears, modal closes after ~1.5s, table row title updates
7. Reopen the modal for the same training — verify the new title is reflected in the fetched data
8. Undo the test change by editing again and reverting the title

- [ ] **Step 3: Test error state**

Temporarily pass an invalid training ID (edit the JS in devtools to use `_editTrainingId = 'bad-id'` before saving). Verify that the footer shows a red error message and the modal stays open.

- [ ] **Step 4: Final commit**

```bash
git add portal/portal.html portal/js/app.js
git commit -m "feat: edit training details modal with accordion form and CRM save"
```

---

## Verification Checklist

- [ ] Training rows with an ID show "Edit ▾" button; rows without an ID show "—"
- [ ] Dropdown shows ✏️ and 👥 items with correct icons
- [ ] Only one dropdown open at a time; clicking outside closes it
- [ ] 👥 navigates to `admin.html?training_id=...&view=selection`
- [ ] ✏️ opens modal with skeleton → pre-filled accordion form
- [ ] Basic Info section is open by default; others collapsed and expandable
- [ ] Countries Participated hidden unless Organised By = Regional
- [ ] All 10 facilitator slots are pre-filled if data exists
- [ ] Save sends PUT to proxy, shows toast, updates row, closes modal
- [ ] Save error shows inline footer message and keeps modal open
- [ ] Modal closes on ✕ button, Cancel button, and clicking the overlay backdrop
