# Training Automation — Design Spec
**Project:** aa-ecosystem  
**Feature:** Training Details Form + Auto-generated Pre/Post Application Forms  
**Phase:** 1 of 2 (Phase 1.5 deferred: Google Maps, AI description generator, Guided Edit flow)  
**Date:** 2026-04-24  
**Owner:** Gino (gideon.valera@gmail.com)  
**Starting country:** Philippines (PH) — other countries replicated once PH is validated

---

## Context

AktivAsia country teams currently create Zoho CRM training records and application forms manually. This feature automates the full pipeline: a country team fills one Training Details Form, and the system automatically creates the CRM training record, generates branded pre/post application forms with unique links per training, and emails all links to the team. This is the first feature to introduce **CRM write operations** (POST/PUT/PATCH authorized by Gino on 2026-04-24; DELETE requires explicit re-authorization each time).

---

## Architecture Overview

Everything lives inside a **Zoho Creator App** ("AA Training Hub"). No external backend required.

```
[Training Details Form] ← country team fills (Zoho Creator)
        │
        └─ Deluge Script (on submit):
            1. POST → Zoho CRM Solutions module (create Training record)
            2. Clone Pre-app form template → new Creator form (unique link)
            3. Clone Post-app form template → new Creator form (unique link)
            4. Append custom questions (if any) to both cloned forms
            5. PUT → CRM Solutions: save links to Application_Form + Evaluation_Form
            6. Trigger CRM Workflow → email country team with all links

[Pre-Application Form] ← applicants fill (cloned Creator form, unique per training)
        └─ On submit (Deluge):
            → Create Deal record in Zoho CRM
            → Stage auto-set to "Still in Applied Stage"
            → Save submission in Creator DB

[Post-Application Form] ← participants fill (cloned Creator form, unique per training)
        └─ On submit (Deluge):
            → Update Deal record in Zoho CRM
            → Stage auto-moved to "Graduated or Post Evaluation Completed"
            → Save submission in Creator DB

[Portal Dashboard] ← existing portal
        └─ New "Training Forms" tab
            → Shows training status (Ongoing / Completed)
            → Shows App Form open/close dates
            → Shows Post-survey open/close dates
            → Links not clickable outside date range
            → Branded closed message shown outside date range
```

---

## Zoho Creator App Setup (One-time Manual by Gino)

1. Create app: **"AA Training Hub"**
2. Create form: **"Training Details Form"** (fields in Section 1)
3. Create form: **"Pre-Application Template"** (fields in Section 2)
4. Create form: **"Post-Application Template"** (fields in Section 3)
5. Add Zoho CRM integration connection in Creator settings
6. Note App ID + Form IDs → required for Deluge scripts

---

## Section 1 — Training Details Form Fields

### SECTION A: Training Identity
| Field | CRM API Field | Type | Required | Notes |
|-------|--------------|------|----------|-------|
| Training Title | Solution_Title | Text | Yes | |
| Training Type | Training_Type | Dropdown | Yes | Foundational, Training of Trainers (TOT), Feminist Leadership, Public Narrative |
| Country / Portal | Organised_By | Dropdown | Yes | Philippines (PH), Pakistan (PK), Korea (KR), Indonesia (ID), Regional (backbone) |
| Language of Delivery | Language_of_Delivery | Multi-select Checkboxes | Yes | Each language is a separate checkbox. PH: Filipino, English. PK: Urdu, English. KR: Korean, English. ID: Bahasa Indonesia, English |
| Format | Format | Dropdown | No | In-person, Hybrid, Online |
| Start Date | Start_Date | Date | Yes | |
| End Date | End_Date | Date | Yes | |
| Target Participants | Target_Participants | Number | Yes | |
| Countries Participated | Countries_Participated | Multi-select | No | For Regional/backbone trainings |
| Venue Name | Venue | Text | No | |
| Venue Address | Venue_Address | Textarea | No | Google Maps deferred to Phase 1.5 |

**Application Form Availability Window:**
| Field | CRM API Field | Type | Required |
|-------|--------------|------|----------|
| Application Form Open Date | Application_Form_Open_Date | Date | Yes |
| Application Form Close Date | Application_Form_Close_Date | Date | Yes |
| Post-Survey Open Date | Post_Survey_Open_Date | Date | Yes |
| Post-Survey Close Date | Post_Survey_Close_Date | Date | Yes |

