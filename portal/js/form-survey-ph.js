// form-survey-ph.js — PH Post-Training Survey logic
// Reads ?id= (solutionId) and ?type= (trainingType) from URL
// Applicant lookup by name or email → matches Deal in this training
// On submit: PATCH Deal with survey responses via Worker proxy

"use strict";

const PROXY_BASE = "https://crm-proxy.gideon-valera.workers.dev";

// Post-training confidence ratings per training type (1-7 scale)
const POST_RATINGS_CONFIG = {
  Foundational: [
    { id: "A_Post_Training_Strategy_Building",     renderKey: "post_f_a", label: "1) I feel confident building strategy and choosing tactics for a campaign.",              labelFil: "Ako ay kumpiyansa sa paggawa o pagtukoy ng stratehiya at gawain para sa isang kampaniya." },
    { id: "B_Post_Training_Building_Communication", renderKey: "post_f_b", label: "2) I feel confident using stories to connect with others for campaigns OR starting a communication strategy for a campaign.", labelFil: "Ako ay kumpiyansa sa pagsisimula ng communication strategy o plano para sa isang kampaniya O gamit ang istorya ay bumuo ng mga ugnayan sa iba." },
    { id: "C_Post_Training_Confident_facilitator",  renderKey: "post_f_c", label: "3) I feel confident sharing what I learned from the training with others.",             labelFil: "Ako ay kumpiyansa sa paggamit ng aking kwento/karanasan sa pakikipag-ugnayan sa ibang tao." },
    { id: "D_Post_Training_Confident_connector",    renderKey: "post_f_d", label: "4) I feel confident building connections with others to support a campaign.",             labelFil: "Ako ay kumpiyansang makapagbuo ng mga ugnayan sa ibang tao upang masuportahan ang isang kampaniya." },
    { id: "Bias_Awareness_Post",                    renderKey: "post_f_e", label: "5) During the training I've developed valuable connections and relationships with other participants in the social campaign space.", labelFil: null },
    { id: "Confident_with_tools_for_campaigns",     renderKey: "post_f_f", label: "6) I feel confident using the tools I've learned during this training to develop more strategic campaigns.", labelFil: null },
  ],
  Training_of_Trainers__TOT_: [
    { id: "B_Schedules_and_Agendas_Post",               renderKey: "post_tot_b", label: "B) Schedules and Agendas",               labelFil: "Mga Iskedyul at Agenda" },
    { id: "C_Facilitating_and_Moderating_Post",         renderKey: "post_tot_c", label: "C) Facilitating and Moderating",         labelFil: "Pagpapatakbo at Pamamagitan" },
    { id: "D_Designing_Workshops_Post",                 renderKey: "post_tot_d", label: "D) Designing Workshops",                 labelFil: "Pagdidisenyo ng mga Workshop" },
    { id: "E_Confidently_Adaptable_Facilitation_Post",  renderKey: "post_tot_e", label: "E) Confidently Adaptable Facilitation",  labelFil: "Kakayahang Mag-angkop" },
  ],
  Feminist_Leadership: [
    { id: "Confident_Analysis_Post",                  renderKey: "post_fl_1", label: "1. Gender Mainstreaming",                labelFil: "Pagsasama ng Kasarian sa Pangunahing Agos" },
    { id: "Strategic_Confidence_Post",                renderKey: "post_fl_2", label: "2. Gender Lens in Social Analysis",       labelFil: "Pagtingin sa Kasarian sa Panlipunang Pagsusuri" },
    { id: "Gender_Aware_Leadership_Post",             renderKey: "post_fl_3", label: "3. Gender-Aware Leadership",              labelFil: "Pamumunong May Kamalayan sa Kasarian" },
    { id: "F_Confident_in_building_connections_Post", renderKey: "post_fl_4", label: "4. Confident in Building Connections",    labelFil: "Kumpiyansa sa Pagbuo ng Koneksyon" },
    { id: "F_Leadership_Coaching_Post",               renderKey: "post_fl_5", label: "5. Leadership Coaching",                 labelFil: "Coaching sa Pamumuno" },
  ],
  Public_Narrative: [
    { id: "A_Campaign_Experience_Assessment_Post", renderKey: "post_pn_a", label: "A) Campaign Experience Assessment", labelFil: "Pagtatasa ng Karanasan sa Kampanya" },
    { id: "B_Narrative_Application_Post",          renderKey: "post_pn_b", label: "B) Narrative Application",          labelFil: "Paggamit ng Salaysay" },
    { id: "C_Collective_Action_Post",              renderKey: "post_pn_c", label: "C) Collective Action",              labelFil: "Kolektibong Aksyon" },
    { id: "D_Relationship_Building_Post",          renderKey: "post_pn_d", label: "D) Relationship Building",          labelFil: "Pagbuo ng Relasyon" },
    { id: "E_Collaborative_Values_Post",           renderKey: "post_pn_e", label: "E) Collaborative Values",           labelFil: "Mga Halaga ng Pakikipagtulungan" },
  ],
};

