"use strict";

const PROXY_BASE  = "https://zoho-solution-60079085181.development.catalystserverless.in/server/crm-proxy";
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

const OWNER_EMAIL_MAP = {
  "Philippines": "aktivasia.philippines@gmail.com",
  "Pakistan":    "aktivasia.pakistan@gmail.com",
  "Korea":       "aktivasia.korea@gmail.com",
  "Indonesia":   "aktivasia.indonesia@gmail.com",
  "Regional":    "aktivasia.backbone@gmail.com",
};

async function resolveOwner(organisedBy) {
  const email = OWNER_EMAIL_MAP[organisedBy];
  if (!email) return undefined;
  try {
    const res  = await fetch(`${PROXY_BASE}/users/search?email=${encodeURIComponent(email)}`);
    const json = await res.json();
    const user = (json.users ?? [])[0];
    return user ? { id: user.id } : undefined;
  } catch {
    return undefined;
  }
}

// ── Date formatting ───────────────────────────────────────────────────────────
function fmtDate(isoStr) {
  if (!isoStr) return "";
  // Parse as local date to avoid UTC-offset shifting the day
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function updateDateDisplay(inputId) {
  const el = document.getElementById(inputId + "-display");
  if (el) el.textContent = fmtDate(document.getElementById(inputId).value);
}

// ── Accordion ─────────────────────────────────────────────────────────────────
function toggleAccordion(sectionId) {
  const body    = document.getElementById(sectionId + "-body");
  const chevron = document.getElementById(sectionId + "-chevron");
  const open    = body.style.display === "none";
  body.style.display    = open ? "" : "none";
  chevron.style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
}

// ── Country/portal change ─────────────────────────────────────────────────────
function onOrganisedByChange(select) {
  const field = document.getElementById("countries-participated-field");
  field.style.display = select.value === "Regional" ? "" : "none";
  if (select.value !== "Regional") {
    document.getElementById("Countries_Participated").selectedIndex = -1;
  }
  lockTitleAndType();
  loadPlans(select.value);
}

function lockTitleAndType() {
  const title = document.getElementById("Solution_Title");
  const type  = document.getElementById("Training_Type");
  title.disabled    = true;
  title.placeholder = "Select a training plan first…";
  type.disabled     = true;
  title.value = "";
  type.value  = "";
}

function unlockTitleAndType() {
  const title = document.getElementById("Solution_Title");
  const type  = document.getElementById("Training_Type");
  title.disabled    = false;
  title.placeholder = "e.g. Foundational Campaigning Training — Philippines 2026";
  type.disabled     = false;
}

async function loadPlans(organisedBy) {
  const input    = document.getElementById("Training_Title_Plan");
  const idInput  = document.getElementById("Training_Title_Plan_id");
  const dropdown = document.getElementById("plan-dropdown");
  const hint     = document.getElementById("plan-hint");

  // Clear previous selection
  input.value   = "";
  idInput.value = "";
  dropdown.style.display = "none";

  if (!organisedBy) {
    input.disabled = true;
    input.placeholder = "Select country first, then search…";
    hint.textContent = "Select an Organised By country above to load plans.";
    return;
  }

  input.disabled = false;
  input.placeholder = "Type to search training plans…";
  hint.textContent = "Loading plans…";

  const seq = (input._loadSeq = (input._loadSeq ?? 0) + 1);
  input._plans = [];

  try {
    const res  = await fetch(`${PROXY_BASE}/training-plans/search?organised_by=${encodeURIComponent(organisedBy)}`);
    if (input._loadSeq !== seq) return; // discard stale response from a superseded country selection
    const json = await res.json();
    const plans = json.data ?? [];
    if (plans.length === 0) {
      hint.textContent = "No plans found for this country.";
    } else {
      hint.textContent = `${plans.length} plan(s) available — type to search.`;
    }
    // Cache the plans on the input element for filtering
    input._plans = plans;
    renderPlanDropdown(plans.slice(0, 10));
  } catch (e) {
    hint.textContent = "Could not load plans. Try again or type manually.";
    input.disabled = false;
    input._plans = [];
  }
}

function onPlanInput(input) {
  const q = input.value.trim().toLowerCase();
  const plans = input._plans ?? [];
  const filtered = q.length === 0
    ? plans.slice(0, 10)
    : plans.filter(p => p.Name?.toLowerCase().includes(q)).slice(0, 10);
  renderPlanDropdown(filtered);
}

function renderPlanDropdown(plans) {
  const dropdown = document.getElementById("plan-dropdown");
  if (plans.length === 0) {
    dropdown.style.display = "none";
    return;
  }
  dropdown.innerHTML = "";
  plans.forEach(plan => {
    const item = document.createElement("div");
    item.className = "fac-dropdown-item";
    const dateLabel = plan.Start_Date
      ? ` (${fmtDate(plan.Start_Date)} → ${plan.End_Date ? fmtDate(plan.End_Date) : "?"})`
      : "";
    item.textContent = plan.Name + dateLabel;
    item.addEventListener("mousedown", e => {
      e.preventDefault();
      selectPlan(plan.id, plan.Name);
    });
    dropdown.appendChild(item);
  });
  dropdown.style.display = "";
}

function selectPlan(id, name) {
  document.getElementById("Training_Title_Plan").value    = name;
  document.getElementById("Training_Title_Plan_id").value = id;
  document.getElementById("plan-dropdown").style.display  = "none";
  unlockTitleAndType();
}

// ── Language of Delivery tags ─────────────────────────────────────────────────
function toggleLang(chip) {
  const nowSelected = chip.classList.toggle("selected");
  chip.setAttribute("aria-pressed", String(nowSelected));
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
  const already = [...document.querySelectorAll(".lang-chip.selected")].map(c => c.dataset.lang.toLowerCase());
  const custom  = [...document.querySelectorAll(".lang-custom-tag")].map(c => c.dataset.lang.toLowerCase());
  if ([...already, ...custom].includes(text.toLowerCase())) { input.select(); return; }
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
      <label class="field-label">Name ${facilitatorCount}
        <button type="button" class="btn-remove-q" style="float:right;margin-top:-2px" onclick="removeFacilitator(this)">× Remove</button>
      </label>
      <div class="fac-typeahead-wrap">
        <input type="text" class="fac-name" placeholder="Search contact name…" autocomplete="off" oninput="onFacInput(this)" onfocus="onFacInput(this)">
        <input type="hidden" class="fac-id">
        <div class="fac-dropdown" style="display:none"></div>
      </div>
    </div>
    <div class="field" style="margin-bottom:0">
      <label class="field-label">Role ${facilitatorCount}</label>
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
    row.querySelector(".fac-typeahead-wrap").closest(".field").querySelector(".field-label").childNodes[0].textContent = `Name ${n}`;
  });
}

