const PROXY_BASE      = "https://crm-proxy.gideon-valera.workers.dev";
const GELP_TRAINING_ID = "773031000008276089";
const GELP_STAGES = new Set([
  "Selected",
  "Attended Training",
  "Graduated or Post Evaluation Completed",
]);

// participant shape: { id, name, customResponses }
let allParticipants    = [];
let selectedParticipant = null;
let selectedFile        = null;
let isSubmitting        = false;

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
const part2        = document.getElementById("part-2");
const submitErrP2  = document.getElementById("submit-error-p2");

// ── DOM refs — Part 3 ──────────────────────────────────────────────────────
const part3           = document.getElementById("part-3");
const fileInput       = document.getElementById("file-input");
const fileTag         = document.getElementById("selected-file-tag");
const fileTagText     = document.getElementById("selected-file-text");
const clearFileBtn    = document.getElementById("clear-file-btn");
const uploadError     = document.getElementById("upload-error");

// ── DOM refs — nav ─────────────────────────────────────────────────────────
const navButtons        = document.getElementById("nav-buttons");
const btnBack           = document.getElementById("btn-back");
const btnNext           = document.getElementById("btn-next");
const btnNextToUpload   = document.getElementById("btn-next-to-upload");
const btnSubmitNoFile   = document.getElementById("btn-submit-no-file");
const btnSubmitWithFile = document.getElementById("btn-submit-with-file");
const successScreen     = document.getElementById("success-screen");

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

// ── Navigation: Part 1 → Part 2 ───────────────────────────────────────────

btnNext.addEventListener("click", () => {
  if (!selectedParticipant) { fieldName.classList.add("has-error"); return; }
  showPart(2);
});

// ── Navigation: Part 2 → Part 3 ───────────────────────────────────────────

btnNextToUpload.addEventListener("click", () => {
  if (!validatePart2()) return;
  showPart(3);
});

// ── Navigation: back ──────────────────────────────────────────────────────

btnBack.addEventListener("click", () => {
  const current = getCurrentPart();
  if (current === 2) showPart(1);
  if (current === 3) showPart(2);
});

function getCurrentPart() {
  if (!part1.classList.contains("hidden")) return 1;
  if (!part2.classList.contains("hidden")) return 2;
  return 3;
}

function showPart(n) {
  part1.classList.toggle("hidden", n !== 1);
  part2.classList.toggle("hidden", n !== 2);
  part3.classList.toggle("hidden", n !== 3);

  btnBack.classList.toggle("hidden", n === 1);
  btnNext.classList.toggle("hidden", n !== 1);
  btnNextToUpload.classList.toggle("hidden", n !== 2);
  btnSubmitNoFile.classList.toggle("hidden", n !== 3);
  btnSubmitWithFile.classList.toggle("hidden", n !== 3);

  submitErrP2.classList.add("hidden");
  uploadError.classList.add("hidden");
  window.scrollTo(0, 0);
}

// ── Part 2: Validation ─────────────────────────────────────────────────────

function validatePart2() {
  let valid = true;
  ["q-overall", "q-plenary", "q-breakout", "q-improvement", "q-other"].forEach((id) => {
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

// ── Part 3: File input ─────────────────────────────────────────────────────

fileInput.addEventListener("change", () => {
  const f = fileInput.files[0];
  if (!f) return;
  selectedFile = f;
  fileTagText.textContent = f.name;
  fileTag.classList.add("visible");
  uploadError.classList.add("hidden");
});

clearFileBtn.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  fileTag.classList.remove("visible");
  fileTagText.textContent = "";
});

// ── Submit: without file ───────────────────────────────────────────────────

btnSubmitNoFile.addEventListener("click", async () => {
  if (isSubmitting) return;
  await doSubmit(false);
});

// ── Submit: with file ──────────────────────────────────────────────────────

btnSubmitWithFile.addEventListener("click", async () => {
  if (isSubmitting) return;
  await doSubmit(selectedFile ? true : false);
});

// ── Core submit logic ──────────────────────────────────────────────────────

async function doSubmit(withFile) {
  isSubmitting = true;
  uploadError.classList.add("hidden");
  submitErrP2.classList.add("hidden");

  const activeBtn = withFile ? btnSubmitWithFile : btnSubmitNoFile;
  activeBtn.disabled = true;
  activeBtn.innerHTML = '<span class="spinner"></span>Menyimpan…';

  let workbookUploaded = false;

  if (withFile && selectedFile) {
    // Local download — rename file and trigger browser save
    const originalName = selectedFile.name;
    const dotIdx       = originalName.lastIndexOf(".");
    const ext          = dotIdx !== -1 ? originalName.slice(dotIdx) : "";
    const targetName   = `GELP 2026 - Session 1 - ${selectedParticipant.name}${ext}`;
    const url          = URL.createObjectURL(selectedFile);
    const a            = document.createElement("a");
    a.href             = url;
    a.download         = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    workbookUploaded = true;
  }

  // Build feedback block
  const overall     = document.getElementById("q-overall").value.trim();
  const plenary     = document.getElementById("q-plenary").value.trim();
  const breakout    = document.getElementById("q-breakout").value.trim();
  const improvement = document.getElementById("q-improvement").value.trim();
  const other       = document.getElementById("q-other").value.trim();

  const feedbackBlock = buildFeedbackBlock(overall, plenary, breakout, improvement, other, workbookUploaded);

  // Read-then-append: strip any existing feedback block from stored Custom_Responses
  const existingRaw   = selectedParticipant.customResponses;
  const feedbackStart = existingRaw.indexOf("[Keseluruhan]");
  const strippedBase  = feedbackStart !== -1
    ? existingRaw.slice(0, feedbackStart).trimEnd()
    : existingRaw;
  const merged = strippedBase ? `${strippedBase}\n\n${feedbackBlock}` : feedbackBlock;

  try {
    const crmRes = await fetch(`${PROXY_BASE}/deals/${selectedParticipant.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ data: [{ Custom_Responses: merged }] }),
    });
    if (!crmRes.ok) throw new Error(`HTTP ${crmRes.status}`);
    part3.classList.add("hidden");
    navButtons.classList.add("hidden");
    successScreen.style.display = "block";
    window.scrollTo(0, 0);
  } catch (e) {
    uploadError.classList.remove("hidden");
    activeBtn.disabled = false;
    activeBtn.textContent = withFile
      ? "Kirim dengan lampiran / Submit with attachment"
      : "Kirim tanpa lampiran / Submit without attachment";
  } finally {
    isSubmitting = false;
  }
}

function buildFeedbackBlock(overall, plenary, breakout, improvement, other, workbookUploaded) {
  let block =
    `[Keseluruhan]\n${overall}\n\n` +
    `[Sesi Pleno]\n${plenary}\n\n` +
    `[Sesi Kelompok]\n${breakout}\n\n` +
    `[Saran Perbaikan]\n${improvement}\n\n` +
    `[Masukan Lainnya]\n${other}`;
  if (workbookUploaded) block += `\n\n[Workbook]\nuploaded`;
  return block;
}

// ── Init ───────────────────────────────────────────────────────────────────

loadParticipants();
