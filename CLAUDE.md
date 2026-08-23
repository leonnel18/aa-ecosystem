# Project Constitution — aa-ecosystem

| Field | Value |
|-------|-------|
| **Mental Folder** | [AktivAsia] |
| **Owner** | Gino |
| **Status** | Phase 2 — Link (field names confirmed, fixing record fetch scope) |
| **Started** | 2026-03-18 |
| **Project Path** | `g:\My Drive\10 Projects\60 Claude\aa-ecosystem\` |

---

## North Star

Build 5 portals (PK, PH, KR, ID, Backbone) each surfacing 4 standardized training reports. All data flows READ-ONLY from Zoho CRM. Portal is a static HTML site styled to match the AktivAsia brand (aktivasia.pages.dev), hosted on Cloudflare Pages.

---

## Behavioral Rules (Invariants)

1. **READ-ONLY on Zoho CRM.** No `POST`, `PUT`, `PATCH`, or `DELETE` to CRM endpoints. Ever. Ask Gino's permission before any write operation. This is enforced by a banner comment in `tools/crm_extract.py`.
2. **Data-First.** Field names in `transform.py` must use confirmed Zoho API names (discovered in Phase 2). No guessing.
3. **Token caching.** Check `data/token_crm.json` for `expires_at` before requesting a new token.
4. **`.tmp/` is ephemeral.** All intermediate files go in `.tmp/`. Never commit `.tmp/`.
5. **`dashboard_data.json` is the single source of truth** consumed by the portal. Always regenerate fully on each pipeline run.
6. **Update `progress.md`** with timestamps after every meaningful action.
7. **Update `claude.md` only when** a schema changes, a rule is added, or architecture is modified.

---

## CRM Module Map

| Zoho API Module | Human Name | Row = one per |
|-----------------|-----------|---------------|
| `Deals` | Applications | Applicant enrolled in a Training |
| `Accounts` | Organizations | Organization |
| `Solutions` | Trainings | Training event |
| `Products` | Training Types | Training category/type (4 types) |
| `Forms` | Practice Sessions | Practice session event |
| `Skill_Session_Participant` | Session Participants | Participant in a Practice Session |

**Relationships:**
- Training (`Solutions`) → Training Type (`Products`)
- Application (`Deals`) → Training (`Solutions`) → Organization (`Accounts`)
- Session Participant (`Skill_Session_Participant`) → Practice Session (`Forms`)

---

## Data Schema

> ✅ All field API names confirmed via `verify_crm.py` on 2026-03-18. Saved to `.tmp/deals_fields.json` and `.tmp/solutions_fields.json`.

### Country Filter Logic (CRITICAL)

Country is **NOT** a direct field on Deals. It is determined by the linked Training:

```
Deal.Training_Applied (lookup) → Solutions.Organised_By
```

**`Organised_By` values → Portal mapping:**
| Organised_By value | Portal |
|--------------------|--------|
| `Philippines`      | PH     |
| `Pakistan`         | PK     |
| `Korea`            | KR     |
| `Indonesia`        | ID     |
| `Regional`         | backbone |

**Extraction strategy:** Fetch all Solutions first, build a dict `{solution_id: organised_by}`. When processing Deals, look up `Deal.Training_Applied.id` to resolve the country.

---

### Application (Deals) — Confirmed Field Map

**Stage Pipeline (updated 2026-05-04):**
```
Still in Applied Stage → Selected → Rejected → Rejected or Not Attended → Attended Training → Graduated or Post Evaluation Completed
```
> Note: "Rejected" (new stage, 2026-05-04) = applicant rejected during selection phase (pre-training).
> Note: "Rejected or Not Attended" = participant was selected but did not attend.
> Note: CRM typo "Attended Traning" was corrected to "Attended Training" on 2026-05-04.

**Stage logic for reports:**
- `total_ongoing` = `Stage` == `"Selected"`
- `attended_training` = `Stage` in [`"Attended Training"`, `"Graduated or Post Evaluation Completed"`]
- `graduated` = `Stage` == `"Graduated or Post Evaluation Completed"`
- `6M eval completed` = graduated AND any 6M impact field is not null

**Core fields (confirmed API names):**
```
Training_Applied        → Solutions (lookup)   "Training Applied"
Account_Name            → Accounts (lookup)    "Organisation Name"
Stage                   picklist               "Stage"
Graduate_Date           date                   "Graduate Date"
```

**Demographics (confirmed):**
```
Gender                  picklist    "Gender"
Date_of_Birth           date        "DOB"          → calculate age group in transform.py
City_Province           text        "City/Province" → used as region within country
```

**Likert Scale — Strategy & Tactics (confirmed):**
```
A_Pre_Training_Strategy_Buildings    picklist    "B) Strategy/Tactics (Pre)"
A_Post_Training_Strategy_Building    picklist    "B) Strategy/Tactics (Post)"
B_Strategy_Tactics_6                 picklist    "B) Strategy/Tactics (6)"
```

**Likert Scale — Communication Strategy (confirmed):**
```
B_Pre_Training_Building_Communication    picklist    "C) Communication Strategy (Pre)"
B_Post_Training_Building_Communication   picklist    "C) Communication Strategy (Post)"
C_Communication_Strategy_6               picklist    "C) Communication Strategy (6)"
```

**Likert Scale — Facilitating Workshops (confirmed):**
```
C_Pre_Training_Confident_facilitator     picklist    "D) Facilitating Workshops/Meetings (Pre)"
C_Post_Training_Confident_facilitator    picklist    "D) Facilitating Workshops/Meetings (Post)"
D_Facilitating_Workshops_Meetings_6      picklist    "D) Facilitating Workshops/Meetings (6)"
```

**Likert Scale — Building Connections (confirmed):**
```
D_Pre_Training_Confident_connector       picklist    "E) Building Connections (Pre)"
D_Post_Training_Confident_connector      picklist    "E) Building Connections (Post)"
E_Building_Connections_6                 picklist    "E) Building Connections (6)"
```

> **Likert picklist → int:** Zoho stores these as text (e.g. "4 - Agree"). `transform.py` must extract the leading integer before averaging.

**Post Survey — qualitative (confirmed):**
```
Best_aspect_of_the_workshop              textarea    "What went well?"
Sum_up_what_you_learned_at_our_training  textarea    "Sum up learning"
Action_Plans_in_the_next_3_months        textarea    "Actions plan or apply the learning"
Improvement_Suggestion_for_next_time     textarea    "Improvement Suggestion"
Suggestions_in_the_next_workshop         textarea    "Suggestions for next workshop"
Willingness_to_provide_a_testimonial     textarea    "Testimonial"
```

**Impact Evaluation Survey — 6M (confirmed, null if not completed):**
```
How_has_the_training_impacted_your_campaigning       textarea    "How has training influenced campaigning?"
Have_you_applied_the_training_to_run_more_effectiv   picklist    "Used the training to improve campaigns?"
I_ve_got_a_new_or_better_job_in_campaigning          picklist    "I've got a new or better job"
I_ve_done_more_campaigning                           picklist    "I've done more campaigning"
I_ve_been_able_to_raise_more_funds_for_my_campaign   picklist    "I've been able to raise more funds"
I_ve_built_connections_to_support_my_campaign        picklist    "I've got more people supporting my campaign"
I_ve_got_more_people_supporting_my_campaign          picklist    "Built connections to support my campaign"
My_campaign_has_achieved_some_objectives_and_goals   picklist    "My campaign has achieved some objectives"
What_you_shared_the_content_or_topics                textarea    "What you shared (the content or topics)"
I_ve_stayed_connected_with_campaigners               picklist    "I've stayed connected with campaigners"
I_ve_trained_others_to_run_effective_campaigns       picklist    "I've trained others to run effective campaigns"
I_ve_shared_my_learnings_with_others                 picklist    "I've shared my learnings with others"
Are_you_interested_in_reconnecting_with_AktivAsia    picklist    "Are you interested in reconnecting?"
Know_someone_who_could_gain_from_our_training        picklist    "Know someone who could gain from training?"
What_s_alive_in_your_campaign_work_now               textarea    "What's alive in your campaign work now?"
Testimonial_for_us_on_how_the_training               textarea    "Testimonial"
Anything_else_you_d_like_to_share_or_ask             textarea    "Anything else you'd like to share?"
Need_support_from_AktivAsia                          textarea    "Need support from AktivAsia?"
Key_focus_for_our_national_local_trainings           textarea    "Key focus for national/local trainings?"
Shared_learnings_with_how_many_people                integer     "Shared learnings with how many people?"
```

---

### Training (Solutions) — Confirmed Field Map
```
Solution_Title          text        "Training Title"
Training_Type           lookup      "Training Type"      → Products
Organised_By            picklist    "Organised By"       → COUNTRY FILTER (Philippines/Pakistan/Korea/Indonesia/Regional)
Start_Date              date        "Start Date"
End_Date                date        "End Date"
Countries_Participated  text        "Countries Participated"
Target_Participants     integer     "Target Participants"
Participants_Until_2023 integer     "Participants (Until 2023)"
Training_Title_Plan     text        "Training Title Plan"
```

### Practice Session (Forms) — Partially Confirmed
> ✅ Confirmed live 2026-08-09 (for `monitor-job`'s new-records check — see Second Catalyst Function section below). Full field audit for portal reporting purposes still pending.
```
Name                             text        "Session Name"
Venue_Name                       text        "Venue Name"
Session_Start_Date               date        "Session Start Date"
Session_End_Date                 date        "Session End Date"
Duration_of_the_Session_in_Days  integer     "Duration (Days)"
Duration_of_the_Session_in_Hours integer     "Duration (Hours)"
Expected_number_of_participants  integer     "Expected Participants"
Full_Name_of_Trainer_1..5        text        "Trainer 1..5"
Associated_Traning_Plan          lookup      "Associated Training Plan"   → Training_Plans (note: CRM's own field name has a typo, "Traning")
Created_Time                     datetime    (system field)
```

### Session Participant (Skill_Session_Participant) — Partially Confirmed
> ✅ Confirmed live 2026-08-09 (for `monitor-job`'s new-records check). Full field audit for portal reporting purposes still pending.
```
Name                            text        "Name"
First_Name                      text        "First Name"
last_Name                       text        "Last Name"   (note: lowercase "l")
Preferred_Name                  text        "Preferred Name"
Contact_Name                    lookup      "Contact"           → Contacts
Org_Name                        lookup      "Organization"      → Accounts
Training_Applied                lookup      "Training Applied"  → Solutions
Skill_Practice_Session_Applied  lookup      "Practice Session"  → Forms
Created_Time                    datetime    (system field)
```

---

## Report Output Schema

### Report 1 — Overview Training Report
```json
{
  "report_1_overview": {
    "total_applicants": 420,
    "total_graduates": 380,
    "total_ongoing": 45,
    "application_funnel": {
      "total_applicants": 420,
      "attended_training": 350,
      "graduated": 310,
      "impact_evaluation_completed": 145
    },
    "yoy_trend": [
      { "year": 2023, "applicants": 180, "graduates": 155 }
    ]
  }
}
```

### Report 2 — Training Plan Report
```json
{
  "report_2_training_plan": {
    "trainings_by_type": [
      { "type": "Type A", "conducted": 3, "total_planned": 4 }
    ],
    "practice_sessions": {
      "total_sessions": 12,
      "sessions": [{ "name": "string", "date": "YYYY-MM-DD", "participant_count": 18 }]
    },
    "training_plans": [
      { "name": "string", "type": "string", "planned_date": "YYYY-MM-DD", "status": "Upcoming | Ongoing" }
    ],
    "actual_trainings": [
      { "name": "string", "type": "string", "date": "YYYY-MM-DD", "applicants": 42, "graduates": 38, "status": "Completed" }
    ]
  }
}
```

### Report 3 — Training Impact Qualitative
```json
{
  "report_3_impact_qualitative": {
    "likert_by_training": [
      {
        "training_name": "string",
        "likert": {
          "strategy_tactics":       { "pre": 3.2, "post": 4.1, "6m": 4.3 },
          "communication_strategy": { "pre": 3.0, "post": 3.9, "6m": 4.1 },
          "facilitating_workshop":  { "pre": 2.8, "post": 3.7, "6m": 3.9 },
          "building_connection":    { "pre": 3.1, "post": 4.0, "6m": 4.2 }
        }
      }
    ],
    "post_survey_feedback": [
      {
        "training_name": "string",
        "responses": [
          {
            "what_went_well": "string", "sum_up_learning": "string",
            "action_plan": "string", "improvement_suggestion": "string",
            "next_workshop_suggestion": "string", "testimonial": "string"
          }
        ]
      }
    ],
    "impact_evaluation_feedback": [
      {
        "training_name": "string",
        "responses": [
          {
            "training_influence": "string", "used_training": "string",
            "new_job": "string", "done_more_campaigning": "string",
            "raised_more_funds": "string", "more_supporters": "string",
            "built_connections": "string", "achieved_objectives": "string",
            "stayed_connected": "string", "trained_others": "string",
            "shared_learnings": "string", "reconnect_interest": "string",
            "know_someone": "string", "whats_alive": "string",
            "testimonial": "string", "anything_else": "string",
            "need_support": "string", "key_focus": "string",
            "shared_with_how_many": "string"
          }
        ]
      }
    ]
  }
}
```

### Report 4 — Training Impact Quantitative
```json
{
  "report_4_impact_quantitative": {
    "demographics": {
      "by_gender": { "Male": 230, "Female": 185, "Other": 5 },
      "by_age_group": { "18-24": 84, "25-34": 189, "35-44": 105, "45+": 42 },
      "by_region": { "Region A": 120, "Region B": 90 }
    }
  }
}
```

### Final Dashboard Data File (`data/dashboard_data.json`)
```json
{
  "generated_at": "YYYY-MM-DDTHH:MM:SS",
  "portals": {
    "PK": { "portal": "PK", "report_1_overview": {}, "report_2_training_plan": {}, "report_3_impact_qualitative": {}, "report_4_impact_quantitative": {} },
    "PH": {},
    "KR": {},
    "ID": {},
    "backbone": {
      "portal": "backbone",
      "aggregate": { "total_applicants": 0, "total_graduates": 0 },
      "per_country": {},
      "report_1_overview": {},
      "report_2_training_plan": {},
      "report_3_impact_qualitative": {},
      "report_4_impact_quantitative": {}
    }
  }
}
```

---

## Architecture Invariants

- `crm_extract.py` → only reads CRM, writes to `.tmp/{module}_raw.json`
- `transform.py` → stateless, reads `.tmp/`, writes to `.tmp/{portal}_report_payload.json`
- `data_writer.py` → reads `.tmp/{portal}_*.json`, writes `data/dashboard_data.json`
- `analytics_push.py` → optional audit push to Zoho Analytics (deferred)
- `orchestrator.py` → runs extract → transform → write → (push) in sequence

## Pagination Strategy

COQL (`POST /coql`) is blocked by scope. Use **REST GET pagination**:
```
GET /Deals?fields=...&per_page=200&page=1
GET /Deals?fields=...&per_page=200&page=2
...until info.more_records == false
```

---

## Second Catalyst Function — `functions/monitor-job/` (Daily CRM Monitor)

A second, independent Catalyst cron function, sibling to `pipeline-job`. Registered in `catalyst.json` → `functions.targets`. Runs daily at **7:00 AM Asia/Manila** (set manually in the Catalyst console, same as `pipeline-job`'s schedule — no schedule is stored in any repo file for either function). Failure in one function does not affect the other.

**Purpose:** read-only daily audit + email digest to Gino, covering 4 checks:
1. **New records** — diffs Deals, Solutions, Training_Plans, Contacts, Forms, Skill_Session_Participant, Funders against a per-module `Created_Time` watermark.
2. **CRM email activity** — `GET /Deals/{id}/Emails` (Zoho's native related list, confirmed present via `getRelatedLists`; no bulk endpoint exists). Scoped to Deals linked to Solutions with `Start_Date`/`End_Date` in the last 30 days only — not a full sweep — because a full sweep across thousands of Deals risks exceeding Catalyst's cron execution time limit, and filtering by Deal `Modified_Time` would silently miss events (logging an email doesn't necessarily bump the Deal's own `Modified_Time`). Confirmed live response shape: each email has `message_id` (dedup key), `time` (ISO 8601 with offset), `subject` — **not** `sent_time`.
3. **Graduate-date consistency** — scoped to `Stage == "Graduated or Post Evaluation Completed"` only (confirmed correct scope with Gino). **`Graduate_Date` is blank on ~80% of graduated Deals** (measured live via COQL during planning) — so this check does NOT use exact-equality-with-blank-as-mismatch (that would flag almost everything, forever). It reports two separate classifications — "missing `Graduate_Date`" and "differs from linked training's `End_Date` by more than 7 days" — using a `Modified_Time` watermark (see State persistence below) so only Deals changed since the last run are re-checked.
4. **6-month evaluation due list** — **report-only, no CRM write, no Tags API call** (confirmed with Gino — the literal ask was to "tag" people, but this keeps the job fully read-only). Flags Deals where `Graduate_Date + 6 months` falls in `(last_run_date, today]` — state-relative, not a fixed day-window, so a missed run of any length still catches everyone without double-reporting; no per-record state needed at all, since the date-range test alone prevents repeats.

**State persistence:** Catalyst **Data Store** (not File Store) — a single table `monitor_state` with one row and one column (`state_json`, holding the entire state as one JSON string). Must be created manually in the Catalyst console (Cloud Scale > Data Store) before first deploy — table name `monitor_state`, column `state_json` (text). Data Store was chosen over File Store because the File Store SDK (`zcatalyst_sdk.filestore`) has no "get file by name" or "list files" call — only `get_file_details(file_id)`, which needs an ID you don't already have — so a read-modify-write JSON blob isn't workable there. Verified directly against the `zcatalyst-sdk==1.4.0` package source (the wheel was downloaded and inspected, since the package isn't installable outside the Catalyst runtime).

**Critical gotcha discovered 2026-08-10 (real production run, not just code review):** the `state_json` column **silently truncates writes at ~10,000 characters** instead of rejecting them — it is not the unbounded CLOB its "Large Text" label implies. An initial design tracking full "already reported" ID lists per check blew past this on the very first real run, silently corrupting all stored state (every `load_state()` after that got invalid JSON and quietly reset to baseline, so nothing ever actually persisted). **Any new state added to this job must stay O(small-bounded) — a single watermark timestamp, a count, at most a handful of tie-break values — never a list that grows with the number of records ever seen.** `state_store.save_state()` now hard-asserts total size stays under 9,000 chars as a safety net against this regressing silently again. See `progress.md` 2026-08-10 for the full diagnosis, including two follow-on bugs found only via synthetic testing at realistic scale (exact-timestamp collisions from bulk edits, and a static/non-advancing dataset) — both fixed by storing each watermark as `(max_seen + a small buffer)` rather than the bare max value, which guarantees the effective comparison threshold advances every run by construction, independent of whether the underlying CRM data changes.

**Confirmed custom module API names (live, 2026-08-09), resolving prior "Fields TBC" notes:**
- `Funders` — addressed directly as `Funders` (not `CustomModule10`, despite that being its internal Catalyst label). Fields: `Name`, `Contact_Name` (lookup), `Funder_Organization_Name` (lookup), `Funder_Last_Name` (lookup), `Organisation_Name`, `Amount_Requested_USD`, `Amount_Funded_USD`, `Report_Due_Dates`, `Closing_Date`, `Grant_Period_End_Date`, `Created_Time`.
- `Forms` (= "Practice Sessions") — `Name`, `Venue_Name`, `Session_Start_Date`, `Session_End_Date`, `Duration_of_the_Session_in_Days`, `Duration_of_the_Session_in_Hours`, `Expected_number_of_participants`, `Full_Name_of_Trainer_1..5`, `Associated_Traning_Plan` (lookup — note the CRM's own typo, "Traning" not "Training"), `Created_Time`.
- `Skill_Session_Participant` (= "Session Participants") — `Name`, `First_Name`, `last_Name` (lowercase `l`), `Preferred_Name`, `Contact_Name` (lookup), `Org_Name` (lookup), `Training_Applied` (lookup), `Skill_Practice_Session_Applied` (lookup), `Created_Time`.
- `Contacts` — standard Zoho module, exists, not previously used by this pipeline.

`monitor-job` copies (does not import) `crm_auth.py` and `gmail_sender.py` from `pipeline-job`/`tools/`, matching the existing no-cross-import pattern between Catalyst functions. Its `crm_auth.py` caches the CRM access token **in-memory** for the process lifetime (not file-cached like `pipeline-job`'s), since item 2's per-Deal Emails calls make many more requests per run and a file-based cache that doesn't reliably persist across Catalyst's ephemeral filesystem risks refreshing the token on every request.

**Deploy gotcha (hit 2026-08-10, applies to any Python Catalyst function in this repo):** `requirements.txt` must pin `zcatalyst-sdk==1.3.0`, not `1.4.0`. `1.4.0` exists on PyPI but is not installable under the `python_3_9` stack's own pip — checking availability with a newer local Python's pip gives a false "it exists" read. A wrong pin here doesn't fail loudly with a clear message; it silently produces an empty dependency install, which the deploy zips up and Catalyst's server then rejects with the unhelpful `HTTP Error: 400, Invalid input value for Zip File`. If that error appears, re-run with `catalyst deploy --verbose` and check for a `pip install` failure in the output before assuming it's a zip/packaging bug.

**Timezone gotcha (hit 2026-08-10):** do not use `zoneinfo.ZoneInfo("Asia/Manila")` (or any IANA zone name) in a Catalyst Python function — stdlib `zoneinfo` needs an IANA tzdata database available via the OS or the `tzdata` PyPI package, and this is not guaranteed on every deploy target (confirmed missing on this function's Windows-hosted Python 3.9 runtime: `ModuleNotFoundError: No module named 'tzdata'`, crashing the function on import). Since Asia/Manila has no DST, use a fixed-offset `datetime.timezone(timedelta(hours=8))` instead — no external database dependency, can't have this failure mode.

---

## Third Catalyst Function — `functions/reminder-job/` (Training Lifecycle Reminders)

A third, independent Catalyst cron function, sibling to `pipeline-job` and `monitor-job`. Registered in `catalyst.json` → `functions.targets`. Runs daily (schedule set manually in the Catalyst console, same pattern as the other two functions — no schedule stored in any repo file). Replaces the retired `tools/reminder_engine.py` / `reminder_logic.py` / `email_templates.py` (fixed day-offset triggers, e.g. "15 days out") with 8 emails anchored to milestones relative to each Training's own `Start_Date`/`End_Date`, per `docs/AktivAsia Automation Email (2).docx`.

**The 8 emails — C1–C6 (country team) and P1/P2 (participant):**

| ID | Fires when | Cadence | Recipient |
|----|---|---|---|
| C1 | 1st of every month | Monthly | Country team, per country with ≥1 unconfirmed Training Plan for the current year |
| C2 | Training `Start_Date` is 8 or 7 weeks out | Once per Training | Country team |
| C3 | Training `Start_Date` is exactly 7 days out | Once per Training | Country team |
| C4 | `Start_Date` is 5–1 days out AND ≥1 Deal still `"Still in Applied Stage"` | Daily while pending remain | Country team |
| C5 | Day after Training `End_Date` | Once per Training | Country team |
| C6 | 7 days after Training `End_Date` | Once per Training | Country team |
| P1 | `today` in `[Graduate_Date + 6mo, Graduate_Date + 6mo + 7d]`, 6M not yet completed | Daily until deadline | Participant (`Deal.Email`), from `regional@aktivasia.org` |
| P2 | Past P1's deadline, still not completed, **≤ 56 days past** | Weekly (max 8) | Participant (`Deal.Email`) |

**P2 is bounded — `MAX_DAYS_PAST_DEADLINE = 56` (added 2026-08-21).** The docx's "weekly until they respond" is capped at 8 nudges, after which a Deal is left alone permanently. Found by the first live dry-run against production CRM: **81 real graduates were due for a P2 on day one, with deadlines 182–287 days past**, none of whom had ever received a P1 (the job had never run). Their first-ever contact would have been an overdue notice for a deadline they were never told about, repeating weekly forever. The cap drops that first-run cohort to 0 and bounds the cadence going forward. **Any future change to P1/P2 windows must be re-checked against this backlog effect** — a widened window silently re-recruits historical graduates. Note the same trap is waiting behind `tools/backfill_graduate_date.py`: filling in the ~72% blank `Graduate_Date` values (1,439 of 2,009 graduated Deals, measured 2026-08-21) back-dates those Deals into the past, and without this cap would have swept most of them into the same blast.

**Participant name rendering (fixed 2026-08-21).** `Deal.First_Name`/`Last_Name` are frequently null in live data — and because the KEY EXISTS, `deal.get("First_Name", "")` returns `None`, not `""`, so the default never fires and the f-string renders the literal string `"None"` ("Dear None," and a subject ending in ", None"). Some records also store "Last, First", leaving a trailing comma that doubled up in the subject line. `email_templates._participant_names()` now normalises both; P1/P2 drop the name from the subject entirely and greet "Dear friend," when no usable name exists. Use that helper for any new participant-facing copy rather than reading the fields directly.

**6-month-completed signal:** any of the 4 dedicated `_6` Likert fields (`B_Strategy_Tactics_6`, `C_Communication_Strategy_6`, `D_Facilitating_Workshops_Meetings_6`, `E_Building_Connections_6`) being non-null — the purpose-built markers, not the larger free-text Impact Evaluation Survey block. Matches this doc's existing `"6M eval completed" = graduated AND any 6M impact field is not null` rule.

**Graduate_Date dependency (backfill):** P1/P2 anchor to `Deal.Graduate_Date`, which is blank on ~80% of graduated Deals (see monitor-job section above). `tools/backfill_graduate_date.py` is a **one-time, manual, dry-run-by-default** script (run locally by Gino, `--apply` required to write) that sets `Graduate_Date = Training.End_Date` for graduated Deals missing it. This is the **one CRM write in the entire repo** — everything else, including `reminder-job` itself, stays strictly read-only per Rule 1. It must be run once before P1/P2 will have anything to send for the ~80% currently blank.

**Sender identity — CONFIRMED WORKING 2026-08-10 via live test sends, two refresh tokens in production use:** C1–C6 send from `gino@aktivasia.org`; **both** P1 and P2 send from `regional@aktivasia.org` (confirmed with Gino, 2026-08-21 — the participant-facing pair is regional's identity; `gino@aktivasia.org` on P2 was only ever a stopgap). P2's footer contact address was changed from `gino@` to `regional@` to match its own `From:`, deliberately diverging from the docx's P2 footer; `reminder.py` already sent both via `PARTICIPANT_GMAIL_SENDER`, so no code change was needed there. A live test send confirmed `regional@aktivasia.org` is **not** a verified "Send As" alias on `gino@aktivasia.org`'s Gmail account — the send API call succeeds either way, but Gmail silently rewrites `From:` back to `gino@aktivasia.org` when the requested sender isn't a verified alias on the authenticated account (setting the MIME `From:` header alone is not enough). `functions/reminder-job/gmail_sender.py` authenticates with a **different OAuth refresh token per sender**: `GMAIL_REFRESH_TOKEN` for `gino@aktivasia.org`, `GMAIL_REFRESH_TOKEN_REGIONAL` for `regional@aktivasia.org`. The second token is generated via `tools/gmail_auth_regional.py` run locally, signed into `regional@aktivasia.org` (writes to `.env` as `GMAIL_REFRESH_TOKEN_REGIONAL`, distinct from `gmail_auth.py`'s `GMAIL_REFRESH_TOKEN` so it doesn't clobber the existing `gino@aktivasia.org` token). Both tokens are filled into `functions/reminder-job/catalyst-config.json` and **live-verified in both directions** (three separate test sends, 2026-08-10): `GMAIL_REFRESH_TOKEN` correctly delivers as `gino@aktivasia.org`, `GMAIL_REFRESH_TOKEN_REGIONAL` correctly delivers as `regional@aktivasia.org`. **Gotcha hit during setup:** the two token values initially got swapped between `.env` and `catalyst-config.json`'s field names (regional token under the `GMAIL_REFRESH_TOKEN` key, `GMAIL_REFRESH_TOKEN_REGIONAL` left as `FILL_ME_IN`) — a silent misconfiguration that would have sent C1–C6 from the wrong account and made P1 fail outright. If Gmail sends start showing up under the wrong `From:` address after any future secret rotation, re-verify with a live test send per address rather than assuming the config file's field names match their values.

**Links:** every link the emails reference is looked up through `functions/reminder-job/links.py`. Real portal pages (application forms, `create-training.html`, `admin.html?training_id=`) resolve to their real URL; pages that don't exist yet (a generalized, non-PH-only post-training survey; the 6-month Impact Evaluation form; a Google Drive photo-upload folder) resolve to a loud `TBD_*` placeholder string — grep for `TBD_` to find every one. Building those two forms (likely as native Zoho Forms) is tracked separately, not part of this function.

**State persistence:** Catalyst Data Store, table `reminder_state`, one row, one `state_json` column — same pattern, and same ~10,000-char silent-truncation gotcha, as `monitor-job`'s `monitor_state` table (see that section above). Must be created manually in the Catalyst console before first deploy. State stores only small, bounded per-Training/per-Deal "last sent" markers, pruned every run once no longer relevant (Training's date has passed, or a Deal's 6-month fields are filled in) — never an ever-growing full-history list.

**Local dry-run:** `python functions/reminder-job/reminder.py --dry-run` (from a machine with `.env` populated with `ZOHO_CRM_*` vars) fetches live CRM data and prints every email that would be sent today, without calling Gmail or touching Catalyst Data Store — useful for sanity-checking the milestone math against real Training/Deal dates before deploying.

---

## Maintenance Log

| Date | What changed | Who |
|------|-------------|-----|
| 2026-03-18 | Project initialized. Protocol 0 complete. Blueprint approved. | Gino + Claude |
| 2026-03-18 | Phase 2: verify_crm.py ran. All Deals + Solutions field API names confirmed. Country filter logic corrected (via Solutions.Organised_By). Token scope needs upgrade to ZohoCRM.modules.ALL to fix record fetch. | Gino + Claude |
| 2026-08-09 | Added `functions/monitor-job/` — second Catalyst cron function, daily CRM audit + digest email (new records, CRM email activity, graduate-date consistency, 6-month-due list). Confirmed live: `Funders`/`Forms`/`Skill_Session_Participant` field names, `Deals/{id}/Emails` related-list shape, and that ~80% of graduated Deals have blank `Graduate_Date`. Registered in `catalyst.json`. Requires manual Catalyst console setup before deploy: create `monitor_state` Data Store table, and fill in Gmail OAuth env vars in `functions/monitor-job/catalyst-config.json`. | Gino + Claude |
| 2026-08-10 | Added `functions/reminder-job/` — third Catalyst cron function, replacing the retired `tools/reminder_engine.py`/`reminder_logic.py`/`email_templates.py` (deleted, along with `register_reminder_task.bat`). Implements all 8 emails from `docs/AktivAsia Automation Email (2).docx` (C1–C6 country-team, P1/P2 participant), milestone-anchored to each Training's own `Start_Date`/`End_Date` rather than a fixed day-offset. Added `tools/backfill_graduate_date.py` (the one CRM-write script in the repo, manual/dry-run-by-default) to backfill blank `Graduate_Date` from `Training.End_Date`. Registered in `catalyst.json`. Requires manual Catalyst console setup before deploy: create `reminder_state` Data Store table, fill in Zoho + Gmail OAuth env vars in `functions/reminder-job/catalyst-config.json`, confirm `regional@aktivasia.org` is a verified Gmail "Send As" alias. Links to two not-yet-built forms (generalized post-training survey, 6-month Impact Evaluation form) are `TBD_*` placeholders in `functions/reminder-job/links.py`, pending Gino building them (likely as native Zoho Forms). | Gino + Claude |