### SECTION B: Facilitators / Trainers
Repeating section, up to 10. Maps to existing CRM fields.

| Field | CRM API Field | Type | Required | Notes |
|-------|--------------|------|----------|-------|
| Facilitator Name | Facilitator (Name_1–Name_10) | CRM Lookup → Contacts | Yes | Typeahead. If no match: "Add New Contact" popup → Full Name, Email, Role/Position → saves to CRM Contacts |
| Role | Facilitator_Type_for_Trainer_1–5, Facilitator_Type_6–10 | Dropdown | Yes | Lead Facilitator, Senior Facilitator, Co-Facilitator, Junior/Peer Facilitator, Guest/External Facilitator, Coach, Shadow Coach, Support |

### SECTION C: Associated Training Plan
| Field | CRM API Field | Type | Required |
|-------|--------------|------|----------|
| Associated Training Plan | Training_Title_Plan | CRM Lookup → Training_Plans | No |

### SECTION D: Training Details
> These are existing fields in the Solutions module under the "Training Details - Website" section.

| Form Field | CRM API Field | CRM Type | Required |
|-----------|--------------|----------|----------|
| Who Is This Training For | Who_is_this_training_for | text (single line) | **Yes** |
| Training Objectives | Training_Objectives | rich text | **Yes** |
| Approach (Pedagogy) | Approach_Pedagogy | multiline (small) | No |
| Costs Covered | Costs_Covered | rich text | No |
| Costs Not Covered | Costs_Not_Covered | rich text | No |
| Course Access Information | Course_Access_Information | multiline (small) | No |

### SECTION E: Pre-Application Form Setup
Pre-set questions auto-loaded by Training Type + Country. Two tiers:
- **Locked** — shown, cannot be removed (⚠️ exact list TBD from questions doc)
- **Removable** — shown with a remove toggle (⚠️ exact list TBD from questions doc)

**Custom Question Builder** (repeating, "Add a Question" button):
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Question Text | Text | Yes | The main question label |
| Instructions | Text | No | Helper text shown below the question |
| Placeholder | Text | No | Placeholder text inside the input |
| Translation | Text | No | PH: Filipino translation |
| Field Type | Dropdown | Yes | Text, Paragraph, Number, Dropdown, Checkbox, Date, Rating (1-7). Shows live mini-preview on selection |
| Options | Text (comma-separated) | Conditional | Only if Dropdown or Checkbox |
| Option Translations | Text | Conditional | Filipino translation of each option (PH) |
| Required? | Toggle | Yes | Default: Yes |

### SECTION F: Post-Application Form Setup
Same structure as Section E. "Mirror custom questions from Pre-app" checkbox (default: checked).

### SECTION G: Email Notification
| Field | Type | Required |
|-------|------|----------|
| Email Recipients | Multi-email | Yes |

---

## Section 2 — Pre-Application Form Structure (PH confirmed from live forms)

Section headers in English + Filipino for PH.

### LOCKED — Demographics (all training types)
| Form Field | CRM API Field | Type | Required | Notes |
|-----------|--------------|------|----------|-------|
| First Name | First_Name | text | Yes | |
| Last Name | Last_Name | text | Yes | |
| Preferred Name / Nickname | Preferred_Name_Nick_Name | text | Yes | "What would you like to be called?" |
| Email | Email | email | Yes | |
| Phone / WhatsApp | Mobile | phone | Yes | |
| Street Address | Address | textarea | Yes | |
| City / Province | City_Province | text | Yes | |
| Country of Residence | Country_of_Residence | picklist | Yes | Pre-filled to training country |
| Year of Birth | Year_of_Birth | integer | Yes | **New CRM field**. Year only (e.g. 1995) |
| Gender | Gender | picklist | Yes | Female/Babae, Male/Lalaki, Transgender, Non-Binary, Prefer not to answer/Ayaw ko pong ipaalam, Other/Iba pa |
| Pronoun | Pronoun | picklist | Yes | She/Her, He/Him, They/Them, Other/Iba pa |
| Other Pronoun (if Other) | Preferred_Pronoun | text | Conditional | |
| Preferred Language | Preferred_Language | picklist | Yes | Multi-select checkboxes. PH: Filipino, English |
| Do you identify as | Identify_as_Multiple | multiselectpicklist | Yes | Person with disability/Taong may kapansanan, Indigenous/First Nations/Katutubo, Frontline Community, LGBTIQ+ Person, Sole Parent/Nag-iisang magulang, None/Wala sa nabanggit, Other/Iba pa |
| Special Requirements | Special_Requirements | textarea | No | |
| Recent Photo | Recent_Photo | imageupload | Yes | |
| CV / Resume | Import_CV | fileupload | No | |