const FAC_NAME_KEYS      = ["Facilitator", "Name_2", "Name_3", "Name_4", "Name_5", "Name_6", "Name_7", "Name_8", "Name_9", "Name_10"];
const FAC_ROLE_KEYS_1_5  = ["Facilitator_Type_for_Trainer_1", "Facilitator_Type_for_Trainer_2", "Facilitator_Type_for_Trainer_3", "Facilitator_Type_for_Trainer_4", "Facilitator_Type_for_Trainer_5"];
const FAC_ROLE_KEYS_6_10 = ["Facilitator_Type_6", "Facilitator_Type_7", "Facilitator_Type_8", "Facilitator_Type_9", "Facilitator_Type_10"];

function collectFacilitators() {
  const result = {};
  document.querySelectorAll(".facilitator-row").forEach((row, i) => {
    const name = row.querySelector(".fac-name").value.trim();
    const id   = row.querySelector(".fac-id").value.trim();
    const role = row.querySelector(".fac-role").value;
    if (!name && !id && !role) return;
    const nameKey = FAC_NAME_KEYS[i];
    const roleKey = i < 5 ? FAC_ROLE_KEYS_1_5[i] : FAC_ROLE_KEYS_6_10[i - 5];
    // Slots 0–7 are CRM lookups → send {id} only; slots 8–9 are plain text
    if (i < 8) {
      if (id) result[nameKey] = { id };
      // if no id selected, skip — CRM lookup fields require an object reference
    } else {
      if (name) result[nameKey] = name;
    }
    if (role) result[roleKey] = role;
  });
  return result;
}

