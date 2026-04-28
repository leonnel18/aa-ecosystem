# Create Training — UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six UX improvements to `create-training.html/js` and `crm-proxy.js`: tag-style Language of Delivery, Contact lookup for Facilitators, Training Plan lookup, Training Details copy update, auto-resolved Training Owner, and Custom Questions section selector.

**Architecture:** All changes are client-side HTML/JS plus two new Worker routes (`GET /contacts/search` and `GET /training-plans/search`). The Owner email→ID resolution happens at submit time via a new `GET /users/search?email=` Worker route. No new files — all edits go into the three existing files.

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Worker (crm-proxy.js), Zoho CRM v6 REST API

---

## Files Modified

| File | Changes |
|---|---|
| `portal/create-training.html` | Language tag UI, facilitator typeahead markup, Training Plan typeahead, Training Details subtitle, Custom Questions section selector |
| `portal/js/create-training.js` | Language tag logic, facilitator lookup+add-new flow, Training Plan lookup, Owner auto-set, `serializeCustomQuestions` section field, `resetForm` updates |
| `portal/workers/crm-proxy.js` | `GET /contacts/search`, `GET /training-plans/search`, `GET /users/search` routes |

---

## Task 1: Language of Delivery — tag-style multi-select

Replace the plain text input with a tag-chip UI. Preset options render as toggleable chips. "Others" chip opens a text input; pressing Enter adds a free-text tag. All selected values join as a comma string sent to `Language_of_Delivery`.

**Files:**
- Modify: `portal/create-training.html` — replace `#Language_of_Delivery` field (~line 427)
- Modify: `portal/js/create-training.js` — add language tag functions, update payload + resetForm

- [ ] **Step 1: Replace the Language of Delivery HTML field.**

Find and replace this block in `portal/create-training.html`:

```html
    <div class="field">
      <label class="field-label" for="Language_of_Delivery">Language of Delivery</label>
      <input type="text" id="Language_of_Delivery" placeholder="e.g. English, Filipino">
      <div class="field-hint">Separate multiple languages with commas.</div>
    </div>
```

Replace with:

```html
    <div class="field" id="lang-field">
      <label class="field-label">Language of Delivery</label>
      <div id="lang-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <button type="button" class="lang-chip" data-lang="Filipino" onclick="toggleLang(this)">Filipino</button>
        <button type="button" class="lang-chip" data-lang="English" onclick="toggleLang(this)">English</button>
        <button type="button" class="lang-chip" data-lang="Urdu" onclick="toggleLang(this)">Urdu</button>
        <button type="button" class="lang-chip" data-lang="Bahasa Indonesia" onclick="toggleLang(this)">Bahasa Indonesia</button>
        <button type="button" class="lang-chip" data-lang="한국어" onclick="toggleLang(this)">한국어</button>
        <button type="button" class="lang-chip lang-chip--others" onclick="showLangOthers(this)">+ Others</button>
      </div>
      <div id="lang-others-row" style="display:none;gap:8px;align-items:center;margin-bottom:8px">
        <input type="text" id="lang-others-input" placeholder="Type language, press Enter" style="flex:1;min-height:38px;font-size:14px">
        <button type="button" class="btn-secondary btn" style="min-height:38px;padding:0 14px;font-size:13px" onclick="addCustomLang()">Add</button>
      </div>
      <div id="lang-custom-tags" style="display:flex;flex-wrap:wrap;gap:8px"></div>
      <div class="field-hint">Select all that apply. Use "Others" to add unlisted languages.</div>
    </div>
```

- [ ] **Step 2: Add `.lang-chip` CSS styles** inside the `<style>` block in `create-training.html`, before the closing `</style>`:

```css
    /* ── Language chips ── */
    .lang-chip {
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      border: 1.5px solid var(--border);
      background: var(--white);
      color: var(--text);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      line-height: 1.4;
    }
    .lang-chip.selected {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--white);
    }
    .lang-chip--others {
      border-style: dashed;
      color: var(--primary);
    }
    .lang-custom-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      background: var(--primary-light);
      border: 1.5px solid var(--primary);
      color: var(--primary);
    }
    .lang-custom-tag button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-size: 14px;
      line-height: 1;
      color: var(--primary);
    }
```

