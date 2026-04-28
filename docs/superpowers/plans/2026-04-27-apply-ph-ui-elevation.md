# apply-ph.html UI Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the PH training application form with 11 UI/UX improvements — banner redesign, inline stepper, custom dropdowns, multiselect, phone prefix, single terms checkbox, gradient Likert scale, and bilingual text corrections.

**Architecture:** Two-pass approach. Pass 1 rewrites all HTML structure and CSS in `apply-ph.html`. Pass 2 rewrites the JS behavior in `form-apply-ph.js` for the stepper, custom selects, multiselect, phone prefix, and terms simplification. All existing field IDs are preserved so CRM payload and validation logic need minimal changes.

**Tech Stack:** Vanilla HTML5, CSS3 (custom properties, grid, flex), vanilla ES6+ JS, no build toolchain, no external dependencies.

**Spec:** `docs/superpowers/specs/2026-04-27-apply-ph-ui-elevation-design.md`

---

## File Map

| File | What changes |
|------|-------------|
| `portal/apply-ph.html` | Pass 1: banner markup, stepper container, name-row grid, phone prefix wrapper, custom select wrappers, multiselect wrapper, terms single checkbox, rating pill CSS, section title sizes, Experience bilingual text |
| `portal/js/form-apply-ph.js` | Pass 2: `buildProgressBar()`, `updateProgressBar()`, `wireCustomSelects()`, `wireMultiselect()`, phone prefix in `buildPayload()`, `validateTerms()`, rating label update in `RATINGS_CONFIG` |

---

## Pass 1 — HTML + CSS

---

### Task 1: Banner Redesign

**Files:**
- Modify: `portal/apply-ph.html` — `<div class="training-banner">` block + `.training-banner` CSS

- [ ] **Step 1: Replace banner CSS**

In `apply-ph.html` inside `<style>`, replace the existing `.training-banner` block with:

```css
.training-banner {
  background: linear-gradient(135deg, var(--primary) 0%, #5a0e30 100%);
  color: var(--white);
  padding: 28px 20px 24px;
}
.training-banner .type-pill {
  display: inline-block;
  border: 1.5px solid rgba(255,255,255,0.4);
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 12px;
  margin-bottom: 12px;
  opacity: 0.9;
}
.training-banner h1 {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 20px;
}
.banner-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  border-top: 1px solid rgba(255,255,255,0.15);
  padding-top: 16px;
}
.banner-meta-col .meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 4px;
}
.banner-meta-col .meta-value {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.95;
  line-height: 1.4;
}
@media (min-width: 640px) {
  .training-banner { padding: 36px 40px 28px; }
  .training-banner h1 { font-size: 36px; }
}
```

- [ ] **Step 2: Replace banner HTML**

Replace the `<div class="training-banner" id="training-banner">` block with:

```html
<div class="training-banner" id="training-banner">
  <div class="type-pill" id="banner-type">Application Form</div>
  <h1 id="banner-title">Loading training…</h1>
  <div class="banner-meta-grid">
    <div class="banner-meta-col">
      <div class="meta-label">Venue</div>
      <div class="meta-value" id="banner-venue">—</div>
    </div>
    <div class="banner-meta-col">
      <div class="meta-label">Time</div>
      <div class="meta-value" id="banner-dates">—</div>
    </div>
    <div class="banner-meta-col">
      <div class="meta-label">Apply Before</div>
      <div class="meta-value" id="banner-deadline">—</div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: redesign training banner with 3-col meta grid and venue address"
```

---

### Task 2: Stepper Container + CSS

**Files:**
- Modify: `portal/apply-ph.html` — `.progress-wrap` CSS + `#progress-steps` HTML

- [ ] **Step 1: Replace progress CSS**

In `<style>`, replace the entire `.progress-wrap`, `.progress-steps`, `.step-dot`, `.progress-label` block with:

```css
.progress-wrap {
  background: var(--white);
  padding: 16px 20px;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border);
}
.stepper-nav {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 0;
}
.stepper-item {
  display: flex;
  align-items: center;
  flex: 1;
}
.stepper-item:last-child { flex: 0 0 auto; }
.stepper-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  padding: 0;
  cursor: default;
  text-align: left;
}
.stepper-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  border: 2px solid var(--border);
  background: var(--white);
  color: var(--meta);
  transition: background 0.25s, border-color 0.25s, color 0.25s;
}
.stepper-item[data-state="completed"] .stepper-indicator {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--white);
}
.stepper-item[data-state="active"] .stepper-indicator {
  background: var(--cta-start);
  border-color: var(--cta-start);
  color: var(--text);
}
.stepper-text { display: flex; flex-direction: column; gap: 1px; }
.stepper-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}
.stepper-desc {
  font-size: 11px;
  color: var(--meta);
  line-height: 1.2;
}
.stepper-item[data-state="inactive"] .stepper-title,
.stepper-item[data-state="inactive"] .stepper-desc {
  color: var(--meta);
}
.stepper-separator {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 8px;
  border-radius: 1px;
  transition: background 0.25s;
}
.stepper-item[data-state="completed"] + .stepper-separator {
  background: var(--primary);
}
/* Mobile: hide text labels for non-active steps */
@media (max-width: 639px) {
  .stepper-text { display: none; }
  .stepper-item[data-state="active"] .stepper-text { display: flex; }
  .stepper-separator { margin: 0 4px; }
}
```