### LOCKED — Professional Information (all training types)
| Form Field | CRM API Field | Type | Required | Notes |
|-----------|--------------|------|----------|-------|
| Training Applying For | Training_Applied | lookup → Solutions | Yes | Auto-filled read-only |
| Organization Name | Account_Name | lookup → Accounts | Yes | Typeahead. "Add Organization" popup if not found → "{Full Name} ({Acronym}) - {City}" |
| Role in Organisation | Role_in_the_Organisation | text | Yes | |
| Professional Bio | Please_provide_a_100_word_bio_that_best_describes | textarea | Yes | 100 words max |

### LOCKED — Terms & Conditions (all training types)
Checkbox (3 statements: participation, respectful space, media consent). English + Filipino (PH). Not saved to CRM.

### VARIABLE — Experience (per training type)
⚠️ Locked/removable status TBD from questions doc.

| Training Type | Form Fields | CRM Mapping |
|--------------|------------|-------------|
| Foundational | Currently campaigning? (Radio); Campaign description (Textarea 300w); Motivation (Textarea) | `Current_Campaign_Description`, `Reason_for_Applying` |
| TOT | Previous teaching/training experience? (Radio); Details (Textarea); Reason for applying (Textarea) | `Reason_for_Applying` + TBD from questions doc |
| Feminist Leadership | Campaign work benefit (Textarea); Personal goals (Textarea); Leadership challenges — `Challenges_faced_as_a_woman_in_leadership`; Previous gender training — `Attended_Gender_Sensitivity_or_women_specific_trai` | `Defining_Leadership_Experience`, `Attended_Gender_Sensitivity_or_women_specific_trai`, `Challenges_faced_as_a_woman_in_leadership` |
| Public Narrative | Currently campaigning? (Radio); Why applying (Textarea); Years + prior training (Textarea) | `Current_Campaign_Description`, `Reason_for_Applying` |

### VARIABLE — Confidence Ratings Pre-Training (per training type, 1-7 scale)
⚠️ Locked/removable status TBD from questions doc.

**Foundational:**
| Label | CRM API Field |
|-------|--------------|
| A) Campaign Experience Assessment | `A_Pre_Training_Strategy_Buildings` |
| B) Strategy & Tactics | `A_Pre_Training_Strategy_Buildings` |
| C) Communication Strategy | `B_Pre_Training_Building_Communication` |
| D) Facilitating Workshops | `C_Pre_Training_Confident_facilitator` |
| E) Building Connections | `D_Pre_Training_Confident_connector` |

**TOT:**
| Label | CRM API Field |
|-------|--------------|
| A) Experience in Facilitating | `A_Experience_in_Facilitating_Pre` |
| B) Schedules and Agendas | `B_Schedules_and_Agendas_Pre` |
| C) Facilitating and Moderating | `C_Facilitating_and_Moderating_Pre` |
| D) Designing Workshops | `D_Designing_Workshops_Pre` |
| E) Confidently Adaptable Facilitation | `E_Confidently_Adaptable_Facilitation_Pre` |

**Feminist Leadership:**
| Label | CRM API Field |
|-------|--------------|
| 1. Gender Mainstreaming | `Confident_Analysis_Pre` |
| 2. Gender Lens in Social Analysis | `Strategic_Confidence_Pre` |
| 3. Gender & Climate Change | (Post-only confirmed; Pre TBD) |
| 4. Gender Strategy Building | TBD from questions doc |
| 5. Self-Reflection & Leadership Bias | `F_Gendered_Leadership_Pre` |
| F) Leadership Coaching | `F_Leadership_Coaching_Pre` |

**Public Narrative:**
| Label | CRM API Field |
|-------|--------------|
| A) Campaign Experience Assessment | `A_Campaign_Experience_Assessment_Pre` |
| B) Narrative Application | `B_Narrative_Application_Pre` |
| C) Collective Action | `C_Collective_Action_Pre` |
| D) Relationship Building | `D_Relationship_Building_Pre` |
| E) Collaborative Values | `E_Collaborative_Values_Pre` |

