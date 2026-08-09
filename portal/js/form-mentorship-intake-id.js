const PROXY_BASE = "https://crm-proxy.gideon-valera.workers.dev";
const GELP_TRAINING_ID = "773031000008276089";
const GELP_STAGES = new Set([
  "Selected",
  "Attended Training",
  "Graduated or Post Evaluation Completed",
]);

let allParticipants = []; // [{ id, name }]
let selectedParticipant = null; // { id, name }
let isSubmitting = false;

// DOM refs — Part 1
const part1        = document.getElementById("part-1");
const loadingMsg   = document.getElementById("loading-msg");
const errorMsg     = document.getElementById("error-msg");
const searchArea   = document.getElementById("search-area");
const nameSearch   = document.getElementById("name-search");
const nameResults  = document.getElementById("name-results");
const nameTag      = document.getElementById("selected-name-tag");
const nameTagText  = document.getElementById("selected-name-text");
const clearNameBtn = document.getElementById("clear-name-btn");
const nameError    = document.getElementById("name-error");
const fieldName    = document.getElementById("field-name");

// DOM refs — Part 2 / nav
const part2        = document.getElementById("part-2");
const successScreen = document.getElementById("success-screen");
const navButtons   = document.getElementById("nav-buttons");
const btnBack      = document.getElementById("btn-back");
const btnNext      = document.getElementById("btn-next");
const btnSubmit    = document.getElementById("btn-submit");
const submitError  = document.getElementById("submit-error");

// ── Part 1: Load participants ──────────────────────────────────────────────

async function loadParticipants() {
  try {
    const res = await fetch(`${PROXY_BASE}/deals/search?training_id=${GELP_TRAINING_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    allParticipants = (json.data ?? [])
      .filter((d) => GELP_STAGES.has(d.Stage))
      .map((d) => ({
        id:              d.id,
        name:            `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim(),
        customResponses: (d.Custom_Responses ?? "").trim(),
      }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    loadingMsg.classList.add("hidden");
    searchArea.classList.remove("hidden");
  } catch (e) {
    loadingMsg.classList.add("hidden");
    errorMsg.classList.remove("hidden");
  }
}

// ── Part 1: Live search ────────────────────────────────────────────────────

nameSearch.addEventListener("input", () => {
  const q = nameSearch.value.trim().toLowerCase();
  if (selectedParticipant && nameSearch.value !== selectedParticipant.name) {
    clearSelection();
  }
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

clearNameBtn.addEventListener("click", () => {
  clearSelection();
  nameSearch.value = "";
  nameSearch.focus();
});

function clearSelection() {
  selectedParticipant = null;
  nameTag.classList.remove("visible");
  nameTagText.textContent = "";
  btnNext.disabled = true;
}

function renderResults(q) {
  nameResults.innerHTML = "";
  if (!q) { nameResults.classList.remove("open"); return; }
  const matches = allParticipants.filter((p) => p.name.toLowerCase().includes(q));
  if (matches.length === 0) { nameResults.classList.remove("open"); return; }
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
  nameTagText.textContent = p.name;
  nameTag.classList.add("visible");
  fieldName.classList.remove("has-error");
  btnNext.disabled = false;
}

// ── Nav: Part 1 → Part 2 ──────────────────────────────────────────────────

btnNext.addEventListener("click", () => {
  if (!selectedParticipant) {
    fieldName.classList.add("has-error");
    return;
  }
  part1.classList.add("hidden");
  part2.classList.remove("hidden");
  btnNext.classList.add("hidden");
  btnSubmit.classList.remove("hidden");
  btnBack.classList.remove("hidden");
  window.scrollTo(0, 0);
});

btnBack.addEventListener("click", () => {
  part2.classList.add("hidden");
  part1.classList.remove("hidden");
  btnSubmit.classList.add("hidden");
  btnNext.classList.remove("hidden");
  btnBack.classList.add("hidden");
  submitError.classList.add("hidden");
  window.scrollTo(0, 0);
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
  submitError.classList.add("hidden");

  if (!validatePart2()) return;

  isSubmitting = true;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span class="spinner"></span>Menyimpan…';

  const q1 = document.getElementById("q1").value.trim();
  const q2 = document.getElementById("q2").value.trim();
  const q3 = document.getElementById("q3").value.trim();
  const q4 = document.getElementById("q4").value.trim();

  const block = formatPayload(q1, q2, q3, q4);

  // Append-only: never strip or overwrite existing content from this or
  // any other form (S1, S2, etc) -- always add the new block at the end.
  const existingRaw = selectedParticipant.customResponses;
  const merged      = existingRaw ? `${existingRaw}\n\n${block}` : block;

  try {
    const res = await fetch(`${PROXY_BASE}/deals/${selectedParticipant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ Custom_Responses: merged }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    part2.classList.add("hidden");
    navButtons.classList.add("hidden");
    successScreen.style.display = "block";
  } catch (e) {
    submitError.classList.remove("hidden");
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