- [ ] **Step 2: Replace progress HTML**

Replace the `<div class="progress-wrap" ...>` block with:

```html
<div class="progress-wrap" id="progress-wrap">
  <div class="stepper-nav" id="progress-steps"></div>
</div>
```

(Remove the old `<div class="progress-label" id="progress-label">` — it's replaced by inline stepper text.)

- [ ] **Step 3: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: add inline title-description stepper CSS and container"
```

---

### Task 3: Section Headlines + Name Row

**Files:**
- Modify: `portal/apply-ph.html` — `.section-title`, `.section-subtitle` CSS + First/Last name fields

- [ ] **Step 1: Update headline CSS**

In `<style>`, replace `.section-title` and `.section-subtitle` rules:

```css
.section-title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 4px;
  color: var(--text);
}
.section-subtitle {
  font-size: 14px;
  color: var(--meta);
  margin-bottom: 20px;
  opacity: 0.75;
}
```

- [ ] **Step 2: Add name-row CSS**

Add to `<style>`:

```css
.name-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.name-row .field { margin-bottom: 0; }
@media (max-width: 400px) {
  .name-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Wrap First Name + Last Name in HTML**

In `#sec-demographics`, replace the two separate `.field` divs for First Name and Last Name with:

```html
<div class="name-row">
  <div class="field">
    <label class="field-label">First Name <span class="req">*</span></label>
    <span class="field-label-fil">Pangalan</span>
    <input type="text" id="First_Name" autocomplete="given-name" inputmode="text">
    <div class="field-error">This field is required.</div>
  </div>
  <div class="field">
    <label class="field-label">Last Name <span class="req">*</span></label>
    <span class="field-label-fil">Apelyido</span>
    <input type="text" id="Last_Name" autocomplete="family-name">
    <div class="field-error">This field is required.</div>
  </div>
</div>
```

- [ ] **Step 4: Update Demographics section title**

Change `<div class="section-title">Personal Information</div>` to:

```html
<div class="section-title">Demographics</div>
```

- [ ] **Step 5: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: larger section headlines, name-row grid, Demographics label"
```

---

### Task 4: Phone Number Prefix Input

**Files:**
- Modify: `portal/apply-ph.html` — Mobile field + add phone-wrap CSS

- [ ] **Step 1: Add phone-wrap CSS**

Add to `<style>`:

```css
.phone-wrap {
  display: flex;
  align-items: stretch;
}
.phone-prefix {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-right: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  min-height: var(--input-h);
  flex-shrink: 0;
}
.phone-wrap input[type="tel"] {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  border-left: none;
  flex: 1;
}
.phone-wrap input[type="tel"]:focus {
  border-color: var(--primary);
  outline: none;
}
```

- [ ] **Step 2: Replace Mobile field HTML**

Replace the `<input type="tel" id="Mobile" ...>` with:

```html
<div class="phone-wrap">
  <span class="phone-prefix">🇵🇭 +63</span>
  <input type="tel" id="Mobile" autocomplete="tel" inputmode="tel" placeholder="9XX XXX XXXX">
</div>
```

- [ ] **Step 3: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: phone input with PH country prefix pill"
```

---

### Task 5: Custom Select Wrappers (HTML structure only)

**Files:**
- Modify: `portal/apply-ph.html` — Country, Gender, Preferred Language fields + add custom-select CSS

- [ ] **Step 1: Add custom-select CSS**

Add to `<style>`:

```css
.custom-select-wrap { position: relative; }
.custom-select-trigger {
  width: 100%;
  min-height: var(--input-h);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 36px 12px 14px;
  font-family: inherit;
  font-size: 16px;
  color: var(--text);
  background: var(--white);
  cursor: pointer;
  display: flex;
  align-items: center;
  text-align: left;
  transition: border-color 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23788099' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
.custom-select-trigger.placeholder { color: var(--meta); }
.custom-select-trigger:focus,
.custom-select-trigger[aria-expanded="true"] { outline: none; border-color: var(--primary); }
.custom-select-listbox {
  display: none;
  position: absolute;
  left: 0; right: 0;
  top: calc(100% + 4px);
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0,0,0,.10);
  max-height: 240px;
  overflow-y: auto;
  z-index: 200;
}
.custom-select-listbox.open { display: block; }
.custom-select-option {
  padding: 12px 16px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.15s;
}
.custom-select-option:hover { background: var(--primary-light); }
.custom-select-option.selected { color: var(--primary); font-weight: 600; }
.custom-select-option.selected::after {
  content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='10' viewBox='0 0 14 10'%3E%3Cpath d='M1 5l4 4L13 1' stroke='%23821545' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
```

- [ ] **Step 2: Replace Country of Residence field HTML**

Replace native `<select id="Country_of_Residence">` block with:

```html
<div class="custom-select-wrap" id="wrap-Country_of_Residence">
  <button type="button" class="custom-select-trigger placeholder" id="trigger-Country_of_Residence" aria-haspopup="listbox" aria-expanded="false">
    — Select / Pumili —
  </button>
  <div class="custom-select-listbox" id="listbox-Country_of_Residence" role="listbox">
    <div class="custom-select-option" data-value="Philippines">Philippines</div>
    <div class="custom-select-option" data-value="Pakistan">Pakistan</div>
    <div class="custom-select-option" data-value="South Korea">South Korea</div>
    <div class="custom-select-option" data-value="Indonesia">Indonesia</div>
    <div class="custom-select-option" data-value="Other">Other</div>
  </div>
  <select id="Country_of_Residence" style="display:none" tabindex="-1">
    <option value="">— Select / Pumili —</option>
    <option value="Philippines" selected>Philippines</option>
    <option value="Pakistan">Pakistan</option>
    <option value="South Korea">South Korea</option>
    <option value="Indonesia">Indonesia</option>
    <option value="Other">Other</option>
  </select>
  <div class="field-error">This field is required.</div>
</div>
```

- [ ] **Step 3: Replace Gender field HTML**

Replace native `<select id="Gender">` block with:

```html
<div class="custom-select-wrap" id="wrap-Gender">
  <button type="button" class="custom-select-trigger placeholder" id="trigger-Gender" aria-haspopup="listbox" aria-expanded="false">
    — Select / Pumili —
  </button>
  <div class="custom-select-listbox" id="listbox-Gender" role="listbox">
    <div class="custom-select-option" data-value="Female">Female / Babae</div>
    <div class="custom-select-option" data-value="Male">Male / Lalaki</div>
    <div class="custom-select-option" data-value="Transgender">Transgender</div>
    <div class="custom-select-option" data-value="Non-Binary">Non-Binary</div>
    <div class="custom-select-option" data-value="Prefer not to answer">Prefer not to answer / Ayaw ko pong ipaalam</div>
    <div class="custom-select-option" data-value="Other">Other / Iba pa</div>
  </div>
  <select id="Gender" style="display:none" tabindex="-1">
    <option value="">— Select / Pumili —</option>
    <option value="Female">Female / Babae</option>
    <option value="Male">Male / Lalaki</option>
    <option value="Transgender">Transgender</option>
    <option value="Non-Binary">Non-Binary</option>
    <option value="Prefer not to answer">Prefer not to answer / Ayaw ko pong ipaalam</option>
    <option value="Other">Other / Iba pa</option>
  </select>
  <div class="field-error">This field is required.</div>
</div>
```

- [ ] **Step 4: Replace Preferred Language field HTML**

Replace native `<select id="Preferred_Language">` block with:

```html
<div class="custom-select-wrap" id="wrap-Preferred_Language">
  <button type="button" class="custom-select-trigger placeholder" id="trigger-Preferred_Language" aria-haspopup="listbox" aria-expanded="false">
    — Select / Pumili —
  </button>
  <div class="custom-select-listbox" id="listbox-Preferred_Language" role="listbox">
    <div class="custom-select-option" data-value="Filipino">Filipino</div>
    <div class="custom-select-option" data-value="English">English</div>
    <div class="custom-select-option" data-value="Other">Other / Iba pa</div>
  </div>
  <select id="Preferred_Language" style="display:none" tabindex="-1">
    <option value="">— Select / Pumili —</option>
    <option value="Filipino">Filipino</option>
    <option value="English">English</option>
    <option value="Other">Other / Iba pa</option>
  </select>
  <div class="field-error" id="lang-error">This field is required.</div>
</div>
<div class="field hidden" id="other-language-field" style="margin-top:10px">
  <input type="text" id="Preferred_Language_Other" placeholder="Please specify / Ibigay ang wika">
</div>
```

- [ ] **Step 5: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: custom select wrappers for Country, Gender, Language fields"
```

---

### Task 6: Multiselect Wrapper for "Identify as"

**Files:**
- Modify: `portal/apply-ph.html` — Identify as field + add multiselect CSS

- [ ] **Step 1: Add multiselect CSS**

Add to `<style>`:

```css
.multiselect-wrap { position: relative; }
.multiselect-trigger {
  width: 100%;
  min-height: var(--input-h);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 36px 12px 14px;
  font-family: inherit;
  font-size: 16px;
  color: var(--meta);
  background: var(--white);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23788099' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
.multiselect-trigger:focus,
.multiselect-trigger[aria-expanded="true"] { outline: none; border-color: var(--primary); }
.multiselect-trigger.has-selection { color: var(--text); }
.multiselect-panel {
  display: none;
  position: absolute;
  left: 0; right: 0;
  top: calc(100% + 4px);
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0,0,0,.10);
  max-height: 280px;
  overflow-y: auto;
  z-index: 200;
}
.multiselect-panel.open { display: block; }
.multiselect-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}
.multiselect-option:hover { background: var(--primary-light); }
.multiselect-option input[type="checkbox"] {
  width: 18px; height: 18px; min-height: 18px;
  margin-top: 1px;
  flex-shrink: 0;
  accent-color: var(--primary);
}
.multiselect-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.multiselect-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--primary-light);
  border: 1px solid var(--primary);
  color: var(--primary);
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 500;
}
.multiselect-tag button {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}
```

- [ ] **Step 2: Replace "Identify as" field HTML**

Replace the existing `.field` div containing the `Identify_as` check-group with:

```html
<div class="field">
  <label class="field-label">Do you identify as <span class="req">*</span></label>
  <span class="field-label-fil">Kabilang ka ba sa — maaaring pumili ng marami</span>
  <div class="multiselect-wrap" id="multiselect-identify">
    <button type="button" class="multiselect-trigger" id="trigger-identify" aria-haspopup="listbox" aria-expanded="false">
      Select all that apply / Pumili ng lahat ng angkop
    </button>
    <div class="multiselect-panel" id="panel-identify" role="listbox" aria-multiselectable="true">
      <div class="multiselect-option">
        <input type="checkbox" name="Identify_as" value="Person with disability" id="id-pwd">
        <label for="id-pwd"><div class="check-label">Person with disability</div><div class="check-label-fil">Taong may kapansanan</div></label>
      </div>
      <div class="multiselect-option">
        <input type="checkbox" name="Identify_as" value="Indigenous / First Nations" id="id-indigenous">
        <label for="id-indigenous"><div class="check-label">Indigenous / First Nations</div><div class="check-label-fil">Katutubo</div></label>
      </div>
      <div class="multiselect-option">
        <input type="checkbox" name="Identify_as" value="Frontline Community" id="id-frontline">
        <label for="id-frontline"><div class="check-label">Frontline Community</div></label>
      </div>
      <div class="multiselect-option">
        <input type="checkbox" name="Identify_as" value="LGBTIQ+ Person" id="id-lgbtiq">
        <label for="id-lgbtiq"><div class="check-label">LGBTIQ+ Person</div></label>
      </div>
      <div class="multiselect-option">
        <input type="checkbox" name="Identify_as" value="Sole Parent" id="id-soleparent">
        <label for="id-soleparent"><div class="check-label">Sole Parent</div><div class="check-label-fil">Nag-iisang magulang</div></label>
      </div>
      <div class="multiselect-option">
        <input type="checkbox" name="Identify_as" value="None" id="id-none">
        <label for="id-none"><div class="check-label">None</div><div class="check-label-fil">Wala sa nabanggit</div></label>
      </div>
      <div class="multiselect-option">
        <input type="checkbox" name="Identify_as" value="Other" id="id-other">
        <label for="id-other"><div class="check-label">Other / Iba pa</div></label>
      </div>
    </div>
    <div class="multiselect-tags" id="tags-identify"></div>
  </div>
  <div class="field-error" id="identify-error">Please select at least one option.</div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: multiselect dropdown for Identify as field"
