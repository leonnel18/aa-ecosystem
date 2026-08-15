// form-apply-pk.js — PK (Pakistan) Foundational Pre-Application Form logic
// Reads ?id= (solutionId) and ?type= (trainingType) from URL
// Fetches training info from CRM via Worker proxy, renders dynamic sections, submits Deal

"use strict";

// ── Config ────────────────────────────────────────────────────────────────────
const PROXY_BASE = "https://zoho-solution-60079085181.development.catalystserverless.in/server/crm-proxy";

// Training-type slug → display name (Foundational only for PK)
const TYPE_LABELS = {
  "Foundational": "Foundational",
};

// Training-type slug → CRM Products record ID
const TYPE_IDS = {
  "Foundational": "773031000000354510",
};

// Confidence rating definitions — Foundational only (1-7 scale)
const RATINGS_CONFIG = {
  Foundational: [
    {
      id: "Campaigning_Experience_Pre",
      renderKey: "rating_f_a",
      label: "1) How would you rank your experience in campaigning? By a \"campaign\" we mean an organized course of action to achieve a social, environmental, or political goal.",
      labelFil: "آپ مہم چلانے میں اپنے تجربے کو کیسے درجہ دیں گے؟ \"مہم\" سے مراد کسی سماجی، ماحولیاتی یا سیاسی مقصد کے حصول کے لیے منظم کارروائی ہے۔",
    },
    {
      id: "A_Pre_Training_Strategy_Buildings",
      renderKey: "rating_f_b",
      label: "2) I feel confident building strategy and choosing tactics for a campaign.",
      labelFil: "مجھے کسی مہم کے لیے حکمت عملی بنانے اور تاکتیک منتخب کرنے میں اعتماد محسوس ہوتا ہے۔",
    },
    {
      id: "B_Pre_Training_Building_Communication",
      renderKey: "rating_f_c",
      label: "3) I feel confident using stories to connect with others for campaigns OR starting a communication strategy or plan for a campaign.",
      labelFil: "مجھے مہم کے لیے کہانیوں کے ذریعے دوسروں سے جڑنے یا مواصلاتی حکمت عملی شروع کرنے میں اعتماد ہے۔",
    },
    {
      id: "C_Pre_Training_Confident_facilitator",
      renderKey: "rating_f_d",
      label: "4) I feel confident facilitating discussions or knowledge sharing activities for a campaign.",
      labelFil: "مجھے مہم کے لیے مذاکرات یا علم کے اشتراک کی سرگرمیوں کو آسان بنانے میں اعتماد ہے۔",
    },
    {
      id: "D_Pre_Training_Confident_connector",
      renderKey: "rating_f_e",
      label: "5) I feel confident building connections with others to support a campaign.",
      labelFil: "مجھے مہم کی حمایت کے لیے دوسروں کے ساتھ تعلقات استوار کرنے میں اعتماد ہے۔",
    },
  ],
};

// ── State ─────────────────────────────────────────────────────────────────────
let trainingId   = null;
let trainingType = null;
let trainingData = null;

let sections = [];
let currentIdx = 0;

const ratingValues = {};
const customValues = {};

// ── Custom selects ────────────────────────────────────────────────────────────

function wireCityProvinceMode(country) {
  const isPK = country === "Pakistan" || country === "";
  const provWrap   = document.getElementById("wrap-Province");
  const provText   = document.getElementById("province-text-input");
  const cityCombo  = document.getElementById("city-combobox-wrap");
  const cityText   = document.getElementById("city-text-input");
  if (!provWrap || !cityCombo) return;

  if (isPK) {
    provWrap.style.display  = "";
    cityCombo.style.display = "";
    if (provText)  provText.closest(".field-text-fallback").style.display  = "none";
    if (cityText)  cityText.closest(".field-text-fallback").style.display  = "none";
  } else {
    provWrap.style.display  = "none";
    cityCombo.style.display = "none";
    const provHidden = document.getElementById("Province");
    const cityHidden = document.getElementById("City_Town");
    if (provHidden) provHidden.value = "";
    if (cityHidden) cityHidden.value = "";
    const pTrig = document.getElementById("trigger-Province");
    if (pTrig) { pTrig.textContent = "— Select Province —"; pTrig.classList.add("placeholder"); }
    const cInput = document.getElementById("city-search-input");
    if (cInput) { cInput.value = ""; cInput.disabled = true; cInput.placeholder = "پہلے صوبہ منتخب کریں…"; }
    if (provText)  provText.closest(".field-text-fallback").style.display  = "";
    if (cityText)  cityText.closest(".field-text-fallback").style.display  = "";
  }
}

