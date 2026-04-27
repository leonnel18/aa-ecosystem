// form-apply-ph.js — PH Pre-Application Form logic
// Reads ?id= (solutionId) and ?type= (trainingType) from URL
// Fetches training info from CRM via Worker proxy, renders dynamic sections, submits Deal

"use strict";

// ── Config ────────────────────────────────────────────────────────────────────
const PROXY_BASE = "https://crm-proxy.gideon-valera.workers.dev";

// Training-type slug → display name
const TYPE_LABELS = {
  "Foundational":                  "Foundational",
  "Training_of_Trainers__TOT_":    "Training of Trainers (TOT)",
  "Feminist_Leadership":           "Feminist Leadership",
  "Public_Narrative":              "Public Narrative",
};

// Training-type slug → CRM Products record ID
const TYPE_IDS = {
  "Foundational":               "773031000000354510",
  "Training_of_Trainers__TOT_": "773031000000354567",
  "Feminist_Leadership":        "773031000000354572",
  "Public_Narrative":           "773031000000354577",
};

// Confidence rating definitions per training type (pre-training, 1-7 scale)
const RATINGS_CONFIG = {
  Foundational: [
    { id: "A_Pre_Training_Strategy_Buildings",    renderKey: "rating_f_a", label: "A) Campaign Experience Assessment",         labelFil: "Karanasan sa Kampanya" },
    { id: "A_Pre_Training_Strategy_Buildings",    renderKey: "rating_f_b", label: "B) Strategy & Tactics",                    labelFil: "Estratehiya at Taktika" },
    { id: "B_Pre_Training_Building_Communication",renderKey: "rating_f_c", label: "C) Communication Strategy",                 labelFil: "Estratehiya sa Komunikasyon" },
    { id: "C_Pre_Training_Confident_facilitator", renderKey: "rating_f_d", label: "D) Facilitating Workshops / Meetings",      labelFil: "Pagpapatakbo ng mga Workshop" },
    { id: "D_Pre_Training_Confident_connector",   renderKey: "rating_f_e", label: "E) Building Connections",                   labelFil: "Pagbuo ng mga Koneksyon" },
  ],
  Training_of_Trainers__TOT_: [
    { id: "A_Experience_in_Facilitating_Pre",         renderKey: "rating_tot_a", label: "A) Experience in Facilitating",             labelFil: "Karanasan sa Pagpapatakbo" },
    { id: "B_Schedules_and_Agendas_Pre",              renderKey: "rating_tot_b", label: "B) Schedules and Agendas",                  labelFil: "Mga Iskedyul at Agenda" },
    { id: "C_Facilitating_and_Moderating_Pre",        renderKey: "rating_tot_c", label: "C) Facilitating and Moderating",            labelFil: "Pagpapatakbo at Pamamagitan" },
    { id: "D_Designing_Workshops_Pre",                renderKey: "rating_tot_d", label: "D) Designing Workshops",                    labelFil: "Pagdidisenyo ng mga Workshop" },
    { id: "E_Confidently_Adaptable_Facilitation_Pre", renderKey: "rating_tot_e", label: "E) Confidently Adaptable Facilitation",     labelFil: "Kakayahang Mag-angkop" },
  ],
  Feminist_Leadership: [
    { id: "Confident_Analysis_Pre",    renderKey: "rating_fl_1", label: "1. Gender Mainstreaming",                   labelFil: "Pagsasama ng Kasarian sa Pangunahing Agos" },
    { id: "Strategic_Confidence_Pre",  renderKey: "rating_fl_2", label: "2. Gender Lens in Social Analysis",          labelFil: "Pagtingin sa Kasarian sa Panlipunang Pagsusuri" },
    { id: "Gender_Climate_Pre",        renderKey: "rating_fl_3", label: "3. Gender & Climate Change",                 labelFil: "Kasarian at Pagbabago ng Klima" },
    { id: "Gender_Strategy_Pre",       renderKey: "rating_fl_4", label: "4. Gender Strategy Building",                labelFil: "Pagbuo ng Estratehiya sa Kasarian" },
    { id: "Self_Reflection_Pre",       renderKey: "rating_fl_5", label: "5. Self-Reflection & Leadership Bias",       labelFil: "Pagninilay at Pagkiling sa Pamumuno" },
    { id: "F_Gendered_Leadership_Pre", renderKey: "rating_fl_6", label: "F) Leadership Coaching",                    labelFil: "Coaching sa Pamumuno" },
    { id: "F_Leadership_Coaching_Pre", renderKey: "rating_fl_7", label: "G) Confident in Building Connections",       labelFil: "Kumpiyansa sa Pagbuo ng Koneksyon" },
  ],
  Public_Narrative: [
    { id: "A_Campaign_Experience_Assessment_Pre", renderKey: "rating_pn_a", label: "A) Campaign Experience Assessment",    labelFil: "Pagtatasa ng Karanasan sa Kampanya" },
    { id: "B_Narrative_Application_Pre",          renderKey: "rating_pn_b", label: "B) Narrative Application",             labelFil: "Paggamit ng Salaysay" },
    { id: "C_Collective_Action_Pre",              renderKey: "rating_pn_c", label: "C) Collective Action",                 labelFil: "Kolektibong Aksyon" },
    { id: "D_Relationship_Building_Pre",          renderKey: "rating_pn_d", label: "D) Relationship Building",             labelFil: "Pagbuo ng Relasyon" },
    { id: "E_Collaborative_Values_Pre",           renderKey: "rating_pn_e", label: "E) Collaborative Values",              labelFil: "Mga Halaga ng Pakikipagtulungan" },
  ],
};