```

---

### Task 7: Terms Single Checkbox

**Files:**
- Modify: `portal/apply-ph.html` — `#sec-terms` section

- [ ] **Step 1: Replace Terms section HTML**

Replace the entire content of `<div class="section-card" id="sec-terms">` with:

```html
<div class="section-card" id="sec-terms">
  <div class="section-title">Terms &amp; Conditions</div>
  <div class="section-subtitle">Mga Tuntunin at Kondisyon</div>

  <div class="check-group">
    <label class="check-opt">
      <input type="checkbox" id="terms1">
      <div>
        <div class="check-label">I agree to participate fully, maintain a respectful learning space, and consent to photos/videos being used for AktivAsia communications.</div>
        <div class="check-label-fil">Sumasang-ayon akong aktibong lumahok, mapanatili ang isang ligtas na espasyo ng pagkatuto, at payagan ang paggamit ng mga larawan/video para sa komunikasyon ng AktivAsia.</div>
      </div>
    </label>
  </div>
  <div class="field-error" id="terms-error" style="margin-top:12px">Please agree to the terms to continue.</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: consolidate Terms into single combined checkbox"
```

---

### Task 8: Experience Section — Foundational Text Correction

**Files:**
- Modify: `portal/apply-ph.html` — `#sec-exp-foundational` section content