### CUSTOM QUESTIONS BLOCK
Appended at end. Answers → `Custom_Responses` JSON array on Deal (integer values preserved as integers).

---

## Section 3 — Post-Application Form Structure (PH confirmed from live forms)

### LOCKED — Applicant Lookup
| Form Field | CRM API Field | Notes |
|-----------|--------------|-------|
| First Name + Last Name | First_Name + Last_Name | Typeahead → Deals filtered to THIS training only |
| Email | Email | Auto-filled read-only |
| Stage | Stage | **Hidden** — auto-set by Deluge |
| Training Type Applied | Training_Type_Applied | Auto-filled read-only |
| Training Applied For | Training_Applied | Auto-filled read-only |

### LOCKED — Training Feedback (all training types)
| Form Field | CRM API Field | Type | Required |
|-----------|--------------|------|----------|
| Overall Satisfaction (1-7) | Did_the_Training_meet_your_expectations | picklist | Yes |
| Best Aspect | Best_aspect_of_the_workshop | textarea | Yes |
| Suggested Improvements | Improvement_Suggestion_for_next_time | textarea | Yes |

### VARIABLE — Topics (per training, session names injected at generation)
Maps to existing CRM Deals fields `Rate_the_sessions_on_Topic_1_Campaign_Strategy` through `Rate_the_session_on_Topic_7_Working_well` (Topics 1–7). Session label names are injected into the form at creation time from the Training Details Form input.

### LOCKED — Logistics & Communication (all training types)
| Form Field | CRM API Field | Required |
|-----------|--------------|----------|
| Venue and Location | Venue_and_Location | Yes |
| Food/Catering | Food_catering | Yes |
| Accessibility of Location | Accessibility_of_Location | Yes |
| Pre-workshop Coordination | Pre_workshop_Coordination_and_Communication | Yes |

### LOCKED — Instruction (all training types, 1-7)
| Form Field | CRM API Field | Required |
|-----------|--------------|----------|
| Instructional methods effective | Instructional_methods_were_effective | Yes |
| Learned valuable information | I_learned_valuable_information | Yes |
| Safe learning space | The_facilitators_created_a_safe_space_for_me | Yes |
| Participant involvement | The_facilitators_involved_me_other_participants | Yes |
| Facilitator preparation | The_facilitators_were_well_prepared_and_able_to | Yes |
| Guest speaker engagement | The_guest_speakers_were_engaging_and_useful | Yes |
| Training resources | The_training_resources_and_readings_were_helpful | Yes |

### VARIABLE — Confidence Ratings Post-Training (per training type, 1-7)

**Foundational:**
`A_Post_Training_Strategy_Building`, `B_Post_Training_Building_Communication`, `C_Post_Training_Confident_facilitator`, `D_Post_Training_Confident_connector`

**TOT:**
`B_Schedules_and_Agendas_Post`, `C_Facilitating_and_Moderating_Post`, `D_Designing_Workshops_Post`, `E_Confidently_Adaptable_Facilitation_Post`

**Feminist Leadership:**
`Confident_Analysis_Post`, `Strategic_Confidence_Post`, `Gender_Aware_Leadership_Post`, `F_Confident_in_building_connections_Post`, `F_Leadership_Coaching_Post`

**Public Narrative:**
`A_Campaign_Experience_Assessment_Post`, `B_Narrative_Application_Post`, `C_Collective_Action_Post`, `D_Relationship_Building_Post`, `E_Collaborative_Values_Post`

### LOCKED — Next Steps (all training types)
| Form Field | CRM API Field | Required |
|-----------|--------------|----------|
| Learning Summary | Sum_up_what_you_learned_at_our_training | No |
| Action Plans (1-3, 3 months) | Action_Plans_in_the_next_3_months | Yes |
| Suggestions for Next Workshop | Suggestions_in_the_next_workshop | No |
| Testimonial | Willingness_to_provide_a_testimonial | No |
| Additional Comments | Anything_else_you_d_like_to_share_or_ask | No |

### CUSTOM QUESTIONS BLOCK
Mirrored from Pre-app or independent. Appended to `Custom_Responses` JSON.

---

## Section 4 — Deluge Script Logic

