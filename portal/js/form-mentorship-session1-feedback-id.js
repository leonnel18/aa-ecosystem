const PROXY_BASE       = "https://crm-proxy.gideon-valera.workers.dev";
const GELP_TRAINING_ID = "773031000008276089";
const GELP_STAGES = new Set([
  "Selected",
  "Attended Training",
  "Graduated or Post Evaluation Completed",
]);

let allParticipants     = [];
let selectedParticipant = null;
let isSubmitting        = false;
const ratings           = { overall: null, plenary: null, breakout: null };

// ── DOM refs — Part 1 ──────────────────────────────────────────────────────
const part1        = document.getElementById("part-1");
const loadingMsg   = document.getElementById("loading-msg");
const errorMsg     = document.getElementById("error-msg");
const searchArea   = document.getElementById("search-area");
const nameSearch   = document.getElementById("name-search");
const nameResults  = document.getElementById("name-results");
const nameTag      = document.getElementById("selected-name-tag");
const nameTagText  = document.getElementById("selected-name-text");
const clearNameBtn = document.getElementById("clear-name-btn");
const fieldName    = document.getElementById("field-name");

// ── DOM refs — Part 2 ──────────────────────────────────────────────────────
const part2       = document.getElementById("part-2");
const submitErrP2 = document.getElementById("submit-error-p2");

// ── DOM refs — Part 3 ──────────────────────────────────────────────────────
const part3 = document.getElementById("part-3");

// ── DOM refs — Part 4 ──────────────────────────────────────────────────────
const part4       = document.getElementById("part-4");
const submitErrP4 = document.getElementById("submit-error-p4");

// ── DOM refs — nav ─────────────────────────────────────────────────────────
const navButtons      = document.getElementById("nav-buttons");
const btnBack         = document.getElementById("btn-back");
const btnNext         = document.getElementById("btn-next");
const btnNextToUpload = document.getElementById("btn-next-to-upload");
const btnNextToOther  = document.getElementById("btn-next-to-other");
const btnSubmitFinal  = document.getElementById("btn-submit-final");
const successScreen   = document.getElementById("success-screen");

// ── Part 1: Load participants ──────────────────────────────────────────────

async function loadParticipants() {
  try {
    const res  = await fetch(`${PROXY_BASE}/deals/search?training_id=${GELP_TRAINING_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    allParticipants = (json.data ?? [])
      .filter((d) => GELP_STAGES.has(d.Stage))
      .map((d) => ({
        id:              d.id,
        name:            `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim(),
        customResponses: (d.Custom_Responses ?? "").trim(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    loadingMsg.classList.add("hidden");
    searchArea.classList.remove("hidden");
  } catch (e) {
    loadingMsg.classList.add("hidden");
    errorMsg.classList.remove("hidden");
  }
}

// ── Part 1: Typeahead ──────────────────────────────────────────────────────

nameSearch.addEventListener("input", () => {
  const q = nameSearch.value.trim().toLowerCase();
  if (selectedParticipant && nameSearch.value !== selectedParticipant.name) clearSelection();
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
  nameSearch.value    = p.name;
  nameResults.classList.remove("open");
  nameTagText.textContent = p.name;
  nameTag.classList.add("visible");
  fieldName.classList.remove("has-error");
  btnNext.disabled = false;
}

// ── Part 2: Rating buttons ─────────────────────────────────────────────────

[
  { groupId: "rating-overall",  key: "overall"  },
  { groupId: "rating-plenary",  key: "plenary"  },
  { groupId: "rating-breakout", key: "breakout" },
].forEach(({ groupId, key }) => {
  const group = document.getElementById(groupId);
  group.querySelectorAll(".rating-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      group.querySelectorAll(".rating-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      ratings[key] = btn.dataset.value;
      document.getElementById(`field-q-${key}`).classList.remove("has-error");
    });
  });
});

// ── Part 2: Validation ─────────────────────────────────────────────────────

