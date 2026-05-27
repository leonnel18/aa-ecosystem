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
    console.error("Failed to load GELP data:", e);
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
  const qKeys = Q_KEYS;
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
      if (btn.dataset.expanded === "1") {
        span.innerHTML = btn.dataset.short + "… ";
        btn.textContent = "▼ Read more";
        btn.dataset.expanded = "0";
      } else {
        span.innerHTML = btn.dataset.full + " ";
        btn.textContent = "▲ Show less";
        btn.dataset.expanded = "1";
      }
    });
  });
}

function renderAnswerCell(text) {
  if (!text) return '<span style="color:var(--meta);font-size:12px">—</span>';
  if (text.length <= TRUNCATE_LEN) return `<span class="answer-text">${esc(text)}</span>`;
  const short = text.slice(0, TRUNCATE_LEN);
  return `<span class="answer-text">${esc(short)}… </span><button class="answer-toggle" data-full="${esc(text)}" data-short="${esc(short)}" data-expanded="0">▼ Read more</button>`;
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
