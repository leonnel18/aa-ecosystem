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
    const res = await fetch(`${PROXY_BASE}/deals/search?training_id=${GELP_TRAINING_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    allParticipants = (json.data ?? [])
      .filter((d) => GELP_STAGES.has(d.Stage))
      .map((d) => ({ id: d.id, name: `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim() }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
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
  if (selectedParticipant && nameSearch.value !== selectedParticipant.name) {
    selectedParticipant = null;
    selectedNameDisplay.textContent = "";
    btnNext.disabled = true;
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

  selectedNameDisplay.textContent = "";
  const strong = document.createElement("strong");
  strong.textContent = p.name;
  const em = document.createElement("em");
  em.style.cssText = "font-size:0.8rem;color:var(--meta)";
  em.textContent = "Bukan Anda? Ketik ulang. / Not you? Type again.";
  selectedNameDisplay.append("Dipilih: ", strong, " ·  ", em);

  btnNext.disabled = false;
}

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