// Instruction quality items — same for all training types
const INSTRUCTION_ITEMS = [
  { id: "Instructional_methods_were_effective",            renderKey: "inst_1", label: "1) Instructional methods were effective (small group work, exercises, presentations)",                    labelFil: "Epektibo ang mga gawain at ginamit na materyales sa pagsasanay." },
  { id: "I_learned_valuable_information",                  renderKey: "inst_2", label: "2) I learned valuable information / tools / ideas that can be applied to my work",                        labelFil: "Nakakuha ako ng mahahalagang kaalaman, instrumento, at kaisipan o ideya na maaari kong magamit sa aking gawain." },
  { id: "The_facilitators_created_a_safe_space_for_me",    renderKey: "inst_3", label: "3) The facilitators created a safe space for me to learn and ask questions",                              labelFil: "Ang mga tagapagpadaloy ay naglaan ng ligtas ng espasyo upang ako ay makalahok, matuto at makapagtanong." },
  { id: "The_facilitators_involved_me_other_participants", renderKey: "inst_4", label: "4) The facilitators involved me/other participants appropriately",                                          labelFil: null },
  { id: "The_facilitators_were_well_prepared_and_able_to", renderKey: "inst_5", label: "5) The facilitators were well prepared and able to clearly share ideas",                                  labelFil: "Ang mga tagapagpadaloy ay may sapat na preparasyon o kahandaan at malinaw na naibahagi ang kanilang mga kaalaman." },
];

// Topic CRM field API names (Topics 1-7)
const TOPIC_FIELDS = [
  "Rate_the_sessions_on_Topic_1_Campaign_Strategy",
  "Rate_the_sessions_on_Topic_2",
  "Rate_the_sessions_on_Topic_3",
  "Rate_the_sessions_on_Topic_4",
  "Rate_the_sessions_on_Topic_5",
  "Rate_the_sessions_on_Topic_6",
  "Rate_the_session_on_Topic_7_Working_well",
];

// 5 visible stepper nodes
const STEPPER_NODES = [
  { sections: ["sec-lookup"],       title: "Feedback",    desc: "Overall" },
  { sections: ["sec-experiences"],  title: "Experiences", desc: "Sessions & Logistics" },
  { sections: ["sec-confidence"],   title: "Confidence",  desc: "Skill-Building" },
  { sections: ["sec-nextsteps"],    title: "Next Steps",  desc: "Reflections" },
  { sections: ["sec-testimonials", "sec-custom"], title: "Testimonial", desc: "& Extras" },
];

// ── State ─────────────────────────────────────────────────────────────────────
let trainingId   = null;
let trainingType = null;
let trainingData = null;
let foundDeal    = null;   // { id, First_Name, Last_Name, Email }

let sections   = [];
let currentIdx = 0;

