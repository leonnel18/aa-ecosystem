# Design Spec: GELP Mentorship Intake Form

**Date:** 2026-05-20  
**Author:** Gino + Claude  
**Status:** Approved for implementation

---

## Context

As part of the Gender Equity Leadership Program (GELP) in Indonesia, participants are invited to fill in a short intake form before the mentorship phase begins. The answers help mentors understand each participant's existing research focus, what they want to develop, their key challenges, and what they can offer to the network. Responses are saved directly to the participant's existing Deal record in Zoho CRM so mentors can read them without any technical knowledge.

---

## Scope

- New file: `portal/mentorship-intake-id.html`
- New file: `portal/js/form-mentorship-intake-id.js`
- Modified file: `portal/workers/crm-proxy.js` — two new endpoints
- One new CRM field created manually by Gino in Zoho CRM (Deals module)

---

## Architecture

### Data Flow

```
Page load
  → Worker GET /gelp-participants
    → Zoho CRM Deals (filtered by training + stage)
    → Returns [{id, name}]
  → Client filters list live as user types

On submit
  → Worker PATCH /deals/:id
    → Writes Mentorship_Intake_Response textarea field
    → Returns 200 OK or error
```

### File Pattern

Follows the existing `apply-id.html` + `form-apply-id.js` pattern:
- Static HTML page, no build step
- JS file handles all logic (fetch, render, validate, submit)
- Uses existing `portal/css/style.css`
- Deployed to Cloudflare Pages alongside other portal files

---

## Part 1 — Name Search

**Behavior:**
1. On page load, call `GET /gelp-participants` via the Worker proxy
2. While loading, show: *"Memuat daftar peserta... / Loading participant list..."*
3. On error, show: *"Gagal memuat data. Silakan coba lagi. / Failed to load data. Please try again."*
4. User types in a search box — results filter client-side (case-insensitive substring match on name)
5. Matching names render as a clickable list below the input
6. Clicking a name selects it (highlighted state); "Lanjut / Next" button becomes active
7. Clicking Next transitions to Part 2 (no page reload — JS show/hide)

**UI copy (Bahasa / English):**
- Page title: *"Formulir Pra-Mentoring GELP / GELP Pre-Mentoring Intake Form"*
- Search label: *"Cari nama Anda / Search your name"*
- Search placeholder: *"Ketik nama Anda... / Type your name..."*
- Button: *"Lanjut / Next"*

---

## Part 2 — Intake Questions

Four open-text textarea questions. All required — form cannot submit with any blank answer.

| # | Bahasa Indonesia (primary) | English (sub-label) |
|---|---------------------------|---------------------|
| 1 | Apa fokus penelitian atau advokasi utama Anda saat ini? | What is the primary focus of your current research or advocacy work? |
| 2 | Area apa yang ingin Anda kembangkan atau dalami melalui proses mentoring ini? | What areas would you like to develop or deepen through this mentoring process? |
| 3 | Apa tantangan atau kesenjangan utama dalam pekerjaan Anda yang membutuhkan eksplorasi atau dukungan lebih lanjut? | What are the key challenges or gaps in your work that need further exploration or support? |
| 4 | Keterampilan, pengetahuan, atau pengalaman apa yang dapat Anda tawarkan kepada peserta lain dalam program ini? | What skills, knowledge, or experience can you offer to other participants in this program? |

**Submit behavior:**
- Show loading spinner on submit
- On success: *"Terima kasih! Jawaban Anda telah disimpan. / Thank you! Your responses have been saved."*
- On error: *"Terjadi kesalahan. Silakan coba lagi. / Something went wrong. Please try again."*

---

## CRM Write Format

Responses are saved to the existing `Custom_Responses` multi-line field on the Deal record, in plain labeled text:

```
[Fokus Penelitian]
<answer to Q1>

[Area Pengembangan]
<answer to Q2>

[Tantangan & Kesenjangan]
<answer to Q3>

[Kontribusi untuk Jaringan]
<answer to Q4>
```

This format is readable by non-technical users directly in the Zoho CRM Deal view. No new CRM field needs to be created.

---

## Worker Changes (`portal/workers/crm-proxy.js`)

### New Endpoint 1: GET /gelp-participants

Queries Zoho CRM Deals:
- Filter: `Training_Applied` name = `"Gender Equity Leadership Program"`
- Filter: `Stage` in `["Selected", "Attended Training", "Graduated or Post Evaluation Completed"]`
- Returns: `[{ id: string, name: string }]` sorted alphabetically by name
- Uses existing REST GET pagination (`per_page=200`, loop until `more_records == false`)

### New Endpoint 2: PATCH /deals/:id

- Accepts body: `{ Custom_Responses: string }`
- Calls Zoho CRM `PUT /Deals/:id` with the field value
- Returns 200 on success, passes through CRM error on failure
- Check if a generic deal-update route already exists before adding a new one

---

## Pre-Launch Checklist (Manual Steps by Gino)

- [ ] Confirm `Custom_Responses` field is visible on the Deals layout in Zoho CRM
- [ ] Deploy updated `crm-proxy.js` Worker via `npx wrangler deploy`
- [ ] Deploy portal files via `npx wrangler pages deploy portal --project-name aktivasia-portal`

---

## Verification

1. Open `mentorship-intake-id.html` in browser
2. Confirm loading state appears, then participant list loads
3. Type a partial name — confirm live filtering works
4. Select a name — confirm Next button activates
5. Click Next — confirm Part 2 renders with all 4 questions
6. Submit with a blank field — confirm validation blocks submission
7. Fill all fields and submit — confirm success message appears
8. Open the Deal in Zoho CRM — confirm `Mentorship Intake Response` field contains the formatted text
