# GELP Research Mapping Form Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live HTML report page at `portal/mentorship-intake-report-id.html` that shows which GELP Indonesia participants have or haven't submitted their Research Mapping intake form, displays their answers per question, and allows downloading the full list as a two-sheet Excel file.

**Architecture:** Single static HTML file with an inline `<style>` block (same CSS variables as `mentorship-intake-id.html`) and a companion JS file. On load, the JS fetches all deals for the GELP training from the existing crm-proxy Worker, parses each deal's `Custom_Responses` field to extract per-question answers, and renders a two-tab interface. SheetJS (CDN) handles the Excel export client-side — no new Worker endpoints or CRM fields needed.

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Pages, existing crm-proxy Worker at `https://crm-proxy.gideon-valera.workers.dev`, SheetJS CDN (`xlsx.full.min.js`) for Excel export.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `portal/mentorship-intake-report-id.html` | Full page: header, banner, KPI strip, controls bar, tab nav, table shells, loading/error states |
| Create | `portal/js/report-mentorship-intake-id.js` | All runtime logic: fetch, parse `Custom_Responses`, render tables, tab switching, XLS download |

No other files are modified.

---

## Task 1: HTML skeleton — structure, CSS, static markup

**Files:**
- Create: `portal/mentorship-intake-report-id.html`

- [ ] **Step 1: Create the HTML file with full inline CSS and static markup**