- [ ] **Step 3: Add language tag JS functions to `create-training.js`**, after the `onOrganisedByChange` function:

```javascript
// ── Language of Delivery tags ─────────────────────────────────────────────────
function toggleLang(chip) {
  chip.classList.toggle("selected");
}

function showLangOthers(btn) {
  const row = document.getElementById("lang-others-row");
  row.style.display = "flex";
  document.getElementById("lang-others-input").focus();
  btn.style.display = "none";
}

function addCustomLang() {
  const input = document.getElementById("lang-others-input");
  const text  = input.value.trim();
  if (!text) return;
  const container = document.getElementById("lang-custom-tags");
  const tag = document.createElement("span");
  tag.className = "lang-custom-tag";
  tag.dataset.lang = text;
  tag.innerHTML = `${escapeHtml(text)}<button type="button" onclick="this.parentElement.remove()" aria-label="Remove">×</button>`;
  container.appendChild(tag);
  input.value = "";
  input.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("lang-others-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); addCustomLang(); }
  });
});

function collectLanguages() {
  const selected = [...document.querySelectorAll(".lang-chip.selected")].map(c => c.dataset.lang);
  const custom   = [...document.querySelectorAll(".lang-custom-tag")].map(c => c.dataset.lang);
  return [...selected, ...custom].join(", ");
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
```

- [ ] **Step 4: Update payload in `submitTraining()`** — replace the `Language_of_Delivery` line:

Find:
```javascript
        Language_of_Delivery:        val("Language_of_Delivery") || undefined,
```
Replace with:
```javascript
        Language_of_Delivery:        collectLanguages() || undefined,
```

- [ ] **Step 5: Update `resetForm()`** — add language reset after the Countries Participated reset block:

```javascript
  // Reset language chips
  document.querySelectorAll(".lang-chip").forEach(c => c.classList.remove("selected"));
  document.getElementById("lang-custom-tags").innerHTML = "";
  document.getElementById("lang-others-row").style.display = "none";
  const othersBtn = document.querySelector(".lang-chip--others");
  if (othersBtn) othersBtn.style.display = "";
```

- [ ] **Step 6: Commit**

```bash
git add portal/create-training.html portal/js/create-training.js
git commit -m "feat: language of delivery tag-chip UI with preset options and free-type others"
```

---

## Task 2: Worker — add Contact search and Training Plans search routes

Add three new GET routes to `crm-proxy.js` before the `return jsonResponse({ error: "Not found" }...` line.

**Files:**
- Modify: `portal/workers/crm-proxy.js` (~line 227, before the `Not found` return)

- [ ] **Step 1: Add `GET /contacts/search?q=` route** — insert before `return jsonResponse({ error: "Not found" }, 404, origin);`:

```javascript
      // ── GET /contacts/search?q= ──────────────────────────────────────────────
      if (request.method === "GET" && path === "/contacts/search") {
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < 2) return jsonResponse({ data: [] }, 200, origin);
        const searchUrl = `${CRM_BASE}/Contacts/search?word=${encodeURIComponent(q)}&fields=id,Full_Name,Email&per_page=10`;
        const crmRes = await fetch(searchUrl, { headers: auth });
        const body   = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── POST /contacts ────────────────────────────────────────────────────────
      if (request.method === "POST" && path === "/contacts") {
        const payload = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Contacts`, {
          method:  "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── GET /training-plans/search?organised_by= ─────────────────────────────
      if (request.method === "GET" && path === "/training-plans/search") {
        const organisedBy = (url.searchParams.get("organised_by") ?? "").trim();
        // Fetch all Training Plans; filter client-side for unlinked ones
        // CRM module: Training_Plans
        const plansUrl = `${CRM_BASE}/Training_Plans?fields=id,Name,Organised_By&per_page=200`;
        const crmRes   = await fetch(plansUrl, { headers: auth });
        const body     = await crmRes.json();
        // Filter by organised_by if provided
        const plans = (body.data ?? []).filter(p =>
          !organisedBy || p.Organised_By === organisedBy
        );
        return jsonResponse({ data: plans }, 200, origin);
      }

      // ── GET /users/search?email= ──────────────────────────────────────────────
      if (request.method === "GET" && path === "/users/search") {
        const email = (url.searchParams.get("email") ?? "").trim();
        if (!email) return jsonResponse({ users: [] }, 200, origin);
        const usersUrl = `${CRM_BASE.replace("/crm/v6", "")}/crm/v2/users?type=AllUsers`;
        const crmRes   = await fetch(usersUrl, { headers: auth });
        const body     = await crmRes.json();
        const match    = (body.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase());
        return jsonResponse(match ? { users: [match] } : { users: [] }, 200, origin);
      }
```

- [ ] **Step 2: Deploy the updated worker**

```bash
cd portal/workers
npx wrangler deploy
```

Expected output: `✨ Successfully published your Worker`

- [ ] **Step 3: Commit**

```bash
git add portal/workers/crm-proxy.js
git commit -m "feat: add contacts/search, contacts POST, training-plans/search, users/search worker routes"
```

---

## Task 3: Facilitators — Contact typeahead + Add New Contact

Replace the plain text `.fac-name` inputs with a typeahead that searches `/contacts/search`. Each row stores a hidden Contact ID. "Add New Contact" appears when the search returns no results.

**Files:**
- Modify: `portal/create-training.html` — facilitator card markup (first slot ~line 523, `addFacilitator` template in JS)
- Modify: `portal/js/create-training.js` — `addFacilitator`, `removeFacilitator`, `collectFacilitators`, new typeahead + add-new-contact functions

- [ ] **Step 1: Add typeahead + add-new-contact CSS** inside `<style>` in `create-training.html`, before `</style>`:

```css
    /* ── Facilitator typeahead ── */
    .fac-typeahead-wrap { position: relative; }
    .fac-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0; right: 0;
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      z-index: 20;
      max-height: 200px;
      overflow-y: auto;
    }
    .fac-dropdown-item {
      padding: 10px 14px;
      font-size: 14px;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
    }
    .fac-dropdown-item:last-child { border-bottom: none; }
    .fac-dropdown-item:hover { background: var(--bg); }
    .fac-dropdown-item.add-new { color: var(--primary); font-weight: 600; }
    .fac-selected-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px 6px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      background: var(--primary-light);
      border: 1.5px solid var(--primary);
      color: var(--primary);
      width: 100%;
      justify-content: space-between;
    }
    .fac-selected-tag button {
      background: none; border: none; cursor: pointer;
      font-size: 15px; line-height: 1; color: var(--primary); padding: 0;
    }
    /* Add New Contact modal */
    .modal-overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.visible { display: flex; }
    .modal-card {
      background: var(--white);
      border-radius: var(--radius);
      padding: 28px 24px;
      width: min(440px, 90vw);
      box-shadow: 0 8px 32px rgba(0,0,0,0.16);
    }
    .modal-title { font-size: 18px; font-weight: 800; margin-bottom: 16px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
```

- [ ] **Step 2: Add "Add New Contact" modal HTML** in `create-training.html`, just before `</body>`:

```html
<!-- Add New Contact modal -->
<div class="modal-overlay" id="add-contact-modal">
  <div class="modal-card">
    <div class="modal-title">Add New Contact</div>
    <div class="field">
      <label class="field-label" for="nc-fullname">Full Name <span class="req">*</span></label>
      <input type="text" id="nc-fullname" placeholder="First and last name">
      <div class="field-error">Required.</div>
    </div>
    <div class="field">
      <label class="field-label" for="nc-email">Email</label>
      <input type="text" id="nc-email" placeholder="email@example.com">
    </div>
    <div class="field" style="margin-bottom:0">
      <label class="field-label" for="nc-role">Role / Position</label>
      <input type="text" id="nc-role" placeholder="e.g. Trainer, Coordinator">
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" onclick="closeAddContactModal()">Cancel</button>
      <button type="button" class="btn btn-primary" id="nc-save-btn" onclick="saveNewContact()">Save Contact</button>
    </div>
    <div class="status-msg" id="nc-status" style="text-align:left;margin-top:8px"></div>
  </div>
</div>
```

- [ ] **Step 3: Replace the first facilitator slot HTML** in `create-training.html`. The static slot (lines ~523–543) should become:

```html
    <div id="facilitators-container">
      <div class="facilitator-row" data-slot="1" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:start">
        <div class="field" style="margin-bottom:0">
          <label class="field-label">Name 1</label>
          <div class="fac-typeahead-wrap">
            <input type="text" class="fac-name" placeholder="Search contact name…" autocomplete="off" oninput="onFacInput(this)" onfocus="onFacInput(this)">
            <input type="hidden" class="fac-id">
            <div class="fac-dropdown" style="display:none"></div>
          </div>
        </div>
        <div class="field" style="margin-bottom:0">
          <label class="field-label">Role 1</label>
          <select class="fac-role">
            <option value="">— Select role —</option>
            <option value="Lead Facilitator">Lead Facilitator</option>
            <option value="Senior Facilitator">Senior Facilitator</option>
            <option value="Co-Facilitator">Co-Facilitator</option>
            <option value="Junior/ Peer Facilitator">Junior/ Peer Facilitator</option>
            <option value="Guest/ External Facilitator">Guest/ External Facilitator</option>
            <option value="Coach">Coach</option>
            <option value="Shadow Coach">Shadow Coach</option>
            <option value="Support">Support</option>
          </select>
        </div>
      </div>
    </div>
```

- [ ] **Step 4: Replace the `addFacilitator` function** in `create-training.js` to use the typeahead markup:

```javascript
function addFacilitator() {
  if (facilitatorCount >= 10) return;
  facilitatorCount++;
  const container = document.getElementById("facilitators-container");
  const row = document.createElement("div");
  row.className = "facilitator-row";
  row.dataset.slot = facilitatorCount;
  row.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:start;position:relative";
  row.innerHTML = `
    <div class="field" style="margin-bottom:0">
      <label class="field-label">Name ${facilitatorCount}
        <button type="button" class="btn-remove-q" style="float:right;margin-top:-2px" onclick="removeFacilitator(this)">× Remove</button>
      </label>
      <div class="fac-typeahead-wrap">
        <input type="text" class="fac-name" placeholder="Search contact name…" autocomplete="off" oninput="onFacInput(this)" onfocus="onFacInput(this)">
        <input type="hidden" class="fac-id">
        <div class="fac-dropdown" style="display:none"></div>
      </div>
    </div>
    <div class="field" style="margin-bottom:0">
      <label class="field-label">Role ${facilitatorCount}</label>
      <select class="fac-role">${ROLE_OPTIONS}</select>
    </div>
  `;
  container.appendChild(row);
  if (facilitatorCount >= 10) {
    document.getElementById("btn-add-facilitator").disabled = true;
  }
}
```

- [ ] **Step 5: Add facilitator typeahead functions** in `create-training.js`, replacing/appending after `collectFacilitators`:

```javascript
// ── Facilitator typeahead ─────────────────────────────────────────────────────
let facDebounceTimer = null;
let pendingFacRow    = null;

async function onFacInput(input) {
  const row      = input.closest(".facilitator-row");
  const dropdown = row.querySelector(".fac-dropdown");
  const q        = input.value.trim();

  clearTimeout(facDebounceTimer);
  if (q.length < 2) { dropdown.style.display = "none"; return; }

  facDebounceTimer = setTimeout(async () => {
    try {
      const res  = await fetch(`${PROXY_BASE}/contacts/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      renderFacDropdown(row, json.data ?? []);
    } catch { dropdown.style.display = "none"; }
  }, 280);
}

function renderFacDropdown(row, contacts) {
  const dropdown = row.querySelector(".fac-dropdown");
  dropdown.innerHTML = "";

  contacts.slice(0, 8).forEach(c => {
    const item = document.createElement("div");
    item.className = "fac-dropdown-item";
    item.textContent = c.Full_Name + (c.Email ? ` — ${c.Email}` : "");
    item.onclick = () => selectFacContact(row, c.id, c.Full_Name);
    dropdown.appendChild(item);
  });

  const addNew = document.createElement("div");
  addNew.className = "fac-dropdown-item add-new";
  addNew.textContent = "+ Add New Contact";
  addNew.onclick = () => openAddContactModal(row);
  dropdown.appendChild(addNew);

  dropdown.style.display = "block";
}

function selectFacContact(row, id, name) {
  row.querySelector(".fac-id").value   = id;
  row.querySelector(".fac-name").value = name;
  row.querySelector(".fac-dropdown").style.display = "none";
}

function openAddContactModal(row) {
  pendingFacRow = row;
  row.querySelector(".fac-dropdown").style.display = "none";
  document.getElementById("nc-fullname").value = "";
  document.getElementById("nc-email").value    = "";
  document.getElementById("nc-role").value     = "";
  document.getElementById("nc-status").textContent = "";
  document.getElementById("nc-save-btn").disabled  = false;
  document.getElementById("add-contact-modal").classList.add("visible");
}

function closeAddContactModal() {
  document.getElementById("add-contact-modal").classList.remove("visible");
  pendingFacRow = null;
}

async function saveNewContact() {
  const fullName = document.getElementById("nc-fullname").value.trim();
  if (!fullName) {
    document.getElementById("nc-fullname").closest(".field").classList.add("has-error");
    return;
  }
  document.getElementById("nc-fullname").closest(".field").classList.remove("has-error");

  const saveBtn = document.getElementById("nc-save-btn");
  saveBtn.disabled = true;
  document.getElementById("nc-status").textContent = "Saving…";

  try {
    const nameParts = fullName.split(" ");
    const payload   = {
      data: [{
        Last_Name:  nameParts.slice(1).join(" ") || nameParts[0],
        First_Name: nameParts.length > 1 ? nameParts[0] : "",
        Email:      document.getElementById("nc-email").value.trim() || undefined,
        Title:      document.getElementById("nc-role").value.trim()  || undefined,
      }]
    };
    const res  = await fetch(`${PROXY_BASE}/contacts`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const json = await res.json();
    const id   = json?.data?.[0]?.details?.id;
    if (!id) throw new Error(JSON.stringify(json));

    if (pendingFacRow) selectFacContact(pendingFacRow, id, fullName);
    closeAddContactModal();
  } catch (e) {
    document.getElementById("nc-status").textContent = "Error: " + e.message;
    saveBtn.disabled = false;
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", e => {
  if (!e.target.closest(".fac-typeahead-wrap")) {
    document.querySelectorAll(".fac-dropdown").forEach(d => d.style.display = "none");
  }
});
```

- [ ] **Step 6: Update `collectFacilitators`** to read from `.fac-id` (prefer ID over name text, fall back to name if no ID for slots 9–10):

```javascript
function collectFacilitators() {
  const result = {};
  document.querySelectorAll(".facilitator-row").forEach((row, i) => {
    const name = row.querySelector(".fac-name").value.trim();
    const id   = row.querySelector(".fac-id").value.trim();
    const role = row.querySelector(".fac-role").value;
    if (!name && !id && !role) return;
    const nameKey = FAC_NAME_KEYS[i];
    const roleKey = i < 5 ? FAC_ROLE_KEYS_1_5[i] : FAC_ROLE_KEYS_6_10[i - 5];
    // Slots 1–8 are CRM lookups → send {id}; slots 9–10 are plain text → send name string
    if (i < 8) {
      if (id)   result[nameKey] = { id };
      else if (name) result[nameKey] = name;
    } else {
      if (name) result[nameKey] = name;
    }
    if (role) result[roleKey] = role;
  });
  return result;
}
```

- [ ] **Step 7: Update `resetForm()`** — replace the facilitators-container innerHTML to use typeahead markup:

```javascript
  document.getElementById("facilitators-container").innerHTML = `
    <div class="facilitator-row" data-slot="1" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:start">
      <div class="field" style="margin-bottom:0">
        <label class="field-label">Name 1</label>
        <div class="fac-typeahead-wrap">
          <input type="text" class="fac-name" placeholder="Search contact name…" autocomplete="off" oninput="onFacInput(this)" onfocus="onFacInput(this)">
          <input type="hidden" class="fac-id">
          <div class="fac-dropdown" style="display:none"></div>
        </div>
      </div>
      <div class="field" style="margin-bottom:0">
        <label class="field-label">Role 1</label>
        <select class="fac-role">
          <option value="">— Select role —</option>
          <option value="Lead Facilitator">Lead Facilitator</option>
          <option value="Senior Facilitator">Senior Facilitator</option>
          <option value="Co-Facilitator">Co-Facilitator</option>
          <option value="Junior/ Peer Facilitator">Junior/ Peer Facilitator</option>
          <option value="Guest/ External Facilitator">Guest/ External Facilitator</option>
          <option value="Coach">Coach</option>
          <option value="Shadow Coach">Shadow Coach</option>
          <option value="Support">Support</option>
        </select>
      </div>
    </div>
  `;
  facilitatorCount = 1;
  document.getElementById("btn-add-facilitator").disabled = false;
```

- [ ] **Step 8: Commit**

```bash
git add portal/create-training.html portal/js/create-training.js
git commit -m "feat: facilitator contact typeahead with add-new-contact modal"
```

---

## Task 4: Training Plan — country-filtered lookup

Replace the plain text `#Training_Title_Plan` input with a typeahead that calls `/training-plans/search?organised_by=<value>` when `Organised_By` is selected.

**Files:**
- Modify: `portal/create-training.html` — replace `#Training_Title_Plan` field
- Modify: `portal/js/create-training.js` — add plan lookup functions, update `onOrganisedByChange`, update payload, update `resetForm`

- [ ] **Step 1: Replace the Training Plan field HTML** in `create-training.html`. Find:

```html
    <div class="field" style="margin-bottom:0">
      <label class="field-label" for="Training_Title_Plan">Training Plan Name</label>
      <input type="text" id="Training_Title_Plan" placeholder="e.g. PH Annual Plan 2026">
      <div class="field-hint">Enter the exact name of the Training Plan record in the CRM.</div>
    </div>
```

Replace with:

```html
    <div class="field" style="margin-bottom:0">
      <label class="field-label">Training Plan</label>
      <div style="position:relative">
        <input type="text" id="Training_Title_Plan_Display" placeholder="Select country first, then search…" autocomplete="off" oninput="onPlanInput(this)" onfocus="onPlanInput(this)" readonly>
        <input type="hidden" id="Training_Title_Plan">
        <div id="plan-dropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--white);border:1.5px solid var(--border);border-radius:var(--radius-sm);box-shadow:0 4px 16px rgba(0,0,0,0.08);z-index:20;max-height:200px;overflow-y:auto"></div>
      </div>
      <div class="field-hint">Filtered to plans matching the selected Country / Portal.</div>
    </div>
```

- [ ] **Step 2: Add plan lookup JS** in `create-training.js`, after the `collectLanguages` function:

```javascript
// ── Training Plan lookup ──────────────────────────────────────────────────────
let cachedPlans = [];

async function loadPlans(organisedBy) {
  const display = document.getElementById("Training_Title_Plan_Display");
  if (!organisedBy) {
    display.placeholder = "Select country first, then search…";
    display.readOnly    = true;
    cachedPlans = [];
    return;
  }
  display.placeholder = "Loading plans…";
  try {
    const res  = await fetch(`${PROXY_BASE}/training-plans/search?organised_by=${encodeURIComponent(organisedBy)}`);
    const json = await res.json();
    cachedPlans        = json.data ?? [];
    display.readOnly   = false;
    display.placeholder = cachedPlans.length
      ? `Search ${cachedPlans.length} plan(s)…`
      : "No plans found for this country";
  } catch {
    display.placeholder = "Failed to load plans";
  }
}

function onPlanInput(input) {
  const q        = input.value.trim().toLowerCase();
  const dropdown = document.getElementById("plan-dropdown");
  const matches  = q
    ? cachedPlans.filter(p => (p.Name ?? "").toLowerCase().includes(q))
    : cachedPlans;

  if (matches.length === 0) { dropdown.style.display = "none"; return; }

  dropdown.innerHTML = "";
  matches.slice(0, 10).forEach(p => {
    const item = document.createElement("div");
    item.className = "fac-dropdown-item";
    item.textContent = p.Name;
    item.onclick = () => {
      document.getElementById("Training_Title_Plan_Display").value = p.Name;
      document.getElementById("Training_Title_Plan").value         = p.id;
      dropdown.style.display = "none";
    };
    dropdown.appendChild(item);
  });
  dropdown.style.display = "block";
}

document.addEventListener("click", e => {
  if (!e.target.closest("#Training_Title_Plan_Display") && !e.target.closest("#plan-dropdown")) {
    document.getElementById("plan-dropdown").style.display = "none";
  }
});
```

- [ ] **Step 3: Update `onOrganisedByChange`** to also trigger `loadPlans`:

```javascript
function onOrganisedByChange(select) {
  const field = document.getElementById("countries-participated-field");
  field.style.display = select.value === "Regional" ? "" : "none";
  if (select.value !== "Regional") {
    document.getElementById("Countries_Participated").selectedIndex = -1;
  }
  loadPlans(select.value);
}
```

- [ ] **Step 4: Update payload** — `Training_Title_Plan` now sends the CRM record ID (already the hidden field value). The existing payload line `Training_Title_Plan: val("Training_Title_Plan") || undefined` stays correct since `val()` reads by id and the hidden field holds the plan ID.

No change needed — `val("Training_Title_Plan")` already reads the hidden input which holds the plan record ID.

- [ ] **Step 5: Update `resetForm()`** — add plan field reset:

```javascript
  // Reset Training Plan lookup
  document.getElementById("Training_Title_Plan_Display").value = "";
  document.getElementById("Training_Title_Plan").value         = "";
  document.getElementById("plan-dropdown").style.display       = "none";
  cachedPlans = [];
  document.getElementById("Training_Title_Plan_Display").placeholder = "Select country first, then search…";
  document.getElementById("Training_Title_Plan_Display").readOnly    = true;
```

- [ ] **Step 6: Commit**

```bash
git add portal/create-training.html portal/js/create-training.js
git commit -m "feat: training plan country-filtered lookup"
```

---

## Task 5: Training Details — subtitle copy update + Training Owner auto-set

**Files:**
- Modify: `portal/create-training.html` — subtitle text
- Modify: `portal/js/create-training.js` — Owner resolution at submit

- [ ] **Step 1: Update Training Details subtitle** in `create-training.html`. Find:

```html
    <div class="section-subtitle">Shown on the public training page — fill in before publishing</div>
```

Replace with:

```html
    <div class="section-subtitle">Optional — but highly advisable. This content will be shown on the public AktivAsia website training page.</div>
```

- [ ] **Step 2: Add Owner email map and resolution in `create-training.js`** — add after `COUNTRY_SLUG_MAP`:

```javascript
const OWNER_EMAIL_MAP = {
  "Philippines": "pilipinas@aktivasia.org",
  "Pakistan":    "pakistan@aktivasia.org",
  "Korea":       "korea@aktivasia.org",
  "Indonesia":   "indonesia@aktivasia.org",
  "Regional":    "regional@aktivasia.org",
};
```

- [ ] **Step 3: Add `resolveOwner` helper** in `create-training.js`, after the `OWNER_EMAIL_MAP` constant:

```javascript
async function resolveOwner(organisedBy) {
  const email = OWNER_EMAIL_MAP[organisedBy];
  if (!email) return undefined;
  try {
    const res  = await fetch(`${PROXY_BASE}/users/search?email=${encodeURIComponent(email)}`);
    const json = await res.json();
    const user = json?.users?.[0];
    return user?.id ? { id: user.id } : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Call `resolveOwner` in `submitTraining()`** — add it to the pre-payload setup block, after the `selectedCountries` line:

```javascript
    setStatus("Resolving training owner…");
    const ownerLookup = await resolveOwner(organisedBy);
```

Then add `Owner` to `payload.data[0]`:

```javascript
        Owner:                       ownerLookup || undefined,
```

Add this line directly after `Solution_Title` in the payload object.

- [ ] **Step 5: Commit**

```bash
git add portal/create-training.html portal/js/create-training.js
git commit -m "feat: training details copy update and auto-set training owner by country"
```

---

## Task 6: Custom Questions — add "Show in" section selector

Add a `<select class="q-section">` to each question card with options: Both (default), Pre-application only, Post-survey only. Include `section` in the serialized JSON.

**Files:**
- Modify: `portal/js/create-training.js` — `addQuestion` template, `serializeCustomQuestions`

- [ ] **Step 1: Update `addQuestion` template** in `create-training.js` — add the section selector field inside the card's innerHTML, after the `q-required-row` div:

Find the closing of the `card.innerHTML` template (the `</div>\n  ` before the closing backtick of `card.innerHTML`). Add this block before the closing backtick:

The full `card.innerHTML` assignment should end with:

```javascript
    <div class="q-required-row">
      <input type="checkbox" class="q-required" id="q-req-${idx}" checked>
      <label for="q-req-${idx}">Required field</label>
    </div>

    <div class="q-field" style="margin-top:8px">
      <label>Show in</label>
      <select class="q-section">
        <option value="both">Both forms (Pre-application &amp; Post-survey)</option>
        <option value="pre">Pre-application form only</option>
        <option value="post">Post-survey only</option>
      </select>
    </div>
  `;
```

So replace the existing end of the innerHTML:

```javascript
    <div class="q-required-row">
      <input type="checkbox" class="q-required" id="q-req-${idx}" checked>
      <label for="q-req-${idx}">Required field</label>
    </div>
  `;
```

with:

```javascript
    <div class="q-required-row">
      <input type="checkbox" class="q-required" id="q-req-${idx}" checked>
      <label for="q-req-${idx}">Required field</label>
    </div>

    <div class="q-field" style="margin-top:8px">
      <label>Show in</label>
      <select class="q-section">
        <option value="both">Both forms (Pre-application &amp; Post-survey)</option>
        <option value="pre">Pre-application form only</option>
        <option value="post">Post-survey only</option>
      </select>
    </div>
  `;
```

- [ ] **Step 2: Update `serializeCustomQuestions`** to include `section`:

```javascript
function serializeCustomQuestions() {
  const cards = document.querySelectorAll(".question-card");
  if (cards.length === 0) return "[]";

  const arr = [...cards].map(card => {
    const type    = card.querySelector(".q-type").value;
    const rawOpts = card.querySelector(".q-options").value.trim();
    const options = rawOpts
      ? rawOpts.split(",").map(o => o.trim()).filter(Boolean)
      : [];

    return {
      question_text: card.querySelector(".q-text").value.trim(),
      type,
      section:       card.querySelector(".q-section").value,
      instructions:  card.querySelector(".q-instructions").value.trim(),
      placeholder:   card.querySelector(".q-placeholder").value.trim(),
      translation:   card.querySelector(".q-translation").value.trim(),
      options:       (type === "dropdown" || type === "checkbox") ? options : [],
      required:      card.querySelector(".q-required").checked,
    };
  });

  return JSON.stringify(arr);
}
```

- [ ] **Step 3: Commit**

```bash
git add portal/js/create-training.js
git commit -m "feat: custom questions show-in section selector (both/pre/post)"
```

---

## Task 7: Deploy

- [ ] **Step 1: Deploy worker**

```bash
cd portal/workers && npx wrangler deploy
```

Expected: `✨ Successfully published your Worker`

- [ ] **Step 2: Deploy portal**

```bash
cd c:\Users\Rimuru\Desktop\github\leonnel18\aa-ecosystem
npx wrangler pages deploy portal --project-name aktivasia-portal --commit-dirty=true
```

Expected: `✨ Deployment complete!`

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 4: Smoke test in browser**
  - Open deployed URL → create-training page
  - Language of Delivery: click Filipino + English → chips turn primary colour. Click "+ Others" → type "Tagalog" + Enter → tag appears
  - Country = Regional → Countries Participated appears
  - Facilitators: type 2+ chars in Name 1 → dropdown appears with contacts. Click "Add New Contact" → modal opens, fill name, Save → name populates slot
  - Change Country → Training Plan field activates, shows plans for that country
  - Add a Custom Question → "Show in" dropdown visible with 3 options
  - Submit → network payload contains `Language_of_Delivery`, `Owner` with id, `Custom_Questions` JSON with `section` field

---

## Self-Review Notes

- Task 2 worker deploy must happen before Task 3/4/5 browser testing (routes must exist)
- `val("Training_Title_Plan")` reads the hidden `<input id="Training_Title_Plan">` which holds the plan record ID — correct, no change needed to payload line
- `removeFacilitator` renumbering logic reads `.fac-name.previousElementSibling` — still valid since the label is the sibling; first slot has no Remove button so slot 1 label renumber is safe
- `escapeHtml` is defined in Task 1 and used in Task 3 — consistent across tasks
- `PROXY_BASE` constant already defined at top of `create-training.js` — all new fetch calls use it correctly