const ratingValues = {};
const customValues = {};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const params = new URLSearchParams(window.location.search);
  trainingId   = params.get("id");
  trainingType = params.get("type");

  if (!trainingId || !trainingType) {
    showError("Missing training ID or type in URL.");
    return;
  }

  wireLookupCombobox();
  wireTestimonialGate();
  document.querySelectorAll(".radio-group:not(#testimonial-gate-group)").forEach(wireRadioGroup);

  try {
    trainingData = await fetchTraining(trainingId);
  } catch (e) {
    showError("Could not load training details. Please check your link.");
    return;
  }

  populateBanner(trainingData);

  if (!isWithinSurveyWindow(trainingData)) {
    showClosed(trainingData);
    return;
  }

  document.getElementById("Training_Applied").value = trainingId;

  renderInstructionRatings();
  renderPostConfidenceRatings();
  renderTopics(trainingData);
  renderCustomQuestions(trainingData.Custom_Questions);

  buildSectionList();
  buildProgressBar();
  showSection(0);
}

// ── CRM fetch ─────────────────────────────────────────────────────────────────
async function fetchTraining(id) {
  const fields = [
    "Solution_Title", "Training_Type", "Organised_By",
    "Start_Date", "End_Date",
    "Post_Survey_Open_Date", "Post_Survey_Close_Date",
    "Custom_Questions",
    "Training_Topics",
  ].join(",");
  const res  = await fetch(`${PROXY_BASE}/solutions/${id}?fields=${fields}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data[0];
}

// ── Lookup combobox ───────────────────────────────────────────────────────────
let lookupDebounce = null;

function wireLookupCombobox() {
  const input    = document.getElementById("lookup-input");
  const dropdown = document.getElementById("lookup-dropdown");
  const clearBtn = document.getElementById("lookup-clear-btn");

  input.addEventListener("input", () => {
    foundDeal = null;
    clearBtn.classList.toggle("visible", input.value.length > 0);
    document.getElementById("search-result").classList.add("hidden");
    document.getElementById("search-notfound").classList.add("hidden");
    clearTimeout(lookupDebounce);
    const q = input.value.trim();
    if (q.length < 3) { dropdown.classList.remove("open"); return; }
    lookupDebounce = setTimeout(() => searchApplicants(q), 300);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.remove("visible");
    dropdown.classList.remove("open");
    foundDeal = null;
    document.getElementById("search-result").classList.add("hidden");
    document.getElementById("search-notfound").classList.add("hidden");
    document.getElementById("feedback-questions").style.display = "none";
  });

  document.addEventListener("click", e => {
    if (!e.target.closest("#lookup-input") && !e.target.closest("#lookup-dropdown")) {
      dropdown.classList.remove("open");
    }
  });
}

async function searchApplicants(q) {
  const dropdown = document.getElementById("lookup-dropdown");
  dropdown.innerHTML = `<div class="org-dropdown-item" style="color:var(--meta);cursor:default">Searching…</div>`;
  dropdown.classList.add("open");

  try {
    const res   = await fetch(`${PROXY_BASE}/deals/search?training_id=${encodeURIComponent(trainingId)}&q=${encodeURIComponent(q)}`);
    const json  = await res.json();
    const deals = json.data ?? [];

    if (deals.length === 0) {
      dropdown.innerHTML = `<div class="org-dropdown-item" style="color:var(--meta);cursor:default">No applicant found. Check spelling or try your email.</div>`;
      return;
    }

    dropdown.innerHTML = deals.map(d => `
      <div class="org-dropdown-item" data-id="${escHtml(d.id)}">
        <div style="font-weight:600">${escHtml(d.First_Name)} ${escHtml(d.Last_Name)}</div>
        <div style="font-size:12px;color:var(--meta)">${escHtml(d.Email || "")}</div>
      </div>`).join("");

    dropdown.querySelectorAll("[data-id]").forEach(item => {
      item.addEventListener("click", () => {
        const deal = deals.find(d => d.id === item.dataset.id);
        selectDeal(deal);
        dropdown.classList.remove("open");
      });
    });
  } catch (e) {
    dropdown.innerHTML = `<div class="org-dropdown-item" style="color:#e53e3e;cursor:default">Search failed. Please try again.</div>`;
  }
}

function selectDeal(deal) {
  foundDeal = deal;
  document.getElementById("Deal_Id").value = deal.id;
  document.getElementById("lookup-input").value = `${deal.First_Name} ${deal.Last_Name}`;
  document.getElementById("lookup-clear-btn").classList.add("visible");
  document.getElementById("result-name").textContent   = `${deal.First_Name} ${deal.Last_Name}`;
  document.getElementById("result-detail").textContent = deal.Email || deal.Account_Name?.name || "";
  document.getElementById("search-result").classList.remove("hidden");
  document.getElementById("search-notfound").classList.add("hidden");
  document.getElementById("feedback-questions").style.display = "block";
}

// ── Testimonial gate ──────────────────────────────────────────────────────────
function wireTestimonialGate() {
  document.getElementById("testimonial-gate-group").addEventListener("click", e => {
    const opt = e.target.closest(".radio-opt");
    if (!opt) return;
    const radio = opt.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.checked = true;
    document.querySelectorAll("#testimonial-gate-group .radio-opt").forEach(o => o.classList.remove("selected"));
    opt.classList.add("selected");
    const show = radio.value === "yes";
    document.getElementById("testimonial-textarea-wrap").style.display = show ? "block" : "none";
    if (!show) document.getElementById("Willingness_to_provide_a_testimonial").value = "";
  });
}

// ── Banner ────────────────────────────────────────────────────────────────────
function populateBanner(t) {
  document.getElementById("banner-title").textContent = t.Solution_Title || "Post-Training Survey";
  document.getElementById("banner-type").textContent  = "🏷 " + (t.Training_Type?.name || trainingType.replace(/_/g, " "));
  if (t.Start_Date && t.End_Date) {
    document.getElementById("banner-dates").textContent = "📅 " + fmtDate(t.Start_Date) + " – " + fmtDate(t.End_Date);
  }
  document.getElementById("banner-country").textContent = "📍 " + (t.Organised_By || "Philippines");
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}

// ── Date window ───────────────────────────────────────────────────────────────
function isWithinSurveyWindow(t) {
  if (!t.Post_Survey_Open_Date || !t.Post_Survey_Close_Date) return true;
  const now   = new Date();
  const open  = new Date(t.Post_Survey_Open_Date);
  const close = new Date(t.Post_Survey_Close_Date);
  close.setHours(23, 59, 59);
  return now >= open && now <= close;
}

function showClosed(t) {
  document.getElementById("progress-wrap").classList.add("hidden");
  document.getElementById("form-wrap").classList.add("hidden");
  document.getElementById("nav-buttons").classList.add("hidden");
  const banner = document.getElementById("closed-banner");
  banner.classList.remove("hidden");

  const now  = new Date();
  const open = t.Post_Survey_Open_Date ? new Date(t.Post_Survey_Open_Date) : null;
  if (open && now < open) {
    document.getElementById("closed-title").textContent = "Survey Not Yet Open";
    document.getElementById("closed-msg").textContent =
      `The post-training survey for ${t.Solution_Title || "this training"} opens on ${fmtDate(t.Post_Survey_Open_Date)}.`;
  } else {
    document.getElementById("closed-title").textContent = "Survey Closed";
    document.getElementById("closed-msg").textContent =
      `The survey window for ${t.Solution_Title || "this training"} has closed. Please contact your AktivAsia country team.`;
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
function buildSectionList() {
  sections = ["sec-lookup", "sec-experiences", "sec-confidence", "sec-nextsteps", "sec-testimonials"];
  const cq = parseCustomQuestions(trainingData.Custom_Questions);
  if (cq.length > 0) sections.push("sec-custom");
}

// ── Progress stepper ──────────────────────────────────────────────────────────
function buildProgressBar() {
  const nav = document.getElementById("progress-steps");
  nav.innerHTML = STEPPER_NODES.map((node, i) => {
    const isLast = i === STEPPER_NODES.length - 1;
    return `
      <div class="stepper-item" data-state="inactive" id="stepper-node-${i}">
        <button type="button" class="stepper-trigger">
          <div class="stepper-indicator">${i + 1}</div>
          <div class="stepper-text">
            <div class="stepper-title">${node.title}</div>
            <div class="stepper-desc">${node.desc}</div>
          </div>
        </button>
      </div>
      ${!isLast ? '<div class="stepper-separator"></div>' : ""}`;
  }).join("");
}

function updateProgressBar() {
  const activeNodeIdx = STEPPER_NODES.findIndex(node =>
    node.sections.includes(sections[currentIdx])
  );
  STEPPER_NODES.forEach((_, i) => {
    const node = document.getElementById(`stepper-node-${i}`);
    if (!node) return;
    if (i < activeNodeIdx)        node.dataset.state = "completed";
    else if (i === activeNodeIdx) node.dataset.state = "active";
    else                          node.dataset.state = "inactive";
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showSection(idx) {
  document.querySelectorAll(".section-card").forEach(el => el.classList.remove("active"));
  document.getElementById(sections[idx]).classList.add("active");
  currentIdx = idx;
  updateProgressBar();
  updateNavButtons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateNavButtons() {
  const isLast = currentIdx === sections.length - 1;
  document.getElementById("btn-back").classList.toggle("hidden", currentIdx === 0);
  document.getElementById("btn-next").classList.toggle("hidden", isLast);
  document.getElementById("btn-submit").classList.toggle("hidden", !isLast);
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

  if (sectionId === "sec-lookup") {
    if (!foundDeal) {
      document.getElementById("search-notfound").classList.remove("hidden");
      document.getElementById("search-notfound").textContent =
        "Please search for and select your application before continuing.";
      ok = false;
    }
    ok = validateStaticRatings(["Did_the_Training_meet_your_expectations"]) && ok;
    ok = validateRequired("Best_aspect_of_the_workshop") && ok;
    ok = validateRequired("Improvement_Suggestion_for_next_time") && ok;
  }

  if (sectionId === "sec-experiences") {
    ok = validateDynamicRatings("topics-container") && ok;
    ok = validateStaticRatings([
      "Venue_and_Location",
      "Food_catering",
      "Accessibility_of_Location",
      "Pre_workshop_Coordination_and_Communication",
    ]) && ok;
    ok = validateStaticRatings(INSTRUCTION_ITEMS.map(i => i.renderKey)) && ok;
  }

  if (sectionId === "sec-confidence") {
    const config = POST_RATINGS_CONFIG[trainingType] || [];
    ok = validateStaticRatings(config.map(i => i.renderKey)) && ok;
  }

  if (sectionId === "sec-nextsteps") {
    ok = validateRequired("Sum_up_what_you_learned_at_our_training") && ok;
  }

  if (sectionId === "sec-custom") {
    ok = validateCustomQuestions() && ok;
  }

  return ok;
}

function validateRequired(id) {
  const el    = document.getElementById(id);
  const field = el?.closest(".field");
  if (!el || !field) return true;
  const pass  = el.value.trim() !== "";
  field.classList.toggle("has-error", !pass);
  return pass;
}

function validateStaticRatings(renderKeys) {
  let ok = true;
  renderKeys.forEach(rk => {
    const item = document.getElementById(`rating-item-${rk}`);
    if (!item) return;
    const selected = item.querySelector(".rating-btn.selected");
    const errEl    = item.querySelector(".field-error");
    const pass     = !!selected;
    if (errEl) errEl.style.display = pass ? "none" : "block";
    ok = ok && pass;
  });
  return ok;
}

function validateDynamicRatings(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return true;
  const items = container.querySelectorAll(".rating-item");
  let ok = true;
  items.forEach(item => {
    const selected = item.querySelector(".rating-btn.selected");
    const errEl    = item.querySelector(".field-error");
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
    const el  = document.getElementById(`custom_q_${i}`);
    if (!el) return;
    const pass = el.value?.trim() !== "";
    el.closest(".field").classList.toggle("has-error", !pass);
    ok = ok && pass;
  });
  return ok;
}

// ── Dynamic renderers ─────────────────────────────────────────────────────────
function renderInstructionRatings() {
  const container = document.getElementById("instruction-ratings");
  container.innerHTML = INSTRUCTION_ITEMS.map(item => ratingItemHtml(
    item.renderKey, item.id, item.label, item.labelFil, "1 — Strongly disagree", "7 — Strongly agree"
  )).join("");
}

function renderPostConfidenceRatings() {
  const config    = POST_RATINGS_CONFIG[trainingType] || [];
  const container = document.getElementById("confidence-post-container");

  if (config.length === 0) {
    document.getElementById("sec-confidence").classList.add("hidden");
    sections = sections.filter(s => s !== "sec-confidence");
    return;
  }
  container.innerHTML = config.map(item => ratingItemHtml(
    item.renderKey, item.id, item.label, item.labelFil, "1 — Not at all confident", "7 — Highly confident"
  )).join("");
}

function renderTopics(t) {
  const container = document.getElementById("topics-container");

  let topicNames = [];
  if (t.Training_Topics) {
    try {
      const parsed = typeof t.Training_Topics === "string"
        ? JSON.parse(t.Training_Topics)
        : t.Training_Topics;
      if (Array.isArray(parsed)) topicNames = parsed.filter(Boolean);
    } catch { /* malformed JSON — treat as empty */ }
  }

  if (topicNames.length === 0) {
    // Hide the Topics subsection header but leave logistics + instruction visible
    const groupLabel    = document.querySelector("#sec-experiences .field-group-label");
    const groupSubtitle = document.querySelector("#sec-experiences .field-group-subtitle");
    const firstDivider  = document.querySelector("#sec-experiences .field-divider");
    if (groupLabel)    groupLabel.style.display    = "none";
    if (groupSubtitle) groupSubtitle.style.display = "none";
    if (firstDivider)  firstDivider.style.display  = "none";
    return;
  }

  container.innerHTML = topicNames.map((name, i) =>
    ratingItemHtml(`topic_${i}`, TOPIC_FIELDS[i] ?? `Rate_the_sessions_on_Topic_${i + 1}`, `${i + 1}. How would you rate the sessions on ${name}?`, null, "1 — Not at all satisfied", "7 — Very satisfied")
  ).join("");
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
      case "rating":
        inputHtml = `<div class="rating-scale" id="scale-cq-${i}">
          ${[1,2,3,4,5,6,7].map(n =>
            `<button type="button" class="rating-btn" data-cqidx="${i}" data-val="${n}"
              onclick="selectCustomRating(this)">${n}</button>`
          ).join("")}
        </div>
        <div class="rating-scale-labels"><span>1</span><span>7</span></div>`;
        break;
      default:
        inputHtml = `<input type="text" id="${id}" placeholder="${q.placeholder || ""}">`;
    }

    return `
      <div class="field">
        <label class="field-label">${q.question_text}${req ? ' <span class="req">*</span>' : ''}</label>
        ${q.translation ? `<span class="field-label-fil">${q.translation}</span>` : ""}
        ${q.instructions ? `<div class="field-hint">${q.instructions}</div>` : ""}
        ${inputHtml}
        ${req ? `<div class="field-error">This field is required.</div>` : ""}
      </div>`;
  }).join("");
}

// ── Rating helpers ────────────────────────────────────────────────────────────
function ratingItemHtml(renderKey, crmField, label, labelFil, lowLabel, highLabel) {
  const buttons = [1,2,3,4,5,6,7].map(n =>
    `<button type="button" class="rating-btn" data-rk="${renderKey}" data-field="${crmField}" data-val="${n}" onclick="selectRating(this)">${n}</button>`
  ).join("");

  return `
    <div class="rating-item" id="rating-item-${renderKey}">
      <div class="rating-question">
        ${label}
        ${labelFil ? `<div style="font-size:12px;font-weight:400;color:var(--meta);margin-top:2px;font-style:italic">${labelFil}</div>` : ""}
      </div>
      <div class="rating-scale">${buttons}</div>
      <div class="rating-scale-labels"><span>${lowLabel}</span><span>${highLabel}</span></div>
      <div class="field-error" style="display:none">Please rate this item.</div>
    </div>`;
}

function selectRating(btn) {
  const rk      = btn.dataset.rk;
  const fieldId = btn.dataset.field;
  const val     = parseInt(btn.dataset.val, 10);
  ratingValues[fieldId] = val;
  document.querySelectorAll(`[data-rk="${rk}"]`).forEach(b => {
    b.classList.toggle("selected", parseInt(b.dataset.val, 10) === val);
  });
  const errEl = document.getElementById(`rating-item-${rk}`)?.querySelector(".field-error");
  if (errEl) errEl.style.display = "none";
}

function selectCustomRating(btn) {
  const idx = parseInt(btn.dataset.cqidx, 10);
  const val = parseInt(btn.dataset.val, 10);
  customValues[`custom_q_${idx}`] = val;
  document.querySelectorAll(`[data-cqidx="${idx}"]`).forEach(b => {
    b.classList.toggle("selected", parseInt(b.dataset.val, 10) === val);
  });
}

// ── Submission ────────────────────────────────────────────────────────────────
async function submitForm() {
  if (!validateSection(sections[currentIdx])) return;

  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting…';

  try {
    const dealId  = document.getElementById("Deal_Id").value;
    const payload = buildPayload();

    const res = await fetch(`${PROXY_BASE}/deals/${dealId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const resJson = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resJson.message || `HTTP ${res.status}`);

    showSuccess();
  } catch (e) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Submit Survey";
    alert("Submission failed: " + e.message + "\n\nPlease try again or contact the AktivAsia team.");
  }
}