- [ ] **Step 1: Replace sec-exp-foundational HTML**

Replace the inner content of `<div class="section-card" id="sec-exp-foundational">` with:

```html
<div class="section-title">Experience</div>
<div class="section-subtitle">Karanasan at Motibasyon</div>

<div class="field">
  <label class="field-label">Are you currently active in campaigning, advocating or organising a community? <span class="req">*</span></label>
  <span class="field-label-fil">Ikaw ba ay kasalukuyang nagkakampaniya, may gawaing adbokasiya, o nag-oorganisa sa iyong komunidad?</span>
  <div class="radio-group">
    <label class="radio-opt"><input type="radio" name="campaigning_f" value="Yes"> Yes / Oo</label>
    <label class="radio-opt"><input type="radio" name="campaigning_f" value="No"> No / Hindi</label>
    <label class="radio-opt"><input type="radio" name="campaigning_f" value="Have in the past but not currently"> Have in the past but not currently / Noon lang</label>
  </div>
  <div class="field-error" id="campaign-f-error">This field is required.</div>
</div>

<div class="field" id="campaign-desc-field">
  <label class="field-label">Describe your campaigning, advocacy, or organizing efforts. Highlight the most rewarding aspects and the most challenging aspects of your work in these areas. (300 words or less)</label>
  <span class="field-label-fil">I-kuwento sa amin ang iyong gawaing pangangampaniya, adbokasiya, o pag-oorganisa. Isama ang mga pinakamasaya o makabuluhan at pinakamahirap na aspeto ng iyong gawain (hindi hihigit sa 300 salita).</span>
  <textarea id="Current_Campaign_Description" rows="5" placeholder="Describe your work…"></textarea>
</div>

<div class="field">
  <label class="field-label">Why are you applying for the training? Specify the knowledge or skills you aim to develop and describe how you plan to use these new skills and knowledge in your work. <span class="req">*</span></label>
  <span class="field-label-fil">Bakit gusto mong makadalo sa pagsasanay na ito? Ano ang gusto mong makuha o mapaunlad na knowledge o skills at paano mo ito naiisip na magamit pagkatapos sa iyong gawain?</span>
  <textarea id="Reason_for_Applying_F" rows="5" placeholder="Share your motivation…"></textarea>
  <div class="field-error">This field is required.</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: update Foundational experience section with correct bilingual text"
```