// ── Facilitator typeahead ─────────────────────────────────────────────────────
let pendingFacRow    = null;

function onFacInput(input) {
  const row = input.closest(".facilitator-row");
  const q = input.value.trim();
  const dropdown = row.querySelector(".fac-dropdown");

  if (q.length < 2) {
    dropdown.style.display = "none";
    return;
  }

  clearTimeout(row._facTimer);
  row._facTimer = setTimeout(async () => {
    row._facSeq = (row._facSeq || 0) + 1;
    const seq = row._facSeq;
    try {
      const res  = await fetch(`${PROXY_BASE}/contacts/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (row._facSeq !== seq) return; // stale response, discard
      renderFacDropdown(row, json.data ?? []);
    } catch {
      if (row._facSeq !== seq) return;
      renderFacDropdown(row, []);
    }
  }, 280);
}

function renderFacDropdown(row, contacts) {
  const dropdown = row.querySelector(".fac-dropdown");
  dropdown.innerHTML = "";

  contacts.slice(0, 8).forEach(c => {
    const item = document.createElement("div");
    item.className = "fac-dropdown-item";
    item.textContent = c.Full_Name + (c.Email ? ` — ${c.Email}` : "");
    item.onclick = () => selectFacContact(row, c.id, c.Full_Name);
    dropdown.appendChild(item);
  });

  const addNew = document.createElement("div");
  addNew.className = "fac-dropdown-item add-new";
  addNew.textContent = "+ Add New Contact";
  addNew.onclick = () => openAddContactModal(row);
  dropdown.appendChild(addNew);

  dropdown.style.display = "block";
}

function selectFacContact(row, id, name) {
  row.querySelector(".fac-id").value   = id;
  row.querySelector(".fac-name").value = name;
  row.querySelector(".fac-dropdown").style.display = "none";
}

function openAddContactModal(row) {
  pendingFacRow = row;
  row.querySelector(".fac-dropdown").style.display = "none";
  document.getElementById("nc-fullname").value = "";
  document.getElementById("nc-email").value    = "";
  document.getElementById("nc-role").value     = "";
  document.getElementById("nc-status").textContent = "";
  document.getElementById("nc-save-btn").disabled  = false;
  document.getElementById("add-contact-modal").classList.add("visible");
}

function closeAddContactModal() {
  document.getElementById("add-contact-modal").classList.remove("visible");
  pendingFacRow = null;
  document.getElementById("nc-fullname").closest(".field").classList.remove("has-error");
}

async function saveNewContact() {
  const fullName = document.getElementById("nc-fullname").value.trim();
  if (!fullName) {
    document.getElementById("nc-fullname").closest(".field").classList.add("has-error");
    return;
  }
  document.getElementById("nc-fullname").closest(".field").classList.remove("has-error");

  const saveBtn = document.getElementById("nc-save-btn");
  saveBtn.disabled = true;
  document.getElementById("nc-status").textContent = "Saving…";

  try {
    const nameParts = fullName.split(" ").filter(Boolean);
    const payload   = {
      data: [{
        Last_Name:  nameParts.slice(1).join(" ") || nameParts[0],
        First_Name: nameParts.length > 1 ? nameParts[0] : "",
        Email:      document.getElementById("nc-email").value.trim() || undefined,
        Title:      document.getElementById("nc-role").value.trim()  || undefined,
      }]
    };
    const res  = await fetch(`${PROXY_BASE}/contacts`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const json = await res.json();
    const id   = json?.data?.[0]?.details?.id;
    if (!id) throw new Error(JSON.stringify(json));

    if (pendingFacRow) selectFacContact(pendingFacRow, id, fullName);
    closeAddContactModal();
  } catch (e) {
    document.getElementById("nc-status").textContent = "Error: " + e.message;
    saveBtn.disabled = false;
  }
}

// Close dropdowns when clicking outside
document.addEventListener("click", e => {
  if (!e.target.closest(".fac-typeahead-wrap")) {
    document.querySelectorAll(".fac-dropdown").forEach(d => d.style.display = "none");
  }
  if (!e.target.closest("#plan-typeahead-wrap")) {
    document.getElementById("plan-dropdown").style.display = "none";
  }
});

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

    <div class="q-field">
      <label>Show in <span style="font-weight:400;color:var(--meta)">(which form section)</span></label>
      <select class="q-section">
        <option value="both">Both (Pre-application & Post-survey)</option>
        <option value="pre">Pre-application only</option>
        <option value="post">Post-survey only</option>
      </select>
    </div>

    <div class="q-field">
      <label>Form Section <span style="font-weight:400;color:var(--meta)">(where in the form it appears)</span></label>
      <select class="q-form-section">
        <option value="demographics">Demographics</option>
        <option value="professional">Professional</option>
        <option value="experience">Experience</option>
        <option value="confidence">Confidence</option>
      </select>
      <div class="field-hint" style="margin-top:4px;font-size:12px">Question is appended at the bottom of this section.</div>
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

// ── Session Topics ────────────────────────────────────────────────────────────
const FOUNDATIONAL_TOPICS = [
  "Building Learning Containers",
  "Introduction to Campaigning",
  "Campaign Tools and Elements",
  "Power",
  "Leadership",
];

const MAX_TOPICS = 7;

function onTrainingTypeChange(type) {
  if (type === "Foundational") {
    setTopics(FOUNDATIONAL_TOPICS);
  }
}

function setTopics(names) {
  const container = document.getElementById("topics-container");
  container.innerHTML = "";
  names.forEach(name => addTopic(name));
}

function addTopic(prefill = "") {
  const container = document.getElementById("topics-container");
  const current   = container.querySelectorAll(".topic-row").length;
  if (current >= MAX_TOPICS) return;

  const idx = current + 1;
  const row = document.createElement("div");
  row.className = "topic-row";
  row.style.cssText = "display:flex;align-items:center;gap:8px";
  row.innerHTML = `
    <span style="font-size:13px;font-weight:700;color:var(--meta);min-width:20px">${idx}</span>
    <input type="text" class="topic-input" placeholder="Topic name…" value="${escHtml(prefill)}" style="flex:1;min-height:44px">
    <button type="button" onclick="removeTopic(this)" style="background:none;border:none;color:var(--meta);font-size:20px;line-height:1;cursor:pointer;padding:0 4px;flex-shrink:0" aria-label="Remove">×</button>`;
  container.appendChild(row);
  updateTopicNumbers();
  updateAddTopicBtn();
}

function removeTopic(btn) {
  btn.closest(".topic-row").remove();
  updateTopicNumbers();
  updateAddTopicBtn();
}

function updateTopicNumbers() {
  document.querySelectorAll(".topic-row").forEach((row, i) => {
    row.querySelector("span").textContent = i + 1;
  });
}

function updateAddTopicBtn() {
  const count = document.querySelectorAll(".topic-row").length;
  document.getElementById("btn-add-topic").disabled = count >= MAX_TOPICS;
}

function collectTopics() {
  const inputs = document.querySelectorAll(".topic-input");
  const names  = [...inputs].map(i => i.value.trim()).filter(Boolean);
  return names.length ? JSON.stringify(names) : undefined;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
      section:       card.querySelector(".q-section").value,
      form_section:  card.querySelector(".q-form-section").value,
    };
  });

  return JSON.stringify(arr);
}

// ── Post-survey auto-dates (open = start date, close = start + 6 months) ──────
function onStartDateChange(startVal) {
  if (!startVal) return;
  const open  = new Date(startVal);
  const close = new Date(startVal);
  close.setMonth(close.getMonth() + 6);
  const fmt = d => d.toISOString().slice(0, 10);
  document.getElementById("Post_Survey_Open_Date").value  = fmt(open);
  document.getElementById("Post_Survey_Close_Date").value = fmt(close);
}

// ── Training Details gate ──────────────────────────────────────────────────────
function toggleTrainingDetails(cb) {
  document.getElementById("training-details-fields").style.display = cb.checked ? "" : "none";
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

function openSection(sectionId) {
  const body    = document.getElementById(sectionId + "-body");
  const chevron = document.getElementById(sectionId + "-chevron");
  if (body && body.style.display === "none") {
    body.style.display      = "";
    chevron.style.transform = "rotate(90deg)";
  }
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

  if (document.getElementById("show-training-details")?.checked) {
    const websiteOk = [
      validateRequired("Who_is_this_training_for"),
      validateRequired("Training_Objectives"),
    ].every(Boolean);
    if (!websiteOk) { openSection("section-website"); ok = false; }
  }

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

    const owner = await resolveOwner(organisedBy);
    if (!owner) {
      setStatus("Warning: could not resolve country owner — record will use default CRM owner.", true);
    }
    const facilitators = collectFacilitators();
    const countriesEl = document.getElementById("Countries_Participated");
    const selectedCountries = [...countriesEl.selectedOptions].map(o => o.value);

    const payload = {
      data: [{
        Solution_Title:              val("Solution_Title"),
        Training_Description:        val("Training_Description") || undefined,
        Training_Type:               { id: typeId },
        Organised_By:                organisedBy,
        Owner:                       owner,
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
        Training_Title_Plan:         val("Training_Title_Plan_id") ? { id: val("Training_Title_Plan_id") } : undefined,
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

    // Step 3: PUT /solutions/:id — write back links, custom questions, and topics
    setStatus("Saving form links to CRM record…");
    const customQs = serializeCustomQuestions();
    const topics   = collectTopics();
    const putBody  = {
      id:               solutionId,
      Application_Form: applyUrl,
      Evaluation_Form:  surveyUrl,
      Custom_Questions: customQs,
    };
    if (topics !== undefined) putBody.Training_Topics = topics;
    const putRes = await fetch(`${PROXY_BASE}/solutions/${solutionId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ data: [putBody] }),
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

  // Reset Training Plan typeahead and cascade
  lockTitleAndType();
  loadPlans("");

  // Clear auto-calculated post-survey hidden dates
  document.getElementById("Post_Survey_Open_Date").value  = "";
  document.getElementById("Post_Survey_Close_Date").value = "";

  // Clear date display labels
  ["Start_Date", "End_Date", "Application_Form_Open_Date", "Application_Form_Close_Date"].forEach(id => {
    const el = document.getElementById(id + "-display");
    if (el) el.textContent = "";
  });

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
        <div class="fac-typeahead-wrap">
          <input type="text" class="fac-name" placeholder="Search contact name…" autocomplete="off" oninput="onFacInput(this)" onfocus="onFacInput(this)">
          <input type="hidden" class="fac-id">
          <div class="fac-dropdown" style="display:none"></div>
        </div>
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

  // Reset accordion: open Basic Info, collapse all others
  [
    { id: "section-basic",     open: true  },
    { id: "section-topics",    open: false },
    { id: "section-fac",       open: false },
    { id: "section-website",   open: false },
    { id: "section-questions", open: false },
  ].forEach(({ id, open }) => {
    const body    = document.getElementById(id + "-body");
    const chevron = document.getElementById(id + "-chevron");
    if (body)    body.style.display        = open ? "" : "none";
    if (chevron) chevron.style.transform   = open ? "rotate(90deg)" : "rotate(0deg)";
  });

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