function buildPayload() {
  const val = id => (document.getElementById(id)?.value ?? "").trim();

  const testimonialGate = document.querySelector('[name="tgate"]:checked')?.value;

  const data = {
    Stage: "Graduated or Post Evaluation Completed",
    Best_aspect_of_the_workshop:              val("Best_aspect_of_the_workshop"),
    Improvement_Suggestion_for_next_time:     val("Improvement_Suggestion_for_next_time"),
    Sum_up_what_you_learned_at_our_training:  val("Sum_up_what_you_learned_at_our_training"),
    Action_Plans_in_the_next_3_months:        val("Action_Plans_in_the_next_3_months"),
    Suggestions_in_the_next_workshop:         val("Suggestions_in_the_next_workshop"),
    Anything_else_you_d_like_to_share_or_ask: val("Anything_else_you_d_like_to_share_or_ask"),
  };

  if (testimonialGate === "yes") {
    data.Willingness_to_provide_a_testimonial = val("Willingness_to_provide_a_testimonial");
  }

  // All rating values (includes Did_the_Training_meet_your_expectations and all others)
  Object.assign(data, ratingValues);

  // Custom question responses
  const cq = parseCustomQuestions(trainingData.Custom_Questions);
  if (cq.length > 0) {
    const responses = cq.map((q, i) => {
      let answer;
      if (q.type === "rating") {
        answer = customValues[`custom_q_${i}`] ?? null;
      } else {
        answer = (document.getElementById(`custom_q_${i}`)?.value ?? "").trim();
        if (q.type === "number") answer = answer ? parseInt(answer, 10) : null;
      }
      return { question: q.question_text, answer, form: "post" };
    });
    data.Custom_Responses = JSON.stringify(responses);
  }

  return { data: [data] };
}

function showSuccess() {
  document.getElementById("form-wrap").classList.add("hidden");
  document.getElementById("nav-buttons").classList.add("hidden");
  document.getElementById("progress-wrap").classList.add("hidden");
  document.getElementById("success-screen").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function parseCustomQuestions(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function wireRadioGroup(group) {
  group.addEventListener("click", e => {
    const opt = e.target.closest(".radio-opt");
    if (!opt) return;
    const radio = opt.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.checked = true;
    group.querySelectorAll(".radio-opt").forEach(o => o.classList.remove("selected"));
    opt.classList.add("selected");
  });
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Expose globals used by inline onclick attributes
window.prevSection        = prevSection;
window.nextSection        = nextSection;
window.submitForm         = submitForm;
window.selectRating       = selectRating;
window.selectCustomRating = selectCustomRating;
