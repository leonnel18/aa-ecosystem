# Design Spec: GELP Session 1 Feedback Form & Report

**Date:** 2026-06-09
**Author:** Gino + Claude
**Status:** Approved

---

## Context

The GELP Mentorship Session 1 was held on June 6, 2026, 9–12pm. We need a feedback form for participants to rate and reflect on the session, and a report page for the AktivAsia team to track responses.

This form follows the exact same design system and participant-filter logic as `mentorship-intake-id.html` and `mentorship-intake-report-id.html`.

---

## Files

### New files
| File | Purpose |
|------|---------|
| `portal/mentorship-session1-feedback-id.html` | Feedback form (Bahasa + English) |
| `portal/js/form-mentorship-session1-feedback-id.js` | Form logic |
| `portal/mentorship-session1-feedback-report-id.html` | Report/tracker page |
| `portal/js/report-mentorship-session1-feedback-id.js` | Report logic |

### Modified files
| File | Change |
|------|--------|
| `portal/workers/crm-proxy.js` | Add `POST /drive/upload` route for Google Drive file upload |

---

## Design System

All styles match the existing mentorship HTML files exactly:
- CSS variables: `--primary: #821545`, `--cta-start: #ff960b`, `--cta-end: #f93a3a`, `--bg: #f5f4ee`
- Font: Inter (Google Fonts)
- Logo: `img/koneksi-aa-logo.png` in `.site-header`
- Banner: dark maroon gradient with `.type-pill` + `<h1>`
- Section cards: white, `border-radius: 16px`
- Fixed bottom nav buttons (back / next / submit pill buttons)
- Spinner on submit
- Success screen with icon + message

---

## Participant Filter Logic

Identical to the intake form:
- Source: `GET /deals/search?training_id=773031000008276089` (same `GELP_TRAINING_ID`)
- Eligible stages: `Selected`, `Attended Training`, `Graduated or Post Evaluation Completed`
- Participants who attended mentorship but did not answer the research mapping form are still eligible — the participant list is sourced from CRM stage only, not from `Custom_Responses` content

---

## Form: mentorship-session1-feedback-id.html

### Banner
- `.type-pill`: "Formulir Umpan Balik / Session Feedback Form"
- `<h1>`: "Formulir Umpan Balik — Sesi Mentorship 1 GELP 2026"
- Subtitle (italic): "Session 1 Feedback Form — GELP 2026 Mentorship Program"

### Description block
```
🎯 Kami mengundang Anda untuk berbagi umpan balik mengenai Sesi Mentorship 1 GELP 2026 yang berlangsung pada 6 Juni 2026.
   We invite you to share feedback on GELP 2026 Mentorship Session 1 held on June 6, 2026.

📋 Masukan Anda sangat berarti untuk membantu kami mempersiapkan sesi berikutnya dengan lebih baik.
   Your feedback helps us prepare better for the next session.

• ✅ Hanya untuk peserta GELP 2026 / For GELP 2026 participants only
• ✏️ Semua pertanyaan wajib diisi / All questions are required
• 📎 Upload workbook Anda (opsional) / Upload your workbook (optional)
```

### Part 1 — Name Search
Identical to intake form:
- Card title: "Cari Nama Anda / Search Your Name"
- Loading / error states
- Typeahead search input
- Selected name tag with clear button
- "Lanjut / Continue →" button enabled only after selection
- Footer note: "Nama tidak ada di daftar? Hubungi tim AktivAsia Indonesia Anda. / Name not in the list? Contact your AktivAsia Indonesia team."

### Part 2 — Feedback Questions (5 open-text textareas)

All fields required. Each field has:
- Bahasa label (bold, primary)
- English translation (italic, meta color, smaller)
- Textarea (min-height 110px, resizable)
- Inline error if empty on submit attempt

| # | ID | Bahasa Label | English Translation |
|---|-----|-------------|-------------------|
| 1 | `q-overall` | Bagaimana penilaian Anda secara keseluruhan terhadap sesi ini? | How would you rate the session overall? |
| 2 | `q-plenary` | Apa yang paling Anda sukai dari Sesi Pleno? | What did you enjoy most about the Plenary Session? |
| 3 | `q-breakout` | Apa yang paling Anda sukai dari Sesi Kelompok (Breakout)? | What did you enjoy most about the Breakout Session? |
| 4 | `q-improvement` | Apa yang dapat kami tingkatkan untuk sesi berikutnya? | What can we improve for the next session? |
| 5 | `q-other` | Apakah ada masukan lain yang ingin Anda bagikan? | Any other feedback you'd like to share? |

Section card title: "Umpan Balik Sesi / Session Feedback"

### Part 3 — Workbook Upload (separate card, optional)

Card title: "Upload Workbook Anda / Upload Your Workbook"

Encouragement copy:
```
📓 Wawasan dari workbook Anda sangat membantu kami mempersiapkan materi dan sesi mentorship berikutnya secara lebih personal.
   Insights from your workbook help us tailor and prepare the next mentorship session more personally.

Silakan upload workbook Anda di bawah ini (opsional).
Please upload your workbook below (optional).
```

File input behavior:
- `<input type="file">` — no `accept` restriction (participant may have PDF, DOCX, JPG, etc.)
- After file selected: show filename chip with a "×" clear button (same `.selected-name-tag` pattern)
- No file selected: chip hidden

Nav buttons for this part (bottom fixed bar):
- "← Back" — goes back to Part 2
- "Kirim tanpa lampiran / Submit without attachment" — skips upload, proceeds to CRM write
- "Kirim dengan lampiran / Submit with attachment" — uploads file first, then writes to CRM

Both submit paths share the same CRM write logic; only the upload step differs.

