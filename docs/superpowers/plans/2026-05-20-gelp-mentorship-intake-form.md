# GELP Mentorship Intake Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-part bilingual (Bahasa Indonesia / English) intake form at `portal/mentorship-intake-id.html` that lets Gender Equity Leadership Program participants find their name and submit 4 pre-mentorship questions, saving answers to their Deal's `Custom_Responses` field in Zoho CRM.

**Architecture:** A standalone static HTML page + JS file following the `apply-id.html` / `form-apply-id.js` pattern. Part 1 fetches participants live from a new `GET /gelp-participants` Worker endpoint and filters client-side. Part 2 collects 4 textarea answers and PATCHes the existing `PUT /deals/:id` Worker endpoint with a plain-text formatted string written to `Custom_Responses`.

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Worker (`crm-proxy.js`), Zoho CRM REST API v6, deployed via `npx wrangler`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `portal/mentorship-intake-id.html` | Page structure: header, Part 1 search, Part 2 form, success screen |
| Create | `portal/js/form-mentorship-intake-id.js` | All JS: fetch participants, filter, validate, submit, write to CRM |
| Modify | `portal/workers/crm-proxy.js` | Add `GET /gelp-participants` endpoint |

---

## Task 1: Add `GET /gelp-participants` to the Worker

**Files:**
- Modify: `portal/workers/crm-proxy.js`

The Worker already has a `GET /deals/search` endpoint and a `GET /solutions` endpoint. We add a new dedicated route that:
1. Fetches all Deals where `Training_Applied` is the GELP training and Stage is in the allowed set
2. Uses REST GET pagination (per_page=200, loop until `more_records == false`)
3. Returns `[{ id, name }]` sorted A–Z

The GELP training name is `"Gender Equity Leadership Program"`. We filter by first searching Solutions for a record with that name to get its ID, then fetch Deals by `Training_Applied` ID. Alternatively — and simpler — use the existing search endpoint pattern with a COQL-style filter via the `/Deals` REST endpoint with criteria.

Zoho REST criteria format: `(Training_Applied:equals:SOLUTION_ID)and((Stage:equals:Selected)or(Stage:equals:Attended Training)or(Stage:equals:Graduated or Post Evaluation Completed))`

Since we need the Solution ID for GELP, hardcode it after verifying. The ID can be found by calling `GET /solutions?fields=Solution_Title,id` and filtering by name — do this once manually or in a setup step. **The GELP Solution ID must be confirmed before deploying.** See Step 4 below.

- [ ] **Step 1: Open `portal/workers/crm-proxy.js` and locate the routing block**

Find the section that reads like:
```javascript
if (path === "/solutions" && method === "GET") { ... }
```
This is where you'll add the new route. Add it before the final `return notFound()` or similar fallback.

- [ ] **Step 2: Add the `GET /gelp-participants` route**

Add this block inside the main request handler, after existing routes:

```javascript
if (path === "/gelp-participants" && method === "GET") {
  const token = await getAccessToken(env);

  // GELP Solution ID — confirm this value in Zoho CRM before deploying
  const GELP_SOLUTION_ID = "773031000008276089";

  const stages = [
    "Selected",
    "Attended Training",
    "Graduated or Post Evaluation Completed",
  ];
  const stageCriteria = stages
    .map((s) => `(Stage:equals:${s})`)
    .join("or");
  const criteria = `(Training_Applied:equals:${GELP_SOLUTION_ID})and(${stageCriteria})`;

  let page = 1;
  let allDeals = [];
  let moreRecords = true;

  while (moreRecords) {
    const url = `${CRM_BASE}/Deals?fields=id,Deal_Name&criteria=${encodeURIComponent(criteria)}&per_page=200&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: corsHeaders(origin),
      });
    }
    const json = await res.json();
    const records = json.data || [];
    allDeals = allDeals.concat(records);
    moreRecords = json.info?.more_records === true;
    page++;
  }

  const participants = allDeals
    .map((d) => ({ id: d.id, name: d.Deal_Name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return new Response(JSON.stringify(participants), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}
```

> Note: `CRM_BASE`, `getAccessToken`, and `corsHeaders` are already defined in the file — use them as-is.

- [ ] **Step 3: Verify `PUT /deals/:id` already exists**

Search the file for `PUT /deals/:id` or `method === "PUT"` with `deals`. It exists — confirm the route accepts a JSON body and forwards it to Zoho CRM's `PUT /Deals/:id`. No changes needed here.

- [ ] **Step 4: Confirm the GELP Solution ID**

Open Zoho CRM → Solutions module → find "Gender Equity Leadership Program" → copy the record ID from the URL. It should be `773031000008276089` (from the `.tmp/sample_deal.json` seen in the codebase). If different, update `GELP_SOLUTION_ID` in the route above.

- [ ] **Step 5: Deploy the Worker**

```bash
cd portal/workers
npx wrangler deploy
```

Expected output: `Deployed crm-proxy ... (current)` with a Workers URL.

- [ ] **Step 6: Smoke-test the new endpoint**

```bash
curl "https://crm-proxy.gideon-valera.workers.dev/gelp-participants"
```

Expected: a JSON array like `[{"id":"773031000008793036","name":"Antonia Morita Iswari Saktiawati"}, ...]`

If empty array: the GELP Solution ID or stage filter is wrong — re-check Step 4.
If 401/403: token issue — check `env.ZOHO_REFRESH_TOKEN` in Wrangler secrets.

- [ ] **Step 7: Commit**

```bash
git add portal/workers/crm-proxy.js
git commit -m "feat: add GET /gelp-participants Worker endpoint"
```

---

## Task 2: Create `portal/mentorship-intake-id.html`

**Files:**
- Create: `portal/mentorship-intake-id.html`

Follows the exact same structure as `apply-id.html`: site header, a content wrapper with two screens (Part 1 and Part 2), and a success screen. Uses the same CSS variables and `portal/css/style.css`.

- [ ] **Step 1: Create the file with this full content**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Formulir Pra-Mentoring GELP</title>
  <link rel="stylesheet" href="css/style.css" />
  <style>
    .intake-wrap {
      max-width: 600px;
      margin: 40px auto;
      padding: 0 20px 80px;
    }
    .intake-card {
      background: var(--white);
      border-radius: var(--radius);
      padding: 32px;
      border: 1px solid var(--border);
    }
    .intake-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 4px;
    }
    .intake-subtitle {
      font-size: 0.85rem;
      color: var(--meta);
      margin-bottom: 28px;
    }
    .search-box {
      position: relative;
      margin-bottom: 8px;
    }
    .search-box input {
      width: 100%;
      height: var(--input-h);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0 16px;
      font-size: 1rem;
      box-sizing: border-box;
      background: var(--bg);
      color: var(--text);
    }
    .search-box input:focus {
      outline: none;
      border-color: var(--primary);
    }
    .name-results {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
      max-height: 240px;
      overflow-y: auto;
      display: none;
    }
    .name-results.open { display: block; }
    .name-result-item {
      padding: 12px 16px;
      cursor: pointer;
      font-size: 0.95rem;
      color: var(--text);
      border-bottom: 1px solid var(--border);
    }
    .name-result-item:last-child { border-bottom: none; }
    .name-result-item:hover,
    .name-result-item.selected {
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
    }
    .selected-name-display {
      margin-top: 12px;
      font-size: 0.9rem;
      color: var(--meta);
      min-height: 20px;
    }
    .selected-name-display strong { color: var(--text); }
    .field-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 2px;
      display: block;
    }
    .field-label-en {
      font-size: 0.8rem;
      color: var(--meta);
      font-weight: 400;
      display: block;
      margin-bottom: 8px;
    }
    .field { margin-bottom: 24px; }
    .field textarea {
      width: 100%;
      min-height: 100px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      font-size: 0.95rem;
      box-sizing: border-box;
      background: var(--bg);
      color: var(--text);
      resize: vertical;
      font-family: inherit;
    }
    .field textarea:focus {
      outline: none;
      border-color: var(--primary);
    }
    .field-error {
      font-size: 0.8rem;
      color: #e53e3e;
      margin-top: 4px;
      display: none;
    }
    .field.has-error textarea,
    .field.has-error input {
      border-color: #e53e3e;
    }
    .field.has-error .field-error { display: block; }
    .btn-primary {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, var(--cta-start), var(--cta-end));
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      width: 100%;
      margin-top: 8px;
    }
    .btn-primary:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .btn-back-link {
      display: inline-block;
      margin-top: 12px;
      font-size: 0.85rem;
      color: var(--meta);
      cursor: pointer;
      text-align: center;
      width: 100%;
    }
    .btn-back-link:hover { color: var(--primary); }
    .status-msg {
      text-align: center;
      font-size: 0.9rem;
      color: var(--meta);
      padding: 12px 0;
    }
    .status-msg.error { color: #e53e3e; }
    .success-screen {
      text-align: center;
      padding: 48px 24px;
    }
    .success-screen .check-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    .success-screen h2 {
      color: var(--primary);
      font-size: 1.3rem;
      margin-bottom: 8px;
    }
    .success-screen p {
      color: var(--meta);
      font-size: 0.95rem;
    }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <header id="site-header" class="site-header">
    <div class="header-inner">
      <a href="index.html" class="logo-link">
        <img src="img/logo.png" alt="AktivAsia" class="logo" onerror="this.style.display='none'" />
      </a>
    </div>
  </header>

  <div class="intake-wrap">

    <!-- Part 1: Name Search -->
    <div id="part-1" class="intake-card">
      <div class="intake-title">Formulir Pra-Mentoring GELP</div>
      <div class="intake-subtitle">GELP Pre-Mentoring Intake Form</div>

      <div id="loading-msg" class="status-msg">Memuat daftar peserta... / Loading participant list...</div>
      <div id="error-msg" class="status-msg error" hidden>
        Gagal memuat data. Silakan coba lagi. / Failed to load data. Please try again.
      </div>

      <div id="search-area" hidden>
        <label class="field-label" for="name-search">Cari nama Anda</label>
        <span class="field-label-en">Search your name</span>
        <div class="search-box">
          <input
            type="text"
            id="name-search"
            placeholder="Ketik nama Anda... / Type your name..."
            autocomplete="off"
          />
        </div>
        <div id="name-results" class="name-results" role="listbox"></div>
        <div id="selected-name-display" class="selected-name-display"></div>

        <button id="btn-next" class="btn-primary" disabled>Lanjut / Next</button>
      </div>
    </div>

    <!-- Part 2: Questions -->
    <div id="part-2" class="intake-card" hidden>
      <div class="intake-title">Pertanyaan Mentoring</div>
      <div class="intake-subtitle">Mentoring Questions</div>

      <div class="field" id="field-q1">
        <label class="field-label" for="q1">Apa fokus penelitian atau advokasi utama Anda saat ini?</label>
        <span class="field-label-en">What is the primary focus of your current research or advocacy work?</span>
        <textarea id="q1" rows="4"></textarea>
        <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
      </div>

      <div class="field" id="field-q2">
        <label class="field-label" for="q2">Area apa yang ingin Anda kembangkan atau dalami melalui proses mentoring ini?</label>
        <span class="field-label-en">What areas would you like to develop or deepen through this mentoring process?</span>
        <textarea id="q2" rows="4"></textarea>
        <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
      </div>

      <div class="field" id="field-q3">
        <label class="field-label" for="q3">Apa tantangan atau kesenjangan utama dalam pekerjaan Anda yang membutuhkan eksplorasi atau dukungan lebih lanjut?</label>
        <span class="field-label-en">What are the key challenges or gaps in your work that need further exploration or support?</span>
        <textarea id="q3" rows="4"></textarea>
        <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
      </div>

      <div class="field" id="field-q4">
        <label class="field-label" for="q4">Keterampilan, pengetahuan, atau pengalaman apa yang dapat Anda tawarkan kepada peserta lain dalam program ini?</label>
        <span class="field-label-en">What skills, knowledge, or experience can you offer to other participants in this program?</span>
        <textarea id="q4" rows="4"></textarea>
        <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
      </div>

      <div id="submit-error" class="status-msg error" hidden>
        Terjadi kesalahan. Silakan coba lagi. / Something went wrong. Please try again.
      </div>

      <button id="btn-submit" class="btn-primary">Kirim / Submit</button>
      <div class="btn-back-link" id="btn-back">&#8592; Kembali / Back</div>
    </div>

    <!-- Success Screen -->
    <div id="success-screen" class="intake-card success-screen" hidden>
      <div class="check-icon">✅</div>
      <h2>Terima kasih!</h2>
      <p>Jawaban Anda telah disimpan.<br /><em>Your responses have been saved.</em></p>
    </div>

  </div>

  <script src="js/form-mentorship-intake-id.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the file was created**

```bash
ls portal/mentorship-intake-id.html
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add portal/mentorship-intake-id.html
git commit -m "feat: add mentorship-intake-id.html shell"
```

---

## Task 3: Create `portal/js/form-mentorship-intake-id.js`

**Files:**
- Create: `portal/js/form-mentorship-intake-id.js`

This file handles all logic: fetching the participant list, live search filtering, Part 1 → Part 2 transition, validation, formatting the CRM payload, and submitting.

- [ ] **Step 1: Create the file with this full content**

```javascript
const PROXY_BASE = "https://crm-proxy.gideon-valera.workers.dev";

let allParticipants = []; // [{ id, name }]
let selectedParticipant = null; // { id, name }
let isSubmitting = false;

// DOM refs
const part1 = document.getElementById("part-1");
const part2 = document.getElementById("part-2");
const successScreen = document.getElementById("success-screen");
const loadingMsg = document.getElementById("loading-msg");
const errorMsg = document.getElementById("error-msg");
const searchArea = document.getElementById("search-area");
const nameSearch = document.getElementById("name-search");
const nameResults = document.getElementById("name-results");
const selectedNameDisplay = document.getElementById("selected-name-display");
const btnNext = document.getElementById("btn-next");
const btnBack = document.getElementById("btn-back");
const btnSubmit = document.getElementById("btn-submit");
const submitError = document.getElementById("submit-error");

// ── Part 1: Load participants ──────────────────────────────────────────────

async function loadParticipants() {
  try {
    const res = await fetch(`${PROXY_BASE}/gelp-participants`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allParticipants = await res.json();
    loadingMsg.hidden = true;
    searchArea.hidden = false;
  } catch (e) {
    loadingMsg.hidden = true;
    errorMsg.hidden = false;
  }
}

// ── Part 1: Live search ────────────────────────────────────────────────────

nameSearch.addEventListener("input", () => {
  const q = nameSearch.value.trim().toLowerCase();
  renderResults(q);
});

nameSearch.addEventListener("focus", () => {
  const q = nameSearch.value.trim().toLowerCase();
  if (q.length > 0) renderResults(q);
});

document.addEventListener("click", (e) => {
  if (!nameSearch.contains(e.target) && !nameResults.contains(e.target)) {
    nameResults.classList.remove("open");
  }
});

function renderResults(q) {
  nameResults.innerHTML = "";
  if (!q) {
    nameResults.classList.remove("open");
    return;
  }
  const matches = allParticipants.filter((p) =>
    p.name.toLowerCase().includes(q)
  );
  if (matches.length === 0) {
    nameResults.classList.remove("open");
    return;
  }
  matches.forEach((p) => {
    const item = document.createElement("div");
    item.className = "name-result-item";
    item.setAttribute("role", "option");
    item.textContent = p.name;
    item.addEventListener("click", () => selectParticipant(p));
    nameResults.appendChild(item);
  });
  nameResults.classList.add("open");
}

function selectParticipant(p) {
  selectedParticipant = p;
  nameSearch.value = p.name;
  nameResults.classList.remove("open");
  selectedNameDisplay.innerHTML = `Dipilih: <strong>${p.name}</strong> &nbsp;·&nbsp; <em style="font-size:0.8rem;color:var(--meta)">Bukan Anda? Ketik ulang. / Not you? Type again.</em>`;
  btnNext.disabled = false;
}

nameSearch.addEventListener("input", () => {
  if (selectedParticipant && nameSearch.value !== selectedParticipant.name) {
    selectedParticipant = null;
    selectedNameDisplay.innerHTML = "";
    btnNext.disabled = true;
  }
});

// ── Part 1 → Part 2 ────────────────────────────────────────────────────────

btnNext.addEventListener("click", () => {
  if (!selectedParticipant) return;
  part1.hidden = true;
  part2.hidden = false;
});

btnBack.addEventListener("click", () => {
  part2.hidden = true;
  part1.hidden = false;
  submitError.hidden = true;
});

// ── Part 2: Validation ─────────────────────────────────────────────────────

function validatePart2() {
  let valid = true;
  ["q1", "q2", "q3", "q4"].forEach((id) => {
    const textarea = document.getElementById(id);
    const field = document.getElementById(`field-${id}`);
    if (!textarea.value.trim()) {
      field.classList.add("has-error");
      valid = false;
    } else {
      field.classList.remove("has-error");
    }
  });
  return valid;
}

// ── Part 2: Submit ─────────────────────────────────────────────────────────

btnSubmit.addEventListener("click", async () => {
  if (isSubmitting) return;
  submitError.hidden = true;

  if (!validatePart2()) return;

  isSubmitting = true;
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Menyimpan... / Saving...";

  const q1 = document.getElementById("q1").value.trim();
  const q2 = document.getElementById("q2").value.trim();
  const q3 = document.getElementById("q3").value.trim();
  const q4 = document.getElementById("q4").value.trim();

  const payload = formatPayload(q1, q2, q3, q4);

  try {
    const res = await fetch(
      `${PROXY_BASE}/deals/${selectedParticipant.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Custom_Responses: payload }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    part2.hidden = true;
    successScreen.hidden = false;
  } catch (e) {
    submitError.hidden = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Kirim / Submit";
  } finally {
    isSubmitting = false;
  }
});

// ── Payload formatter ──────────────────────────────────────────────────────

function formatPayload(q1, q2, q3, q4) {
  return (
    `[Fokus Penelitian]\n${q1}\n\n` +
    `[Area Pengembangan]\n${q2}\n\n` +
    `[Tantangan & Kesenjangan]\n${q3}\n\n` +
    `[Kontribusi untuk Jaringan]\n${q4}`
  );
}

// ── Init ───────────────────────────────────────────────────────────────────

loadParticipants();
```

- [ ] **Step 2: Verify the file was created**

```bash
ls portal/js/form-mentorship-intake-id.js
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add portal/js/form-mentorship-intake-id.js
git commit -m "feat: add form-mentorship-intake-id.js logic"
```

---

## Task 4: End-to-End Verification

**Files:** No changes — read-only testing.

- [ ] **Step 1: Serve the portal locally**

```bash
cd portal
npx serve . -p 3000
```

Or if using the existing dev server pattern from the project, use that.

- [ ] **Step 2: Open the form**

Navigate to: `http://localhost:3000/mentorship-intake-id.html`

Expected: Page loads with "Memuat daftar peserta..." then transitions to the search box.

- [ ] **Step 3: Test name search**

Type a partial name (e.g. "ant"). Expected: dropdown appears with matching names. Click a name. Expected: name highlighted, "Lanjut / Next" button becomes active, selected name display shows below the search box.

- [ ] **Step 4: Test Next button disabled state**

Before selecting a name, confirm "Lanjut / Next" is greyed out and unclickable.

- [ ] **Step 5: Navigate to Part 2**

Click "Lanjut / Next". Expected: Part 1 hides, Part 2 shows with all 4 questions.

- [ ] **Step 6: Test validation**

Click "Kirim / Submit" without filling any fields. Expected: all 4 fields show red border and error message "Mohon isi pertanyaan ini."

- [ ] **Step 7: Test Back navigation**

Click "← Kembali / Back". Expected: returns to Part 1 with name still selected.

- [ ] **Step 8: Fill and submit**

Fill all 4 questions with test text and click "Kirim / Submit". Expected: button shows "Menyimpan...", then success screen appears with checkmark and thank-you message.

- [ ] **Step 9: Verify in Zoho CRM**

Open Zoho CRM → Deals → find the test participant's record → check the `Custom_Responses` field. Expected content:

```
[Fokus Penelitian]
<your Q1 answer>

[Area Pengembangan]
<your Q2 answer>

[Tantangan & Kesenjangan]
<your Q3 answer>

[Kontribusi untuk Jaringan]
<your Q4 answer>
```

- [ ] **Step 10: Deploy to Cloudflare Pages**

```bash
npx wrangler pages deploy portal --project-name aktivasia-portal
```

Expected: Deployment URL printed. Open the live URL and repeat Steps 2–8 on production.

- [ ] **Step 11: Final commit**

```bash
git add portal/mentorship-intake-id.html portal/js/form-mentorship-intake-id.js portal/workers/crm-proxy.js
git commit -m "feat: GELP mentorship intake form — complete"
```

---

## Pre-Launch Manual Checklist (Gino)

- [ ] Confirm `Custom_Responses` field is visible on the Deals layout in Zoho CRM
- [ ] Confirm GELP Solution ID `773031000008276089` is correct (check CRM URL for the GELP Solutions record)
- [ ] Deploy Worker: `npx wrangler deploy` from `portal/workers/`
- [ ] Deploy portal: `npx wrangler pages deploy portal --project-name aktivasia-portal`