function wireProvinceDropdown() {
  const provinces = Object.keys(PK_PROVINCES).sort();

  const pTrigger = document.getElementById("trigger-Province");
  const pListbox = document.getElementById("listbox-Province");
  const pHidden  = document.getElementById("Province");
  if (!pTrigger || !pListbox || !pHidden) return;

  pListbox.innerHTML = provinces.map(p =>
    `<div class="custom-select-option" data-value="${p}">${p}</div>`
  ).join("");
  pHidden.innerHTML = `<option value=""></option>` +
    provinces.map(p => `<option value="${p}">${p}</option>`).join("");

  const pOptions = pListbox.querySelectorAll(".custom-select-option");

  function openProv() { pListbox.classList.add("open"); pTrigger.setAttribute("aria-expanded","true"); }
  function closeProv() { pListbox.classList.remove("open"); pTrigger.setAttribute("aria-expanded","false"); }

  function selectProvince(opt) {
    const val = opt.dataset.value;
    pOptions.forEach(o => o.classList.remove("selected"));
    opt.classList.add("selected");
    pTrigger.textContent = val;
    pTrigger.classList.remove("placeholder");
    pHidden.value = val;
    closeProv();
    buildCityList(val);
  }

  pTrigger.addEventListener("click", () => pListbox.classList.contains("open") ? closeProv() : openProv());
  pOptions.forEach(opt => opt.addEventListener("click", () => selectProvince(opt)));
  document.addEventListener("click", e => {
    if (!document.getElementById("wrap-Province")?.contains(e.target)) closeProv();
  });

  const cityWrap    = document.getElementById("city-combobox-wrap");
  const cityInput   = document.getElementById("city-search-input");
  const cityList    = document.getElementById("city-dropdown-list");
  const cityHidden  = document.getElementById("City_Town");
  if (!cityInput || !cityList || !cityHidden) return;

  let currentMunis = [];

  function buildCityList(province) {
    currentMunis = (PK_PROVINCES[province] || []).slice().sort();
    cityInput.value = "";
    cityHidden.value = "";
    cityInput.disabled = false;
    cityInput.placeholder = "ضلع تلاش کریں…";
    cityList.classList.remove("open");
    renderCityOptions("");
  }

  function renderCityOptions(q) {
    const lower = q.toLowerCase();
    const matches = q.length === 0
      ? currentMunis
      : currentMunis.filter(m => m.toLowerCase().includes(lower));

    if (matches.length === 0 && q.length > 0) {
      cityList.innerHTML = `
        <div class="org-dropdown-item" style="color:var(--meta);cursor:default;font-size:13px">کوئی نتیجہ نہیں — دستی درج کریں</div>
        <div class="org-add-row" id="city-enter-manual">"${escHtml(q)}" بطور ضلع استعمال کریں</div>`;
      cityList.classList.add("open");
      cityList.querySelector("#city-enter-manual")?.addEventListener("click", () => {
        cityHidden.value = q;
        cityInput.value  = q;
        cityList.classList.remove("open");
      });
      return;
    }

    cityList.innerHTML = matches.map(m =>
      `<div class="org-dropdown-item" data-city="${escHtml(m)}">${escHtml(m)}</div>`
    ).join("");

    if (matches.length > 0) cityList.classList.add("open");
    else cityList.classList.remove("open");

    cityList.querySelectorAll("[data-city]").forEach(item => {
      item.addEventListener("click", () => {
        cityHidden.value = item.dataset.city;
        cityInput.value  = item.dataset.city;
        cityList.classList.remove("open");
      });
    });
  }

  cityInput.addEventListener("input", () => {
    if (currentMunis.length === 0) return;
    cityHidden.value = "";
    renderCityOptions(cityInput.value.trim());
  });

  cityInput.addEventListener("focus", () => {
    if (currentMunis.length > 0 && cityInput.value === "") renderCityOptions("");
  });

  document.addEventListener("click", e => {
    if (cityWrap && !cityWrap.contains(e.target)) cityList.classList.remove("open");
  });
}