### Submit flow

**With attachment:**
1. POST `multipart/form-data` to `https://crm-proxy.gideon-valera.workers.dev/drive/upload`
   - Fields: `file` (the file object), `participant_name` (selected participant's name)
2. On success: proceed to CRM read-then-append write
3. On Drive upload failure: show error, keep form open, allow retry

**CRM write — read-then-append (both paths):**

Because `Custom_Responses` is shared with the research mapping intake form, a blind overwrite would erase the participant's intake answers. The submit flow therefore:

1. `GET /deals/search?training_id=...` — the participant record is already in memory from Part 1 load; use the `Custom_Responses` value already fetched (no extra round-trip needed)
2. Strip any existing feedback block from the fetched `Custom_Responses`:
   - Remove everything from the first occurrence of `[Keseluruhan]` to the end of the string (feedback blocks always appear after intake blocks)
3. Append the new feedback block to the stripped value
4. `PUT /deals/:id` with the merged `Custom_Responses`
5. On success: hide form + nav, show success screen
6. On failure: show inline error, re-enable submit button

> **Implementation note:** `loadParticipants()` in Part 1 already fetches `Custom_Responses` in the fields list (same as the intake form JS). Store the raw value per participant so it is available at submit time without an extra fetch.

**Custom_Responses payload format (feedback block):**
```
[Keseluruhan]
{q-overall value}

[Sesi Pleno]
{q-plenary value}

[Sesi Kelompok]
{q-breakout value}

[Saran Perbaikan]
{q-improvement value}

[Masukan Lainnya]
{q-other value}

[Workbook]
uploaded
```

The `[Workbook]` section is appended only when a file was successfully uploaded to Drive. If no file uploaded, the `[Workbook]` section is omitted entirely.

**Answered detection key:** The report uses presence of `[Keseluruhan]` in `Custom_Responses` to classify a participant as having answered this form. This is distinct from the intake form's `[Fokus Penelitian]` key.

### Success screen
```
🎉
Terima kasih atas umpan balik Anda!
Thank you for your feedback!

Masukan Anda telah berhasil disimpan dan akan membantu kami mempersiapkan sesi berikutnya.
Your responses have been saved and will help us prepare the next session.
```

---

## Worker: POST /drive/upload (crm-proxy.js)

### New route
```
POST /drive/upload
Content-Type: multipart/form-data
Body fields: file, participant_name
```

### Logic
1. Parse `file` and `participant_name` from FormData
2. Derive file extension from `file.name` (fallback: no extension)
3. Target filename: `GELP 2026 - Session 1 - {participant_name}.{ext}`
4. Authenticate with Google using JWT flow:
   - Parse `GOOGLE_SERVICE_ACCOUNT_JSON` secret (full service account JSON)
   - Sign a JWT for scope `https://www.googleapis.com/auth/drive.file`
   - Exchange JWT for access token via `https://oauth2.googleapis.com/token`
   - Cache token in-memory (same pattern as Zoho token cache)
5. Upload file to Google Drive using multipart upload:
   - `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
   - Metadata part: `{ name: targetFilename, parents: ["1oaw6qnOjzjRXgnL4v8Gj-l1HHtor7OON"] }`
   - Media part: file bytes
6. Return `{ ok: true, fileId }` on success, `{ ok: false, error }` on failure

### New Worker secret
| Secret name | Value source |
|-------------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON key file from Google Cloud Console (IAM → Service Accounts → Create Key → JSON) |

The service account must have **Editor** access on the target Drive folder (share the folder with the service account email).

### CORS
Same `corsHeaders()` helper already in `crm-proxy.js` — no changes needed.

---

## Report: mentorship-session1-feedback-report-id.html

### Banner
- `.type-pill`: "GELP 2026 · Indonesia"
- `<h1>`: "GELP Session 1 Feedback Report"
- Subtitle: "Response tracking for GELP 2026 Mentorship Session 1"
- Last refreshed timestamp

### KPI strip
- Total eligible participants
- Answered (with %)
- Not Answered

### Controls bar
- "⬇ Download Excel" button (disabled until data loads)

### Tab: Answered
Table columns:
| # | Name | Keseluruhan | Sesi Pleno | Sesi Kelompok | Saran Perbaikan | Masukan Lainnya | Workbook |
|---|------|-------------|-----------|--------------|----------------|----------------|---------|

- Long answers truncated at 100 chars with "▼ Read more" toggle (same pattern as intake report)
- Workbook column: "✓ Diunggah" (green badge) if `[Workbook]` section present in `Custom_Responses`, "—" if absent

### Tab: Not Answered
Table columns: # | Name | Email | Mobile

Includes participants who:
- Have not submitted this feedback form at all (no `[Keseluruhan]` in `Custom_Responses`)
- Regardless of whether they answered the research mapping form

### Answered detection
Report JS parses `Custom_Responses` and checks for `[Keseluruhan]` header. If found → Answered tab. If absent → Not Answered tab.

Bracket keys parsed: `Keseluruhan`, `Sesi Pleno`, `Sesi Kelompok`, `Saran Perbaikan`, `Masukan Lainnya`, `Workbook`

### Excel export (two sheets)
- Sheet "Answered": Name, Keseluruhan, Sesi Pleno, Sesi Kelompok, Saran Perbaikan, Masukan Lainnya, Workbook Uploaded
- Sheet "Not Answered": Name, Email, Mobile

Filename: `GELP_Session1_Feedback_Report_{YYYY-MM-DD}.xlsx`

---

## Out of Scope
- No Zoho Analytics push
- No email notification on submission
- No pagination UI on the report (all records loaded in one fetch, same as intake report)
- No file type validation (participant decides what to upload)
