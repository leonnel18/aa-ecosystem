"use strict";

const PROXY_BASE  = "https://crm-proxy.gideon-valera.workers.dev";
const PORTAL_BASE = "https://aktivasia-portal.pages.dev";

const TRAINING_TYPE_IDS = {
  "Foundational":               "773031000000354510",
  "Training of Trainers (TOT)": "773031000000354567",
  "Feminist Leadership":        "773031000000354572",
  "Public Narrative":           "773031000000354577",
};

const TYPE_SLUG_MAP = {
  "Foundational":               "Foundational",
  "Training of Trainers (TOT)": "Training_of_Trainers__TOT_",
  "Feminist Leadership":        "Feminist_Leadership",
  "Public Narrative":           "Public_Narrative",
};

const COUNTRY_SLUG_MAP = {
  "Philippines": "ph",
  "Pakistan":    "pk",
  "Korea":       "kr",
  "Indonesia":   "id",
  "Regional":    "backbone",
};

// ── Country/portal change ─────────────────────────────────────────────────────
function onOrganisedByChange(select) {
  const field = document.getElementById("countries-participated-field");
  field.style.display = select.value === "Regional" ? "" : "none";
  if (select.value !== "Regional") {
    document.getElementById("Countries_Participated").selectedIndex = -1;
  }
}

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

// ── Facilitators ──────────────────────────────────────────────────────────────
const ROLE_OPTIONS = `
  <option value="">— Select role —</option>
  <option value="Lead Facilitator">Lead Facilitator</option>
  <option value="Senior Facilitator">Senior Facilitator</option>
  <option value="Co-Facilitator">Co-Facilitator</option>
  <option value="Junior/ Peer Facilitator">Junior/ Peer Facilitator</option>
  <option value="Guest/ External Facilitator">Guest/ External Facilitator</option>
  <option value="Coach">Coach</option>
  <option value="Shadow Coach">Shadow Coach</option>
  <option value="Support">Support</option>
`.trim();