---

### Task 9: Rating Scale CSS Upgrade

**Files:**
- Modify: `portal/apply-ph.html` — `.rating-btn` CSS

- [ ] **Step 1: Replace rating CSS**

In `<style>`, replace `.rating-scale`, `.rating-scale-labels`, `.rating-btn` rules with:

```css
.rating-item { margin-bottom: 28px; }
.rating-question { font-size: 14px; font-weight: 600; margin-bottom: 10px; line-height: 1.5; }
.rating-scale {
  display: flex;
  gap: 6px;
  align-items: center;
}
.rating-btn {
  flex: 1;
  min-height: 44px;
  min-width: 36px;
  border: 1.5px solid var(--border);
  border-radius: 9999px;
  background: var(--bg);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text);
}
.rating-btn:hover {
  border-color: var(--cta-start);
  color: var(--cta-start);
}
.rating-btn.selected {
  background: linear-gradient(135deg, var(--cta-start), var(--cta-end));
  border-color: transparent;
  color: var(--white);
}
.rating-scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--meta);
  margin-top: 6px;
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/apply-ph.html
git commit -m "feat: upgrade rating scale to gradient pill buttons"
```

---

## Pass 2 — JS Behavior

---

### Task 10: Update Banner JS (`populateBanner` + `fetchTraining`)

**Files:**
- Modify: `portal/js/form-apply-ph.js` — `fetchTraining()`, `populateBanner()`