function wireCustomSelects() {
  const selects = [
    "Country_of_Residence",
    "Gender",
    "Preferred_Language",
    "Pronoun",
    "campaigning_f",
  ];

  selects.forEach(id => {
    const trigger  = document.getElementById(`trigger-${id}`);
    const listbox  = document.getElementById(`listbox-${id}`);
    const hidden   = document.getElementById(id);
    if (!trigger || !listbox || !hidden) return;

    const options = listbox.querySelectorAll(".custom-select-option");

    function openListbox() {
      listbox.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
    function closeListbox() {
      listbox.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
    function selectOption(opt) {
      const val   = opt.dataset.value;
      const label = opt.textContent.trim();
      options.forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      trigger.textContent = label;
      trigger.classList.remove("placeholder");
      hidden.value = val;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
      closeListbox();
    }

    trigger.addEventListener("click", () => {
      listbox.classList.contains("open") ? closeListbox() : openListbox();
    });

    options.forEach(opt => {
      opt.addEventListener("click", () => selectOption(opt));
    });

    trigger.addEventListener("keydown", e => {
      const openOpts = [...options];
      const curIdx   = openOpts.findIndex(o => o.classList.contains("selected"));
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openListbox(); }
      if (e.key === "Escape") closeListbox();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!listbox.classList.contains("open")) { openListbox(); return; }
        const next = openOpts[curIdx + 1] || openOpts[0];
        selectOption(next);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!listbox.classList.contains("open")) { openListbox(); return; }
        const prev = openOpts[curIdx - 1] || openOpts[openOpts.length - 1];
        selectOption(prev);
      }
    });

    document.addEventListener("click", e => {
      if (!trigger.contains(e.target) && !listbox.contains(e.target)) closeListbox();
    });
  });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wireMultiselect() {
  const trigger = document.getElementById("trigger-identify");
  const panel   = document.getElementById("panel-identify");
  if (!trigger || !panel) return;

  function getChecked() {
    return [...document.querySelectorAll('input[name="Identify_as"]:checked')];
  }

  function renderChips() {
    const checked = getChecked();
    trigger.querySelectorAll(".ms-chip, .multiselect-placeholder").forEach(el => el.remove());

    if (checked.length === 0) {
      trigger.insertAdjacentHTML("afterbegin",
        `<span class="multiselect-placeholder">Select all that apply / تمام متعلقہ انتخاب کریں</span>`
      );
    } else {
      const frag = document.createDocumentFragment();
      checked.forEach(cb => {
        const chip = document.createElement("span");
        chip.className = "ms-chip";
        chip.dataset.val = cb.value;
        chip.innerHTML = `${escHtml(cb.value)}<button type="button" class="ms-chip-remove" aria-label="Remove ${escHtml(cb.value)}">×</button>`;
        chip.querySelector(".ms-chip-remove").addEventListener("click", ev => {
          ev.stopPropagation();
          cb.checked = false;
          renderChips();
        });
        frag.appendChild(chip);
      });
      trigger.insertBefore(frag, trigger.firstChild);
    }
  }

  trigger.addEventListener("click", e => {
    if (e.target.closest(".ms-chip-remove")) return;
    const isOpen = panel.classList.contains("open");
    panel.classList.toggle("open", !isOpen);
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });

  trigger.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger.click(); }
    if (e.key === "Escape") { panel.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); }
  });

  panel.addEventListener("change", () => renderChips());

  document.addEventListener("click", e => {
    if (!trigger.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  renderChips();
}

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

  document.querySelectorAll(".radio-group").forEach(wireRadioGroup);
  document.querySelectorAll(".check-group").forEach(wireCheckGroup);

  wireCustomSelects();
  wireProvinceDropdown();
  wireMultiselect();

  document.getElementById("Pronoun").addEventListener("change", function() {
    document.getElementById("other-pronoun-field").classList.toggle("hidden", this.value !== "Other");
  });

  document.getElementById("Preferred_Language").addEventListener("change", function() {
    document.getElementById("other-language-field").classList.toggle("hidden", this.value !== "Other");
  });

  // Phone: strip non-digits, cap at 10, format as 3XX XXX XXXX
  document.getElementById("Mobile").addEventListener("input", function() {
    const digits = this.value.replace(/\D/g, "").slice(0, 10);
    let fmt = digits;
    if (digits.length > 7) fmt = digits.slice(0,3) + " " + digits.slice(3,7) + " " + digits.slice(7);
    else if (digits.length > 3) fmt = digits.slice(0,3) + " " + digits.slice(3);
    if (this.value !== fmt) this.value = fmt;
    validatePhone("Mobile");
  });

  document.getElementById("Email").addEventListener("blur", () => validateEmail("Email"));
  document.getElementById("Email").addEventListener("input", function() {
    if (this.closest(".field").classList.contains("has-error")) validateEmail("Email");
  });

  const campDesc = document.getElementById("Current_Campaign_Description");
  if (campDesc) {
    campDesc.addEventListener("input", () => {
      const words = campDesc.value.trim() === "" ? 0 : campDesc.value.trim().split(/\s+/).length;
      const el = document.getElementById("campaign-word-count");
      if (el) el.textContent = words;
    });
  }

  const campaigningSelect = document.getElementById("campaigning_f");
  if (campaigningSelect) {
    campaigningSelect.addEventListener("change", function() {
      const show = this.value === "Yes" || this.value === "Have in the past but not currently";
      document.getElementById("campaign-desc-field").style.display = show ? "" : "none";
    });
  }

  document.getElementById("Country_of_Residence").addEventListener("change", function() {
    wireCityProvinceMode(this.value);
  });

  wireOrgTypeahead();

  const bioField = document.getElementById("Please_provide_a_100_word_bio_that_best_describes");
  bioField.addEventListener("input", () => {
    const words = bioField.value.trim() === "" ? 0 : bioField.value.trim().split(/\s+/).length;
    document.getElementById("bio-word-count").textContent = words;
  });

  wireFileUpload("Recent_Photo", "photo-name");
  wireFileUpload("Import_CV",    "cv-name");

  try {
    trainingData = await fetchTraining(trainingId);
  } catch (e) {
    showError("Could not load training details. Please check your link.");
    return;
  }

  populateBanner(trainingData);

  if (!isWithinApplicationWindow(trainingData)) {
    showClosed(trainingData);
    return;
  }

  document.getElementById("Training_Applied").value = trainingId;
  document.getElementById("Training_Applied_Display").value = trainingData.Solution_Title || "—";

  buildSectionList();
  renderRatings();
  renderCustomQuestions(trainingData.Custom_Questions);
  buildProgressBar();
  showSection(0);
}

// ── CRM fetch ─────────────────────────────────────────────────────────────────
async function fetchTraining(id) {
  const fields = [
    "Solution_Title", "Training_Type", "Organised_By",
    "Start_Date", "End_Date",
    "Application_Form_Open_Date", "Application_Form_Close_Date",
    "Venue_Address",
    "Custom_Questions",
    "Training_Description",
  ].join(",");
  const res = await fetch(`${PROXY_BASE}/solutions/${id}?fields=${fields}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data[0];
}

// ── Banner ────────────────────────────────────────────────────────────────────
function populateBanner(t) {
  document.getElementById("banner-title").textContent =
    t.Solution_Title || "Training Application";

  const typeEl = document.getElementById("banner-type");
  typeEl.textContent = t.Training_Type?.name || trainingType.replace(/_/g, " ");

  if (t.Start_Date && t.End_Date) {
    document.getElementById("banner-dates").textContent =
      fmtDate(t.Start_Date) + " – " + fmtDate(t.End_Date);
  }

  document.getElementById("banner-venue").textContent =
    t.Venue_Address || t.Organised_By || "Pakistan";

  document.getElementById("banner-deadline").textContent =
    t.Application_Form_Close_Date ? fmtDate(t.Application_Form_Close_Date) : "—";

  const descBlock = document.getElementById("training-description-block");
  const descBody  = document.getElementById("training-description-body");
  if (t.Training_Description && t.Training_Description.trim()) {
    descBody.innerHTML = t.Training_Description;
    descBlock.style.display = "block";
  }
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
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
const STEPPER_NODES = [
  { sections: ["sec-demographics"],         title: "Demographics", desc: "Personal Info" },
  { sections: ["sec-professional"],          title: "Professional", desc: "Your work" },
  { sections: ["sec-exp-foundational"],      title: "Experience",   desc: "& Motivation" },
  { sections: ["sec-ratings", "sec-custom"], title: "Confidence",   desc: "Ratings" },
];

function buildSectionList() {
  sections = ["sec-demographics", "sec-professional", "sec-exp-foundational", "sec-ratings"];
  const cq = parseCustomQuestions(trainingData.Custom_Questions);
  if (cq.length > 0) sections.push("sec-custom");
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function buildProgressBar() {
  const nav = document.getElementById("progress-steps");
  nav.innerHTML = STEPPER_NODES.map((node, i) => {
    const isLast = i === STEPPER_NODES.length - 1;
    return `
      <div class="stepper-item" id="stepper-node-${i}" data-state="inactive">
        <button type="button" class="stepper-trigger" tabindex="-1" aria-label="Step ${i+1}: ${node.title}">
          <div class="stepper-indicator">${i + 1}</div>
          <div class="stepper-text">
            <div class="stepper-title">${node.title}</div>
            <div class="stepper-desc">${node.desc}</div>
          </div>
        </button>
      </div>
      ${!isLast ? `<div class="stepper-separator" id="stepper-sep-${i}"></div>` : ""}
    `;
  }).join("");
}

function updateProgressBar() {
  let activeNodeIdx = STEPPER_NODES.findIndex(node =>
    node.sections.includes(sections[currentIdx])
  );
  if (activeNodeIdx === -1) activeNodeIdx = STEPPER_NODES.length;

  STEPPER_NODES.forEach((_, i) => {
    const node = document.getElementById(`stepper-node-${i}`);
    if (!node) return;
    if (i < activeNodeIdx)        node.dataset.state = "completed";
    else if (i === activeNodeIdx) node.dataset.state = "active";
    else                          node.dataset.state = "inactive";
  });
}

// ── Section navigation ────────────────────────────────────────────────────────
function showSection(idx) {
  document.querySelectorAll(".section-card").forEach(el => el.classList.remove("active"));
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
    ok = validatePhone("Mobile") && ok;
    if (isPKCountry()) {
      ok = validateSelect("Province", "province-error") && ok;
    } else {
      const pv = (document.getElementById("province-text-input")?.value ?? "").trim();
      const pe = document.getElementById("province-error");
      if (pe) pe.style.display = pv ? "none" : "block";
      if (!pv) ok = false;
    }
    ok = validateCityTown() && ok;
    ok = validateSelect("Country_of_Residence") && ok;
    ok = validateYear("Year_of_Birth") && ok;
    ok = validateSelect("Gender") && ok;
    ok = validateSelect("Pronoun", "pronoun-error") && ok;
    ok = validateSelect("Preferred_Language", "lang-error") && ok;
    ok = validateCheckGroup("Identify_as", "identify-error") && ok;
    ok = validateFileUpload("Recent_Photo", "photo-error") && ok;
  }

  if (sectionId === "sec-professional") {
    const orgInput = document.getElementById("Account_Name").value.trim();
    const orgErrEl = document.getElementById("org-error");
    if (!orgInput) {
      orgErrEl.textContent = "یہ خانہ ضروری ہے۔";
      orgErrEl.style.display = "block";
      ok = false;
    } else if (!selectedOrgId && !addingNewOrg) {
      orgErrEl.textContent = "فہرست سے تنظیم منتخب کریں یا '+ Add new organization' پر کلک کریں۔";
      orgErrEl.style.display = "block";
      ok = false;
    } else {
      orgErrEl.style.display = "none";
    }
    ok = validateRequired("Role_in_the_Organisation") && ok;
    ok = validateBio() && ok;
  }

  if (sectionId === "sec-exp-foundational") {
    ok = validateSelect("campaigning_f", "campaign-f-error") && ok;
    ok = validateRequired("Reason_for_Applying_F") && ok;
  }

  if (sectionId === "sec-ratings") {
    ok = validateRatings() && ok;
    ok = validateTerms() && ok;
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

function validateSelect(id, errorId) {
  const el    = document.getElementById(id);
  const field = el.closest(".field");
  const pass  = el.value !== "";
  field.classList.toggle("has-error", !pass);
  if (errorId) {
    const errEl = document.getElementById(errorId);
    if (errEl) errEl.style.display = pass ? "none" : "block";
  }
  return pass;
}

function validateEmail(id) {
  const el    = document.getElementById(id);
  const field = el.closest(".field");
  const pass  = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(el.value.trim());
  field.classList.toggle("has-error", !pass);
  return pass;
}

function validatePhone(id) {
  const el     = document.getElementById(id);
  const field  = el.closest(".field");
  const digits = el.value.replace(/\D/g, "");
  // PK: exactly 10 digits starting with 3
  const pass = digits.length === 10 && digits.startsWith("3");
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

function isPKCountry() {
  const v = (document.getElementById("Country_of_Residence")?.value ?? "Pakistan");
  return v === "Pakistan" || v === "";
}

function validateCityTown() {
  const errEl = document.getElementById("city-error");
  const val = isPKCountry()
    ? (document.getElementById("City_Town")?.value ?? "").trim()
    : (document.getElementById("city-text-input")?.value ?? "").trim();
  const pass = val !== "";
  if (errEl) errEl.style.display = pass ? "none" : "block";
  return pass;
}

function validateTerms() {
  const checked = document.getElementById("terms1")?.checked ?? false;
  document.getElementById("terms-error").style.display = checked ? "none" : "block";
  return checked;
}

function validateRatings() {
  const config = RATINGS_CONFIG[trainingType] || [];
  let ok = true;
  config.forEach(item => {
    const rk       = item.renderKey || item.id;
    const ratingEl = document.getElementById(`rating-item-${rk}`);
    const errEl    = ratingEl?.querySelector(".field-error");
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
    const rk = item.renderKey || item.id;
    return `
    <div class="rating-item" id="rating-item-${rk}">
      <div class="rating-question">
        ${item.label}
        ${item.labelFil ? `<div style="font-size:12px;font-weight:400;color:var(--meta);margin-top:2px;font-style:italic" dir="rtl">${item.labelFil}</div>` : ""}
      </div>
      <div class="rating-scale">
        ${[1,2,3,4,5,6,7].map(n =>
          `<button type="button" class="rating-btn" data-rk="${rk}" data-field="${item.id}" data-val="${n}" onclick="selectRating(this)">${n}</button>`
        ).join("")}
      </div>
      <div class="rating-scale-labels">
        <span>Not confident</span>
        <span>Highly confident</span>
      </div>
      <div class="field-error" style="display:none">براہ کرم درجہ بندی کریں۔</div>
    </div>`;
  }).join("");
}

function selectRating(btn) {
  const rk      = btn.dataset.rk;
  const fieldId = btn.dataset.field;
  const val     = btn.dataset.val;

  ratingValues[fieldId] = val;

  document.querySelectorAll(`[data-rk="${rk}"]`).forEach(b => {
    b.classList.toggle("selected", b.dataset.val === val);
  });

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

function buildCustomQuestionHtml(q, i) {
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
    default:
      inputHtml = `<input type="text" id="${id}" placeholder="${q.placeholder || ""}">`;
  }

  return `
    <div class="field" data-cq-idx="${i}">
      <label class="field-label">${q.question_text}${req ? ' <span class="req">*</span>' : ''}</label>
      ${q.translation ? `<span class="field-label-fil" dir="rtl">${q.translation}</span>` : ""}
      ${q.instructions ? `<div class="field-hint">${q.instructions}</div>` : ""}
      ${inputHtml}
      ${req ? `<div class="field-error">یہ خانہ ضروری ہے۔</div>` : ""}
    </div>
  `;
}

const SECTION_ID_MAP = {
  demographics: "sec-demographics",
  professional: "sec-professional",
  confidence:   "sec-ratings",
  experience:   "sec-exp-foundational",
};

function renderCustomQuestions(raw) {
  const cq          = parseCustomQuestions(raw);
  const container   = document.getElementById("custom-questions-container");
  const section     = document.getElementById("sec-custom");

  if (cq.length === 0) {
    section.classList.add("hidden");
    return;
  }

  const legacyQs  = [];
  const sectionQs = [];
  cq.forEach((q, i) => {
    if (q.form_section) {
      sectionQs.push({ q, i });
    } else {
      legacyQs.push({ q, i });
    }
  });

  if (legacyQs.length > 0) {
    section.classList.remove("hidden");
    container.innerHTML = legacyQs.map(({ q, i }) => buildCustomQuestionHtml(q, i)).join("");
    container.querySelectorAll(".check-group").forEach(wireCheckGroup);
  } else {
    section.classList.add("hidden");
  }

  sectionQs.forEach(({ q, i }) => {
    const targetId = SECTION_ID_MAP[q.form_section];
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildCustomQuestionHtml(q, i);
    const fieldEl = wrapper.firstElementChild;
    target.appendChild(fieldEl);
    wrapper.querySelectorAll(".check-group").forEach(wireCheckGroup);
  });
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
  if (isSubmitting) return;
  if (!validateSection(sections[currentIdx])) return;

  isSubmitting = true;
  let createdDealId = null;
  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting…';

  try {
    if (addingNewOrg) {
      const orgName    = document.getElementById("org-new-name").value.trim();
      const orgCity    = document.getElementById("org-new-city").value.trim();
      const orgCountry = document.getElementById("org-new-country").value;
      if (!orgName) throw new Error("Please enter the organization name.");
      const orgRes  = await fetch(`${PROXY_BASE}/accounts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ data: [{ Account_Name: orgName, Billing_City: orgCity, Billing_Country: orgCountry }] }),
      });
      const orgJson = await orgRes.json();
      const newId   = orgJson.data?.[0]?.details?.id;
      if (newId) { selectedOrgId = newId; addingNewOrg = false; }
    }

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

    createdDealId = resJson?.data?.[0]?.details?.id;
    await uploadFiles(resJson);
    showSuccess();
  } catch (e) {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Submit Application";
    if (createdDealId) {
      alert("Your application was submitted but there was a problem with file upload. Your data was saved. Please contact the AktivAsia team if needed.");
      showSuccess();
    } else {
      alert("Submission failed: " + e.message + "\n\nPlease try again or contact the AktivAsia team.");
    }
  }
}