let facilitatorCount = 1;

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
      <label class="field-label">Name ${facilitatorCount}</label>
      <input type="text" class="fac-name" placeholder="Facilitator name">
    </div>
    <div class="field" style="margin-bottom:0">
      <label class="field-label">Role ${facilitatorCount}
        <button type="button" class="btn-remove-q" style="float:right;margin-top:-2px" onclick="removeFacilitator(this)">× Remove</button>
      </label>
      <select class="fac-role">${ROLE_OPTIONS}</select>
    </div>
  `;
  container.appendChild(row);
  if (facilitatorCount >= 10) {
    document.getElementById("btn-add-facilitator").disabled = true;
  }
}

function removeFacilitator(btn) {
  btn.closest(".facilitator-row").remove();
  facilitatorCount--;
  document.getElementById("btn-add-facilitator").disabled = false;
  document.querySelectorAll(".facilitator-row").forEach((row, i) => {
    const n = i + 1;
    row.querySelector(".fac-name").previousElementSibling.textContent = `Name ${n}`;
  });
}

const FAC_NAME_KEYS      = ["Facilitator", "Name_2", "Name_3", "Name_4", "Name_5", "Name_6", "Name_7", "Name_8", "Name_9", "Name_10"];
const FAC_ROLE_KEYS_1_5  = ["Facilitator_Type_for_Trainer_1", "Facilitator_Type_for_Trainer_2", "Facilitator_Type_for_Trainer_3", "Facilitator_Type_for_Trainer_4", "Facilitator_Type_for_Trainer_5"];
const FAC_ROLE_KEYS_6_10 = ["Facilitator_Type_6", "Facilitator_Type_7", "Facilitator_Type_8", "Facilitator_Type_9", "Facilitator_Type_10"];

function collectFacilitators() {
  const result = {};
  document.querySelectorAll(".facilitator-row").forEach((row, i) => {
    const name = row.querySelector(".fac-name").value.trim();
    const role = row.querySelector(".fac-role").value;
    if (!name && !role) return;
    const nameKey = FAC_NAME_KEYS[i];
    const roleKey = i < 5 ? FAC_ROLE_KEYS_1_5[i] : FAC_ROLE_KEYS_6_10[i - 5];
    if (name) result[nameKey] = name;
    if (role) result[roleKey] = role;
  });
  return result;
}

// ── Question builder ──────────────────────────────────────────────────────────
let questionCount = 0;

function addQuestion() {
  questionCount++;
  const idx = questionCount;
  const container = document.getElementById("questions-container");

  const card = document.createElement("div");
  card.className = "question-card";
  card.dataset.idx = idx;
  card.innerHTML = `
    <div class="question-card-header">
      <span class="question-card-num">Question ${idx}</span>
      <button type="button" class="btn-remove-q" onclick="removeQuestion(this)">× Remove</button>
    </div>

    <div class="q-field">
      <label>Question Text <span class="req">*</span></label>
      <input type="text" class="q-text" placeholder="Enter your question…">
    </div>

    <div class="q-field">
      <label>Field Type</label>
      <select class="q-type" onchange="onTypeChange(this)">
        <option value="text">Short Text</option>
        <option value="paragraph">Paragraph</option>
        <option value="number">Number</option>
        <option value="dropdown">Dropdown</option>
        <option value="checkbox">Checkbox (multi-select)</option>
        <option value="date">Date</option>
        <option value="rating">Rating (1–7)</option>
      </select>
    </div>

    <div class="q-field q-options-wrap">
      <label>Options <span style="font-weight:400;color:var(--meta)">(comma-separated)</span></label>
      <input type="text" class="q-options" placeholder="e.g. Option A, Option B, Option C">
    </div>

    <div class="q-field">
      <label>Instructions <span style="font-weight:400;color:var(--meta)">(optional)</span></label>
      <input type="text" class="q-instructions" placeholder="Helper text shown under the question">
    </div>

    <div class="q-field">
      <label>Placeholder <span style="font-weight:400;color:var(--meta)">(optional)</span></label>
      <input type="text" class="q-placeholder" placeholder="Placeholder shown inside the input">
    </div>

    <div class="q-field">
      <label>Bilingual Label <span style="font-weight:400;color:var(--meta)">(optional — shown in italics below the question)</span></label>
      <input type="text" class="q-translation" placeholder="e.g. Filipino translation of the question">
    </div>

    <div class="q-required-row">
      <input type="checkbox" class="q-required" id="q-req-${idx}" checked>
      <label for="q-req-${idx}">Required field</label>
    </div>
  `;

  container.appendChild(card);
  renumberCards();
}

function removeQuestion(btn) {
  btn.closest(".question-card").remove();
  renumberCards();
}

function renumberCards() {
  document.querySelectorAll(".question-card").forEach((card, i) => {
    card.querySelector(".question-card-num").textContent = `Question ${i + 1}`;
  });
}

function onTypeChange(select) {
  const card = select.closest(".question-card");
  const optionsWrap = card.querySelector(".q-options-wrap");
  const needsOptions = select.value === "dropdown" || select.value === "checkbox";
  optionsWrap.classList.toggle("visible", needsOptions);
}

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
      instructions:  card.querySelector(".q-instructions").value.trim(),
      placeholder:   card.querySelector(".q-placeholder").value.trim(),
      translation:   card.querySelector(".q-translation").value.trim(),
      options:       (type === "dropdown" || type === "checkbox") ? options : [],
      required:      card.querySelector(".q-required").checked,
    };
  });

  return JSON.stringify(arr);
}

// ── Validation ────────────────────────────────────────────────────────────────
function val(id) {
  return (document.getElementById(id)?.value ?? "").trim();
}

function validateRequired(id) {
  const el    = document.getElementById(id);
  const field = el.closest(".field");
  const pass  = el.value.trim() !== "";
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

function validateAll() {
  let ok = true;
  ok = validateRequired("Solution_Title") && ok;
  ok = validateSelect("Training_Type") && ok;
  ok = validateSelect("Organised_By") && ok;
  ok = validateRequired("Start_Date") && ok;
  ok = validateRequired("End_Date") && ok;
  ok = validateRequired("Application_Form_Open_Date") && ok;
  ok = validateRequired("Application_Form_Close_Date") && ok;
  ok = validateRequired("Who_is_this_training_for") && ok;
  ok = validateRequired("Training_Objectives") && ok;
  return ok;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitTraining() {
  if (!validateAll()) {
    setStatus("Please fill in all required fields.", true);
    return;
  }

  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating…';

  try {
    const trainingType = document.getElementById("Training_Type").value;
    const organisedBy  = document.getElementById("Organised_By").value;
    const countrySlug  = COUNTRY_SLUG_MAP[organisedBy];
    const typeSlug     = TYPE_SLUG_MAP[trainingType];
    const typeId       = TRAINING_TYPE_IDS[trainingType];

    // Step 1: POST /solutions — create the training record
    setStatus("Creating training record in CRM…");

    const facilitators = collectFacilitators();
    const countriesEl = document.getElementById("Countries_Participated");
    const selectedCountries = [...countriesEl.selectedOptions].map(o => o.value);

    const payload = {
      data: [{
        Solution_Title:              val("Solution_Title"),
        Training_Type:               { id: typeId },
        Organised_By:                organisedBy,
        Format:                      val("Format") || undefined,
        Start_Date:                  val("Start_Date"),
        End_Date:                    val("End_Date"),
        Target_Participants:         parseInt(val("Target_Participants"), 10) || undefined,
        Application_Form_Open_Date:  val("Application_Form_Open_Date"),
        Application_Form_Close_Date: val("Application_Form_Close_Date"),
        Post_Survey_Open_Date:       val("Post_Survey_Open_Date") || undefined,
        Post_Survey_Close_Date:      val("Post_Survey_Close_Date") || undefined,
        Venue:                       val("Venue") || undefined,
        Venue_Address:               val("Venue_Address") || undefined,
        // Section A extras
        Language_of_Delivery:        collectLanguages() || undefined,
        Co_host:                     val("Co_host") || undefined,
        Countries_Participated:      selectedCountries.length ? selectedCountries : undefined,
        // Section C
        Training_Title_Plan:         val("Training_Title_Plan") || undefined,
        // Section D — update keys below to match confirmed CRM API names
        Who_is_this_training_for:    val("Who_is_this_training_for") || undefined,
        Training_Objectives:         val("Training_Objectives") || undefined,
        Approach_Pedagogy:           val("Approach_Pedagogy") || undefined,
        Costs_Covered:               val("Costs_Covered") || undefined,
        Costs_Not_Covered:           val("Costs_Not_Covered") || undefined,
        Course_Access_Information:   val("Course_Access_Information") || undefined,
        // Section B facilitators
        ...facilitators,
      }]
    };

    // Strip undefined values so CRM doesn't receive null for optional fields
    payload.data[0] = Object.fromEntries(
      Object.entries(payload.data[0]).filter(([, v]) => v !== undefined)
    );

    const createRes  = await fetch(`${PROXY_BASE}/solutions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const createJson = await createRes.json();
    const solutionId = createJson?.data?.[0]?.details?.id;
    if (!solutionId) {
      throw new Error("CRM did not return a solution ID. Response: " + JSON.stringify(createJson));
    }

    // Step 2: Build the apply and survey URLs (mirrors the Deluge script exactly)
    const applyUrl  = `${PORTAL_BASE}/apply-${countrySlug}.html?id=${solutionId}&type=${typeSlug}`;
    const surveyUrl = `${PORTAL_BASE}/trainingsurvey-${countrySlug}.html?id=${solutionId}&type=${typeSlug}`;

    // Step 3: PUT /solutions/:id — write back links and custom questions
    setStatus("Saving form links to CRM record…");
    const customQs = serializeCustomQuestions();
    const putRes = await fetch(`${PROXY_BASE}/solutions/${solutionId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        data: [{
          id:               solutionId,
          Application_Form: applyUrl,
          Evaluation_Form:  surveyUrl,
          Custom_Questions: customQs,
        }]
      }),
    });
    if (!putRes.ok) {
      const putJson = await putRes.json().catch(() => ({}));
      throw new Error("Failed to save links: " + JSON.stringify(putJson));
    }

    // Step 4: Show result
    showResult(solutionId, applyUrl, surveyUrl);

  } catch (e) {
    setStatus("Error: " + e.message, true);
    btn.disabled = false;
    btn.innerHTML = "Create Training";
  }
}

// ── Result ────────────────────────────────────────────────────────────────────
function showResult(solutionId, applyUrl, surveyUrl) {
  document.getElementById("submit-bar").style.display = "none";
  document.getElementById("result-panel").classList.add("visible");

  document.getElementById("result-id").textContent = "Solution ID: " + solutionId;
  document.getElementById("result-apply-url").value  = applyUrl;
  document.getElementById("result-survey-url").value = surveyUrl;

  document.getElementById("result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function copyLink(inputId, btn) {
  const text = document.getElementById(inputId).value;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 2000);
  });
}

function resetForm() {
  document.querySelectorAll("input[type='text'], input[type='number'], input[type='date'], select, textarea").forEach(el => {
    if (el.multiple) {
      el.selectedIndex = -1;
    } else {
      el.value = "";
    }
  });

  // Reset Countries Participated visibility
  document.getElementById("countries-participated-field").style.display = "none";

  // Reset language chips
  document.querySelectorAll(".lang-chip").forEach(c => c.classList.remove("selected"));
  document.getElementById("lang-custom-tags").innerHTML = "";
  document.getElementById("lang-others-row").style.display = "none";
  const othersBtn = document.querySelector(".lang-chip--others");
  if (othersBtn) othersBtn.style.display = "";

  // Reset facilitators to single empty slot
  document.getElementById("facilitators-container").innerHTML = `
    <div class="facilitator-row" data-slot="1" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:start">
      <div class="field" style="margin-bottom:0">
        <label class="field-label">Name 1</label>
        <input type="text" class="fac-name" placeholder="Facilitator name">
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

  // Clear question cards
  document.getElementById("questions-container").innerHTML = "";
  questionCount = 0;

  // Reset submit bar and result panel
  document.getElementById("submit-bar").style.display = "";
  document.getElementById("result-panel").classList.remove("visible");

  const btn = document.getElementById("btn-submit");
  btn.disabled = false;
  btn.innerHTML = "Create Training";
  setStatus("");

  document.querySelectorAll(".field.has-error").forEach(f => f.classList.remove("has-error"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Status message ────────────────────────────────────────────────────────────
function setStatus(msg, isError = false) {
  const el = document.getElementById("status-msg");
  el.textContent = msg;
  el.classList.toggle("error", isError);
}
