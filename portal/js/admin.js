"use strict";

const PROXY_BASE  = "https://crm-proxy.gideon-valera.workers.dev";
const PORTAL_BASE = "https://aktivasia-portal.pages.dev";

const params      = new URLSearchParams(window.location.search);
const TRAINING_ID = params.get("training_id") ?? "";
const INIT_VIEW   = params.get("view") ?? "selection";

// ── Stage options per view ────────────────────────────────────────────────────
const STAGE_OPTIONS = {
  selection:   ["Still in Applied Stage", "Selected", "Rejected"],
  attendance:  ["Selected", "Attended Training", "Rejected or Not Attended"],
  post_survey: ["Attended Training", "Graduated or Post Evaluation Completed"],
};

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(view) {
  document.querySelectorAll(".admin-view").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".admin-tabs button").forEach(el => el.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.getElementById(`tab-${view}`).classList.add("active");
  const url = new URL(window.location);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", url);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function dealName(d) {
  return `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim();
}

function dealOrg(d) {
  const acc = d.Account_Name;
  return (acc && typeof acc === "object") ? (acc.name ?? "") : String(acc ?? "");
}

function stageSelect(dealId, currentStage, view) {
  const opts = STAGE_OPTIONS[view]
    .map(s => `<option value="${s}"${s === currentStage ? " selected" : ""}>${s}</option>`)
    .join("");
  return `<select id="stage-${dealId}" data-original="${currentStage}">${opts}</select>`;
}

// ── Fetch training info ───────────────────────────────────────────────────────
async function loadTrainingInfo() {
  if (!TRAINING_ID) {
    document.getElementById("training-title").textContent = "No training ID specified";
    return;
  }
  try {
    const res  = await fetch(`${PROXY_BASE}/solutions/${TRAINING_ID}?fields=Solution_Title,Start_Date,End_Date,Organised_By`);
    const json = await res.json();
    const t    = (json.data ?? [json])[0] ?? {};
    document.getElementById("training-title").textContent = t.Solution_Title ?? "Training";
    document.getElementById("training-meta").textContent  =
      `${t.Organised_By ?? ""} · ${t.Start_Date ?? "—"} → ${t.End_Date ?? "—"}`;
    document.getElementById("back-link").href =
      `portal.html?country=${encodeURIComponent(t.Organised_By ?? "")}`;
  } catch (e) {
    document.getElementById("training-title").textContent = "Could not load training";
  }
}

// ── Fetch all deals for this training ─────────────────────────────────────────
let allDeals = [];

async function loadDeals() {
  if (!TRAINING_ID) return;
  try {
    const res  = await fetch(`${PROXY_BASE}/deals/search?training_id=${TRAINING_ID}&q=`);
    const json = await res.json();
    allDeals   = json.data ?? [];
    renderAll();
  } catch (e) {
    console.error("Failed to load deals:", e);
  }
}

// ── Render all three views ────────────────────────────────────────────────────
function renderAll() {
  renderSelection();
  renderAttendance();
  renderPostSurvey();
}

function renderSelection() {
  const pending = allDeals.filter(d => d.Stage === "Still in Applied Stage");
  const tbody   = document.getElementById("sel-tbody");
  const empty   = document.getElementById("sel-empty");
  const counter = document.getElementById("sel-counter");

  const resolved = allDeals.filter(d =>
    d.Stage === "Selected" || d.Stage === "Rejected").length;
  counter.textContent = `${resolved} of ${allDeals.length} resolved`;

  if (pending.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = pending.map(d => `
    <tr>
      <td>${dealName(d)}</td>
      <td>${dealOrg(d)}</td>
      <td>${d.Email ?? ""}</td>
      <td>${stageSelect(d.id, d.Stage, "selection")}</td>
    </tr>`).join("");
}

function renderAttendance() {
  const selected = allDeals.filter(d => d.Stage === "Selected");
  const tbody    = document.getElementById("att-tbody");
  const empty    = document.getElementById("att-empty");
  const counter  = document.getElementById("att-counter");

  const confirmed = allDeals.filter(d =>
    d.Stage === "Attended Training" || d.Stage === "Rejected or Not Attended").length;
  counter.textContent = `${confirmed} of ${allDeals.length} confirmed`;

  if (selected.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = selected.map(d => `
    <tr>
      <td>${dealName(d)}</td>
      <td>${dealOrg(d)}</td>
      <td>${d.Email ?? ""}</td>
      <td>${stageSelect(d.id, d.Stage, "attendance")}</td>
    </tr>`).join("");
}

function renderPostSurvey() {
  const attended   = allDeals.filter(d =>
    d.Stage === "Attended Training" || d.Stage === "Graduated or Post Evaluation Completed");
  const completed  = allDeals.filter(d => d.Stage === "Graduated or Post Evaluation Completed");
  const incomplete = allDeals.filter(d => d.Stage === "Attended Training");
  const pct        = attended.length > 0 ? Math.round(completed.length / attended.length * 100) : 0;

  document.getElementById("ps-label").textContent =
    `${pct}% complete — ${completed.length} of ${attended.length} participants`;
  document.getElementById("ps-bar").style.width = `${pct}%`;

  const tbody = document.getElementById("ps-tbody");
  const empty = document.getElementById("ps-empty");

  if (incomplete.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = incomplete.map(d => `
    <tr>
      <td>${dealName(d)}</td>
      <td>${d.Email ?? ""}</td>
      <td>${stageSelect(d.id, d.Stage, "post_survey")}</td>
    </tr>`).join("");
}

// ── Bulk set stage ────────────────────────────────────────────────────────────
function bulkSetStage(view, stage) {
  const pending = allDeals.filter(d => d.Stage === "Still in Applied Stage");
  pending.forEach(d => {
    const sel = document.getElementById(`stage-${d.id}`);
    if (sel) sel.value = stage;
  });
}

// ── Save changes ──────────────────────────────────────────────────────────────
async function saveChanges(view) {
  const viewMap = { selection: "sel", attendance: "att", post_survey: "ps" };
  const prefix  = viewMap[view];
  const savingEl = document.getElementById(`${prefix}-saving`);
  savingEl.style.display = "inline";

  const selects = document.querySelectorAll(`#view-${view} select`);
  const changes = [];
  selects.forEach(sel => {
    if (sel.value !== sel.dataset.original) {
      const dealId = sel.id.replace("stage-", "");
      changes.push({ id: dealId, Stage: sel.value });
    }
  });

  if (changes.length === 0) {
    savingEl.style.display = "none";
    alert("No changes to save.");
    return;
  }

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

  savingEl.style.display = "none";
  alert(`${successCount} of ${changes.length} changes saved.`);
  renderAll();
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  await loadTrainingInfo();
  await loadDeals();
  switchTab(INIT_VIEW);
})();