function buildPayload() {
  const val = id => (document.getElementById(id)?.value ?? "").trim();
  const checkArr = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(c => c.value);

  const data = {
    Deal_Name:              val("First_Name") + " " + val("Last_Name"),
    First_Name:             val("First_Name"),
    Last_Name:              val("Last_Name"),
    Preferred_Name_Nick_Name: val("Preferred_Name_Nick_Name"),
    Email:                  val("Email"),
    Mobile: "+92" + (document.getElementById("Mobile")?.value ?? "").replace(/\D/g, ""),
    Address:                val("Address"),
    City_Province: isPKCountry()
      ? [val("City_Town"), val("Province")].filter(Boolean).join(", ")
      : [(document.getElementById("city-text-input")?.value ?? "").trim(), (document.getElementById("province-text-input")?.value ?? "").trim()].filter(Boolean).join(", "),
    Country_of_Residence:   val("Country_of_Residence"),
    Year_of_Birth:          parseInt(val("Year_of_Birth"), 10) || null,
    Gender:                 val("Gender"),
    Pronoun:                val("Pronoun"),
    Preferred_Pronoun:      val("Preferred_Pronoun"),
    Preferred_Language:     val("Preferred_Language") === "Other" ? val("Preferred_Language_Other") : val("Preferred_Language"),
    Identify_as_Multiple:   checkArr("Identify_as"),
    Special_Requirements:   val("Special_Requirements"),
    Organisation:           val("Account_Name"),
    Role_in_the_Organisation: val("Role_in_the_Organisation"),
    Please_provide_a_100_word_bio_that_best_describes: val("Please_provide_a_100_word_bio_that_best_describes"),
    Training_Applied:       { id: trainingId },
    Training_Type_Applied:  TYPE_IDS[trainingType] ? { id: TYPE_IDS[trainingType] } : null,
    Pipeline:               "Application Pipeline",
    Stage:                  "Still in Applied Stage",
    Currently_Campaigning:        val("campaigning_f"),
    Current_Campaign_Description: val("Current_Campaign_Description"),
    Reason_for_Applying:          val("Reason_for_Applying_F"),
  };

  Object.assign(data, ratingValues);

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

let selectedOrgId      = null;
let selectedOrgName    = null;
let addingNewOrg       = false;
let skipNextOrgInput   = false;
let isSubmitting       = false;

function wireOrgTypeahead() {
  const input     = document.getElementById("Account_Name");
  const dropdown  = document.getElementById("org-dropdown");
  const clearBtn  = document.getElementById("org-clear-btn");
  const newPrompt = document.getElementById("org-new-prompt");
  const newFields = document.getElementById("org-new-fields");
  let debounce;

  function updateClearBtn() {
    clearBtn.classList.toggle("visible", input.value.length > 0);
  }

  clearBtn.addEventListener("click", () => {
    input.value = "";
    document.getElementById("Account_Name_Id").value = "";
    selectedOrgId   = null;
    selectedOrgName = null;
    addingNewOrg    = false;
    dropdown.classList.remove("open");
    newPrompt.style.display = "none";
    newFields.style.display = "none";
    updateClearBtn();
    input.focus();
  });

  input.addEventListener("input", () => {
    if (skipNextOrgInput) { skipNextOrgInput = false; updateClearBtn(); return; }
    selectedOrgId   = null;
    selectedOrgName = null;
    addingNewOrg    = false;
    newPrompt.style.display = "none";
    newFields.style.display = "none";
    updateClearBtn();
    clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.classList.remove("open"); return; }
    debounce = setTimeout(() => searchOrgs(q), 300);
  });

  document.addEventListener("click", e => {
    const wrap = document.querySelector(".org-combobox-wrap");
    if (wrap && !wrap.contains(e.target)) dropdown.classList.remove("open");
  });

  document.getElementById("org-add-btn").addEventListener("click", () => {
    addingNewOrg = true;
    newFields.style.display = "block";
    newPrompt.style.display = "none";
    document.getElementById("org-new-name").value = input.value.trim();
  });
}

