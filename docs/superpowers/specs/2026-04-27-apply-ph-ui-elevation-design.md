# Design Spec: apply-ph.html UI Elevation

**Date:** 2026-04-27  
**Author:** Gino + Claude  
**Status:** Approved  
**Scope:** `portal/apply-ph.html` + `portal/js/form-apply-ph.js`  
**Approach:** Option B — HTML/CSS first, JS behavior second

---

## Context

The PH training application form at `aktivasia-portal.pages.dev/apply-ph` is functional but visually underpolished. This spec covers 11 targeted UI/UX improvements to elevate the form to a production-grade, on-brand experience. The data pipeline and CRM integration are untouched. All changes preserve existing field IDs so validation and payload logic require minimal changes.

---

## Implementation Strategy

Two sequential passes:

1. **Pass 1 — HTML + CSS:** All structural and visual changes to `apply-ph.html` and inline `<style>`.
2. **Pass 2 — JS behavior:** Multiselect dropdown, custom select, phone prefix, stepper logic, terms simplification, rating scale upgrade.

---

## Changes

### 1. Training Banner Redesign

**Reference:** aktivasia.org/training-events/belantara-kaltara-2025

**Layout:**
- Top row: type pill (left) — no change needed
- Large title: `font-size: 28–32px`, `font-weight: 800`
- 3-column metadata grid below title:
  - **VENUE / LOCATION** — shows `Venue_Address` from CRM (replaces "Philippines")
  - **TIME** — date range (existing)
  - **APPLY BEFORE** — `Application_Form_Close_Date` (existing)
- Each column: uppercase 11px tracking label, value in normal weight below

**CRM fetch change (`fetchTraining()`):**
- Add `Venue_Address` to the fields list
- No description field — deferred until CRM field exists

**`populateBanner()` change:**
- Replace `banner-country` span with `banner-venue` showing `Venue_Address`
- Render 3-column grid instead of current flat `meta` flex row

---

### 2. Step Counter — Inline Title+Description Stepper

**Pattern:** reui stepper `inline-title-description`, translated to vanilla JS/CSS

**4 steps only** (Terms is not a step — it navigates through normally):
| Step | Title | Description |
|------|-------|-------------|
| 1 | Demographics | Personal Info |
| 2 | Professional | Your work |
| 3 | Experience | & Motivation |
| 4 | Confidence | Ratings |

**Visual states:**
- Completed: filled circle `#821545`, white number, separator line filled
- Active: filled circle `#ff960b`, white number
- Inactive: `var(--border)` background, `var(--meta)` number, empty separator

**Mobile (< 640px):** Circles + connectors always visible; only the active step's title + description text shows.

**JS changes:**
- `buildProgressBar()` — rewritten to generate 4-node stepper HTML
- `updateProgressBar()` — rewritten to set `data-state` attributes (completed / active / inactive)
- `SECTION_LABELS` map updated: `sec-demographics` → "Demographics / Personal Info", etc.
- `sec-terms` is excluded from stepper node count but remains in `sections[]` array for navigation

---

### 3. Larger Section Headlines

- `.section-title`: `font-size: 17px` → `22px`, `font-weight: 800`
- `.section-subtitle`: `font-size: 13px` → `14px`, `opacity: 0.7`

---

### 4. First Name + Last Name in One Row

Wrap `#First_Name` and `#Last_Name` fields in:
```css
.name-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 400px) {
  .name-row { grid-template-columns: 1fr; }
}
```
No ID changes. Validation unchanged.

---

### 5. Phone Number Input with Country Prefix (point 10)

Replace plain `<input type="tel" id="Mobile">` with a flex wrapper:

```
[ 🇵🇭 +63 | xxxxxxxxxx ]
```

- Left: static `<span>` pill with flag + `+63`, styled with left border-radius, `background: var(--bg)`, `border: 1.5px solid var(--border)`
- Right: `<input type="tel" id="Mobile">` with left border-radius `0`, border-left `none`, flush join
- Placeholder: `9XX XXX XXXX`

**JS change (`buildPayload()`):**
- Prepend `+63` to `val("Mobile")` before sending to CRM
- Strip leading `0` if present (e.g. `09XX` → `+639XX`)

---

### 6. Custom Styled Select Dropdowns (point 6)

Replace native `<select>` elements for:
- `Country_of_Residence`
- `Gender`
- `Preferred_Language`

With custom dropdown component:
- Trigger button: styled identically to current inputs, shows selected value + SVG chevron
- Listbox: absolutely positioned below trigger, `border-radius: var(--radius-sm)`, `box-shadow: 0 4px 16px rgba(0,0,0,.10)`, `max-height: 240px`, `overflow-y: auto`
- Each option: `padding: 12px 16px`, hover = `background: var(--primary-light)`
- Selected option: checkmark icon right-aligned, text color `var(--primary)`
- Keyboard: Arrow keys navigate, Enter selects, Escape closes
- Hidden `<select>` kept in DOM with same `id` for validation compatibility — JS syncs value on selection

---

### 7. Multiselect Dropdown for "Identify as" (point 5)

Replace stacked checkbox cards with a dropdown multiselect:

- Trigger: styled button showing "Select all that apply" or "3 selected", chevron right
- Panel: dropdown panel with checkboxes + labels (same visual as check-opt but inside dropdown)
- Selected tags: appear as removable pills beneath trigger (`×` to deselect)
- Same `name="Identify_as"` checkboxes inside panel — `validateCheckGroup()` and `buildPayload()` require zero changes

---

### 8. Terms & Conditions — Single Checkbox (point 7)

Replace 3 separate checkboxes with one:

**English:** "I agree to participate fully, maintain a respectful learning space, and consent to photos/videos being used for AktivAsia communications."

**Filipino:** "Sumasang-ayon akong aktibong lumahok, mapanatili ang isang ligtas na espasyo ng pagkatuto, at payagan ang paggamit ng mga larawan/video para sa komunikasyon ng AktivAsia."

- Single `id="terms1"` checkbox using `.check-opt` style
- `validateTerms()` simplified to check only `terms1`

---

### 9. Likert Rating Scale Upgrade (point 8)

Replace flat number buttons with styled pill-row rating group:

- Each number (`1`–`7`): rounded pill, `min-width: 40px`, `min-height: 40px`
- Unselected: `background: var(--bg)`, `border: 1.5px solid var(--border)`
- Selected: gradient fill `linear-gradient(135deg, #ff960b, #f93a3a)`, white text, no border
- Anchor labels: "1 — Not at all confident" (left) and "7 — Highly confident" (right) in `font-size: 11px`, `color: var(--meta)`
- `selectRating()` and `ratingValues` map — no changes needed (same `data-field`, `data-val` attributes)

---

### 10. Experience Section — Foundational Text Correction (point 11)

Replace `sec-exp-foundational` content with exact bilingual text:

**Question 1 — Active in campaigning:**
- EN: "Are you currently active in campaigning, advocating or organising a community? *Required"
- FIL: "Ikaw ba ay kasalukuyang nagkakampaniya, may gawaing adbokasiya, o nag-oorganisa sa iyong komunidad?"
- Radio: Yes / No / Have in the past but not currently (unchanged)

**Question 2 — Describe efforts (conditional, max 300 words):**
- EN: "Describe your campaigning, advocacy, or organizing efforts. Highlight the most rewarding aspects and the most challenging aspects of your work in these areas. (300 words or less)"
- FIL: "I-kuwento sa amin ang iyong gawaing pangangampaniya, adbokasiya, o pag-oorganisa. Isama ang mga pinakamasaya o makabuluhan at pinakamahirap na aspeto ng iyong gawain (hindi hihigit sa 300 salita)."
- Field: `id="Current_Campaign_Description"` (unchanged)

**Question 3 — Why applying:**
- EN: "Why are you applying for the training? Specify the knowledge or skills you aim to develop and describe how you plan to use these new skills and knowledge in your work. *Required"
- FIL: "Bakit gusto mong makadalo sa pagsasanay na ito? Ano ang gusto mong makuha o mapaunlad na knowledge o skills at paano mo ito naiisip na magamit pagkatapos sa iyong gawain?"
- Field: `id="Reason_for_Applying_F"` (unchanged)

**Ratings section (`sec-ratings`) — Foundational labels updated to exact bilingual text:**

| # | EN Label | FIL Label |
|---|----------|-----------|
| 1 | "How would you rank your experience in campaigning? By a 'campaign' we mean an organized course of action to achieve a social, environmental, or political goal." | "Anong masasabi mo tungkol sa iyong karanasan sa pangangampaniya? Ang tinutukoy nating 'kampaniya' ay ang organisadong pagkilos..." |
| 2 | "I feel confident building strategy and choosing tactics for a campaign." | "Ako ay kumpiyansa sa paggawa o pagtukoy ng ng stratehiya at gawain para sa isang kampaniya." |
| 3 | "I feel confident using stories to connect with others for campaigns OR starting a communication strategy or plan for a campaign." | "Ako ay kumpiyansa sa paggamit ng aking kwento/karanasa sa pakikipag-ugnayan..." |
| 4 | "I feel confident facilitating discussions or knowledge sharing activities for a campaign." | "Ako ay kumpiyansang magpadaloy ng workshops at meetings para sa isang kampaniya." |
| 5 | "I feel confident building connections with others to support a campaign." | "Ako ay kumpiyansang makapagbuo ng mga ugnayan sa ibang tao upang masuportahan ang isang kampaniya." |

Rating scale: 1–7 (not 1–5). Anchor: "1 being not at all confident and 7 being highly confident".

---

### 11. Step 1 Label Update (point 9)

- Section title: "Personal Information" → "Demographics"
- Section subtitle: "Impormasyon tungkol sa iyo" → "Impormasyon tungkol sa iyo" (unchanged)
- Stepper label: "Personal Info" → "Demographics"

---

## Files Modified

| File | Change type |
|------|-------------|
| `portal/apply-ph.html` | Pass 1: structure, CSS, all static markup |
| `portal/js/form-apply-ph.js` | Pass 2: stepper logic, phone prefix, custom select sync, terms simplification |

## Files NOT Modified

- `portal/workers/crm-proxy.js` — no proxy changes needed
- `portal/css/style.css` — all new styles go inline in `apply-ph.html` to keep the form self-contained
- `tools/` — pipeline untouched

---

## Verification

1. Open `apply-ph.html?id=<valid-solution-id>&type=Foundational` in browser
2. Banner shows venue address, large title, 3-column meta grid
3. Stepper shows 4 nodes; completing Demographics activates Professional (circle fills)
4. First Name + Last Name render side by side on desktop, stacked on mobile < 400px
5. Phone field shows 🇵🇭 +63 prefix pill flush with input
6. "Country of Residence", "Gender", "Preferred Language" open custom dropdowns
7. "Identify as" opens multiselect panel; selected items appear as tags
8. Terms shows single checkbox with combined wording
9. Rating scale renders gradient pills; selecting a number highlights it
10. Experience section shows exact bilingual Foundational text
11. Step 1 label reads "Demographics" in stepper and section title