### onTrainingDetailsSubmit
```
1. Build CRM Solutions payload:
   Solution_Title, Organised_By, Training_Type (lookup), Start_Date, End_Date,
   Target_Participants, Language_of_Delivery, Format, Venue, Venue_Address,
   Countries_Participated, Training_Title_Plan,
   Facilitator + Name_2–10, Facilitator_Type_for_Trainer_1–5 + 6–10
   + Training Details Website fields (TBC API names)

2. POST to CRM Solutions → solutionId

3. Clone "Pre-Application Template" → "{Training Title} - Pre-Application"
   → inject training-type-specific confidence fields
   → append custom questions from Section E input
   → set availability: App_Open_Date → App_Close_Date
   → get preFormLink

4. Clone "Post-Application Template" → "{Training Title} - Post-Training Survey"
   → inject training-type-specific post-confidence fields
   → inject session topic fields with names from input
   → append custom questions from Section F input
   → set availability: Post_Open_Date → Post_Close_Date
   → get postFormLink

5. PUT to CRM Solutions (solutionId):
   Application_Form = preFormLink
   Evaluation_Form = postFormLink
   Application_Form_Open_Date, Application_Form_Close_Date
   Post_Survey_Open_Date, Post_Survey_Close_Date

6. CRM Workflow fires → email recipients
```

### onPreAppSubmit
```
1. Create Deal:
   Deal_Name = First_Name + " " + Last_Name
   First_Name, Last_Name, Preferred_Name_Nick_Name, Email, Mobile,
   Address, City_Province, Country_of_Residence, Year_of_Birth (new),
   Gender, Pronoun, Preferred_Pronoun, Preferred_Language,
   Identify_as_Multiple, Special_Requirements,
   Account_Name (lookup), Role_in_the_Organisation,
   Please_provide_a_100_word_bio_that_best_describes,
   Training_Applied (lookup to solutionId), Training_Type_Applied,
   Stage = "Still in Applied Stage"
   → confidence fields mapped per training type (Pre variants)
   → experience fields mapped per training type
   Custom_Responses = JSON array [{Q1: "...", A1: <string|integer>}, ...]

2. Save to Creator DB
```

### onPostAppSubmit
```
1. Find Deal: First_Name + Last_Name + Training_Applied = solutionId
2. Update Deal:
   Stage = "Graduated or Post Evaluation Completed"
   Did_the_Training_meet_your_expectations, Best_aspect_of_the_workshop,
   Improvement_Suggestion_for_next_time,
   Venue_and_Location, Food_catering, Accessibility_of_Location,
   Pre_workshop_Coordination_and_Communication,
   Instructional_methods_were_effective, I_learned_valuable_information,
   The_facilitators_created_a_safe_space_for_me,
   The_facilitators_involved_me_other_participants,
   The_facilitators_were_well_prepared_and_able_to,
   The_guest_speakers_were_engaging_and_useful,
   The_training_resources_and_readings_were_helpful,
   Rate_the_sessions_on_Topic_1–7 (session ratings),
   → post-confidence fields mapped per training type
   Sum_up_what_you_learned_at_our_training,
   Action_Plans_in_the_next_3_months, Suggestions_in_the_next_workshop,
   Willingness_to_provide_a_testimonial, Anything_else_you_d_like_to_share_or_ask
   Custom_Responses = append post Q&A to JSON array

3. Save to Creator DB
```

---

## Section 5 — CRM Field Audit: Existing vs New

### Solutions Module — New Fields Only
| Field | API Name | Type | Notes |
|-------|---------|------|-------|
| App Form Open Date | Application_Form_Open_Date | date | |
| App Form Close Date | Application_Form_Close_Date | date | |
| Post-Survey Open Date | Post_Survey_Open_Date | date | |
| Post-Survey Close Date | Post_Survey_Close_Date | date | |
| Who Is This Training For | Who_is_this_training_for | text (single line) | |
| Training Objectives | Training_Objectives | rich text | |
| Approach / Pedagogy | Approach_Pedagogy | multiline (small) | |
| Costs Covered | Costs_Covered | rich text | |
| Costs Not Covered | Costs_Not_Covered | rich text | |
| Course Access Information | Course_Access_Information | multiline (small) | |

### Deals Module — New Fields Only
| Field | API Name | Type |
|-------|---------|------|
| Year of Birth | Year_of_Birth | integer |
| Custom Responses | Custom_Responses | Long Text (JSON array) |

---

## Section 6 — Portal Dashboard Changes