function validatePart2() {
  let valid = true;

  ["overall", "plenary", "breakout"].forEach((key) => {
    const field = document.getElementById(`field-q-${key}`);
    if (!ratings[key]) {
      field.classList.add("has-error");
      valid = false;
    } else {
      field.classList.remove("has-error");
    }
  });

  ["q-enjoyed", "q-improvement"].forEach((id) => {
    const textarea = document.getElementById(id);
    const field    = document.getElementById(`field-${id}`);
    if (!textarea.value.trim()) {
      field.classList.add("has-error");
      valid = false;
    } else {
      field.classList.remove("has-error");
    }
  });

  return valid;
}

// ── Navigation ─────────────────────────────────────────────────────────────

btnNext.addEventListener("click", () => {
  if (!selectedParticipant) { fieldName.classList.add("has-error"); return; }
  showPart(2);
});

btnNextToUpload.addEventListener("click", () => {
  if (!validatePart2()) return;
  showPart(3);
});

btnNextToOther.addEventListener("click", () => {
  showPart(4);
});

btnBack.addEventListener("click", () => {
  const current = getCurrentPart();
  if (current === 2) showPart(1);
  if (current === 3) showPart(2);
  if (current === 4) showPart(3);
});

function getCurrentPart() {
  if (!part1.classList.contains("hidden")) return 1;
  if (!part2.classList.contains("hidden")) return 2;
  if (!part3.classList.contains("hidden")) return 3;
  return 4;
}

function showPart(n) {
  part1.classList.toggle("hidden", n !== 1);
  part2.classList.toggle("hidden", n !== 2);
  part3.classList.toggle("hidden", n !== 3);
  part4.classList.toggle("hidden", n !== 4);

  btnBack.classList.toggle("hidden", n === 1);
  btnNext.classList.toggle("hidden", n !== 1);
  btnNextToUpload.classList.toggle("hidden", n !== 2);
  btnNextToOther.classList.toggle("hidden", n !== 3);
  btnSubmitFinal.classList.toggle("hidden", n !== 4);

  submitErrP2.classList.add("hidden");
  if (submitErrP4) submitErrP4.classList.add("hidden");
  window.scrollTo(0, 0);
}

// ── Part 4: Final submit ───────────────────────────────────────────────────

btnSubmitFinal.addEventListener("click", async () => {
  if (isSubmitting) return;
  isSubmitting = true;
  submitErrP4.classList.add("hidden");
  btnSubmitFinal.disabled = true;
  btnSubmitFinal.innerHTML = '<span class="spinner"></span>Menyimpan…';

  const enjoyed     = document.getElementById("q-enjoyed").value.trim();
  const improvement = document.getElementById("q-improvement").value.trim();
  const other       = document.getElementById("q-other").value.trim();

  let block =
    `[Keseluruhan]\n${ratings.overall}\n\n` +
    `[Sesi Pleno]\n${ratings.plenary}\n\n` +
    `[Sesi Kelompok]\n${ratings.breakout}\n\n` +
    `[Menikmati Sesi]\n${enjoyed}\n\n` +
    `[Saran Perbaikan]\n${improvement}`;

  if (other) block += `\n\n[Masukan Lainnya]\n${other}`;

  const existingRaw   = selectedParticipant.customResponses;
  const feedbackStart = existingRaw.indexOf("[Keseluruhan]");
  const strippedBase  = feedbackStart !== -1
    ? existingRaw.slice(0, feedbackStart).trimEnd()
    : existingRaw;
  const merged = strippedBase ? `${strippedBase}\n\n${block}` : block;

  try {
    const res = await fetch(`${PROXY_BASE}/deals/${selectedParticipant.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ data: [{ Custom_Responses: merged }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    part4.classList.add("hidden");
    navButtons.classList.add("hidden");
    successScreen.style.display = "block";
    window.scrollTo(0, 0);
  } catch (e) {
    submitErrP4.classList.remove("hidden");
    btnSubmitFinal.disabled = false;
    btnSubmitFinal.textContent = "Kirim / Submit";
  } finally {
    isSubmitting = false;
  }
});

// ── Init ───────────────────────────────────────────────────────────────────

loadParticipants();