- [ ] **Step 1: Add Venue_Address to fetchTraining fields list**

In `fetchTraining()`, change the `fields` array to:

```js
const fields = [
  "Solution_Title", "Training_Type", "Organised_By",
  "Start_Date", "End_Date",
  "Application_Form_Open_Date", "Application_Form_Close_Date",
  "Venue_Address",
  "Custom_Questions",
].join(",");
```

- [ ] **Step 2: Rewrite populateBanner()**

Replace the entire `populateBanner(t)` function with:

```js
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
    t.Venue_Address || t.Organised_By || "Philippines";

  document.getElementById("banner-deadline").textContent =
    t.Application_Form_Close_Date ? fmtDate(t.Application_Form_Close_Date) : "—";
}
```

- [ ] **Step 3: Verify in browser**

Open `apply-ph.html?id=<valid-id>&type=Foundational`. Banner should show:
- Type pill with training type
- Large title
- Venue column showing venue address
- Time column showing date range
- Apply Before column showing close date

- [ ] **Step 4: Commit**

```bash
git add portal/js/form-apply-ph.js
git commit -m "feat: wire banner venue address and apply deadline from CRM"
```

---

### Task 11: Rewrite Stepper JS

**Files:**
- Modify: `portal/js/form-apply-ph.js` — `SECTION_LABELS`, `buildProgressBar()`, `updateProgressBar()`

- [ ] **Step 1: Replace SECTION_LABELS and add STEPPER_STEPS**

Replace the `SECTION_LABELS` constant with:

```js
const SECTION_LABELS = {
  "sec-demographics":        "Demographics",
  "sec-professional":        "Professional",
  "sec-terms":               "Terms",
  "sec-exp-foundational":    "Experience",
  "sec-exp-tot":             "Experience",
  "sec-exp-feminist":        "Experience",
  "sec-exp-pn":              "Experience",
  "sec-ratings":             "Confidence",
  "sec-custom":              "Extra Questions",
};

// 4 visible stepper nodes — sec-terms navigates through but is not a stepper node
const STEPPER_NODES = [
  { sections: ["sec-demographics"],                                                       title: "Demographics", desc: "Personal Info" },
  { sections: ["sec-professional"],                                                        title: "Professional", desc: "Your work" },
  { sections: ["sec-exp-foundational","sec-exp-tot","sec-exp-feminist","sec-exp-pn"],      title: "Experience",   desc: "& Motivation" },
  { sections: ["sec-ratings", "sec-custom"],                                               title: "Confidence",   desc: "Ratings" },
];
```

- [ ] **Step 2: Rewrite buildProgressBar()**

Replace `buildProgressBar()` with:

```js
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
```

- [ ] **Step 3: Rewrite updateProgressBar()**

Replace `updateProgressBar()` with:

```js
function updateProgressBar() {
  // Find which stepper node the current section belongs to
  const activeNodeIdx = STEPPER_NODES.findIndex(node =>
    node.sections.includes(sections[currentIdx])
  );

  STEPPER_NODES.forEach((_, i) => {
    const node = document.getElementById(`stepper-node-${i}`);
    if (!node) return;
    if (i < activeNodeIdx)      node.dataset.state = "completed";
    else if (i === activeNodeIdx) node.dataset.state = "active";
    else                          node.dataset.state = "inactive";
  });
}
```

- [ ] **Step 4: Remove progress-label reference**

In `updateProgressBar()` remove any line referencing `progress-label` (it no longer exists in the HTML).

Also in `showSection()`, remove:
```js
window.scrollTo({ top: 0, behavior: "smooth" });
```
and replace with — no change needed, keep scroll.

- [ ] **Step 5: Verify stepper in browser**

Navigate through the form. Circles should:
- Step 1 active on load (orange circle, "Demographics" label visible)
- Step 1 filled maroon after advancing past Demographics
- Mobile: non-active step text hidden, active text visible

- [ ] **Step 6: Commit**

```bash
git add portal/js/form-apply-ph.js
git commit -m "feat: rewrite stepper with 4-node inline title-description pattern"
```

---

### Task 12: Custom Select JS Behavior

**Files:**
- Modify: `portal/js/form-apply-ph.js` — add `wireCustomSelects()`, call from `init()`

- [ ] **Step 1: Add wireCustomSelects() function**

Add this function before the `init()` function:

```js
function wireCustomSelects() {
  const selects = [
    "Country_of_Residence",
    "Gender",
    "Preferred_Language",
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
      // Fire change event so existing listeners (e.g. Preferred_Language Other toggle) work
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
      closeListbox();
    }

    trigger.addEventListener("click", () => {
      listbox.classList.contains("open") ? closeListbox() : openListbox();
    });

    options.forEach((opt, i) => {
      opt.addEventListener("click", () => selectOption(opt));
    });

    // Keyboard navigation
    trigger.addEventListener("keydown", e => {
      const openOpts = [...options];
      const curIdx   = openOpts.findIndex(o => o.classList.contains("selected"));
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openListbox(); }
      if (e.key === "Escape") closeListbox();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = openOpts[curIdx + 1] || openOpts[0];
        selectOption(next);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = openOpts[curIdx - 1] || openOpts[openOpts.length - 1];
        selectOption(prev);
      }
    });

    // Close on outside click
    document.addEventListener("click", e => {
      if (!trigger.contains(e.target) && !listbox.contains(e.target)) closeListbox();
    });
  });
}
```

- [ ] **Step 2: Call wireCustomSelects() from init()**

In the `init()` function, add after `wireCheckGroup` wiring:

```js
wireCustomSelects();
```

- [ ] **Step 3: Verify custom selects**

Open the form. Click Country of Residence — listbox opens, options selectable, chevron present. Press Escape — listbox closes. Arrow keys cycle through options. `validateSelect("Country_of_Residence")` still works because hidden `<select>` value is synced.

- [ ] **Step 4: Commit**

```bash
git add portal/js/form-apply-ph.js
git commit -m "feat: wire custom select dropdowns with keyboard navigation"
```

---

### Task 13: Multiselect JS Behavior

**Files:**
- Modify: `portal/js/form-apply-ph.js` — add `wireMultiselect()`, call from `init()`

- [ ] **Step 1: Add wireMultiselect() function**

Add after `wireCustomSelects()`:

```js
function wireMultiselect() {
  const trigger   = document.getElementById("trigger-identify");
  const panel     = document.getElementById("panel-identify");
  const tagsEl    = document.getElementById("tags-identify");
  if (!trigger || !panel || !tagsEl) return;

  function getChecked() {
    return [...document.querySelectorAll('input[name="Identify_as"]:checked')];
  }

  function renderTags() {
    const checked = getChecked();
    trigger.classList.toggle("has-selection", checked.length > 0);
    trigger.textContent = checked.length === 0
      ? "Select all that apply / Pumili ng lahat ng angkop"
      : `${checked.length} selected`;
    tagsEl.innerHTML = checked.map(cb =>
      `<div class="multiselect-tag" data-val="${cb.value}">
        ${cb.value}
        <button type="button" aria-label="Remove ${cb.value}">×</button>
      </div>`
    ).join("");
    tagsEl.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.closest(".multiselect-tag").dataset.val;
        const cb  = document.querySelector(`input[name="Identify_as"][value="${val}"]`);
        if (cb) { cb.checked = false; }
        renderTags();
      });
    });
  }

  trigger.addEventListener("click", () => {
    const isOpen = panel.classList.contains("open");
    panel.classList.toggle("open", !isOpen);
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });

  panel.addEventListener("change", () => renderTags());

  document.addEventListener("click", e => {
    if (!trigger.contains(e.target) && !panel.contains(e.target) && !tagsEl.contains(e.target)) {
      panel.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  renderTags();
}
```

- [ ] **Step 2: Call wireMultiselect() from init()**

In `init()`, add after `wireCustomSelects()`:

```js
wireMultiselect();
```

- [ ] **Step 3: Verify multiselect**

Select "Person with disability" and "LGBTIQ+ Person" — two tags appear below trigger, trigger shows "2 selected". Click × on a tag — checkbox unchecks, tag removed. `validateCheckGroup("Identify_as", "identify-error")` still works (queries DOM checkboxes directly).

- [ ] **Step 4: Commit**

```bash
git add portal/js/form-apply-ph.js
git commit -m "feat: wire multiselect dropdown with tag pills for Identify as"
```

---

### Task 14: Phone Prefix in buildPayload()

**Files:**
- Modify: `portal/js/form-apply-ph.js` — `buildPayload()`

- [ ] **Step 1: Update Mobile value in buildPayload()**

In `buildPayload()`, find the line:

```js
Mobile: val("Mobile"),
```

Replace with:

```js
Mobile: (() => {
  let m = val("Mobile").replace(/\s/g, "");
  if (m.startsWith("0")) m = m.slice(1);
  return "+63" + m;
})(),
```

- [ ] **Step 2: Verify payload**

Submit a test form entry with `09171234567`. Check CRM — Mobile field should arrive as `+639171234567`.

- [ ] **Step 3: Commit**

```bash
git add portal/js/form-apply-ph.js
git commit -m "feat: prepend +63 country code to mobile number in payload"
```

---

### Task 15: Simplify validateTerms()

