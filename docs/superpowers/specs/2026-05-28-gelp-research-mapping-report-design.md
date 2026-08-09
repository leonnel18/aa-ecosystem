# Design Spec: GELP Research Mapping Form Report Page

**Date:** 2026-05-28  
**Author:** Gino + Claude  
**Status:** Approved for implementation

---

## Context

AktivAsia staff need a shareable, live report page to see which GELP Indonesia participants have or have not submitted their Research Mapping intake form. When someone has answered, staff need to read their responses per question directly on the page. The page must be downloadable as an Excel file (two sheets: Answered and Not Answered) for offline use and sharing.

---

## Scope

- New file: `portal/mentorship-intake-report-id.html`
- New file: `portal/js/report-mentorship-intake-id.js`
- No Worker changes needed — existing `GET /deals/search?training_id=` endpoint is sufficient
- No new CRM fields — reads existing `Custom_Responses` field already used by the intake form

---

## Architecture

### Data Flow

```
Page load
  → fetch GET /deals/search?training_id=773031000008276089
    → Returns all Deal records for GELP training (no stage filter)
    → Each Deal has: id, First_Name, Last_Name, Stage, Custom_Responses

Client-side parsing
  → For each Deal:
      if Custom_Responses is non-empty → "Answered" bucket
      else → "Not Answered" bucket
  → Parse Custom_Responses by section headers:
      [Fokus Penelitian], [Area Pengembangan], [Tantangan & Kesenjangan], [Kontribusi untuk Jaringan]
      → extract text after each header up to the next header (or end of string)

Render
  → KPI banner: Total | Answered | Not Answered
  → Tab "Answered" → table of answered participants + per-question columns
  → Tab "Not Answered" → table of names + Stage only

Download
  → SheetJS (CDN) builds .xlsx in-browser
  → Sheet 1 "Answered": Name | Stage | Q1 | Q2 | Q3 | Q4
  → Sheet 2 "Not Answered": Name | Stage
  → Triggers browser download as "GELP_Research_Mapping_Report.xlsx"
```

### File Pattern

Follows the existing `portal.html` + `admin.html` pattern:
- Static HTML, self-contained CSS (inline `<style>` block using the same CSS variables)
- Separate JS file handles all logic
- No build step, deployed to Cloudflare Pages
- SheetJS loaded from CDN for XLS export

---

## Page Layout

### Header

Same as `mentorship-intake-id.html`:
- AktivAsia logo + KONEKSI logo
- `site-header` white bar with `header-logos` and `header-divider`

### Banner

Gradient banner (`background: linear-gradient(135deg, var(--primary) 0%, #5a0e30 100%)`):
- Type pill: `GELP 2026 · Indonesia`
- `<h1>`: **GELP Research Mapping Form Report**
- Subtitle: *Response tracking for GELP 2026 mentorship intake*
- Last refreshed timestamp (set on load)

### KPI Strip

White bar below banner, three stat pills side by side:
- **Total Participants** — count of all deals fetched
- **Answered** — count with non-empty Custom_Responses (+ percentage, e.g. "12 · 60%")
- **Not Answered** — remaining count

### Controls Bar

Below KPI strip, right-aligned:
- **Download Excel** button (gradient CTA style matching other portal buttons)

### Tab Navigation

Two tabs using the `.nav-tab` pattern from portal pages:
- **Answered** (with count badge)
- **Not Answered** (with count badge)

### Tab: Answered

Full-width table inside a `.section-card`:

| # | Name | Stage | Fokus Penelitian | Area Pengembangan | Tantangan & Kesenjangan | Kontribusi untuk Jaringan |
|---|------|-------|-----------------|-------------------|------------------------|--------------------------|

- Answer cells: truncated to 100 characters with a `▼ Read more` toggle that expands inline
- Sorted alphabetically by name
- Empty state: *"No participants have answered yet."*

### Tab: Not Answered

Simpler table inside a `.section-card`:

| # | Name | Stage |

- Sorted alphabetically by name
- Empty state: *"All participants have answered!"*

### Loading / Error States

- On load: spinner + *"Loading participant data..."*
- On error: red error card + *"Failed to load data. Please try again."* with a Retry button

---

## Custom_Responses Parsing Logic

The `Custom_Responses` field stores answers in this format (written by `form-mentorship-intake-id.js`):

```
[Fokus Penelitian]
<answer 1>

[Area Pengembangan]
<answer 2>

[Tantangan & Kesenjangan]
<answer 3>

[Kontribusi untuk Jaringan]
<answer 4>
```

Parsing approach in JS:
```javascript
function parseResponses(raw) {
  const sections = {
    "Fokus Penelitian": "",
    "Area Pengembangan": "",
    "Tantangan & Kesenjangan": "",
    "Kontribusi untuk Jaringan": "",
  };
  const keys = Object.keys(sections);
  for (let i = 0; i < keys.length; i++) {
    const start = raw.indexOf(`[${keys[i]}]`);
    if (start === -1) continue;
    const contentStart = start + keys[i].length + 2; // skip "[key]\n"
    const end = i + 1 < keys.length ? raw.indexOf(`[${keys[i + 1]}]`) : raw.length;
    sections[keys[i]] = raw.slice(contentStart, end === -1 ? raw.length : end).trim();
  }
  return sections;
}
```

If `Custom_Responses` is non-empty but does not contain expected headers (e.g., free-text legacy entries), treat the entire value as the Q1 answer and leave Q2–Q4 blank.

---

## XLS Export

Uses **SheetJS** (`xlsx` library) loaded from CDN:
```html
<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
```

Two sheets:
- **Sheet 1 — "Answered":** columns: Name, Stage, Fokus Penelitian, Area Pengembangan, Tantangan & Kesenjangan, Kontribusi untuk Jaringan
- **Sheet 2 — "Not Answered":** columns: Name, Stage

Download filename: `GELP_Research_Mapping_Report_<YYYY-MM-DD>.xlsx`

---

## CSS

All styling uses the same CSS variable set as `mentorship-intake-id.html` (inline `<style>` block):

```css
:root {
  --primary: #821545;
  --cta-start: #ff960b;
  --cta-end: #f93a3a;
  --bg: #f5f4ee;
  --white: #ffffff;
  --text: #131625;
  --meta: #788099;
  --border: #e2e0d8;
  --radius: 16px;
  --radius-sm: 10px;
}
```

Table styles match the `.table-wrap` pattern from admin pages. Tab styles match the `.nav-tab` active/inactive pattern from `portal.html`.

---

## Verification

1. Open `mentorship-intake-report-id.html` in browser (local or deployed)
2. Confirm loading spinner appears, then data loads and KPI counts render
3. Confirm participants are split correctly across the two tabs
4. Click "Read more" on a long answer — confirm it expands inline
5. Click "Not Answered" tab — confirm only participants without responses appear
6. Click "Download Excel" — confirm `.xlsx` downloads with two correctly populated sheets
7. Confirm the file opens in Excel/Google Sheets with correct column headers and data
8. Open the page on a mobile viewport — confirm layout remains readable

---

## Pre-Launch Checklist (Manual Steps by Gino)

- [ ] Deploy portal files via `npx wrangler pages deploy portal --project-name aktivasia-portal`
- [ ] Share URL: `https://aktivasia-portal.pages.dev/mentorship-intake-report-id.html`
