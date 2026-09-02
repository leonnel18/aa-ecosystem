# Progress Log — aa-ecosystem

---

## [2026-08-10] Design pass #3 — Training Lifecycle Reminder emails, centered logo + bold key info

Two small corrections from Gino on design pass #2: (1) the logo should be
centered, not left-aligned — `_header()` in `email_templates.py` updated
(`align="center"` on the cell, `margin:0 auto` on the `<img>`); (2) bold key
information (training names, dates, deadlines, pending-applicant counts)
throughout the body copy for scannability — added `<strong>` around training
titles/plan names, `Start_Date`/`End_Date` values, P1/P2's evaluation
deadline, and C4's pending-applicant count, across all 8 templates (several
already bolded the training title; the gap was mainly dates and deadlines).

Full test suite still green (48 passed). Re-sent all 8 sample test emails
with both fixes for Gino's review.

---

## [2026-08-10] Design pass #2 — Training Lifecycle Reminder emails, table-based/inline-style markup

Gino reported the first design pass (below) "looks bad" in his real inbox —
plain edge-to-edge layout, oversized logo, default blue hyperlinks instead of
styled buttons — and asked whether HTML email is done differently (citing
Zoho CRM's outbound mail as looking better). Root cause: the previous markup
used a `<style>` block with CSS classes (`.header`, `.btn`, `.brand-footer`),
which many email clients (Outlook desktop notably, some Gmail rendering
paths) strip or ignore, silently falling back to unstyled HTML. The emails
were already HTML — the markup technique was the problem.

Rebuilt `functions/reminder-job/email_templates.py`'s shared layout entirely
on **table-based markup with inline `style="..."` attributes**, no `<style>`
block or CSS classes anywhere — the same technique already proven working in
`functions/monitor-job/email_report.py`, and the standard approach real ESPs
(including Zoho's own outbound mail) use for exactly this reason.

New frame (matches the reference KONEKSI/AktivAsia email Gino provided):
thin maroon bar → white content card (small 150px-wide left-aligned logo +
body text) → maroon divider → cream "AktivAsia LTD." footer band (ABN,
contact links, address) → maroon bar. Buttons are now a single-cell
`<table>` rather than a styled `<a>` (Outlook's Word rendering engine
mis-renders `<a>` padding/border-radius but respects it inside a table
cell) — a `_btn(href, label)` helper replaces every prior `<a class="btn">`
usage across all 8 templates; a few (in `c5_email`) needed restructuring
since a `<table>` can't validly nest inside a `<p>`.

Full test suite still green (48 passed). Re-sent all 8 sample test emails
with the new design for Gino's review.

---

## [2026-08-10] Design pass — Training Lifecycle Reminder emails, after Gino's visual review

Gino reviewed the 8 sample test-sends (see "Test-send findings" below) against
a reference AktivAsia email (KONEKSI mentorship report) and asked for two
changes:
1. **C1's participant-plan table** ("Training Name | Planned Month | Status"
   3-column table) looked cramped — replaced with a flat bullet list,
   `Training Name - Status (Planned Month)`.
2. **Header/footer branding** — added the standalone AktivAsia logo (not the
   KONEKSI-combo one used elsewhere in the portal) as an inline embedded
   header image, and a cream/maroon "AktivAsia LTD." footer band (ABN,
   contact links, address) matching the reference email's style, replacing
   the old plain "contact X" footer line (kept, now sitting above the brand
   band).

**Files changed:**
- `functions/reminder-job/email_templates.py` — C1's table → `<ul>` list;
  new `_brand_footer()`; header now `<img src="cid:...">` referencing an
  inline-attached logo instead of styled text
- `functions/reminder-job/AktivAsia.png` (new) — the logo file itself,
  copied from `portal/img/AktivAsia.png` (which Gino saved from a chat
  attachment). **Deliberately a separate copy, not a shared path** — Catalyst
  deploys `functions/reminder-job/` and the `portal/` static site as
  independent artifacts (`catalyst.json`'s `slate` vs. `functions` sections),
  so a relative path reaching into `portal/img/` would resolve locally but be
  missing entirely from the deployed function's zip. If the logo changes,
  both copies need updating.
- `functions/reminder-job/email_config.json` (new) — same fix applied to a
  latent bug found while doing the logo fix: `reminder.py` was reading
  `../../data/email_config.json`, outside the function's own directory,
  which would have failed the same way once actually deployed (never caught
  locally, since the local dry-run always has the full repo checkout on
  disk). Now a local copy; keep in sync with `data/email_config.json` if
  country team addresses change.
- `functions/reminder-job/gmail_sender.py` — `build_message()`/`send_email()`
  now accept `inline_images: {content_id: bytes}`, switched the MIME
  container from `multipart/alternative` to `multipart/related` (correct
  structure for an HTML document referencing its own embedded parts).
  Chose `cid:` inline attachment over a `data:` URI because some clients
  (Outlook desktop notably) strip `data:` URIs from HTML email.
- `functions/reminder-job/reminder.py` — loads the logo once at import
  (`_LOGO_BYTES`) and passes it to every `_send()` call.

Full test suite still green after these changes (48 passed). Re-sent all 8
sample test emails with the new design for Gino's review.

---

## [2026-08-10] Built — Training Lifecycle Reminders (functions/reminder-job/) — CODE COMPLETE, NOT YET DEPLOYED

Built the full 8-email reminder automation spec'd in
`docs/AktivAsia Automation Email (2).docx` (C1–C6 country-team milestone
reminders, P1/P2 participant 6-month Impact Evaluation reminders), as a
third Catalyst cron function, `functions/reminder-job/`. See CLAUDE.md's
new "Third Catalyst Function" section for the full design (trigger table,
6-month-completed signal, sender identity, state shape, links config).

**Replaces and deletes** the old fixed-day-offset system: `tools/reminder_engine.py`,
`tools/reminder_logic.py`, `tools/email_templates.py`, `register_reminder_task.bat`,
and their test files (`tests/test_reminder_logic.py`, `tests/test_email_templates.py`).
`data/email_config.json` (country → email mapping) is reused as-is — no changes needed.

**Files added:**
- `functions/reminder-job/` — `crm_auth.py`, `crm_fetch.py`, `gmail_sender.py`,
  `state_store.py`, `links.py`, `email_templates.py`, `reminder.py` (orchestrator,
  supports `--dry-run` locally), `main.py`, `checks/` (8 modules, one per email,
  plus shared `_dates.py` helpers), `requirements.txt`, `catalyst-config.json`
  (placeholder secrets — Gino must fill in), `catalyst-inputs.json`
- `tools/backfill_graduate_date.py` — the one CRM-write script in this repo
  (dry-run by default, `--apply` required), backfills blank `Deals.Graduate_Date`
  from the linked Training's `End_Date` for graduated Deals. Needed because P1/P2
  anchor to `Graduate_Date`, which is blank on ~80% of graduated Deals.
- `tests/test_reminder_job_checks.py` — 41 new unit tests covering all 8 checks'
  date/window logic (fires-at-boundary, suppressed-outside-window, dedup/pruning,
  6-month-completed stop condition). Full suite: 43 passed (`python -m pytest tests/ -q`).

**Still open before this can run unattended:**
- [ ] Manual Catalyst console setup: create `reminder_state` Data Store table
      (`state_json` text column, same shape as `monitor_state`)
- [x] Fill in real Zoho CRM + Gmail OAuth secrets in
      `functions/reminder-job/catalyst-config.json` — done by Gino, 2026-08-10
- [x] Confirmed via live test send (2026-08-10): `regional@aktivasia.org` is
      NOT a verified Send As alias — see "Sender identity finding" below.
      Fixed by using a separate refresh token per sender.
- [x] `GMAIL_REFRESH_TOKEN_REGIONAL` filled in and live-verified (2026-08-10)
      — see "Sender identity finding, resolved" below. Both tokens confirmed
      correct: `GMAIL_REFRESH_TOKEN` -> `gino@aktivasia.org`,
      `GMAIL_REFRESH_TOKEN_REGIONAL` -> `regional@aktivasia.org`.
- [ ] Run `python tools/backfill_graduate_date.py` (dry-run), review the diff with
      Gino, then `--apply` once approved — P1/P2 will find nothing to send for the
      ~80% of graduated Deals with blank `Graduate_Date` until this runs
- [ ] `python functions/reminder-job/reminder.py --dry-run` against live CRM data
      to sanity-check the milestone math (which Trainings/Deals fire today) before
      first deploy
- [ ] Deploy (`catalyst deploy --only functions:reminder-job`), verify
      `requirements.txt`'s `zcatalyst-sdk==1.3.0` pin survives (see 2026-08-10
      monitor-job deploy gotcha below for what happens if it doesn't)
- [ ] Set daily cron schedule in Catalyst console (mirrors `monitor_job_daily`)
- [ ] Two forms referenced by C5/C6/P1/P2 don't exist yet and are placeholder
      (`TBD_*`) links in `functions/reminder-job/links.py`: a generalized (non-PH-only)
      post-training survey, and the 6-month Impact Evaluation form. Gino to build
      these separately, likely as native Zoho Forms — out of scope for this work.

**Sender identity finding (2026-08-10, live test send):** Gino filled in
`functions/reminder-job/catalyst-config.json`'s Gmail vars by reusing
`monitor-job`'s existing `gino@aktivasia.org` refresh token for
`GMAIL_SENDER_PARTICIPANT=regional@aktivasia.org`, and asked whether that
would work. Verified with a real test send (via that exact token, `From:
regional@aktivasia.org`, to `gino@aktivasia.org`) — the Gmail API call
succeeded with no error, but the message that actually arrived showed
`From: gino@aktivasia.org`, confirming Gmail silently rewrote the sender
because `regional@aktivasia.org` is not a verified "Send As" alias on that
account. A single shared refresh token cannot produce two different `From:`
identities. Fixed by:
- Adding `tools/gmail_auth_regional.py` (variant of `tools/gmail_auth.py`,
  writes to a distinct `.env` key, `GMAIL_REFRESH_TOKEN_REGIONAL`, so it
  doesn't clobber the existing `GMAIL_REFRESH_TOKEN`) — Gino needs to run
  this locally, signed into `regional@aktivasia.org`, to generate its token.
- `functions/reminder-job/gmail_sender.py` now selects the refresh-token env
  var per requested sender (`GMAIL_REFRESH_TOKEN` for `gino@aktivasia.org`,
  `GMAIL_REFRESH_TOKEN_REGIONAL` for `regional@aktivasia.org`) instead of
  always using one token with a different `From:` header.
- `catalyst-config.json`'s `GMAIL_SENDER` reverted to `gino@aktivasia.org`
  (drives C1–C6; Gino had set it to `regional@aktivasia.org`, which would
  have misrouted the country-team emails too) — `GMAIL_SENDER_PARTICIPANT`
  stays `regional@aktivasia.org` (drives P1), and a new
  `GMAIL_REFRESH_TOKEN_REGIONAL` placeholder was added, still needing a real
  value.
- 5 new unit tests (`tests/test_reminder_job_gmail_sender.py`) covering the
  per-sender token selection. Full suite: 48 passed.

**Sender identity finding, resolved (2026-08-10, same day):** Gino filled in
`GMAIL_REFRESH_TOKEN_REGIONAL` in `.env`. A second live test send (via that
exact token, `From: regional@aktivasia.org`) confirmed it **does** arrive as
`regional@aktivasia.org` — that account has the alias verified, unlike
`gino@aktivasia.org`'s account. However, `functions/reminder-job/catalyst-config.json`
had the two token values **swapped**: its `GMAIL_REFRESH_TOKEN` field held
the regional token's value, and `GMAIL_REFRESH_TOKEN_REGIONAL` was still
`FILL_ME_IN` — meaning C1–C6 (which authenticate via `GMAIL_REFRESH_TOKEN`)
would have silently sent using the regional account instead of Gino's, and
P1 (`GMAIL_REFRESH_TOKEN_REGIONAL`) would have failed outright on the
placeholder. Fixed by cross-checking `.env` (which had both values correct
under their right names) against `catalyst-config.json` and correcting the
latter to match. A third live test send (via `GMAIL_REFRESH_TOKEN`, `From:
gino@aktivasia.org`) confirmed that direction is also correct. Both
directions are now live-verified:
- `GMAIL_REFRESH_TOKEN` (`...ZUQxICgYI...`) -> confirmed sends as `gino@aktivasia.org`
- `GMAIL_REFRESH_TOKEN_REGIONAL` (`...671ICgYI...`) -> confirmed sends as `regional@aktivasia.org`

`functions/reminder-job/catalyst-config.json` is now fully filled in and
verified correct — no `FILL_ME_IN` placeholders remain in it.

**Dry-run findings (2026-08-10, against live CRM data):**
- Ran `python functions/reminder-job/reminder.py --dry-run` after fixing two bugs
  found only by actually running it: (1) `checks/*.py`'s bare `from _dates import`
  needs `checks/` on `sys.path`, which Catalyst provides automatically for a
  deployed function but a local `python reminder.py` does not — fixed by adding it
  explicitly in `reminder.py`, harmless no-op under real Catalyst; (2) `crm_auth.py`'s
  module-level `os.environ.get(...)` reads happened at `import crm_fetch` time,
  before `__main__`'s `load_dotenv()` ran — `.env` values were never seen locally,
  causing a Zoho `invalid_client` error. Fixed by moving `load_dotenv()` to the very
  top of `reminder.py`, before any other imports; no-op under Catalyst (no `.env`
  there, env vars are pre-populated by the platform).
- With both fixed, the dry run correctly evaluated all 8 checks against live data:
  C1–C6 and P1 found nothing due today (expected — today isn't the 1st for C1, and
  the others are narrow date windows). **P2 found 46 real Deals** already past their
  6-month deadline (the ~20% of graduated Deals that already have a non-blank
  `Graduate_Date`) — meaning the first real deploy will send 46 P2 emails at once on
  day one, before `tools/backfill_graduate_date.py` even runs (which will surface
  more once the other ~80% get a `Graduate_Date`). Worth a heads-up to participants
  or a staged rollout, Gino's call. Also surfaced pre-existing CRM data-quality gaps
  unrelated to this code (one Deal's email has a `.con` typo; two Deals have a blank
  `First_Name`) — not fixed here, flagging for awareness only.

---

## [2026-08-10] Deploy — Daily CRM Monitor (functions/monitor-job/) — DEPLOYED

`catalyst deploy --only functions:monitor-job` initially failed with
`HTTP Error: 400, Invalid input value for Zip File`. Root cause (found via
`--verbose`, which surfaces the underlying `pip install` log): `requirements.txt`
pinned `zcatalyst-sdk==1.4.0`, but **`1.4.0` is not available for the
`python_3_9` stack's pip** — Catalyst's Python 3.9 interpreter's pip index
only lists up to `1.3.0` for that version (confirmed directly: `python3.9 -m
pip index versions zcatalyst-sdk` → max `1.3.0`; a newer local Python 3.14
interpreter sees `1.4.0` as available, which is what caused the mismatch
during planning — checking a package against the wrong interpreter's pip
gave a false read). With no matching distro, `pip install` produced nothing,
the packaged zip was empty of that dependency, and the server rejected it.
Fixed by pinning `zcatalyst-sdk==1.3.0` (same version `pipeline-job` already
correctly uses). Redeployed successfully.

**Takeaway for future Python Catalyst functions in this repo:** always pin
`zcatalyst-sdk==1.3.0` (not whatever `pip index` shows on a dev machine) —
verify against the `python_3_9` interpreter's own pip if unsure, not a newer
local Python's pip, since availability differs by interpreter/platform tag.

**Cron schedule created 2026-08-10:** `monitor_job_daily` in the Catalyst
console — Recursive, daily 07:00:00, Asia/Manila, target function
`monitor-job`, no function parameters.

**Full manual setup checklist — ALL COMPLETE:**
- [x] `monitor_state` Data Store table (`state_json` text column)
- [x] Gmail OAuth credentials in `functions/monitor-job/catalyst-config.json`
- [x] Deploy `monitor-job` (`catalyst deploy --only functions:monitor-job`)
- [x] Cron schedule: `monitor_job_daily`, daily 07:00 Asia/Manila

**Still open:** trigger one manual run to confirm the baseline digest email
arrives as expected (all 4 sections reporting "baseline run" / no false
backlog flood) before relying on the unattended daily schedule.

---

## [2026-08-10] Fix — monitor-job state storage: 10K column truncation + tie-tracking bugs — RESOLVED

Manual first run (`catalyst functions:execute monitor-job`) surfaced two
serious, compounding bugs, found by actually running against live production
data rather than stopping at "it runs without crashing":

**Bug 1 — silent column truncation.** Catalyst Data Store's `state_json`
Large Text column silently **truncates writes at ~10,000 characters**
instead of rejecting them. `graduate_mismatch.py`'s original design stored a
full "already reported" Deal-ID list (grew to 3,600+ entries on the very
first run) and `new_records.py`'s watermark accumulated one tie-break ID per
null-`Created_Time` record forever (several modules — Solutions, Contacts —
return `Created_Time: null` for many records). Combined state blew past
10,000 chars within the first run, got silently truncated, and every
subsequent `load_state()` correctly detected the resulting invalid JSON and
fell back to empty state — meaning **state never actually persisted across
runs at all**; every run behaved like a fresh baseline. Diagnosed by adding
temporary logging to `state_store.load_state()` and observing
`raw state_json length=10000` with a `JSONDecodeError: Unterminated string`
at that exact boundary.

**Fix:** redesigned all per-check state to be small and bounded by
construction instead of full ID lists:
- `new_records.py`: per-module watermark = single max-`Created_Time` value
  only. Null-`Created_Time` records are counted (not individually tracked)
  once on the baseline run via `null_ts_baseline_count`, then permanently
  ignored after that — an accepted, explicit gap (surfaced in the digest),
  not a silently unbounded set.
- `graduate_mismatch.py`: replaced the full reported-IDs list with a single
  `Modified_Time` watermark (not `Created_Time` — a Deal is created at
  application time but only enters this check's scope later, when it
  transitions to the Graduated stage; `Created_Time` would silently skip
  long-lived Deals that just graduated). Added `Modified_Time` to
  `crm_fetch.DEALS_GRADUATE_CHECK_FIELDS`.
- `six_month_due.py`: removed the `six_month_already_flagged` permanent ID
  set entirely — the existing `last_run_date < six_month_mark <= today`
  date-range check already prevents double-reporting on its own (once a
  mark passes that test, `last_run_date` only ever advances forward, so it
  can't fall in a later window again); the extra set added unbounded growth
  with no correctness benefit.
- `state_store.py`: added a hard `MAX_STATE_JSON_CHARS = 9000` assertion in
  `save_state()` so any future regression fails loudly instead of silently
  corrupting state again; `load_state()`'s parse-failure fallback now logs a
  `[WARN]` instead of failing silently.

**Bug 2 — exact-timestamp tie collisions (found via synthetic testing at
realistic scale before touching production again).** A first-pass fix kept
a capped tie-break ID set per watermark, to dedup records sharing the exact
max timestamp. A synthetic test (3,600 Deals, 128 sharing one exact
`Modified_Time` — realistic after any bulk CRM edit/import) showed any
record beyond the cap gets **incorrectly re-reported as "new" forever**,
since it can never appear in the capped set. Fixed by dropping tie-tracking
entirely in favor of a time-buffer threshold (`modified > last_seen -
buffer`) — cheaper, needs zero per-record state, and a boundary record is at
worst re-examined once, never incorrectly skipped.

**Bug 3 — buffer never advances on static data (also found via synthetic
testing).** The buffer-threshold fix above has its own gap: if a module's
timestamps never advance past a single value again (e.g. a one-time
historical batch, now static — confirmed via a second synthetic run
repeating against unchanged data), the buffered threshold never moves
forward either, so the same batch re-triggers "new" every run, forever.
Fixed by storing the watermark as `(max_dt + buffer)` instead of bare
`max_dt` — the next run's threshold (`stored - buffer`) then exactly equals
this run's `max_dt`, guaranteeing the effective threshold advances by
construction every run, regardless of whether the underlying data changes.
Applied identically to both `new_records.py` and `graduate_mismatch.py`.

**Verification:** after all three fixes, ran `catalyst functions:execute
monitor-job` three times in a row against live production data. Run 1
correctly detected and logged the old corrupted state, reset to baseline.
Runs 2 and 3 both correctly loaded the prior run's saved state
(`baseline_run=False`, `last_run_at` populated) with zero false "new" counts
— state genuinely persists across real runs now, confirmed live, not just
in synthetic tests.

**Lesson for future checks/state design in this job:** any new per-run
state must be O(1) or O(small-bounded), never O(records-ever-seen) — this
table's real limit is much lower than "Large Text" implies, and it fails
silently (truncation, not rejection) rather than loudly. Always test new
state logic against synthetic data at realistic production scale (thousands
of records, including exact-timestamp collisions and totally static
batches) before trusting it against live data.

---

## [2026-08-09] Build — Daily CRM Monitor (functions/monitor-job/) — CODE COMPLETE, MANUAL SETUP PENDING

Built a second, independent Catalyst cron function per Gino's request: a daily
read-only audit + email digest covering 4 checks (see `CLAUDE.md` → "Second
Catalyst Function" section for full detail).

Files added: `functions/monitor-job/{main,monitor,crm_auth,crm_fetch,
state_store,gmail_sender,email_report}.py`, `checks/{new_records,
email_activity,graduate_mismatch,six_month_due}.py`, `catalyst-config.json`,
`catalyst-inputs.json`, `requirements.txt`. Registered in `catalyst.json` →
`functions.targets`.

Design was reviewed by a second Opus pass before implementation, which caught
real bugs in the first draft (broken token-cache-under-load assumption,
noisy exact-equality date matching, a non-gap-proof 6-month window, missing
`catalyst.json` registration). Findings verified and folded into the design
before any code was written — see the approved plan file for the full
before/after.

During implementation, inspected the actual `zcatalyst-sdk==1.4.0` package
source directly (downloaded the wheel; not installed locally) rather than
guess at API shapes, and found the File Store SDK has no "get file by name"
or "list files" call — only `get_file_details(file_id)`, which needs an ID
you don't have. Switched state persistence from File Store (as originally
planned) to Data Store (a single-row table) as a result. Also confirmed live
against the CRM: `Deals/{id}/Emails` response field is `time`/`message_id`,
not `sent_time`; `Funders` is addressed directly (not `CustomModule10`); and
~80% of graduated Deals have blank `Graduate_Date` (COQL sample of 200).

**Manual setup required before first deploy (cannot be done from code):**
- [x] Create `monitor_state` Data Store table in Catalyst console (Cloud
      Scale > Data Store), column `state_json` (text). Done 2026-08-10 —
      table ID `56790000000031384`, confirmed via console screenshot.
- [x] Fill in `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN`
      in `functions/monitor-job/catalyst-config.json`. Done 2026-08-10 — Gino
      re-ran `tools/gmail_auth.py` to generate a fresh token (old one may
      have been stale/revoked) and pasted the new values directly into
      `catalyst-config.json` himself.
- [ ] Set the cron schedule to 7:00 AM Asia/Manila in the Catalyst console
      (same manual-schedule pattern as `pipeline-job` — no schedule is
      stored in any repo file for either function).
- [ ] Deploy and run once manually to confirm the baseline run behaves as
      expected (see plan's Verification Plan section) before relying on the
      daily digest.

---

## [2026-06-09] Deploy — Mentorship Session 1 Feedback form + report (ID) — COMPLETE

Deployed to Cloudflare Pages: https://57c19f44.aktivasia-portal.pages.dev

New files shipped:
- `portal/mentorship-session1-feedback-id.html` — Session 1 feedback intake form
- `portal/js/form-mentorship-session1-feedback-id.js` — form logic
- `portal/mentorship-session1-feedback-report-id.html` — report page
- `portal/js/report-mentorship-session1-feedback-id.js` — report logic

Production URL: https://aktivasia-portal.pages.dev

---

## [2026-05-28] GELP Research Mapping Form Report page — COMPLETE

Features shipped:
- `portal/mentorship-intake-report-id.html` — live report page showing GELP Indonesia participants who have/haven't submitted the Research Mapping intake form
- `portal/js/report-mentorship-intake-id.js` — fetches all GELP deals (no stage filter), parses `Custom_Responses` per question header, renders two-tab table (Answered / Not Answered), XLS export via SheetJS (two sheets)
- Deployed to: https://aktivasia-portal.pages.dev/mentorship-intake-report-id.html

---

## [2026-05-04] Reminder Engine + Admin Page — COMPLETE

Features shipped:
- `tools/reminder_engine.py` — daily scheduler (4 reminder types), `--dry-run` flag
- `tools/gmail_sender.py` — Gmail API sender (gino@aktivasia.org), in-memory token cache
- `tools/gmail_auth.py` — one-time OAuth2 setup script
- `tools/reminder_logic.py` — pure business logic, fully tested (17 tests)
- `tools/email_templates.py` — HTML email builders, fully tested (8 tests)
- `portal/admin.html` + `portal/js/admin.js` — participant stage management (selection / attendance / post-survey tabs)
- `portal/workers/crm-proxy.js` — `PATCH /deals/:id/stage` route added
- `register_reminder_task.bat` — Windows Task Scheduler daily 08:00 trigger
- `data/email_config.json` — country team email lists

Dry-run against live CRM confirmed:
- 164 training plans, 116 trainings, 3865 deals fetched successfully
- 9 due reminders detected (1×R2, 5×R3, 2×R4) — ready to fire after Gmail OAuth setup

CRM changes still needed from Gino (pre-deployment prerequisites):
- [ ] Add `Rejected` picklist value to `Deals.Stage` in Zoho CRM
- [ ] Confirm `Attended Training` spelling is live
- [ ] Enable Gmail API + create OAuth2 credentials → run `python tools/gmail_auth.py`

---

## [2026-03-18] Protocol 0 — Initialization

**Status:** COMPLETE

Actions taken:
- Created project directory: `g:\My Drive\10 Projects\60 Claude\aa-ecosystem\`
- Scaffolded full directory structure: `architecture/`, `tools/`, `data/`, `portal/`, `.tmp/`
- Created: `claude.md`, `task_plan.md`, `findings.md`, `progress.md`, `.env.example`, `requirements.txt`, `.gitignore`

Discovery Questions answered by Gino:
- North Star: 5 portals (PK, PH, KR, ID, Backbone) × 4 reports each
- CRM module API names confirmed
- Read-only rule on CRM established
- WhatsApp/Twilio dropped from scope
- Portal style: follow aktivasia.pages.dev design system

**Next:** Phase 2 — populate `.env` with Zoho CRM credentials, then run `verify_crm.py`

---

## [2026-03-18] Phase 2 — Link: COMPLETE

**Status:** ALL CHECKS PASSED

Actions taken:
- OAuth token refresh working (Zoho IN datacenter)
- 70 CRM modules listed; all 6 pipeline modules confirmed present
- 204 Deals fields confirmed; saved to `.tmp/deals_fields.json`
- 64 Solutions fields confirmed; saved to `.tmp/solutions_fields.json`
- Sample Deal and Training records fetched via REST GET

Key findings:
- COQL (`POST /coql`) blocked by scope despite per-module READ scopes — pipeline will use paginated REST GET (`per_page=200&page=N`) instead
- Country filter confirmed: `Deal.Training_Applied (lookup) → Solutions.Organised_By`
- All field API names confirmed and documented in `claude.md`
- `ZohoCRM.settings.READ` + per-module `READ` scopes sufficient for full pipeline

**Next:** Phase 3 — build pipeline tools (crm_auth.py, crm_extract.py, transform.py, data_writer.py, orchestrator.py)

---

## [2026-03-18] Phase 3 — Architecture: COMPLETE

**Status:** All pipeline tools written

Tools created:
- `tools/crm_auth.py` — OAuth token manager (cache + refresh)
- `tools/crm_extract.py` — paginated REST GET for Deals, Solutions, Products, Accounts → `.tmp/`
- `tools/transform.py` — all 4 report aggregations per portal; country routing via Solutions.Organised_By
- `tools/data_writer.py` — merges 5 portal payloads → `data/dashboard_data.json`
- `tools/orchestrator.py` — pipeline runner with `--portal` and `--skip-extract` flags

Key architecture decisions:
- Uses REST GET pagination (`per_page=200&page=N`) not COQL (COQL requires broader scope)
- Country resolution: `Deal.Training_Applied.id` → `solutions_by_id[id].Organised_By` → portal key
- Backbone portal processes `Organised_By=Regional` deals + aggregates per-country totals
- 6M eval completion: any non-null 6M impact field on a Graduated/Post Eval Completed deal

**Next:** Run `python tools/orchestrator.py --portal PH` to test with real data, then Phase 4 — HTML portal

---
[2026-03-18 12:47:13 UTC] Pipeline started. portal=PH skip_extract=False
[2026-03-18 12:47:24 UTC]   [FAIL] Extract failed: 400 Client Error:  for url: https://www.zohoapis.in/crm/v8/Deals?fields=id%2CDeal_Name%2CStage%2CGraduate_Date%2CTraining_Applied%2CTraining_Type_Applied%2CAccount_Name%2CGender%2CDate_of_Birth%2CCity_Province%2CA_Pre_Training_Strategy_Buildings%2CA_Post_Training_Strategy_Building%2CB_Strategy_Tactics_6%2CB_Pre_Training_Building_Communication%2CB_Post_Training_Building_Communication%2CC_Communication_Strategy_6%2CC_Pre_Training_Confident_facilitator%2CC_Post_Training_Confident_facilitator%2CD_Facilitating_Workshops_Meetings_6%2CD_Pre_Training_Confident_connector%2CD_Post_Training_Confident_connector%2CE_Building_Connections_6%2CBest_aspect_of_the_workshop%2CSum_up_what_you_learned_at_our_training%2CAction_Plans_in_the_next_3_months%2CImprovement_Suggestion_for_next_time%2CSuggestions_in_the_next_workshop%2CWillingness_to_provide_a_testimonial%2CHow_has_the_training_impacted_your_campaigning%2CHave_you_applied_the_training_to_run_more_effectiv%2CI_ve_got_a_new_or_better_job_in_campaigning%2CI_ve_done_more_campaigning%2CI_ve_been_able_to_raise_more_funds_for_my_campaign%2CI_ve_built_connections_to_support_my_campaign%2CI_ve_got_more_people_supporting_my_campaign%2CMy_campaign_has_achieved_some_objectives_and_goals%2CWhat_you_shared_the_content_or_topics%2CI_ve_stayed_connected_with_campaigners%2CI_ve_trained_others_to_run_effective_campaigns%2CI_ve_shared_my_learnings_with_others%2CAre_you_interested_in_reconnecting_with_AktivAsia%2CKnow_someone_who_could_gain_from_our_training%2CWhat_s_alive_in_your_campaign_work_now%2CTestimonial_for_us_on_how_the_training%2CAnything_else_you_d_like_to_share_or_ask%2CNeed_support_from_AktivAsia%2CKey_focus_for_our_national_local_trainings%2CShared_learnings_with_how_many_people&per_page=200&page=11
[2026-03-18 12:48:27 UTC] Pipeline started. portal=PH skip_extract=False
[2026-03-18 12:48:48 UTC]   Extracted Deals: 3842 records
[2026-03-18 12:48:48 UTC]   Extracted Solutions: 110 records
[2026-03-18 12:48:48 UTC]   Extracted Products: 4 records
[2026-03-18 12:48:48 UTC]   Extracted Accounts: 2232 records
[2026-03-18 12:48:48 UTC]   Transformed PH: applicants=667 graduates=0
[2026-03-18 12:48:48 UTC] Pipeline complete in 20s
[2026-03-18 13:01:38 UTC] Pipeline started. portal=PH skip_extract=True
[2026-03-18 13:01:38 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 13:01:38 UTC] Pipeline complete in 0s
[2026-03-18 13:02:15 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 13:02:16 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 13:02:16 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 13:02:16 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 13:02:16 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 13:02:16 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 13:02:16 UTC]   dashboard_data.json written (749.6 KB)
[2026-03-18 13:02:16 UTC] Pipeline complete in 0s
[2026-03-18 13:04:14 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 13:04:14 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 13:04:14 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 13:04:14 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 13:04:14 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 13:04:14 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 13:04:14 UTC]   dashboard_data.json written (752.5 KB)
[2026-03-18 13:04:14 UTC] Pipeline complete in 0s
[2026-03-18 14:11:30 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 14:11:46 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 14:11:46 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 14:11:46 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 14:11:46 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 14:11:46 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 14:11:46 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 14:11:47 UTC]   dashboard_data.json written (806.3 KB)
[2026-03-18 14:11:47 UTC] Pipeline complete in 0s
[2026-03-18 14:19:29 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-03-18 14:19:54 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-03-18 14:22:41 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-03-18 14:25:57 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-03-18 14:29:33 UTC]   Extracted Deals: 3842 records
[2026-03-18 14:29:33 UTC]   Extracted Solutions: 110 records
[2026-03-18 14:29:33 UTC]   Extracted Products: 4 records
[2026-03-18 14:29:33 UTC]   Extracted Accounts: 2232 records
[2026-03-18 14:29:33 UTC]   Extracted Forms: 6 records
[2026-03-18 14:29:34 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 14:29:34 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 14:29:34 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 14:29:34 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 14:29:34 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 14:29:34 UTC]   dashboard_data.json written (806.3 KB)
[2026-03-18 14:29:34 UTC] Pipeline complete in 580s
[2026-03-18 14:31:53 UTC]   [FAIL] Extract failed: 'charmap' codec can't encode character '\u2192' in position 1: character maps to <undefined>
[2026-03-18 14:32:24 UTC]   Extracted Deals: 3842 records
[2026-03-18 14:32:24 UTC]   Extracted Solutions: 110 records
[2026-03-18 14:32:24 UTC]   Extracted Products: 4 records
[2026-03-18 14:32:24 UTC]   Extracted Accounts: 2232 records
[2026-03-18 14:32:24 UTC]   Extracted Forms: 6 records
[2026-03-18 14:32:24 UTC]   [FAIL] Transform failed: [Errno 22] Invalid argument
[2026-03-18 14:34:08 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-03-18 14:42:16 UTC]   Extracted Deals: 3842 records
[2026-03-18 14:42:16 UTC]   Extracted Solutions: 110 records
[2026-03-18 14:42:16 UTC]   Extracted Products: 4 records
[2026-03-18 14:42:16 UTC]   Extracted Accounts: 2232 records
[2026-03-18 14:42:16 UTC]   Extracted Forms: 6 records
[2026-03-18 14:42:17 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 14:42:17 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 14:42:17 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 14:42:17 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 14:42:17 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 14:42:17 UTC]   dashboard_data.json written (806.3 KB)
[2026-03-18 14:42:17 UTC] Pipeline complete in 488s
[2026-03-18 14:50:27 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 14:50:27 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 14:50:27 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 14:50:27 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 14:50:27 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 14:50:27 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 14:50:27 UTC]   dashboard_data.json written (806.3 KB)
[2026-03-18 14:50:27 UTC] Pipeline complete in 0s
[2026-03-18 14:52:05 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 14:52:06 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 14:52:06 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 14:52:06 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 14:52:06 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 14:52:06 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 14:52:06 UTC]   dashboard_data.json written (807.2 KB)
[2026-03-18 14:52:06 UTC] Pipeline complete in 0s
[2026-03-18 15:50:04 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 15:50:04 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 15:50:04 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 15:50:04 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 15:50:04 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 15:50:04 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 15:50:05 UTC]   dashboard_data.json written (1275.3 KB)
[2026-03-18 15:50:05 UTC] Pipeline complete in 0s
[2026-03-18 15:54:54 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 15:54:55 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 15:54:55 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 15:54:55 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 15:54:55 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 15:54:55 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 15:54:55 UTC]   dashboard_data.json written (1275.3 KB)
[2026-03-18 15:54:55 UTC] Pipeline complete in 0s
[2026-03-18 15:58:18 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-18 15:58:18 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-18 15:58:18 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-18 15:58:18 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-18 15:58:18 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-18 15:58:18 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-18 15:58:18 UTC]   dashboard_data.json written (1275.3 KB)
[2026-03-18 15:58:18 UTC] Pipeline complete in 0s
[2026-03-21 12:50:55 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-03-21 12:51:18 UTC]   Extracted Deals: 3842 records
[2026-03-21 12:51:18 UTC]   Extracted Solutions: 110 records
[2026-03-21 12:51:18 UTC]   Extracted Products: 4 records
[2026-03-21 12:51:18 UTC]   Extracted Accounts: 2232 records
[2026-03-21 12:51:18 UTC]   Extracted Forms: 6 records
[2026-03-21 12:51:18 UTC]   Extracted Training_Plans: 164 records
[2026-03-21 12:51:18 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-21 12:51:18 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-21 12:51:18 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-21 12:51:19 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-21 12:51:19 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-21 12:51:19 UTC]   dashboard_data.json written (1275.3 KB)
[2026-03-21 12:51:19 UTC] Pipeline complete in 24s
[2026-03-21 12:52:13 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-03-21 12:52:13 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-21 12:52:13 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-21 12:52:13 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-21 12:52:13 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-21 12:52:13 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-21 12:52:13 UTC]   dashboard_data.json written (1325.6 KB)
[2026-03-21 12:52:13 UTC] Pipeline complete in 0s
[2026-03-21 13:57:06 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-03-21 14:06:31 UTC]   Extracted Deals: 3842 records
[2026-03-21 14:06:31 UTC]   Extracted Solutions: 110 records
[2026-03-21 14:06:31 UTC]   Extracted Products: 4 records
[2026-03-21 14:06:31 UTC]   Extracted Accounts: 2232 records
[2026-03-21 14:06:31 UTC]   Extracted Forms: 6 records
[2026-03-21 14:06:31 UTC]   Extracted Training_Plans: 164 records
[2026-03-21 14:06:32 UTC]   Transformed PH: applicants=667 graduates=514
[2026-03-21 14:06:32 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-03-21 14:06:32 UTC]   Transformed KR: applicants=188 graduates=164
[2026-03-21 14:06:32 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-03-21 14:06:32 UTC]   Transformed backbone: applicants=344 graduates=192
[2026-03-21 14:06:32 UTC]   dashboard_data.json written (1509.3 KB)
[2026-03-21 14:06:32 UTC] Pipeline complete in 566s
[2026-05-04 14:31:14 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-05-04 14:31:38 UTC]   Extracted Deals: 3865 records
[2026-05-04 14:31:38 UTC]   Extracted Solutions: 116 records
[2026-05-04 14:31:38 UTC]   Extracted Products: 4 records
[2026-05-04 14:31:38 UTC]   Extracted Accounts: 2141 records
[2026-05-04 14:31:38 UTC]   Extracted Forms: 7 records
[2026-05-04 14:31:38 UTC]   Extracted Training_Plans: 164 records
[2026-05-04 14:31:39 UTC]   Transformed PH: applicants=689 graduates=518
[2026-05-04 14:31:39 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-04 14:31:39 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-04 14:31:39 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-05-04 14:31:39 UTC]   Transformed backbone: applicants=345 graduates=191
[2026-05-04 14:31:39 UTC]   dashboard_data.json written (1756.1 KB)
[2026-05-04 14:31:39 UTC] Pipeline complete in 25s
[2026-05-04 14:35:49 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-05-04 14:36:11 UTC]   Extracted Deals: 3865 records
[2026-05-04 14:36:11 UTC]   Extracted Solutions: 116 records
[2026-05-04 14:36:11 UTC]   Extracted Products: 4 records
[2026-05-04 14:36:11 UTC]   Extracted Accounts: 2141 records
[2026-05-04 14:36:11 UTC]   Extracted Forms: 7 records
[2026-05-04 14:36:11 UTC]   Extracted Training_Plans: 164 records
[2026-05-04 14:36:11 UTC]   Transformed PH: applicants=689 graduates=518
[2026-05-04 14:36:11 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-04 14:36:11 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-04 14:36:11 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-05-04 14:36:11 UTC]   Transformed backbone: applicants=345 graduates=191
[2026-05-04 14:36:12 UTC]   dashboard_data.json written (1756.1 KB)
[2026-05-04 14:36:12 UTC] Pipeline complete in 22s
[2026-05-05 04:26:53 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-05-05 04:27:15 UTC]   Extracted Deals: 3865 records
[2026-05-05 04:27:15 UTC]   Extracted Solutions: 116 records
[2026-05-05 04:27:15 UTC]   Extracted Products: 4 records
[2026-05-05 04:27:15 UTC]   Extracted Accounts: 2141 records
[2026-05-05 04:27:15 UTC]   Extracted Forms: 7 records
[2026-05-05 04:27:15 UTC]   Extracted Training_Plans: 164 records
[2026-05-05 04:27:15 UTC]   Transformed PH: applicants=689 graduates=518
[2026-05-05 04:27:15 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-05 04:27:15 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-05 04:27:15 UTC]   Transformed ID: applicants=1635 graduates=663
[2026-05-05 04:27:15 UTC]   Transformed backbone: applicants=345 graduates=192
[2026-05-05 04:27:15 UTC]   dashboard_data.json written (1756.1 KB)
[2026-05-05 04:27:15 UTC] Pipeline complete in 22s
[2026-05-12 13:25:52 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-05-12 13:26:14 UTC]   Extracted Deals: 3881 records
[2026-05-12 13:26:14 UTC]   Extracted Solutions: 116 records
[2026-05-12 13:26:14 UTC]   Extracted Products: 4 records
[2026-05-12 13:26:14 UTC]   Extracted Accounts: 2141 records
[2026-05-12 13:26:14 UTC]   Extracted Forms: 8 records
[2026-05-12 13:26:14 UTC]   Extracted Training_Plans: 167 records
[2026-05-12 13:26:14 UTC]   Transformed PH: applicants=688 graduates=518
[2026-05-12 13:26:14 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-12 13:26:14 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-12 13:26:14 UTC]   Transformed ID: applicants=1651 graduates=680
[2026-05-12 13:26:14 UTC]   Transformed backbone: applicants=345 graduates=193
[2026-05-12 13:26:14 UTC]   dashboard_data.json written (1834.4 KB)
[2026-05-12 13:26:14 UTC] Pipeline complete in 22s
[2026-05-12 13:34:43 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-05-12 13:35:01 UTC]   Extracted Deals: 3881 records
[2026-05-12 13:35:01 UTC]   Extracted Solutions: 116 records
[2026-05-12 13:35:01 UTC]   Extracted Products: 4 records
[2026-05-12 13:35:01 UTC]   Extracted Accounts: 2141 records
[2026-05-12 13:35:01 UTC]   Extracted Forms: 8 records
[2026-05-12 13:35:01 UTC]   Extracted Training_Plans: 167 records
[2026-05-12 13:35:01 UTC]   Transformed PH: applicants=688 graduates=518
[2026-05-12 13:35:01 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-12 13:35:01 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-12 13:35:01 UTC]   Transformed ID: applicants=1651 graduates=680
[2026-05-12 13:35:01 UTC]   Transformed backbone: applicants=345 graduates=193
[2026-05-12 13:35:01 UTC]   dashboard_data.json written (1834.4 KB)
[2026-05-12 13:35:01 UTC] Pipeline complete in 18s
[2026-05-12 13:48:24 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-05-12 13:48:43 UTC]   Extracted Deals: 3881 records
[2026-05-12 13:48:43 UTC]   Extracted Solutions: 116 records
[2026-05-12 13:48:43 UTC]   Extracted Products: 4 records
[2026-05-12 13:48:43 UTC]   Extracted Accounts: 2141 records
[2026-05-12 13:48:43 UTC]   Extracted Forms: 8 records
[2026-05-12 13:48:43 UTC]   Extracted Training_Plans: 167 records
[2026-05-12 13:48:44 UTC]   Transformed PH: applicants=688 graduates=518
[2026-05-12 13:48:44 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-12 13:48:44 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-12 13:48:44 UTC]   Transformed ID: applicants=1651 graduates=680
[2026-05-12 13:48:44 UTC]   Transformed backbone: applicants=345 graduates=193
[2026-05-12 13:48:44 UTC]   dashboard_data.json written (1834.4 KB)
[2026-05-12 13:48:44 UTC] Pipeline complete in 19s
[2026-05-12 13:57:15 UTC] Pipeline started. portal=ALL skip_extract=True
[2026-05-12 13:57:15 UTC]   Transformed PH: applicants=688 graduates=518
[2026-05-12 13:57:15 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-12 13:57:15 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-12 13:57:15 UTC]   Transformed ID: applicants=1651 graduates=680
[2026-05-12 13:57:15 UTC]   Transformed backbone: applicants=345 graduates=193
[2026-05-12 13:57:15 UTC]   dashboard_data.json written (1884.6 KB)
[2026-05-12 13:57:15 UTC]   dashboard_data.json synced to portal/data/
[2026-05-12 13:57:15 UTC] Pipeline complete in 0s
[2026-05-18 00:51:27 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-05-18 00:51:53 UTC]   Extracted Deals: 3881 records
[2026-05-18 00:51:53 UTC]   Extracted Solutions: 116 records
[2026-05-18 00:51:53 UTC]   Extracted Products: 4 records
[2026-05-18 00:51:53 UTC]   Extracted Accounts: 2141 records
[2026-05-18 00:51:53 UTC]   Extracted Forms: 8 records
[2026-05-18 00:51:53 UTC]   Extracted Training_Plans: 167 records
[2026-05-18 00:51:54 UTC]   Transformed PH: applicants=688 graduates=518
[2026-05-18 00:51:54 UTC]   Transformed PK: applicants=1008 graduates=281
[2026-05-18 00:51:54 UTC]   Transformed KR: applicants=188 graduates=164
[2026-05-18 00:51:54 UTC]   Transformed ID: applicants=1651 graduates=680
[2026-05-18 00:51:54 UTC]   Transformed backbone: applicants=345 graduates=193
[2026-05-18 00:51:54 UTC]   dashboard_data.json written (1884.6 KB)
[2026-05-18 00:51:54 UTC]   dashboard_data.json synced to portal/data/
[2026-05-18 00:51:54 UTC] Pipeline complete in 26s
[2026-06-08 16:44:05 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-08 16:44:53 UTC]   Extracted Deals: 3986 records
[2026-06-08 16:44:53 UTC]   Extracted Solutions: 120 records
[2026-06-08 16:44:53 UTC]   Extracted Products: 4 records
[2026-06-08 16:44:53 UTC]   Extracted Accounts: 2223 records
[2026-06-08 16:44:53 UTC]   Extracted Forms: 24 records
[2026-06-08 16:44:53 UTC]   Extracted Training_Plans: 167 records
[2026-06-08 16:44:53 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-08 16:44:53 UTC]   Transformed PK: applicants=1070 graduates=281
[2026-06-08 16:44:53 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-08 16:44:53 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-08 16:44:53 UTC]   Transformed backbone: applicants=355 graduates=193
[2026-06-08 16:44:53 UTC]   dashboard_data.json written (1923.0 KB)
[2026-06-08 16:44:53 UTC]   dashboard_data.json synced to portal/data/
[2026-06-08 16:44:53 UTC] Pipeline complete in 48s
[2026-06-08 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-08 22:00:30 UTC]   Extracted Deals: 3986 records
[2026-06-08 22:00:30 UTC]   Extracted Solutions: 120 records
[2026-06-08 22:00:30 UTC]   Extracted Products: 4 records
[2026-06-08 22:00:30 UTC]   Extracted Accounts: 2223 records
[2026-06-08 22:00:30 UTC]   Extracted Forms: 24 records
[2026-06-08 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-06-08 22:00:30 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-08 22:00:30 UTC]   Transformed PK: applicants=1070 graduates=281
[2026-06-08 22:00:30 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-08 22:00:30 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-08 22:00:30 UTC]   Transformed backbone: applicants=355 graduates=193
[2026-06-08 22:00:30 UTC]   dashboard_data.json written (1923.0 KB)
[2026-06-08 22:00:30 UTC]   dashboard_data.json synced to portal/data/
[2026-06-08 22:00:30 UTC] Pipeline complete in 27s
[2026-06-09 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-09 22:00:30 UTC]   Extracted Deals: 3986 records
[2026-06-09 22:00:30 UTC]   Extracted Solutions: 120 records
[2026-06-09 22:00:30 UTC]   Extracted Products: 4 records
[2026-06-09 22:00:30 UTC]   Extracted Accounts: 2223 records
[2026-06-09 22:00:30 UTC]   Extracted Forms: 24 records
[2026-06-09 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-06-09 22:00:30 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-09 22:00:30 UTC]   Transformed PK: applicants=1070 graduates=281
[2026-06-09 22:00:30 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-09 22:00:30 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-09 22:00:30 UTC]   Transformed backbone: applicants=355 graduates=193
[2026-06-09 22:00:31 UTC]   dashboard_data.json written (1923.0 KB)
[2026-06-09 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-06-09 22:00:31 UTC] Pipeline complete in 28s
[2026-06-11 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-11 22:00:29 UTC]   Extracted Deals: 3989 records
[2026-06-11 22:00:29 UTC]   Extracted Solutions: 120 records
[2026-06-11 22:00:29 UTC]   Extracted Products: 4 records
[2026-06-11 22:00:29 UTC]   Extracted Accounts: 2225 records
[2026-06-11 22:00:29 UTC]   Extracted Forms: 24 records
[2026-06-11 22:00:29 UTC]   Extracted Training_Plans: 167 records
[2026-06-11 22:00:29 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-11 22:00:29 UTC]   Transformed PK: applicants=1070 graduates=281
[2026-06-11 22:00:29 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-11 22:00:29 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-11 22:00:29 UTC]   Transformed backbone: applicants=358 graduates=194
[2026-06-11 22:00:29 UTC]   dashboard_data.json written (1924.6 KB)
[2026-06-11 22:00:29 UTC]   dashboard_data.json synced to portal/data/
[2026-06-11 22:00:29 UTC] Pipeline complete in 27s
[2026-06-12 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-12 22:00:30 UTC]   Extracted Deals: 4016 records
[2026-06-12 22:00:30 UTC]   Extracted Solutions: 120 records
[2026-06-12 22:00:30 UTC]   Extracted Products: 4 records
[2026-06-12 22:00:30 UTC]   Extracted Accounts: 2225 records
[2026-06-12 22:00:30 UTC]   Extracted Forms: 24 records
[2026-06-12 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-06-12 22:00:30 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-12 22:00:30 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-12 22:00:30 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-12 22:00:30 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-12 22:00:30 UTC]   Transformed backbone: applicants=358 graduates=197
[2026-06-12 22:00:30 UTC]   dashboard_data.json written (1929.6 KB)
[2026-06-12 22:00:30 UTC]   dashboard_data.json synced to portal/data/
[2026-06-12 22:00:30 UTC] Pipeline complete in 28s
[2026-06-14 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-14 22:00:30 UTC]   Extracted Deals: 4016 records
[2026-06-14 22:00:30 UTC]   Extracted Solutions: 120 records
[2026-06-14 22:00:30 UTC]   Extracted Products: 4 records
[2026-06-14 22:00:30 UTC]   Extracted Accounts: 2225 records
[2026-06-14 22:00:30 UTC]   Extracted Forms: 24 records
[2026-06-14 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-06-14 22:00:30 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-14 22:00:30 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-14 22:00:30 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-14 22:00:30 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-14 22:00:30 UTC]   Transformed backbone: applicants=358 graduates=197
[2026-06-14 22:00:30 UTC]   dashboard_data.json written (1929.6 KB)
[2026-06-14 22:00:30 UTC]   dashboard_data.json synced to portal/data/
[2026-06-14 22:00:30 UTC] Pipeline complete in 28s
[2026-06-23 22:00:03 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-23 22:00:31 UTC]   Extracted Deals: 4016 records
[2026-06-23 22:00:31 UTC]   Extracted Solutions: 120 records
[2026-06-23 22:00:31 UTC]   Extracted Products: 4 records
[2026-06-23 22:00:31 UTC]   Extracted Accounts: 2226 records
[2026-06-23 22:00:31 UTC]   Extracted Forms: 24 records
[2026-06-23 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-06-23 22:00:31 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-23 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-23 22:00:31 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-23 22:00:31 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-23 22:00:31 UTC]   Transformed backbone: applicants=358 graduates=197
[2026-06-23 22:00:31 UTC]   dashboard_data.json written (1929.6 KB)
[2026-06-23 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-06-23 22:00:31 UTC] Pipeline complete in 28s
[2026-06-24 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-24 22:00:31 UTC]   Extracted Deals: 4016 records
[2026-06-24 22:00:31 UTC]   Extracted Solutions: 120 records
[2026-06-24 22:00:31 UTC]   Extracted Products: 4 records
[2026-06-24 22:00:31 UTC]   Extracted Accounts: 2226 records
[2026-06-24 22:00:31 UTC]   Extracted Forms: 24 records
[2026-06-24 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-06-24 22:00:31 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-24 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-24 22:00:31 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-24 22:00:31 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-24 22:00:31 UTC]   Transformed backbone: applicants=358 graduates=197
[2026-06-24 22:00:31 UTC]   dashboard_data.json written (1929.6 KB)
[2026-06-24 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-06-24 22:00:31 UTC] Pipeline complete in 29s
[2026-06-25 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-25 22:00:31 UTC]   Extracted Deals: 4016 records
[2026-06-25 22:00:31 UTC]   Extracted Solutions: 120 records
[2026-06-25 22:00:31 UTC]   Extracted Products: 4 records
[2026-06-25 22:00:31 UTC]   Extracted Accounts: 2226 records
[2026-06-25 22:00:31 UTC]   Extracted Forms: 24 records
[2026-06-25 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-06-25 22:00:31 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-25 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-25 22:00:31 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-25 22:00:31 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-25 22:00:31 UTC]   Transformed backbone: applicants=358 graduates=197
[2026-06-25 22:00:31 UTC]   dashboard_data.json written (1929.6 KB)
[2026-06-25 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-06-25 22:00:31 UTC] Pipeline complete in 29s
[2026-06-27 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-27 22:00:33 UTC]   Extracted Deals: 4016 records
[2026-06-27 22:00:33 UTC]   Extracted Solutions: 120 records
[2026-06-27 22:00:33 UTC]   Extracted Products: 4 records
[2026-06-27 22:00:33 UTC]   Extracted Accounts: 2226 records
[2026-06-27 22:00:33 UTC]   Extracted Forms: 24 records
[2026-06-27 22:00:33 UTC]   Extracted Training_Plans: 167 records
[2026-06-27 22:00:33 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-27 22:00:33 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-27 22:00:33 UTC]   Transformed KR: applicants=188 graduates=164
[2026-06-27 22:00:33 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-27 22:00:33 UTC]   Transformed backbone: applicants=358 graduates=197
[2026-06-27 22:00:33 UTC]   dashboard_data.json written (1929.6 KB)
[2026-06-27 22:00:33 UTC]   dashboard_data.json synced to portal/data/
[2026-06-27 22:00:33 UTC] Pipeline complete in 30s
[2026-06-28 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-28 22:00:31 UTC]   Extracted Deals: 4043 records
[2026-06-28 22:00:31 UTC]   Extracted Solutions: 120 records
[2026-06-28 22:00:31 UTC]   Extracted Products: 4 records
[2026-06-28 22:00:31 UTC]   Extracted Accounts: 2237 records
[2026-06-28 22:00:31 UTC]   Extracted Forms: 24 records
[2026-06-28 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-06-28 22:00:31 UTC]   Transformed PH: applicants=688 graduates=518
[2026-06-28 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-28 22:00:31 UTC]   Transformed KR: applicants=200 graduates=164
[2026-06-28 22:00:31 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-28 22:00:31 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-06-28 22:00:31 UTC]   dashboard_data.json written (1961.0 KB)
[2026-06-28 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-06-28 22:00:31 UTC] Pipeline complete in 29s
[2026-06-29 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-29 22:00:30 UTC]   Extracted Deals: 4043 records
[2026-06-29 22:00:30 UTC]   Extracted Solutions: 120 records
[2026-06-29 22:00:30 UTC]   Extracted Products: 4 records
[2026-06-29 22:00:30 UTC]   Extracted Accounts: 2237 records
[2026-06-29 22:00:30 UTC]   Extracted Forms: 24 records
[2026-06-29 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-06-29 22:00:30 UTC]   Transformed PH: applicants=688 graduates=520
[2026-06-29 22:00:30 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-29 22:00:30 UTC]   Transformed KR: applicants=200 graduates=166
[2026-06-29 22:00:30 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-29 22:00:30 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-06-29 22:00:30 UTC]   dashboard_data.json written (1961.0 KB)
[2026-06-29 22:00:30 UTC]   dashboard_data.json synced to portal/data/
[2026-06-29 22:00:30 UTC] Pipeline complete in 28s
[2026-06-30 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-06-30 22:00:30 UTC]   Extracted Deals: 4043 records
[2026-06-30 22:00:30 UTC]   Extracted Solutions: 120 records
[2026-06-30 22:00:30 UTC]   Extracted Products: 4 records
[2026-06-30 22:00:30 UTC]   Extracted Accounts: 2237 records
[2026-06-30 22:00:30 UTC]   Extracted Forms: 24 records
[2026-06-30 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-06-30 22:00:30 UTC]   Transformed PH: applicants=688 graduates=520
[2026-06-30 22:00:30 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-06-30 22:00:30 UTC]   Transformed KR: applicants=200 graduates=166
[2026-06-30 22:00:30 UTC]   Transformed ID: applicants=1684 graduates=713
[2026-06-30 22:00:30 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-06-30 22:00:30 UTC]   dashboard_data.json written (1961.0 KB)
[2026-06-30 22:00:30 UTC]   dashboard_data.json synced to portal/data/
[2026-06-30 22:00:30 UTC] Pipeline complete in 28s
[2026-07-01 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-01 22:00:29 UTC]   Extracted Deals: 4107 records
[2026-07-01 22:00:29 UTC]   Extracted Solutions: 120 records
[2026-07-01 22:00:29 UTC]   Extracted Products: 4 records
[2026-07-01 22:00:29 UTC]   Extracted Accounts: 2247 records
[2026-07-01 22:00:29 UTC]   Extracted Forms: 24 records
[2026-07-01 22:00:29 UTC]   Extracted Training_Plans: 167 records
[2026-07-01 22:00:29 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-01 22:00:29 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-01 22:00:29 UTC]   Transformed KR: applicants=200 graduates=166
[2026-07-01 22:00:29 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-01 22:00:29 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-01 22:00:29 UTC]   dashboard_data.json written (1945.3 KB)
[2026-07-01 22:00:29 UTC]   dashboard_data.json synced to portal/data/
[2026-07-01 22:00:29 UTC] Pipeline complete in 28s
[2026-07-02 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-02 22:00:31 UTC]   Extracted Deals: 4107 records
[2026-07-02 22:00:31 UTC]   Extracted Solutions: 120 records
[2026-07-02 22:00:31 UTC]   Extracted Products: 4 records
[2026-07-02 22:00:31 UTC]   Extracted Accounts: 2247 records
[2026-07-02 22:00:31 UTC]   Extracted Forms: 24 records
[2026-07-02 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-07-02 22:00:31 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-02 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-02 22:00:31 UTC]   Transformed KR: applicants=200 graduates=166
[2026-07-02 22:00:31 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-02 22:00:31 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-02 22:00:31 UTC]   dashboard_data.json written (1945.3 KB)
[2026-07-02 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-07-02 22:00:31 UTC] Pipeline complete in 29s
[2026-07-03 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-03 22:00:31 UTC]   Extracted Deals: 4107 records
[2026-07-03 22:00:31 UTC]   Extracted Solutions: 120 records
[2026-07-03 22:00:31 UTC]   Extracted Products: 4 records
[2026-07-03 22:00:31 UTC]   Extracted Accounts: 2247 records
[2026-07-03 22:00:31 UTC]   Extracted Forms: 24 records
[2026-07-03 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-07-03 22:00:31 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-03 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-03 22:00:31 UTC]   Transformed KR: applicants=200 graduates=166
[2026-07-03 22:00:31 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-03 22:00:31 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-03 22:00:31 UTC]   dashboard_data.json written (1945.3 KB)
[2026-07-03 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-07-03 22:00:31 UTC] Pipeline complete in 30s
[2026-07-04 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-04 22:00:31 UTC]   Extracted Deals: 4107 records
[2026-07-04 22:00:31 UTC]   Extracted Solutions: 120 records
[2026-07-04 22:00:31 UTC]   Extracted Products: 4 records
[2026-07-04 22:00:31 UTC]   Extracted Accounts: 2247 records
[2026-07-04 22:00:31 UTC]   Extracted Forms: 24 records
[2026-07-04 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-07-04 22:00:31 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-04 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-04 22:00:31 UTC]   Transformed KR: applicants=200 graduates=166
[2026-07-04 22:00:31 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-04 22:00:31 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-04 22:00:31 UTC]   dashboard_data.json written (1945.3 KB)
[2026-07-04 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-07-04 22:00:31 UTC] Pipeline complete in 29s
[2026-07-05 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-05 22:00:30 UTC]   Extracted Deals: 4107 records
[2026-07-05 22:00:30 UTC]   Extracted Solutions: 120 records
[2026-07-05 22:00:30 UTC]   Extracted Products: 4 records
[2026-07-05 22:00:30 UTC]   Extracted Accounts: 2247 records
[2026-07-05 22:00:30 UTC]   Extracted Forms: 24 records
[2026-07-05 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-07-05 22:00:31 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-05 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-05 22:00:31 UTC]   Transformed KR: applicants=200 graduates=166
[2026-07-05 22:00:31 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-05 22:00:31 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-05 22:00:31 UTC]   dashboard_data.json written (1945.3 KB)
[2026-07-05 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-07-05 22:00:31 UTC] Pipeline complete in 29s
[2026-07-06 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-06 22:00:31 UTC]   Extracted Deals: 4107 records
[2026-07-06 22:00:31 UTC]   Extracted Solutions: 121 records
[2026-07-06 22:00:31 UTC]   Extracted Products: 4 records
[2026-07-06 22:00:31 UTC]   Extracted Accounts: 2247 records
[2026-07-06 22:00:31 UTC]   Extracted Forms: 24 records
[2026-07-06 22:00:31 UTC]   Extracted Training_Plans: 167 records
[2026-07-06 22:00:31 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-06 22:00:31 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-06 22:00:31 UTC]   Transformed KR: applicants=200 graduates=166
[2026-07-06 22:00:31 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-06 22:00:31 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-06 22:00:31 UTC]   dashboard_data.json written (1946.3 KB)
[2026-07-06 22:00:31 UTC]   dashboard_data.json synced to portal/data/
[2026-07-06 22:00:31 UTC] Pipeline complete in 29s
[2026-07-07 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-07 22:00:27 UTC]   Extracted Deals: 4107 records
[2026-07-07 22:00:27 UTC]   Extracted Solutions: 121 records
[2026-07-07 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-07 22:00:27 UTC]   Extracted Accounts: 2249 records
[2026-07-07 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-07 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-07 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-07 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-07 22:00:27 UTC]   Transformed KR: applicants=200 graduates=165
[2026-07-07 22:00:27 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-07 22:00:27 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-07 22:00:27 UTC]   dashboard_data.json written (1945.7 KB)
[2026-07-07 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-07-07 22:00:27 UTC] Pipeline complete in 26s
[2026-07-08 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-08 22:00:27 UTC]   Extracted Deals: 4106 records
[2026-07-08 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-08 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-08 22:00:27 UTC]   Extracted Accounts: 2250 records
[2026-07-08 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-08 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-08 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-08 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-08 22:00:28 UTC]   Transformed KR: applicants=200 graduates=165
[2026-07-08 22:00:28 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-08 22:00:28 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-08 22:00:28 UTC]   dashboard_data.json written (1946.6 KB)
[2026-07-08 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-07-08 22:00:28 UTC] Pipeline complete in 26s
[2026-07-09 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-09 22:00:27 UTC]   Extracted Deals: 4106 records
[2026-07-09 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-09 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-09 22:00:27 UTC]   Extracted Accounts: 2250 records
[2026-07-09 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-09 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-09 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-09 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-09 22:00:27 UTC]   Transformed KR: applicants=200 graduates=166
[2026-07-09 22:00:27 UTC]   Transformed ID: applicants=1670 graduates=699
[2026-07-09 22:00:27 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-09 22:00:27 UTC]   dashboard_data.json written (1949.0 KB)
[2026-07-09 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-07-09 22:00:27 UTC] Pipeline complete in 25s
[2026-07-10 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-10 22:00:27 UTC]   Extracted Deals: 4109 records
[2026-07-10 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-10 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-10 22:00:27 UTC]   Extracted Accounts: 2252 records
[2026-07-10 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-10 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-10 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-10 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-10 22:00:27 UTC]   Transformed KR: applicants=200 graduates=173
[2026-07-10 22:00:27 UTC]   Transformed ID: applicants=1673 graduates=699
[2026-07-10 22:00:27 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-10 22:00:27 UTC]   dashboard_data.json written (1967.6 KB)
[2026-07-10 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-07-10 22:00:27 UTC] Pipeline complete in 25s
[2026-07-12 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-12 22:00:27 UTC]   Extracted Deals: 4111 records
[2026-07-12 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-12 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-12 22:00:27 UTC]   Extracted Accounts: 2253 records
[2026-07-12 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-12 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-12 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-12 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-12 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-12 22:00:27 UTC]   Transformed ID: applicants=1675 graduates=698
[2026-07-12 22:00:27 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-12 22:00:27 UTC]   dashboard_data.json written (1972.5 KB)
[2026-07-12 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-07-12 22:00:27 UTC] Pipeline complete in 25s
[2026-07-13 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-13 22:00:28 UTC]   Extracted Deals: 4113 records
[2026-07-13 22:00:28 UTC]   Extracted Solutions: 122 records
[2026-07-13 22:00:28 UTC]   Extracted Products: 4 records
[2026-07-13 22:00:28 UTC]   Extracted Accounts: 2255 records
[2026-07-13 22:00:28 UTC]   Extracted Forms: 24 records
[2026-07-13 22:00:28 UTC]   Extracted Training_Plans: 167 records
[2026-07-13 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-13 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-13 22:00:28 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-13 22:00:28 UTC]   Transformed ID: applicants=1677 graduates=698
[2026-07-13 22:00:28 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-13 22:00:28 UTC]   dashboard_data.json written (1973.4 KB)
[2026-07-13 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-07-13 22:00:28 UTC] Pipeline complete in 26s
[2026-07-14 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-14 22:00:27 UTC]   Extracted Deals: 4117 records
[2026-07-14 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-14 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-14 22:00:27 UTC]   Extracted Accounts: 2259 records
[2026-07-14 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-14 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-14 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-14 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-14 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-14 22:00:27 UTC]   Transformed ID: applicants=1681 graduates=698
[2026-07-14 22:00:27 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-14 22:00:27 UTC]   dashboard_data.json written (1974.7 KB)
[2026-07-14 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-07-14 22:00:27 UTC] Pipeline complete in 25s
[2026-07-17 22:00:03 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-17 22:00:32 UTC]   Extracted Deals: 4122 records
[2026-07-17 22:00:32 UTC]   Extracted Solutions: 122 records
[2026-07-17 22:00:32 UTC]   Extracted Products: 4 records
[2026-07-17 22:00:32 UTC]   Extracted Accounts: 2261 records
[2026-07-17 22:00:32 UTC]   Extracted Forms: 24 records
[2026-07-17 22:00:32 UTC]   Extracted Training_Plans: 167 records
[2026-07-17 22:00:32 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-17 22:00:32 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-17 22:00:32 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-17 22:00:32 UTC]   Transformed ID: applicants=1686 graduates=698
[2026-07-17 22:00:32 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-17 22:00:32 UTC]   dashboard_data.json written (1975.4 KB)
[2026-07-17 22:00:32 UTC]   dashboard_data.json synced to portal/data/
[2026-07-17 22:00:32 UTC] Pipeline complete in 28s
[2026-07-18 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-18 22:00:28 UTC]   Extracted Deals: 4124 records
[2026-07-18 22:00:28 UTC]   Extracted Solutions: 122 records
[2026-07-18 22:00:28 UTC]   Extracted Products: 4 records
[2026-07-18 22:00:28 UTC]   Extracted Accounts: 2261 records
[2026-07-18 22:00:28 UTC]   Extracted Forms: 24 records
[2026-07-18 22:00:28 UTC]   Extracted Training_Plans: 167 records
[2026-07-18 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-18 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-18 22:00:28 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-18 22:00:28 UTC]   Transformed ID: applicants=1688 graduates=711
[2026-07-18 22:00:28 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-18 22:00:28 UTC]   dashboard_data.json written (1986.8 KB)
[2026-07-18 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-07-18 22:00:28 UTC] Pipeline complete in 25s
[2026-07-19 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-19 22:00:30 UTC]   Extracted Deals: 4124 records
[2026-07-19 22:00:30 UTC]   Extracted Solutions: 122 records
[2026-07-19 22:00:30 UTC]   Extracted Products: 4 records
[2026-07-19 22:00:30 UTC]   Extracted Accounts: 2261 records
[2026-07-19 22:00:30 UTC]   Extracted Forms: 24 records
[2026-07-19 22:00:30 UTC]   Extracted Training_Plans: 167 records
[2026-07-19 22:00:30 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-19 22:00:30 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-19 22:00:30 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-19 22:00:30 UTC]   Transformed ID: applicants=1688 graduates=711
[2026-07-19 22:00:30 UTC]   Transformed backbone: applicants=373 graduates=214
[2026-07-19 22:00:30 UTC]   dashboard_data.json written (1986.8 KB)
[2026-07-19 22:00:30 UTC]   dashboard_data.json synced to portal/data/
[2026-07-19 22:00:30 UTC] Pipeline complete in 28s
[2026-07-20 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-20 22:00:28 UTC]   Extracted Deals: 4147 records
[2026-07-20 22:00:28 UTC]   Extracted Solutions: 122 records
[2026-07-20 22:00:28 UTC]   Extracted Products: 4 records
[2026-07-20 22:00:28 UTC]   Extracted Accounts: 2283 records
[2026-07-20 22:00:28 UTC]   Extracted Forms: 24 records
[2026-07-20 22:00:28 UTC]   Extracted Training_Plans: 167 records
[2026-07-20 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-20 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-20 22:00:28 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-20 22:00:28 UTC]   Transformed ID: applicants=1711 graduates=711
[2026-07-20 22:00:28 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-20 22:00:28 UTC]   dashboard_data.json written (1994.8 KB)
[2026-07-20 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-07-20 22:00:28 UTC] Pipeline complete in 26s
[2026-07-21 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-21 22:00:27 UTC]   Extracted Deals: 4151 records
[2026-07-21 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-21 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-21 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-07-21 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-21 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-21 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-21 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-21 22:00:28 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-21 22:00:28 UTC]   Transformed ID: applicants=1715 graduates=711
[2026-07-21 22:00:28 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-21 22:00:28 UTC]   dashboard_data.json written (1996.2 KB)
[2026-07-21 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-07-21 22:00:28 UTC] Pipeline complete in 25s
[2026-07-22 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-22 22:00:27 UTC]   Extracted Deals: 4151 records
[2026-07-22 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-22 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-22 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-07-22 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-22 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-22 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-22 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-22 22:00:28 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-22 22:00:28 UTC]   Transformed ID: applicants=1715 graduates=711
[2026-07-22 22:00:28 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-22 22:00:28 UTC]   dashboard_data.json written (1996.2 KB)
[2026-07-22 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-07-22 22:00:28 UTC] Pipeline complete in 25s
[2026-07-23 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-23 22:00:33 UTC]   Extracted Deals: 4151 records
[2026-07-23 22:00:33 UTC]   Extracted Solutions: 122 records
[2026-07-23 22:00:33 UTC]   Extracted Products: 4 records
[2026-07-23 22:00:33 UTC]   Extracted Accounts: 2286 records
[2026-07-23 22:00:33 UTC]   Extracted Forms: 24 records
[2026-07-23 22:00:33 UTC]   Extracted Training_Plans: 167 records
[2026-07-23 22:00:33 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-23 22:00:33 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-23 22:00:33 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-23 22:00:33 UTC]   Transformed ID: applicants=1715 graduates=711
[2026-07-23 22:00:33 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-23 22:00:33 UTC]   dashboard_data.json written (1996.2 KB)
[2026-07-23 22:00:33 UTC]   dashboard_data.json synced to portal/data/
[2026-07-23 22:00:33 UTC] Pipeline complete in 31s
[2026-07-26 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-26 22:00:26 UTC]   Extracted Deals: 4153 records
[2026-07-26 22:00:26 UTC]   Extracted Solutions: 122 records
[2026-07-26 22:00:26 UTC]   Extracted Products: 4 records
[2026-07-26 22:00:26 UTC]   Extracted Accounts: 2286 records
[2026-07-26 22:00:26 UTC]   Extracted Forms: 24 records
[2026-07-26 22:00:26 UTC]   Extracted Training_Plans: 167 records
[2026-07-26 22:00:26 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-26 22:00:26 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-26 22:00:26 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-26 22:00:26 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-07-26 22:00:26 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-26 22:00:26 UTC]   dashboard_data.json written (2023.6 KB)
[2026-07-26 22:00:26 UTC]   dashboard_data.json synced to portal/data/
[2026-07-26 22:00:26 UTC] Pipeline complete in 25s
[2026-07-27 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-28 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-28 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-07-28 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-28 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-28 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-07-28 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-28 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-28 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-28 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-28 22:00:28 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-28 22:00:28 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-07-28 22:00:28 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-28 22:00:28 UTC]   dashboard_data.json written (2023.6 KB)
[2026-07-28 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-07-28 22:00:28 UTC] Pipeline complete in 26s
[2026-07-29 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-29 22:00:22 UTC]   [FAIL] Extract failed: HTTPSConnectionPool(host='accounts.zoho.in', port=443): Max retries exceeded with url: /oauth/v2/token?refresh_token=1000.c32dfe71dcaaf591e6b6906053d6c554.e02ee4e0376977177821164392d5ae9d&client_id=1000.W4UPK12SWF551HS4XKSVH83FF76MRK&client_secret=d1e3416bae330241da73c726c2ed67cbb4bfad3c6c&grant_type=refresh_token (Caused by ConnectTimeoutError(<HTTPSConnection(host='accounts.zoho.in', port=443) at 0x1da6ba65940>, 'Connection to accounts.zoho.in timed out. (connect timeout=None)'))
[2026-07-30 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-30 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-07-30 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-07-30 22:00:27 UTC]   Extracted Products: 4 records
[2026-07-30 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-07-30 22:00:27 UTC]   Extracted Forms: 24 records
[2026-07-30 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-07-30 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-30 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-30 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-30 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-07-30 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-30 22:00:27 UTC]   dashboard_data.json written (2023.6 KB)
[2026-07-30 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-07-30 22:00:27 UTC] Pipeline complete in 25s
[2026-07-31 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-07-31 22:00:26 UTC]   Extracted Deals: 4153 records
[2026-07-31 22:00:26 UTC]   Extracted Solutions: 122 records
[2026-07-31 22:00:26 UTC]   Extracted Products: 4 records
[2026-07-31 22:00:26 UTC]   Extracted Accounts: 2286 records
[2026-07-31 22:00:26 UTC]   Extracted Forms: 24 records
[2026-07-31 22:00:26 UTC]   Extracted Training_Plans: 167 records
[2026-07-31 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-07-31 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-07-31 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-07-31 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-07-31 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-07-31 22:00:27 UTC]   dashboard_data.json written (2023.6 KB)
[2026-07-31 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-07-31 22:00:27 UTC] Pipeline complete in 25s
[2026-08-01 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-01 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-08-01 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-08-01 22:00:27 UTC]   Extracted Products: 4 records
[2026-08-01 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-08-01 22:00:27 UTC]   Extracted Forms: 24 records
[2026-08-01 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-08-01 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-01 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-01 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-01 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-01 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-01 22:00:27 UTC]   dashboard_data.json written (2023.6 KB)
[2026-08-01 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-01 22:00:27 UTC] Pipeline complete in 25s
[2026-08-02 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-02 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-08-02 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-08-02 22:00:27 UTC]   Extracted Products: 4 records
[2026-08-02 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-08-02 22:00:27 UTC]   Extracted Forms: 24 records
[2026-08-02 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-08-02 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-02 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-02 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-02 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-02 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-02 22:00:27 UTC]   dashboard_data.json written (2023.6 KB)
[2026-08-02 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-02 22:00:27 UTC] Pipeline complete in 25s
[2026-08-03 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-03 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-08-03 22:00:27 UTC]   Extracted Solutions: 122 records
[2026-08-03 22:00:27 UTC]   Extracted Products: 4 records
[2026-08-03 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-08-03 22:00:27 UTC]   Extracted Forms: 24 records
[2026-08-03 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-08-03 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-03 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-03 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-03 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-03 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-03 22:00:27 UTC]   dashboard_data.json written (2023.6 KB)
[2026-08-03 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-03 22:00:27 UTC] Pipeline complete in 25s
[2026-08-04 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-04 22:00:22 UTC]   [FAIL] Extract failed: HTTPSConnectionPool(host='accounts.zoho.in', port=443): Max retries exceeded with url: /oauth/v2/token?refresh_token=1000.c32dfe71dcaaf591e6b6906053d6c554.e02ee4e0376977177821164392d5ae9d&client_id=1000.W4UPK12SWF551HS4XKSVH83FF76MRK&client_secret=d1e3416bae330241da73c726c2ed67cbb4bfad3c6c&grant_type=refresh_token (Caused by ConnectTimeoutError(<HTTPSConnection(host='accounts.zoho.in', port=443) at 0x1445ea75940>, 'Connection to accounts.zoho.in timed out. (connect timeout=None)'))
[2026-08-05 22:00:01 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-05 22:00:26 UTC]   Extracted Deals: 4153 records
[2026-08-05 22:00:26 UTC]   Extracted Solutions: 124 records
[2026-08-05 22:00:26 UTC]   Extracted Products: 4 records
[2026-08-05 22:00:26 UTC]   Extracted Accounts: 2286 records
[2026-08-05 22:00:26 UTC]   Extracted Forms: 24 records
[2026-08-05 22:00:26 UTC]   Extracted Training_Plans: 167 records
[2026-08-05 22:00:26 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-05 22:00:26 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-05 22:00:26 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-05 22:00:26 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-05 22:00:26 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-05 22:00:26 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-05 22:00:26 UTC]   dashboard_data.json synced to portal/data/
[2026-08-05 22:00:26 UTC] Pipeline complete in 25s
[2026-08-06 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-06 22:00:28 UTC]   Extracted Deals: 4153 records
[2026-08-06 22:00:28 UTC]   Extracted Solutions: 124 records
[2026-08-06 22:00:28 UTC]   Extracted Products: 4 records
[2026-08-06 22:00:28 UTC]   Extracted Accounts: 2286 records
[2026-08-06 22:00:28 UTC]   Extracted Forms: 24 records
[2026-08-06 22:00:28 UTC]   Extracted Training_Plans: 167 records
[2026-08-06 22:00:28 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-06 22:00:28 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-06 22:00:28 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-06 22:00:28 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-06 22:00:28 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-06 22:00:28 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-06 22:00:28 UTC]   dashboard_data.json synced to portal/data/
[2026-08-06 22:00:28 UTC] Pipeline complete in 26s
[2026-08-07 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-07 22:00:28 UTC]   Extracted Deals: 4153 records
[2026-08-07 22:00:28 UTC]   Extracted Solutions: 124 records
[2026-08-07 22:00:28 UTC]   Extracted Products: 4 records
[2026-08-07 22:00:28 UTC]   Extracted Accounts: 2286 records
[2026-08-07 22:00:28 UTC]   Extracted Forms: 24 records
[2026-08-07 22:00:28 UTC]   Extracted Training_Plans: 167 records
[2026-08-07 22:00:29 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-07 22:00:29 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-07 22:00:29 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-07 22:00:29 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-07 22:00:29 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-07 22:00:29 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-07 22:00:29 UTC]   dashboard_data.json synced to portal/data/
[2026-08-07 22:00:29 UTC] Pipeline complete in 27s
[2026-08-08 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-08 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-08-08 22:00:27 UTC]   Extracted Solutions: 124 records
[2026-08-08 22:00:27 UTC]   Extracted Products: 4 records
[2026-08-08 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-08-08 22:00:27 UTC]   Extracted Forms: 24 records
[2026-08-08 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-08-08 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-08 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-08 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-08 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-08 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-08 22:00:27 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-08 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-08 22:00:27 UTC] Pipeline complete in 24s
[2026-08-09 21:30:00 UTC] Repo sync: committed Session 2 feedback form/report (mirrors Session 1), daily-deploy GitHub Actions workflow, Catalyst migration scaffolding (catalyst.json, .catalystrc, portal/.catalyst/), docs (user guide, presentation, screenshots), doc/screenshot generation tooling. Stopped tracking node_modules/ (added to .gitignore) and portal/workers/.wrangler cache (contained account config, matches existing .wrangler/ ignore rule). Merged origin/main, which had diverged with two commits from another device: a 2026-07-10 corrupted-clone recovery commit (GELP forms/tooling, reviewed — no CRM write calls) and a 2026-08-04 Bitwarden Secrets Manager sync commit (tools/pull_secrets_from_bitwarden.ps1, push_secrets_to_bitwarden.ps1 — no hardcoded secrets). Resolved conflicts in deploy_portal.log and progress.md by keeping local (superset) versions. Pushed to origin/main (f79cc3d).
[2026-08-09 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-09 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-08-09 22:00:27 UTC]   Extracted Solutions: 124 records
[2026-08-09 22:00:27 UTC]   Extracted Products: 4 records
[2026-08-09 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-08-09 22:00:27 UTC]   Extracted Forms: 24 records
[2026-08-09 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-08-09 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-09 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-09 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-09 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-09 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-09 22:00:27 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-09 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-09 22:00:27 UTC] Pipeline complete in 25s
[2026-08-10 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-10 22:00:32 UTC]   Extracted Deals: 4153 records
[2026-08-10 22:00:32 UTC]   Extracted Solutions: 124 records
[2026-08-10 22:00:32 UTC]   Extracted Products: 4 records
[2026-08-10 22:00:32 UTC]   Extracted Accounts: 2286 records
[2026-08-10 22:00:32 UTC]   Extracted Forms: 24 records
[2026-08-10 22:00:32 UTC]   Extracted Training_Plans: 167 records
[2026-08-10 22:00:32 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-10 22:00:32 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-10 22:00:32 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-10 22:00:32 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-10 22:00:32 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-10 22:00:33 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-10 22:00:33 UTC]   dashboard_data.json synced to portal/data/
[2026-08-10 22:00:33 UTC] Pipeline complete in 30s
[2026-08-11 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-11 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-08-11 22:00:27 UTC]   Extracted Solutions: 124 records
[2026-08-11 22:00:27 UTC]   Extracted Products: 4 records
[2026-08-11 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-08-11 22:00:27 UTC]   Extracted Forms: 24 records
[2026-08-11 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-08-11 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-11 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-11 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-11 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-11 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-11 22:00:27 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-11 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-11 22:00:27 UTC] Pipeline complete in 25s
[2026-08-12 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-12 22:00:26 UTC]   Extracted Deals: 4153 records
[2026-08-12 22:00:26 UTC]   Extracted Solutions: 124 records
[2026-08-12 22:00:26 UTC]   Extracted Products: 4 records
[2026-08-12 22:00:26 UTC]   Extracted Accounts: 2286 records
[2026-08-12 22:00:26 UTC]   Extracted Forms: 24 records
[2026-08-12 22:00:26 UTC]   Extracted Training_Plans: 167 records
[2026-08-12 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-12 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-12 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-12 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-12 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-12 22:00:27 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-12 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-12 22:00:27 UTC] Pipeline complete in 25s
[2026-08-13 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-13 22:00:27 UTC]   Extracted Deals: 4153 records
[2026-08-13 22:00:27 UTC]   Extracted Solutions: 124 records
[2026-08-13 22:00:27 UTC]   Extracted Products: 4 records
[2026-08-13 22:00:27 UTC]   Extracted Accounts: 2286 records
[2026-08-13 22:00:27 UTC]   Extracted Forms: 24 records
[2026-08-13 22:00:27 UTC]   Extracted Training_Plans: 167 records
[2026-08-13 22:00:27 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-13 22:00:27 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-13 22:00:27 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-13 22:00:27 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-13 22:00:27 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-13 22:00:27 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-13 22:00:27 UTC]   dashboard_data.json synced to portal/data/
[2026-08-13 22:00:27 UTC] Pipeline complete in 25s
[2026-08-14 22:00:02 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-08-14 22:00:28 UTC]   Extracted Deals: 4153 records
[2026-08-14 22:00:28 UTC]   Extracted Solutions: 124 records
[2026-08-14 22:00:28 UTC]   Extracted Products: 4 records
[2026-08-14 22:00:28 UTC]   Extracted Accounts: 2286 records
[2026-08-14 22:00:28 UTC]   Extracted Forms: 24 records
[2026-08-14 22:00:28 UTC]   Extracted Training_Plans: 167 records
[2026-08-14 22:00:29 UTC]   Transformed PH: applicants=748 graduates=586
[2026-08-14 22:00:29 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-08-14 22:00:29 UTC]   Transformed KR: applicants=200 graduates=176
[2026-08-14 22:00:29 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-08-14 22:00:29 UTC]   Transformed backbone: applicants=372 graduates=213
[2026-08-14 22:00:29 UTC]   dashboard_data.json written (2025.7 KB)
[2026-08-14 22:00:29 UTC]   dashboard_data.json synced to portal/data/
[2026-08-14 22:00:29 UTC] Pipeline complete in 26s
[2026-09-02 05:59:22 UTC] Pipeline started. portal=ALL skip_extract=False
[2026-09-02 06:00:08 UTC]   Extracted Deals: 4227 records
[2026-09-02 06:00:08 UTC]   Extracted Solutions: 125 records
[2026-09-02 06:00:08 UTC]   Extracted Products: 4 records
[2026-09-02 06:00:08 UTC]   Extracted Accounts: 2349 records
[2026-09-02 06:00:08 UTC]   Extracted Forms: 24 records
[2026-09-02 06:00:08 UTC]   Extracted Training_Plans: 167 records
[2026-09-02 06:00:08 UTC]   Transformed PH: applicants=748 graduates=586
[2026-09-02 06:00:08 UTC]   Transformed PK: applicants=1097 graduates=281
[2026-09-02 06:00:08 UTC]   Transformed KR: applicants=200 graduates=176
[2026-09-02 06:00:08 UTC]   Transformed ID: applicants=1717 graduates=737
[2026-09-02 06:00:08 UTC]   Transformed backbone: applicants=446 graduates=213
[2026-09-02 06:00:08 UTC]   dashboard_data.json written (2008.4 KB)
[2026-09-02 06:00:08 UTC]   dashboard_data.json synced to portal/data/
[2026-09-02 06:00:08 UTC] Pipeline complete in 45s