async function searchOrgs(q) {
  const dropdown  = document.getElementById("org-dropdown");
  const newPrompt = document.getElementById("org-new-prompt");
  dropdown.innerHTML = `<div class="org-dropdown-item" style="color:var(--meta);cursor:default">Searching…</div>`;
  dropdown.classList.add("open");
  try {
    const res  = await fetch(`${PROXY_BASE}/accounts/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    const orgs = json.data ?? [];
    if (orgs.length === 0) {
      dropdown.classList.remove("open");
      newPrompt.style.display = "block";
      return;
    }
    dropdown.innerHTML = orgs.map(o =>
      `<div class="org-dropdown-item${o.id === selectedOrgId ? " selected" : ""}" data-id="${escHtml(o.id)}" data-name="${escHtml(o.Account_Name)}">${escHtml(o.Account_Name)}</div>`
    ).join("") +
      `<div class="org-add-row" data-id="__new__">+ Add new organization</div>`;
    dropdown.querySelectorAll("[data-id]").forEach(item => {
      item.addEventListener("click", () => {
        if (item.dataset.id === "__new__") {
          document.getElementById("org-new-fields").style.display = "block";
          document.getElementById("org-new-name").value = document.getElementById("Account_Name").value.trim();
          addingNewOrg = true;
        } else {
          skipNextOrgInput = true;
          document.getElementById("Account_Name").value    = item.dataset.name;
          document.getElementById("Account_Name_Id").value = item.dataset.id;
          selectedOrgId   = item.dataset.id;
          selectedOrgName = item.dataset.name;
          addingNewOrg    = false;
          document.getElementById("org-error").style.display = "none";
          document.getElementById("org-clear-btn").classList.add("visible");
        }
        dropdown.classList.remove("open");
        newPrompt.style.display = "none";
      });
    });
  } catch {
    dropdown.classList.remove("open");
  }
}

window.prevSection  = prevSection;
window.nextSection  = nextSection;
window.submitForm   = submitForm;
window.selectRating = selectRating;
window.selectCustomRating = selectCustomRating;
