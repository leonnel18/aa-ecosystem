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

**Stage Pipeline (confirmed CRM values 2026-03-18):**
```
Still in Applied Stage → Selected → Rejected or Not Attended → Attended Traning → Graduated or Post Evaluation Completed
```
> ⚠️ CRM typo: "Attended Traning" (missing 'i') — match exactly in code.

**Stage logic for reports:**
- `total_ongoing` = `Stage` == `"Selected"`
- `attended_training` = `Stage` in [`"Attended Traning"`, `"Graduated or Post Evaluation Completed"`]
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

### Practice Session (Forms) — Fields TBC
> Run `verify_crm.py` extended to list Forms fields (add to Phase 2 checklist).

### Session Participant (Skill_Session_Participant) — Fields TBC
> Run `verify_crm.py` extended to list Skill_Session_Participant fields.

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

## Maintenance Log

| Date | What changed | Who |
|------|-------------|-----|
| 2026-03-18 | Project initialized. Protocol 0 complete. Blueprint approved. | Gino + Claude |
| 2026-03-18 | Phase 2: verify_crm.py ran. All Deals + Solutions field API names confirmed. Country filter logic corrected (via Solutions.Organised_By). Token scope needs upgrade to ZohoCRM.modules.ALL to fix record fetch. | Gino + Claude |