**Files:**
- Modify: `portal/js/form-apply-ph.js` — `validateTerms()`

- [ ] **Step 1: Replace validateTerms()**

Replace the existing function with:

```js
function validateTerms() {
  const checked = document.getElementById("terms1")?.checked ?? false;
  document.getElementById("terms-error").style.display = checked ? "none" : "block";
  return checked;
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/js/form-apply-ph.js
git commit -m "feat: simplify validateTerms to single checkbox"
```

---

### Task 16: Update Foundational RATINGS_CONFIG Labels

**Files:**
- Modify: `portal/js/form-apply-ph.js` — `RATINGS_CONFIG.Foundational`

- [ ] **Step 1: Replace Foundational ratings config**

Replace the `Foundational` array inside `RATINGS_CONFIG` with:

```js
Foundational: [
  {
    id: "Campaigning_Experience_Pre",
    renderKey: "rating_f_a",
    label: "1) How would you rank your experience in campaigning? By a \"campaign\" we mean an organized course of action to achieve a social, environmental, or political goal. (1 being not at all confident and 7 being highly confident)",
    labelFil: "Anong masasabi mo tungkol sa iyong karanasan sa pangangampaniya? Ang tinutukoy nating \"kampaniya\" ay ang organisadong pagkilos na may mga hakbangin o gawain para sa isang sosyal, environmental, o politikal na layunin.",
  },
  {
    id: "A_Pre_Training_Strategy_Buildings",
    renderKey: "rating_f_b",
    label: "2) I feel confident building strategy and choosing tactics for a campaign. (1 being not at all confident and 7 being highly confident)",
    labelFil: "Ako ay kumpiyansa sa paggawa o pagtukoy ng ng stratehiya at gawain para sa isang kampaniya.",
  },
  {
    id: "B_Pre_Training_Building_Communication",
    renderKey: "rating_f_c",
    label: "3) I feel confident using stories to connect with others for campaigns OR starting a communication strategy or plan for a campaign. (1 being not at all confident and 7 being highly confident)",
    labelFil: "Ako ay kumpiyansa sa paggamit ng aking kwento/karanasa sa pakikipag-ugnayan sa ibang tao na pwedeng makatutulong sa aking kampaniya o sa pagsisimula ng isang stratehiya o planong pangkomunikasyon para sa isang kampaniya.",
  },
  {
    id: "C_Pre_Training_Confident_facilitator",
    renderKey: "rating_f_d",
    label: "4) I feel confident facilitating discussions or knowledge sharing activities for a campaign. (1 being not at all confident and 7 being highly confident)",
    labelFil: "Ako ay kumpiyansang magpadaloy ng workshops at meetings para sa isang kampaniya.",
  },
  {
    id: "D_Pre_Training_Confident_connector",
    renderKey: "rating_f_e",
    label: "5) I feel confident building connections with others to support a campaign. (1 being not at all confident and 7 being highly confident)",
    labelFil: "Ako ay kumpiyansang makapagbuo ng mga ugnayan sa ibang tao upang masuportahan ang isang kampaniya.",
  },
],
```

Also update the rating scale anchor labels in `renderRatings()`. Find:

```js
<div class="rating-scale-labels">
  <span>1 — Not confident</span>
  <span>7 — Very confident</span>
</div>
```

Replace with:

```js
<div class="rating-scale-labels">
  <span>1 — Not at all confident</span>
  <span>7 — Highly confident</span>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add portal/js/form-apply-ph.js
git commit -m "feat: update Foundational rating labels with full bilingual text"
```

---

## Final Verification Checklist

Open `apply-ph.html?id=<valid-solution-id>&type=Foundational` in Chrome:

- [ ] Banner: type pill + large title + 3-col grid (Venue / Time / Apply Before)
- [ ] Stepper: 4 nodes visible; Demographics active on load; advancing fills circles maroon
- [ ] Mobile (< 640px): stepper circles visible, only active step label shows
- [ ] First Name + Last Name side by side on desktop, stacked below 400px
- [ ] Phone field: 🇵🇭 +63 pill flush with input, placeholder `9XX XXX XXXX`
- [ ] Country, Gender, Language: custom listbox opens on click, selects correctly, keyboard works
- [ ] Identify as: multiselect panel opens, tags appear, × removes tag
- [ ] Terms: single checkbox with combined English + Filipino wording
- [ ] Rating scale: pill-shaped buttons, selected = orange-red gradient
- [ ] Experience section: correct bilingual Foundational questions and 300-word textarea
- [ ] Section titles: 22px bold
- [ ] Submit test entry → check CRM Mobile field shows `+63XXXXXXXXX`