Create `portal/mentorship-intake-report-id.html` with the following complete content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GELP Research Mapping Form Report — AktivAsia</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- SheetJS for Excel export -->
  <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary: #821545;
      --primary-light: #f3e8ff;
      --cta-start: #ff960b;
      --cta-end: #f93a3a;
      --bg: #f5f4ee;
      --white: #ffffff;
      --text: #131625;
      --meta: #788099;
      --border: #e2e0d8;
      --radius: 16px;
      --radius-sm: 10px;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 16px;
      line-height: 1.5;
    }

    /* ── Header ── */
    .site-header {
      background: var(--white);
      border-bottom: 1px solid var(--border);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-logos { display: flex; align-items: center; gap: 12px; }
    .header-logos img { height: 36px; width: auto; display: block; }

    /* ── Banner ── */
    .training-banner {
      background: linear-gradient(135deg, var(--primary) 0%, #5a0e30 100%);
      color: var(--white);
      padding: 28px 20px 24px;
    }
    @media (min-width: 640px) { .training-banner { padding: 36px 40px 28px; } }
    .training-banner .type-pill {
      display: inline-block;
      border: 1.5px solid rgba(255,255,255,0.4);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 4px 12px;
      margin-bottom: 12px;
      opacity: 0.9;
    }
    .training-banner h1 {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.25;
    }
    @media (min-width: 640px) { .training-banner h1 { font-size: 30px; } }
    .training-banner .subtitle {
      font-size: 14px;
      opacity: 0.75;
      margin-top: 8px;
      font-style: italic;
    }
    .refreshed {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 10px;
    }

    /* ── KPI Strip ── */
    .kpi-strip {
      background: var(--white);
      border-bottom: 1px solid var(--border);
      padding: 16px 20px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    @media (min-width: 640px) { .kpi-strip { padding: 16px 40px; } }
    .kpi-pill {
      background: var(--bg);
      border: 1.5px solid var(--border);
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kpi-pill .kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: var(--primary);
    }
    .kpi-pill .kpi-pct {
      font-size: 11px;
      font-weight: 500;
      color: var(--meta);
    }

    /* ── Controls bar ── */
    .controls-bar {
      padding: 14px 20px;
      display: flex;
      justify-content: flex-end;
    }
    @media (min-width: 640px) { .controls-bar { padding: 14px 40px; } }
    .btn-download {
      background: linear-gradient(135deg, var(--cta-start), var(--cta-end));
      color: var(--white);
      border: none;
      border-radius: 9999px;
      padding: 10px 22px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn-download:hover { opacity: 0.9; }
    .btn-download:active { opacity: 0.8; }

    /* ── Tab nav ── */
    .tab-nav {
      display: flex;
      gap: 0;
      border-bottom: 2px solid var(--border);
      padding: 0 20px;
      background: var(--white);
    }
    @media (min-width: 640px) { .tab-nav { padding: 0 40px; } }
    .tab-btn {
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      padding: 14px 20px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      color: var(--meta);
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-badge {
      background: var(--bg);
      border: 1.5px solid var(--border);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 8px;
      color: var(--text);
    }
    .tab-btn.active .tab-badge {
      background: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary);
    }

    /* ── Page wrap ── */
    .page-wrap {
      padding: 24px 20px 60px;
      max-width: 1200px;
      margin: 0 auto;
    }
    @media (min-width: 640px) { .page-wrap { padding: 28px 40px 60px; } }

    /* ── Tab panels ── */
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* ── Section card ── */
    .section-card {
      background: var(--white);
      border-radius: var(--radius);
      padding: 0;
      overflow: hidden;
    }

    /* ── Table ── */
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    thead th {
      background: var(--bg);
      color: var(--meta);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      padding: 12px 16px;
      text-align: left;
      white-space: nowrap;
      border-bottom: 1.5px solid var(--border);
    }
    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: #fafaf7; }
    tbody td {
      padding: 12px 16px;
      vertical-align: top;
      color: var(--text);
      line-height: 1.5;
    }
    td.num { color: var(--meta); font-size: 12px; width: 40px; }
    td.answer { max-width: 220px; }
    .answer-text { display: inline; }
    .answer-toggle {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      padding: 0;
      margin-left: 4px;
      white-space: nowrap;
    }
    .answer-toggle:hover { text-decoration: underline; }

    /* ── Stage badge ── */
    .stage-badge {
      display: inline-block;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      background: var(--bg);
      color: var(--meta);
      border: 1.5px solid var(--border);
      white-space: nowrap;
    }

    /* ── Status messages ── */
    .status-msg {
      text-align: center;
      font-size: 14px;
      color: var(--meta);
      padding: 48px 24px;
    }
    .status-msg.error { color: #e53e3e; }
    .btn-retry {
      background: none;
      border: 1.5px solid var(--border);
      border-radius: 9999px;
      padding: 8px 20px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      margin-top: 12px;
    }
    .btn-retry:hover { border-color: var(--primary); color: var(--primary); }

    /* ── Spinner ── */
    .spinner {
      display: inline-block; width: 18px; height: 18px;
      border: 3px solid rgba(130,21,69,0.2); border-top-color: var(--primary);
      border-radius: 50%; animation: spin 0.7s linear infinite;
      vertical-align: middle; margin-right: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state { text-align: center; padding: 48px 24px; color: var(--meta); font-size: 14px; }

    .hidden { display: none !important; }
  </style>
</head>
<body>

<header class="site-header">
  <div class="header-logos">
    <img src="img/koneksi-aa-logo.png" alt="Koneksi &amp; AktivAsia">
  </div>
</header>

<div class="training-banner">
  <div class="type-pill">GELP 2026 · Indonesia</div>
  <h1>GELP Research Mapping Form Report</h1>
  <p class="subtitle">Response tracking for GELP 2026 mentorship intake</p>
  <p class="refreshed" id="refreshed-at"></p>
</div>

<div class="kpi-strip" id="kpi-strip">
  <div class="kpi-pill">
    <span>Total</span>
    <span class="kpi-val" id="kpi-total">—</span>
  </div>
  <div class="kpi-pill">
    <span>Answered</span>
    <span class="kpi-val" id="kpi-answered">—</span>
    <span class="kpi-pct" id="kpi-pct"></span>
  </div>
  <div class="kpi-pill">
    <span>Not Answered</span>
    <span class="kpi-val" id="kpi-unanswered">—</span>
  </div>
</div>

<div class="controls-bar">
  <button class="btn-download" id="btn-download" disabled>⬇ Download Excel</button>
</div>

<div class="tab-nav">
  <button class="tab-btn active" data-tab="answered">
    Answered <span class="tab-badge" id="badge-answered">0</span>
  </button>
  <button class="tab-btn" data-tab="unanswered">
    Not Answered <span class="tab-badge" id="badge-unanswered">0</span>
  </button>
</div>

<div class="page-wrap">

  <!-- Loading state -->
  <div id="state-loading" class="section-card">
    <div class="status-msg">
      <span class="spinner"></span>Loading participant data…
    </div>
  </div>

  <!-- Error state -->
  <div id="state-error" class="section-card hidden">
    <div class="status-msg error">
      Failed to load data. Please try again.
      <br>
      <button class="btn-retry" id="btn-retry">Retry</button>
    </div>
  </div>

  <!-- Tab: Answered -->
  <div class="tab-panel active" id="panel-answered">
    <div class="section-card hidden" id="table-answered-wrap">
      <div class="table-wrap">
        <table id="table-answered">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Stage</th>
              <th>Fokus Penelitian</th>
              <th>Area Pengembangan</th>
              <th>Tantangan &amp; Kesenjangan</th>
              <th>Kontribusi untuk Jaringan</th>
            </tr>
          </thead>
          <tbody id="tbody-answered"></tbody>
        </table>
      </div>
    </div>
    <div class="section-card hidden" id="empty-answered">
      <div class="empty-state">No participants have answered yet.</div>
    </div>
  </div>

  <!-- Tab: Not Answered -->
  <div class="tab-panel" id="panel-unanswered">
    <div class="section-card hidden" id="table-unanswered-wrap">
      <div class="table-wrap">
        <table id="table-unanswered">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody id="tbody-unanswered"></tbody>
        </table>
      </div>
    </div>
    <div class="section-card hidden" id="empty-unanswered">
      <div class="empty-state">All participants have answered!</div>
    </div>
  </div>

</div>

<script src="js/report-mentorship-intake-id.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the file exists and opens without JS errors in a browser**

Open `portal/mentorship-intake-report-id.html` directly in a browser (file:// is fine for this step). You should see: header with logo, dark red gradient banner, KPI strip with dashes, disabled Download button, two tabs ("Answered", "Not Answered"), and a loading spinner card. No JS errors in the console (SheetJS will load from CDN — you need internet access).

- [ ] **Step 3: Commit**

```bash
git add portal/mentorship-intake-report-id.html
git commit -m "feat: add GELP research mapping report HTML skeleton"
```

---

## Task 2: JS — fetch, parse, and render

**Files:**
- Create: `portal/js/report-mentorship-intake-id.js`

- [ ] **Step 1: Create the JS file with all runtime logic**

Create `portal/js/report-mentorship-intake-id.js` with the following complete content:

```javascript
const PROXY_BASE = "https://crm-proxy.gideon-valera.workers.dev";
const GELP_TRAINING_ID = "773031000008276089";
const TRUNCATE_LEN = 100;

const Q_KEYS = [
  "Fokus Penelitian",
  "Area Pengembangan",
  "Tantangan & Kesenjangan",
  "Kontribusi untuk Jaringan",
];

// ── State ──────────────────────────────────────────────────────────────────

let answeredList = [];    // [{ name, stage, q1, q2, q3, q4 }]
let unansweredList = [];  // [{ name, stage }]

// ── DOM refs ───────────────────────────────────────────────────────────────

const stateLoading      = document.getElementById("state-loading");
const stateError        = document.getElementById("state-error");
const btnRetry          = document.getElementById("btn-retry");
const btnDownload       = document.getElementById("btn-download");
const kpiTotal          = document.getElementById("kpi-total");
const kpiAnswered       = document.getElementById("kpi-answered");
const kpiPct            = document.getElementById("kpi-pct");
const kpiUnanswered     = document.getElementById("kpi-unanswered");
const badgeAnswered     = document.getElementById("badge-answered");
const badgeUnanswered   = document.getElementById("badge-unanswered");
const refreshedAt       = document.getElementById("refreshed-at");
const tbodyAnswered     = document.getElementById("tbody-answered");
const tbodyUnanswered   = document.getElementById("tbody-unanswered");
const tableAnsweredWrap = document.getElementById("table-answered-wrap");
const tableUnansweredWrap = document.getElementById("table-unanswered-wrap");
const emptyAnswered     = document.getElementById("empty-answered");
const emptyUnanswered   = document.getElementById("empty-unanswered");

// ── Tab switching ──────────────────────────────────────────────────────────

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── Fetch ──────────────────────────────────────────────────────────────────

async function loadData() {
  stateLoading.classList.remove("hidden");
  stateError.classList.add("hidden");
  tableAnsweredWrap.classList.add("hidden");
  tableUnansweredWrap.classList.add("hidden");
  emptyAnswered.classList.add("hidden");
  emptyUnanswered.classList.add("hidden");
  btnDownload.disabled = true;

  try {
    const res = await fetch(`${PROXY_BASE}/deals/search?training_id=${GELP_TRAINING_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    processDeals(json.data ?? []);
  } catch (e) {
    stateLoading.classList.add("hidden");
    stateError.classList.remove("hidden");
  }
}

// ── Process & classify ─────────────────────────────────────────────────────

function processDeals(deals) {
  answeredList = [];
  unansweredList = [];

  const sorted = [...deals].sort((a, b) => {
    const na = `${a.First_Name ?? ""} ${a.Last_Name ?? ""}`.trim();
    const nb = `${b.First_Name ?? ""} ${b.Last_Name ?? ""}`.trim();
    return na.localeCompare(nb);
  });

  for (const d of sorted) {
    const name = `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim();
    const stage = d.Stage ?? "";
    const raw = (d.Custom_Responses ?? "").trim();

    if (raw) {
      const parsed = parseResponses(raw);
      answeredList.push({ name, stage, ...parsed });
    } else {
      unansweredList.push({ name, stage });
    }
  }

  renderAll();
}

// ── Parse Custom_Responses ─────────────────────────────────────────────────

function parseResponses(raw) {
  const result = { q1: "", q2: "", q3: "", q4: "" };
  const qKeys = ["Fokus Penelitian", "Area Pengembangan", "Tantangan & Kesenjangan", "Kontribusi untuk Jaringan"];
  const qProps = ["q1", "q2", "q3", "q4"];

  for (let i = 0; i < qKeys.length; i++) {
    const header = `[${qKeys[i]}]`;
    const start = raw.indexOf(header);
    if (start === -1) continue;
    const contentStart = start + header.length;
    const nextHeader = i + 1 < qKeys.length ? raw.indexOf(`[${qKeys[i + 1]}]`) : -1;
    const end = nextHeader === -1 ? raw.length : nextHeader;
    result[qProps[i]] = raw.slice(contentStart, end).trim();
  }

  // Fallback: if no headers found, put entire raw into q1
  if (!result.q1 && !result.q2 && !result.q3 && !result.q4) {
    result.q1 = raw;
  }

  return result;
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderAll() {
  stateLoading.classList.add("hidden");
  stateError.classList.add("hidden");

  const total = answeredList.length + unansweredList.length;
  const pct = total > 0 ? Math.round((answeredList.length / total) * 100) : 0;

  kpiTotal.textContent = total;
  kpiAnswered.textContent = answeredList.length;
  kpiPct.textContent = `${pct}%`;
  kpiUnanswered.textContent = unansweredList.length;
  badgeAnswered.textContent = answeredList.length;
  badgeUnanswered.textContent = unansweredList.length;
  refreshedAt.textContent = `Last refreshed: ${new Date().toLocaleString()}`;

  renderAnsweredTable();
  renderUnansweredTable();

  btnDownload.disabled = false;
}

function renderAnsweredTable() {
  tbodyAnswered.innerHTML = "";

  if (answeredList.length === 0) {
    emptyAnswered.classList.remove("hidden");
    tableAnsweredWrap.classList.add("hidden");
    return;
  }

  answeredList.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="num">${i + 1}</td>
      <td><strong>${esc(p.name)}</strong></td>
      <td><span class="stage-badge">${esc(p.stage)}</span></td>
      ${["q1", "q2", "q3", "q4"].map((q) => `<td class="answer">${renderAnswerCell(p[q])}</td>`).join("")}
    `;
    tbodyAnswered.appendChild(tr);
  });

  tableAnsweredWrap.classList.remove("hidden");
  emptyAnswered.classList.add("hidden");

  // Attach toggle listeners after DOM insertion
  tbodyAnswered.querySelectorAll(".answer-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cell = btn.closest("td");
      const span = cell.querySelector(".answer-text");
      const full = btn.dataset.full;
      const short = btn.dataset.short;
      if (btn.dataset.expanded === "1") {
        span.textContent = short + "… ";
        btn.textContent = "▼ Read more";
        btn.dataset.expanded = "0";
      } else {
        span.textContent = full + " ";
        btn.textContent = "▲ Show less";
        btn.dataset.expanded = "1";
      }
    });
  });
}

function renderAnswerCell(text) {
  if (!text) return '<span style="color:var(--meta);font-size:12px">—</span>';
  if (text.length <= TRUNCATE_LEN) return `<span class="answer-text">${esc(text)}</span>`;
  const short = esc(text.slice(0, TRUNCATE_LEN));
  const full = esc(text);
  return `<span class="answer-text">${short}… </span><button class="answer-toggle" data-full="${full}" data-short="${short}" data-expanded="0">▼ Read more</button>`;
}

function renderUnansweredTable() {
  tbodyUnanswered.innerHTML = "";

  if (unansweredList.length === 0) {
    emptyUnanswered.classList.remove("hidden");
    tableUnansweredWrap.classList.add("hidden");
    return;
  }

  unansweredList.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="num">${i + 1}</td>
      <td><strong>${esc(p.name)}</strong></td>
      <td><span class="stage-badge">${esc(p.stage)}</span></td>
    `;
    tbodyUnanswered.appendChild(tr);
  });

  tableUnansweredWrap.classList.remove("hidden");
  emptyUnanswered.classList.add("hidden");
}

// ── HTML escape helper ─────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── XLS Download ───────────────────────────────────────────────────────────

btnDownload.addEventListener("click", () => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Answered
  const answeredRows = [
    ["Name", "Stage", "Fokus Penelitian", "Area Pengembangan", "Tantangan & Kesenjangan", "Kontribusi untuk Jaringan"],
    ...answeredList.map((p) => [p.name, p.stage, p.q1, p.q2, p.q3, p.q4]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(answeredRows);
  XLSX.utils.book_append_sheet(wb, ws1, "Answered");

  // Sheet 2: Not Answered
  const unansweredRows = [
    ["Name", "Stage"],
    ...unansweredList.map((p) => [p.name, p.stage]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(unansweredRows);
  XLSX.utils.book_append_sheet(wb, ws2, "Not Answered");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `GELP_Research_Mapping_Report_${date}.xlsx`);
});

// ── Retry ──────────────────────────────────────────────────────────────────

btnRetry.addEventListener("click", loadData);

// ── Init ───────────────────────────────────────────────────────────────────

loadData();
```

- [ ] **Step 2: Open the page in a browser and verify end-to-end**

Serve the portal directory locally (e.g. `npx serve portal` or `python -m http.server 8080` from the `portal/` folder). Open `http://localhost:8080/mentorship-intake-report-id.html`.

Expected sequence:
1. Spinner + "Loading participant data…" appears
2. Data loads → KPI strip shows real numbers (Total, Answered %, Not Answered)
3. "Answered" tab table renders with Name / Stage / 4 answer columns
4. Long answers show truncated text with "▼ Read more" — click it, answer expands, button changes to "▲ Show less"
5. Click "Not Answered" tab → table shows participants with no responses
6. Click "⬇ Download Excel" → `.xlsx` file downloads
7. Open the downloaded file in Excel or Google Sheets:
   - Sheet "Answered" has columns: Name, Stage, Fokus Penelitian, Area Pengembangan, Tantangan & Kesenjangan, Kontribusi untuk Jaringan
   - Sheet "Not Answered" has columns: Name, Stage

- [ ] **Step 3: Commit**

```bash
git add portal/js/report-mentorship-intake-id.js
git commit -m "feat: add GELP research mapping report JS — fetch, parse, render, XLS export"
```

---

## Task 3: Deploy

**Files:**
- No file changes — deployment step only

- [ ] **Step 1: Deploy to Cloudflare Pages**

Run from the repo root:

```bash
npx wrangler pages deploy portal --project-name aktivasia-portal
```

Expected output includes:
```
✨ Deployment complete! Take a peek over at https://aktivasia-portal.pages.dev
```

- [ ] **Step 2: Smoke-test the live URL**

Open `https://aktivasia-portal.pages.dev/mentorship-intake-report-id.html` in a browser.

Verify:
1. Page loads (no 404)
2. Data loads from the live crm-proxy Worker
3. Tables render correctly
4. Download button produces a valid `.xlsx`

- [ ] **Step 3: Commit progress note to progress.md**

Open `progress.md` and append a new entry at the top of the log:

```markdown
## 2026-05-28 — GELP Research Mapping Report page live
- New page: `portal/mentorship-intake-report-id.html`
- New JS: `portal/js/report-mentorship-intake-id.js`
- Shows answered/unanswered GELP participants, per-question answers with expand toggle
- Download Excel (two sheets: Answered, Not Answered) via SheetJS CDN
- Deployed to: https://aktivasia-portal.pages.dev/mentorship-intake-report-id.html
```

```bash
git add progress.md
git commit -m "docs: log GELP research mapping report deployment"
```