// ── State ─────────────────────────────────────────────────────────────────────
let trainingId   = null;
let trainingType = null;   // URL slug e.g. "Foundational"
let trainingData = null;   // resolved from CRM

// Ordered list of section IDs that will be active for this submission
let sections = [];
let currentIdx = 0;

// Collected rating values: { fieldId: intValue }
const ratingValues = {};
// Collected custom answer values: { fieldId: stringOrInt }
const customValues = {};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const params     = new URLSearchParams(window.location.search);
  trainingId       = params.get("id");
  trainingType     = params.get("type");

  if (!trainingId || !trainingType) {
    showError("Missing training ID or type in URL.");
    return;
  }

  // Wire up radio-group click behaviour (delegated)
  document.querySelectorAll(".radio-group").forEach(wireRadioGroup);

  // Wire up checkbox visual state
  document.querySelectorAll(".check-group").forEach(wireCheckGroup);

  // Pronoun "Other" toggle
  document.querySelectorAll('input[name="Pronoun"]').forEach(r => {
    r.addEventListener("change", () => {
      document.getElementById("other-pronoun-field").classList.toggle("hidden", r.value !== "Other" || !r.checked);
    });
  });

  // Preferred Language "Other" toggle
  document.getElementById("Preferred_Language").addEventListener("change", function() {
    document.getElementById("other-language-field").classList.toggle("hidden", this.value !== "Other");
  });

  // Bio word count
  const bioField = document.getElementById("Please_provide_a_100_word_bio_that_best_describes");
  bioField.addEventListener("input", () => {
    const words = bioField.value.trim() === "" ? 0 : bioField.value.trim().split(/\s+/).length;
    document.getElementById("bio-word-count").textContent = words;
  });

  // File upload labels
  wireFileUpload("Recent_Photo", "photo-name");
  wireFileUpload("Import_CV",    "cv-name");

  // Fetch training from CRM
  try {
    trainingData = await fetchTraining(trainingId);
  } catch (e) {
    showError("Could not load training details. Please check your link.");
    return;
  }

  // Populate banner
  populateBanner(trainingData);

  // Check date window
  if (!isWithinApplicationWindow(trainingData)) {
    showClosed(trainingData);
    return;
  }

  // Pre-fill hidden training field
  document.getElementById("Training_Applied").value = trainingId;
  document.getElementById("Training_Applied_Display").value = trainingData.Solution_Title || "—";

  // Build section list based on training type
  buildSectionList();

  // Render dynamic sections
  renderRatings();
  renderCustomQuestions(trainingData.Custom_Questions);

  // Build progress bar
  buildProgressBar();

  // Show first section
  showSection(0);
}