### New "Training Forms" tab on portal.html and backbone.html
```
Training Forms
─────────────────────────────────────────────────────────────────────
[Filter by Year ▼]  [Filter by Training Type ▼]

Training Name       Type          Status     App Form            Post Survey
──────────────────  ────────────  ─────────  ──────────────────  ──────────────────
TOT-North 2025      TOT           Ongoing    [Apply] Mar1–Apr1   [Survey] May1–May15
Pandayan PH 2025    Foundational  Completed  Closed Apr1         Closed May15
```

**Date-range link logic:**
- Within Open→Close: link is active button
- Before Open: "Opens {date}" (not clickable)
- After Close: "Closed {date}" (not clickable)
- Applicant landing on closed form URL: branded AktivAsia message — *"This form is no longer accepting responses. Please contact your AktivAsia country team."*

### Pipeline changes:
- `crm_extract.py`: add `Application_Form`, `Evaluation_Form`, `Application_Form_Open_Date`, `Application_Form_Close_Date`, `Post_Survey_Open_Date`, `Post_Survey_Close_Date` to Solutions fields list
- `transform.py`: include links + dates in `report_2_training_plan.actual_trainings[]`
- `dashboard_data.json`: add `pre_app_link`, `post_app_link`, `app_open_date`, `app_close_date`, `post_open_date`, `post_close_date` per training
- `portal.html` + `app.js`: add "Training Forms" tab with date-aware rendering

---

## Section 7 — UI / Branding

Follow portal dashboard design system exactly:

| Element | Value |
|---------|-------|
| Primary | `#821545` |
| CTA gradient | `#ff960b → #f93a3a` |
| Background | `#ffffff` / `#f5f4ee` |
| Font | Inter (400–900) |
| Border radius | 16px cards, 9999px buttons |
| Text dark | `#131625` |
| Text meta | `#788099` |
| Light accent | `#f3e8ff` |

Applied via Zoho Creator custom CSS.

---

## Section 8 — Phase 1.5 (Deferred)

1. **Guided Form Editor** — Step-by-step post-creation edit flow (separate button in Creator)
2. **Google Maps address autocomplete** — Venue Address. Google Places API. Gino is Google Admin.
3. **AI-assisted Training Details description** — Claude API call from Deluge.

---

## Section 9 — Required Inputs Before Implementation

> ⚠️ Must be resolved before coding starts:

1. **Pre-set questions doc** — Locked vs. removable per question, per training type, per country. Gino to provide.
2. **Zoho Creator App + Form IDs** — After one-time manual setup by Gino.

---

## Section 10 — Verification Plan

1. Submit Training Details Form → verify Solutions record in CRM (all fields correct)
2. Verify Pre/Post Creator forms cloned with correct pre-set + custom questions
3. Verify `Application_Form` + `Evaluation_Form` on CRM Solutions record
4. Verify CRM workflow email sent with correct links
5. Submit Pre-app → verify Deal created: all demographics, Likert per training type, `Custom_Responses` JSON (integers preserved)
6. Submit Post-app name lookup → verify filter to current training only
7. Submit Post-app → verify Stage = "Graduated or Post Evaluation Completed"
8. Test outside date range → verify closed message shown
9. Run `orchestrator.py --portal PH` → verify "Training Forms" tab renders correctly
10. Browser check → verify AktivAsia branding on forms

---

## Section 11 — Implementation Order

1. **Gino:** Provide questions doc (Required Input #1)
2. **Gino:** One-time Creator app setup (Required Input #2)
3. **Script:** Add new Solutions fields (4 date fields: Application_Form_Open/Close_Date, Post_Survey_Open/Close_Date)
4. **Script:** Add new Deals fields (`Year_of_Birth`, `Custom_Responses`)
6. **Creator:** Build Training Details Form (Section 1)
7. **Creator:** Build Pre-application Template (Section 2)
8. **Creator:** Build Post-application Template (Section 3)
9. **Deluge:** `onTrainingDetailsSubmit` script
10. **Deluge:** `onPreAppSubmit` → Deal creation per training type
11. **Deluge:** `onPostAppSubmit` → Deal update + stage advance
12. **CRM:** Email workflow template + trigger
13. **Creator CSS:** AktivAsia branding on all 3 forms
14. **Pipeline:** Update `crm_extract.py` + `transform.py` + `portal.html` + `app.js`
15. **Verify:** End-to-end test (Section 10)
16. **Replicate:** PK, KR, ID with country-specific translations after PH validated