// ── CRM fetch ─────────────────────────────────────────────────────────────────
async function fetchTraining(id) {
  const fields = [
    "Solution_Title", "Training_Type", "Organised_By",
    "Start_Date", "End_Date",
    "Application_Form_Open_Date", "Application_Form_Close_Date",
    "Custom_Questions",
  ].join(",");
  const res = await fetch(`${PROXY_BASE}/solutions/${id}?fields=${fields}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data[0];
}

// ── Banner ────────────────────────────────────────────────────────────────────
function populateBanner(t) {
  document.getElementById("banner-title").textContent = t.Solution_Title || "Training Application";
  document.getElementById("banner-type").textContent  = "🏷 " + (t.Training_Type?.name || trainingType.replace(/_/g, " "));
  if (t.Start_Date && t.End_Date) {
    document.getElementById("banner-dates").textContent = "📅 " + fmtDate(t.Start_Date) + " – " + fmtDate(t.End_Date);
  }
  document.getElementById("banner-country").textContent = "📍 " + (t.Organised_By || "Philippines");
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}

// ── Date window check ─────────────────────────────────────────────────────────
function isWithinApplicationWindow(t) {
  if (!t.Application_Form_Open_Date || !t.Application_Form_Close_Date) return true;
  const now   = new Date();
  const open  = new Date(t.Application_Form_Open_Date);
  const close = new Date(t.Application_Form_Close_Date);
  close.setHours(23, 59, 59);
  return now >= open && now <= close;
}

function showClosed(t) {
  document.getElementById("progress-wrap").classList.add("hidden");
  document.getElementById("form-wrap").classList.add("hidden");
  document.getElementById("nav-buttons").classList.add("hidden");

  const banner = document.getElementById("closed-banner");
  banner.classList.remove("hidden");

  const now   = new Date();
  const open  = t.Application_Form_Open_Date ? new Date(t.Application_Form_Open_Date) : null;
  if (open && now < open) {
    document.getElementById("closed-title").textContent = "Applications Not Yet Open";
    document.getElementById("closed-msg").textContent =
      `Applications for ${t.Solution_Title || "this training"} open on ${fmtDate(t.Application_Form_Open_Date)}. Please check back then.`;
  } else {
    document.getElementById("closed-title").textContent = "Application Closed";
    document.getElementById("closed-msg").textContent =
      `The application window for ${t.Solution_Title || "this training"} has closed. Please contact your AktivAsia country team.`;
  }
}

function showError(msg) {
  document.getElementById("progress-wrap").classList.add("hidden");
  document.getElementById("form-wrap").classList.add("hidden");
  document.getElementById("nav-buttons").classList.add("hidden");
  document.getElementById("error-banner").classList.remove("hidden");
  document.querySelector("#error-banner p").textContent = msg;
}

// ── Section list ──────────────────────────────────────────────────────────────
const SECTION_LABELS = {
  "sec-demographics":        "Personal Info",
  "sec-professional":        "Professional",
  "sec-terms":               "Terms",
  "sec-exp-foundational":    "Experience",
  "sec-exp-tot":             "Experience",
  "sec-exp-feminist":        "Experience",
  "sec-exp-pn":              "Experience",
  "sec-ratings":             "Confidence",
  "sec-custom":              "Extra Questions",
};

function buildSectionList() {
  sections = ["sec-demographics", "sec-professional", "sec-terms"];

  // Add the correct experience section
  const expMap = {
    "Foundational":               "sec-exp-foundational",
    "Training_of_Trainers__TOT_": "sec-exp-tot",
    "Feminist_Leadership":        "sec-exp-feminist",
    "Public_Narrative":           "sec-exp-pn",
  };
  if (expMap[trainingType]) sections.push(expMap[trainingType]);

  sections.push("sec-ratings");

  // Add custom questions section only if there are custom questions
  const cq = parseCustomQuestions(trainingData.Custom_Questions);
  if (cq.length > 0) sections.push("sec-custom");
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function buildProgressBar() {
  const stepsEl = document.getElementById("progress-steps");
  stepsEl.innerHTML = sections.map((_, i) =>
    `<div class="step-dot" id="dot-${i}"></div>`
  ).join("");
}

function updateProgressBar() {
  sections.forEach((_, i) => {
    const dot = document.getElementById(`dot-${i}`);
    dot.className = "step-dot" + (i < currentIdx ? " done" : i === currentIdx ? " active" : "");
  });
  document.getElementById("progress-label").textContent =
    `Step ${currentIdx + 1} of ${sections.length} — ${SECTION_LABELS[sections[currentIdx]] || ""}`;
}

// ── Section navigation ────────────────────────────────────────────────────────
function showSection(idx) {
  // Hide all section cards
  document.querySelectorAll(".section-card").forEach(el => el.classList.remove("active"));

  // Show target
  document.getElementById(sections[idx]).classList.add("active");

  currentIdx = idx;
  updateProgressBar();
  updateNavButtons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateNavButtons() {
  const backBtn   = document.getElementById("btn-back");
  const nextBtn   = document.getElementById("btn-next");
  const submitBtn = document.getElementById("btn-submit");
  const isLast    = currentIdx === sections.length - 1;

  backBtn.classList.toggle("hidden", currentIdx === 0);
  nextBtn.classList.toggle("hidden", isLast);
  submitBtn.classList.toggle("hidden", !isLast);
}

function prevSection() {
  if (currentIdx > 0) showSection(currentIdx - 1);
}

function nextSection() {
  if (!validateSection(sections[currentIdx])) return;
  if (currentIdx < sections.length - 1) showSection(currentIdx + 1);
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateSection(sectionId) {
  let ok = true;

  if (sectionId === "sec-demographics") {
    ok = validateRequired("First_Name") && ok;
    ok = validateRequired("Last_Name") && ok;
    ok = validateRequired("Preferred_Name_Nick_Name") && ok;
    ok = validateEmail("Email") && ok;
    ok = validateRequired("Mobile") && ok;
    ok = validateRequired("Address") && ok;
    ok = validateRequired("City_Province") && ok;
    ok = validateSelect("Country_of_Residence") && ok;
    ok = validateYear("Year_of_Birth") && ok;
    ok = validateSelect("Gender") && ok;
    ok = validateRadioGroup("pronoun-group", "pronoun-error") && ok;
    ok = validateSelect("Preferred_Language", "lang-error") && ok;
    ok = validateCheckGroup("Identify_as", "identify-error") && ok;
    ok = validateFileUpload("Recent_Photo", "photo-error") && ok;
  }

  if (sectionId === "sec-professional") {
    ok = validateRequired("Account_Name") && ok;
    ok = validateRequired("Role_in_the_Organisation") && ok;
    ok = validateBio() && ok;
  }

  if (sectionId === "sec-terms") {
    ok = validateTerms() && ok;
  }

  if (sectionId === "sec-exp-foundational") {
    ok = validateRadioGroup(
      document.querySelector('#sec-exp-foundational .radio-group'),
      "campaign-f-error"
    ) && ok;
    ok = validateRequired("Reason_for_Applying_F") && ok;
  }

  if (sectionId === "sec-exp-tot") {
    ok = validateRadioGroup(
      document.querySelector('#sec-exp-tot .radio-group'),
      "teaching-tot-error"
    ) && ok;
    ok = validateRequired("Reason_for_Applying_TOT") && ok;
  }

  if (sectionId === "sec-exp-feminist") {
    ok = validateRequired("Defining_Leadership_Experience") && ok;
    ok = validateRequired("Personal_Leadership_Goals") && ok;
    ok = validateRequired("Challenges_faced_as_a_woman_in_leadership") && ok;
    ok = validateRadioGroup(
      document.querySelector('#sec-exp-feminist .radio-group:last-of-type'),
      "gender-training-error"
    ) && ok;
  }

  if (sectionId === "sec-exp-pn") {
    ok = validateRadioGroup(
      document.querySelector('#sec-exp-pn .radio-group'),
      "campaign-pn-error"
    ) && ok;
    ok = validateRequired("Reason_for_Applying_PN") && ok;
    ok = validateRequired("Campaign_Years_Prior_Training") && ok;
  }

  if (sectionId === "sec-ratings") {
    ok = validateRatings() && ok;
  }

  if (sectionId === "sec-custom") {
    ok = validateCustomQuestions() && ok;
  }

  return ok;
}

function validateRequired(id) {
  const el    = document.getElementById(id);
  const field = el.closest(".field");
  const val   = el.value.trim();
  const pass  = val !== "";
  field.classList.toggle("has-error", !pass);
  return pass;
}

function validateSelect(id) {
  const el    = document.getElementById(id);
  const field = el.closest(".field");
  const pass  = el.value !== "";
  field.classList.toggle("has-error", !pass);
  return pass;
}

function validateEmail(id) {
  const el    = document.getElementById(id);
  const field = el.closest(".field");
  const pass  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
  field.classList.toggle("has-error", !pass);
  return pass;
}

function validateYear(id) {
  const el    = document.getElementById(id);
  const field = el.closest(".field");
  const val   = parseInt(el.value, 10);
  const pass  = !isNaN(val) && val >= 1940 && val <= new Date().getFullYear() - 10;
  field.classList.toggle("has-error", !pass);
  return pass;
}

// accepts either a container element or an element ID for the group
function validateRadioGroup(groupElOrId, errorId) {
  const group = typeof groupElOrId === "string"
    ? document.getElementById(groupElOrId)
    : groupElOrId;
  const checked = group && group.querySelector('input[type="radio"]:checked');
  const errEl   = document.getElementById(errorId);
  if (errEl) errEl.style.display = checked ? "none" : "block";
  return !!checked;
}

function validateCheckGroup(name, errorId) {
  const checked = document.querySelectorAll(`input[name="${name}"]:checked`).length > 0;
  document.getElementById(errorId).style.display = checked ? "none" : "block";
  return checked;
}

function validateFileUpload(id, errorId) {
  const el   = document.getElementById(id);
  const pass = el.files && el.files.length > 0;
  document.getElementById(errorId).style.display = pass ? "none" : "block";
  return pass;
}

function validateBio() {
  const el    = document.getElementById("Please_provide_a_100_word_bio_that_best_describes");
  const field = el.closest(".field");
  const words = el.value.trim() === "" ? 0 : el.value.trim().split(/\s+/).length;
  const pass  = words > 0 && words <= 100;
  field.classList.toggle("has-error", !pass);
  return pass;
}

function validateTerms() {
  const all = ["terms1", "terms2", "terms3"].every(id => document.getElementById(id).checked);
  document.getElementById("terms-error").style.display = all ? "none" : "block";
  return all;
}

function validateRatings() {
  const config = RATINGS_CONFIG[trainingType] || [];
  let ok = true;
  config.forEach(item => {
    const rk       = item.renderKey || item.id;
    const ratingEl = document.getElementById(`rating-item-${rk}`);
    const errEl    = ratingEl?.querySelector(".field-error");
    // A rating is valid if any button in this render group has been selected
    const selected = ratingEl?.querySelector(".rating-btn.selected");
    const pass     = !!selected;
    if (errEl) errEl.style.display = pass ? "none" : "block";
    ok = ok && pass;
  });
  return ok;
}

function validateCustomQuestions() {
  const cq = parseCustomQuestions(trainingData.Custom_Questions);
  let ok = true;
  cq.forEach((q, i) => {
    if (!q.required) return;
    const id  = `custom_q_${i}`;
    const el  = document.getElementById(id);
    if (!el) return;
    const val = el.value?.trim() ?? "";
    const pass = val !== "";
    el.closest(".field").classList.toggle("has-error", !pass);
    ok = ok && pass;
  });
  return ok;
}

// ── Ratings renderer ──────────────────────────────────────────────────────────
function renderRatings() {
  const config    = RATINGS_CONFIG[trainingType] || [];
  const container = document.getElementById("ratings-container");

  if (config.length === 0) {
    document.getElementById("sec-ratings").classList.add("hidden");
    sections = sections.filter(s => s !== "sec-ratings");
    return;
  }

  container.innerHTML = config.map(item => {
    // renderKey is used for unique DOM IDs; falls back to id if not set
    const rk = item.renderKey || item.id;
    return `
    <div class="rating-item" id="rating-item-${rk}">
      <div class="rating-question">
        ${item.label}
        ${item.labelFil ? `<div style="font-size:12px;font-weight:400;color:var(--meta);margin-top:2px;font-style:italic">${item.labelFil}</div>` : ""}
      </div>
      <div class="rating-scale">
        ${[1,2,3,4,5,6,7].map(n =>
          `<button type="button" class="rating-btn" data-rk="${rk}" data-field="${item.id}" data-val="${n}" onclick="selectRating(this)">${n}</button>`
        ).join("")}
      </div>
      <div class="rating-scale-labels">
        <span>1 — Not confident</span>
        <span>7 — Very confident</span>
      </div>
      <div class="field-error" style="display:none">Please rate this item.</div>
    </div>`;
  }).join("");
}

function selectRating(btn) {
  const rk      = btn.dataset.rk;
  const fieldId = btn.dataset.field;
  const val     = btn.dataset.val;

  // Last value for this CRM field wins (for fields shared across two items)
  ratingValues[fieldId] = val;

  // Update visual state only for buttons in the same render group
  document.querySelectorAll(`[data-rk="${rk}"]`).forEach(b => {
    b.classList.toggle("selected", b.dataset.val === val);
  });

  // Clear error for this item
  const errEl = document.getElementById(`rating-item-${rk}`)?.querySelector(".field-error");
  if (errEl) errEl.style.display = "none";
}

// ── Custom questions renderer ─────────────────────────────────────────────────
function parseCustomQuestions(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderCustomQuestions(raw) {
  const cq        = parseCustomQuestions(raw);
  const container = document.getElementById("custom-questions-container");
  const section   = document.getElementById("sec-custom");

  if (cq.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  container.innerHTML = cq.map((q, i) => {
    const req = q.required !== false;
    const id  = `custom_q_${i}`;
    let inputHtml = "";

    switch (q.type) {
      case "paragraph":
        inputHtml = `<textarea id="${id}" rows="4" placeholder="${q.placeholder || ""}"></textarea>`;
        break;
      case "number":
        inputHtml = `<input type="number" id="${id}" inputmode="numeric" placeholder="${q.placeholder || ""}">`;
        break;
      case "dropdown":
        inputHtml = `<select id="${id}">
          <option value="">— Select —</option>
          ${(q.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join("")}
        </select>`;
        break;
      case "checkbox":
        inputHtml = `<div class="check-group">
          ${(q.options || []).map(opt =>
            `<label class="check-opt">
              <input type="checkbox" name="custom_q_${i}" value="${opt}">
              <div><div class="check-label">${opt}</div></div>
            </label>`
          ).join("")}
        </div>`;
        break;
      case "date":
        inputHtml = `<input type="date" id="${id}">`;
        break;
      case "rating":
        inputHtml = `<div class="rating-scale" id="scale-cq-${i}">
          ${[1,2,3,4,5,6,7].map(n =>
            `<button type="button" class="rating-btn" data-cqidx="${i}" data-val="${n}"
              onclick="selectCustomRating(this)">${n}</button>`
          ).join("")}
        </div>
        <div class="rating-scale-labels"><span>1</span><span>7</span></div>`;
        break;
      default: // text
        inputHtml = `<input type="text" id="${id}" placeholder="${q.placeholder || ""}">`;
    }

    return `
      <div class="field">
        <label class="field-label">${q.question_text}${req ? ' <span class="req">*</span>' : ''}</label>
        ${q.translation ? `<span class="field-label-fil">${q.translation}</span>` : ""}
        ${q.instructions ? `<div class="field-hint">${q.instructions}</div>` : ""}
        ${inputHtml}
        ${req ? `<div class="field-error">This field is required.</div>` : ""}
      </div>
    `;
  }).join("");

  // Wire checkbox visual state inside custom section
  container.querySelectorAll(".check-group").forEach(wireCheckGroup);
}

function selectCustomRating(btn) {
  const idx = parseInt(btn.dataset.cqidx, 10);
  const val = parseInt(btn.dataset.val, 10);
  customValues[`custom_q_${idx}`] = val;
  document.querySelectorAll(`[data-cqidx="${idx}"]`).forEach(b => {
    b.classList.toggle("selected", parseInt(b.dataset.val, 10) === val);
  });
}

// ── Form submission ───────────────────────────────────────────────────────────
async function submitForm() {
  if (!validateSection(sections[currentIdx])) return;

  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting…';

  try {
    const payload = buildPayload();
    const res = await fetch(`${PROXY_BASE}/deals`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const resJson = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resJson.message || `HTTP ${res.status}`);
    }

    // Handle file uploads (photo/CV) — sent separately as multipart
    await uploadFiles(resJson);

    showSuccess();
  } catch (e) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Submit Application";
    alert("Submission failed: " + e.message + "\n\nPlease try again or contact the AktivAsia team.");
  }
}

function buildPayload() {
  const val = id => (document.getElementById(id)?.value ?? "").trim();
  const radVal = name => document.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
  const checkVals = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(c => c.value).join(";");
  const checkArr  = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(c => c.value);

  const data = {
    // Core Deal fields
    Deal_Name:              val("First_Name") + " " + val("Last_Name"),
    First_Name:             val("First_Name"),
    Last_Name:              val("Last_Name"),
    Preferred_Name_Nick_Name: val("Preferred_Name_Nick_Name"),
    Email:                  val("Email"),
    Mobile:                 val("Mobile"),
    Address:                val("Address"),
    City_Province:          val("City_Province"),
    Country_of_Residence:   val("Country_of_Residence"),
    Year_of_Birth:          parseInt(val("Year_of_Birth"), 10) || null,
    Gender:                 val("Gender"),
    Pronoun:                radVal("Pronoun"),
    Preferred_Pronoun:      val("Preferred_Pronoun"),
    Preferred_Language:     val("Preferred_Language") === "Other" ? val("Preferred_Language_Other") : val("Preferred_Language"),
    Identify_as_Multiple:   checkArr("Identify_as"),
    Special_Requirements:   val("Special_Requirements"),
    Account_Name:           { name: val("Account_Name") },
    Role_in_the_Organisation: val("Role_in_the_Organisation"),
    Please_provide_a_100_word_bio_that_best_describes: val("Please_provide_a_100_word_bio_that_best_describes"),
    Training_Applied:       { id: trainingId },
    Training_Type_Applied:  TYPE_IDS[trainingType] ? { id: TYPE_IDS[trainingType] } : null,
    Stage:                  "Still in Applied Stage",
  };

  // Experience fields per training type
  switch (trainingType) {
    case "Foundational":
      data.Currently_Campaigning        = radVal("campaigning_f");
      data.Current_Campaign_Description = val("Current_Campaign_Description");
      data.Reason_for_Applying          = val("Reason_for_Applying_F");
      break;
    case "Training_of_Trainers__TOT_":
      data.Teaching_Experience_Description = val("Teaching_Experience_Description");
      data.Reason_for_Applying             = val("Reason_for_Applying_TOT");
      break;
    case "Feminist_Leadership":
      data.Defining_Leadership_Experience              = val("Defining_Leadership_Experience");
      data.Personal_Leadership_Goals                   = val("Personal_Leadership_Goals");
      data.Challenges_faced_as_a_woman_in_leadership   = val("Challenges_faced_as_a_woman_in_leadership");
      data.Attended_Gender_Sensitivity_or_women_specific_trai = radVal("gender_training");
      break;
    case "Public_Narrative":
      data.Currently_Campaigning        = radVal("campaigning_pn");
      data.Reason_for_Applying          = val("Reason_for_Applying_PN");
      data.Campaign_Years_Prior_Training = val("Campaign_Years_Prior_Training");
      break;
  }

  // Confidence ratings
  Object.assign(data, ratingValues);

  // Custom question responses as JSON array
  const cq = parseCustomQuestions(trainingData.Custom_Questions);
  if (cq.length > 0) {
    const responses = cq.map((q, i) => {
      let answer;
      if (q.type === "checkbox") {
        answer = [...document.querySelectorAll(`input[name="custom_q_${i}"]:checked`)].map(c => c.value).join(";");
      } else if (q.type === "rating") {
        answer = customValues[`custom_q_${i}`] ?? null;
      } else {
        answer = (document.getElementById(`custom_q_${i}`)?.value ?? "").trim();
        if (q.type === "number") answer = answer ? parseInt(answer, 10) : null;
      }
      return { question: q.question_text, answer };
    });
    data.Custom_Responses = JSON.stringify(responses);
  }

  return { data: [data] };
}

async function uploadFiles(dealResponse) {
  const dealId = dealResponse?.data?.[0]?.details?.id;
  if (!dealId) return;

  const photoFile = document.getElementById("Recent_Photo").files[0];
  const cvFile    = document.getElementById("Import_CV").files[0];

  const uploads = [];
  if (photoFile) uploads.push(uploadFile(dealId, "Recent_Photo", photoFile));
  if (cvFile)    uploads.push(uploadFile(dealId, "Import_CV",    cvFile));

  await Promise.allSettled(uploads);
}

async function uploadFile(dealId, fieldName, file) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  await fetch(`${PROXY_BASE}/deals/${dealId}/files?field=${fieldName}`, {
    method: "POST",
    body:   fd,
  });
}

function showSuccess() {
  document.getElementById("form-wrap").classList.add("hidden");
  document.getElementById("nav-buttons").classList.add("hidden");
  document.getElementById("progress-wrap").classList.add("hidden");
  document.getElementById("success-screen").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function wireRadioGroup(group) {
  group.addEventListener("click", e => {
    const opt = e.target.closest(".radio-opt");
    if (!opt) return;
    const radio = opt.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.checked = true;
    group.querySelectorAll(".radio-opt").forEach(o => o.classList.remove("selected"));
    opt.classList.add("selected");
    radio.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function wireCheckGroup(group) {
  group.addEventListener("click", e => {
    const opt = e.target.closest(".check-opt");
    if (!opt) return;
    const cb = opt.querySelector('input[type="checkbox"]');
    if (!cb || e.target === cb) return;
    cb.checked = !cb.checked;
    opt.classList.toggle("selected", cb.checked);
  });
  // Sync initial visual state
  group.querySelectorAll(".check-opt").forEach(opt => {
    const cb = opt.querySelector('input[type="checkbox"]');
    if (cb?.checked) opt.classList.add("selected");
  });
}

function wireFileUpload(inputId, nameDisplayId) {
  const input   = document.getElementById(inputId);
  const display = document.getElementById(nameDisplayId);
  if (!input || !display) return;
  input.addEventListener("change", () => {
    if (input.files[0]) {
      display.textContent = input.files[0].name;
      display.classList.remove("hidden");
    } else {
      display.classList.add("hidden");
    }
  });
}

// Expose globals called from inline onclick attributes in HTML
window.prevSection  = prevSection;
window.nextSection  = nextSection;
window.submitForm   = submitForm;
window.selectRating = selectRating;
window.selectCustomRating = selectCustomRating;
