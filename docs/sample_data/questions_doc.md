# Pre-Set Questions — Training Automation
# Pre-Application & Post-Application Forms

**Status:** All pre-set questions are LOCKED (country teams cannot remove them).
**Starting country:** Philippines (PH) — other countries added after PH is validated.
**Source:** Confirmed from live PH forms (Apr 2026 session).

---

## Pre-Application Form — Pre-Set Questions

All questions below are LOCKED for all training types unless noted otherwise.

### SECTION: Demographics (ALL training types)

| # | Question Label (EN) | Question Label (Filipino / PH) | CRM Field | Field Type | Required |
|---|--------------------|---------------------------------|-----------|------------|----------|
| 1 | First Name | Pangalan | First_Name | text | Yes |
| 2 | Last Name | Apelyido | Last_Name | text | Yes |
| 3 | Preferred Name / Nickname | Palayaw | Preferred_Name_Nick_Name | text | Yes |
| 4 | Email | Email | Email | email | Yes |
| 5 | Phone / WhatsApp | Numero ng Telepono / WhatsApp | Mobile | phone | Yes |
| 6 | Street Address | Address | Address | textarea | Yes |
| 7 | City / Province | Lungsod / Probinsya | City_Province | text | Yes |
| 8 | Country of Residence | Bansa | Country_of_Residence | picklist | Yes |
| 9 | Year of Birth | Taon ng Kapanganakan | Year_of_Birth | integer | Yes |
| 10 | Gender | Kasarian | Gender | picklist | Yes |
| 11 | Pronoun | Pronoun | Pronoun | picklist | Yes |
| 12 | Other Pronoun (if Other) | Iba pang Pronoun | Preferred_Pronoun | text | Conditional |
| 13 | Preferred Language | Nais na Wika | Preferred_Language | multi-select | Yes |
| 14 | Do you identify as | Kabilang ka ba sa | Identify_as_Multiple | multi-select | Yes |
| 15 | Special Requirements / Accessibility Needs | Espesyal na Pangangailangan | Special_Requirements | textarea | No |
| 16 | Recent Photo | Kamakailang Larawan | Recent_Photo | image upload | Yes |
| 17 | CV / Resume | CV / Resume | Import_CV | file upload | No |

**Gender picklist options (PH):**
- Female / Babae
- Male / Lalaki
- Transgender
- Non-Binary
- Prefer not to answer / Ayaw ko pong ipaalam
- Other / Iba pa

**Pronoun picklist options (PH):**
- She/Her
- He/Him
- They/Them
- Other / Iba pa

**Preferred Language options (PH, multi-select checkboxes):**
- Filipino
- English

**Identify as options (PH, multi-select):**
- Person with disability / Taong may kapansanan
- Indigenous / First Nations / Katutubo
- Frontline Community
- LGBTIQ+ Person
- Sole Parent / Nag-iisang magulang
- None / Wala sa nabanggit
- Other / Iba pa

---

### SECTION: Professional Information (ALL training types)

| # | Question Label (EN) | Question Label (Filipino / PH) | CRM Field | Field Type | Required |
|---|--------------------|---------------------------------|-----------|------------|----------|
| 1 | Training Applying For | Training na Inaaplyahan | Training_Applied | lookup → Solutions (auto-filled, read-only) | Yes |
| 2 | Organization Name | Pangalan ng Organisasyon | Account_Name | lookup → Accounts | Yes |
| 3 | Role in Organisation | Tungkulin sa Organisasyon | Role_in_the_Organisation | text | Yes |
| 4 | Professional Bio (100 words max) | Propesyonal na Bio | Please_provide_a_100_word_bio_that_best_describes | textarea | Yes |

---

### SECTION: Terms & Conditions (ALL training types)

Three checkbox statements (not saved to CRM):
1. I agree to participate actively and commit to the full duration of the training.
2. I agree to contribute to a respectful and safe learning space for all participants.
3. I consent to photos/videos taken during the training being used for AktivAsia communications.

(Filipino translations to be provided by country team on Creator form setup.)

---

### SECTION: Experience & Motivation (VARIABLE — per training type)

#### Foundational Training

| # | Question Label (EN) | CRM Field | Field Type | Required |
|---|---------------------|-----------|------------|----------|
| 1 | Are you currently involved in a campaign? | (radio, not mapped) | radio (Yes/No) | Yes |
| 2 | If yes, briefly describe your campaign (max 300 words) | Current_Campaign_Description | textarea | Conditional |
| 3 | Why are you applying for this training? | Reason_for_Applying | textarea | Yes |

#### Training of Trainers (TOT)

| # | Question Label (EN) | CRM Field | Field Type | Required |
|---|---------------------|-----------|------------|----------|
| 1 | Do you have previous experience teaching or training others? | (radio, not mapped) | radio (Yes/No) | Yes |
| 2 | If yes, describe your experience | Reason_for_Applying | textarea | Conditional |
| 3 | Why are you applying for this TOT training? | Reason_for_Applying | textarea | Yes |

#### Feminist Leadership

| # | Question Label (EN) | CRM Field | Field Type | Required |
|---|---------------------|-----------|------------|----------|
| 1 | How will this training benefit your campaign work? | Defining_Leadership_Experience | textarea | Yes |
| 2 | What personal leadership goals do you hope to achieve? | (not mapped) | textarea | Yes |
| 3 | What challenges have you faced as a woman in leadership? | Challenges_faced_as_a_woman_in_leadership | textarea | Yes |
| 4 | Have you attended gender sensitivity or women-specific training before? | Attended_Gender_Sensitivity_or_women_specific_trai | picklist (Yes/No) | Yes |

#### Public Narrative

| # | Question Label (EN) | CRM Field | Field Type | Required |
|---|---------------------|-----------|------------|----------|
| 1 | Are you currently involved in a campaign? | (radio, not mapped) | radio (Yes/No) | Yes |
| 2 | Why are you applying for this training? | Reason_for_Applying | textarea | Yes |
| 3 | How many years of campaigning experience do you have, and what prior training have you attended? | (not mapped) | textarea | Yes |

---

### SECTION: Confidence Ratings — Pre-Training (VARIABLE — per training type, 1–7 scale)

All rating questions use a 1–7 scale. All are LOCKED.

#### Foundational

| Label | CRM Field |
|-------|-----------|
| A) Campaign Experience Assessment | A_Pre_Training_Strategy_Buildings |
| B) Strategy & Tactics | A_Pre_Training_Strategy_Buildings |
| C) Communication Strategy | B_Pre_Training_Building_Communication |
| D) Facilitating Workshops | C_Pre_Training_Confident_facilitator |
| E) Building Connections | D_Pre_Training_Confident_connector |

#### Training of Trainers (TOT)

| Label | CRM Field |
|-------|-----------|
| A) Experience in Facilitating | A_Experience_in_Facilitating_Pre |
| B) Schedules and Agendas | B_Schedules_and_Agendas_Pre |
| C) Facilitating and Moderating | C_Facilitating_and_Moderating_Pre |
| D) Designing Workshops | D_Designing_Workshops_Pre |
| E) Confidently Adaptable Facilitation | E_Confidently_Adaptable_Facilitation_Pre |

#### Feminist Leadership

| Label | CRM Field |
|-------|-----------|
| 1. Gender Mainstreaming | Confident_Analysis_Pre |
| 2. Gender Lens in Social Analysis | Strategic_Confidence_Pre |
| 3. Gender & Climate Change | Intersectional_Networking_Pre |
| 4. Strategic Gender Planning | F_Confident_in_building_Pre_connections |
| 5. Self-Reflection & Leadership Bias | F_Gendered_Leadership_Pre |
| 6. Network Building | G_confident_in_Building_Connection_Pre |
| 7. Leadership Coaching | F_Leadership_Coaching_Pre |

#### Public Narrative

| Label | CRM Field |
|-------|-----------|
| A) Campaign Experience Assessment | A_Campaign_Experience_Assessment_Pre |
| B) Narrative Application | B_Narrative_Application_Pre |
| C) Collective Action | C_Collective_Action_Pre |
| D) Relationship Building | D_Relationship_Building_Pre |
| E) Collaborative Values | E_Collaborative_Values_Pre |

---

## Post-Application Form — Pre-Set Questions

All questions below are LOCKED for all training types unless noted otherwise.

### SECTION: Applicant Lookup (ALL training types)

| # | Question Label (EN) | CRM Field | Notes |
|---|---------------------|-----------|-------|
| 1 | First Name + Last Name | First_Name + Last_Name | Typeahead — filtered to current training only |
| 2 | Email | Email | Auto-filled, read-only |
| 3 | Training Applied For | Training_Applied | Auto-filled, read-only |
| 4 | Stage | Stage | Hidden — auto-set to "Graduated or Post Evaluation Completed" by Deluge |

---

### SECTION: Training Feedback (ALL training types)

| # | Question Label (EN) | CRM Field | Field Type | Required |
|---|---------------------|-----------|------------|----------|
| 1 | Overall, did the training meet your expectations? (1–7) | Did_the_Training_meet_your_expectations | picklist | Yes |
| 2 | What was the best aspect of the workshop? | Best_aspect_of_the_workshop | textarea | Yes |
| 3 | What would you suggest to improve the next training? | Improvement_Suggestion_for_next_time | textarea | Yes |

---

### SECTION: Session Topics (VARIABLE — per training, topic names injected at form generation)

Maps to CRM fields `Rate_the_sessions_on_Topic_1_Campaign_Strategy` through `Rate_the_session_on_Topic_7_Working_well`. Session label names are injected from the Training Details Form input at clone time. All use 1–7 scale.

---

### SECTION: Logistics & Communication (ALL training types, 1–7)

| # | Question Label (EN) | CRM Field | Required |
|---|---------------------|-----------|----------|
| 1 | Venue and Location | Venue_and_Location | Yes |
| 2 | Food / Catering | Food_catering | Yes |
| 3 | Accessibility of Location | Accessibility_of_Location | Yes |
| 4 | Pre-workshop Coordination and Communication | Pre_workshop_Coordination_and_Communication | Yes |

---

### SECTION: Instruction Quality (ALL training types, 1–7)

| # | Question Label (EN) | CRM Field | Required |
|---|---------------------|-----------|----------|
| 1 | Instructional methods were effective | Instructional_methods_were_effective | Yes |
| 2 | I learned valuable information | I_learned_valuable_information | Yes |
| 3 | The facilitators created a safe space for me | The_facilitators_created_a_safe_space_for_me | Yes |
| 4 | The facilitators involved me and other participants | The_facilitators_involved_me_other_participants | Yes |
| 5 | The facilitators were well prepared and able to adapt | The_facilitators_were_well_prepared_and_able_to | Yes |
| 6 | The guest speakers were engaging and useful | The_guest_speakers_were_engaging_and_useful | Yes |
| 7 | The training resources and readings were helpful | The_training_resources_and_readings_were_helpful | Yes |

---

### SECTION: Confidence Ratings — Post-Training (VARIABLE — per training type, 1–7)

#### Foundational

| Label | CRM Field |
|-------|-----------|
| A) Strategy & Tactics | A_Post_Training_Strategy_Building |
| B) Communication Strategy | B_Post_Training_Building_Communication |
| C) Facilitating Workshops | C_Post_Training_Confident_facilitator |
| D) Building Connections | D_Post_Training_Confident_connector |

#### Training of Trainers (TOT)

| Label | CRM Field |
|-------|-----------|
| B) Schedules and Agendas | B_Schedules_and_Agendas_Post |
| C) Facilitating and Moderating | C_Facilitating_and_Moderating_Post |
| D) Designing Workshops | D_Designing_Workshops_Post |
| E) Confidently Adaptable Facilitation | E_Confidently_Adaptable_Facilitation_Post |

#### Feminist Leadership

| Label | CRM Field |
|-------|-----------|
| 1. Gender Mainstreaming | Confident_Analysis_Post |
| 2. Gender Lens in Social Analysis | Strategic_Confidence_Post |
| 3. Gender & Climate Change | Gender_Aware_Leadership_Post |
| 4. Strategic Gender Planning | Intersectional_Networking_Post |
| 5. Self-Reflection & Leadership Bias | F_Confident_in_building_connections_Post |
| 6. Network Building | Gender_Strategies_Post |
| 7. Leadership Coaching | F_Leadership_Coaching_Post |

#### Public Narrative

| Label | CRM Field |
|-------|-----------|
| A) Campaign Experience Assessment | A_Campaign_Experience_Assessment_Post |
| B) Narrative Application | B_Narrative_Application_Post |
| C) Collective Action | C_Collective_Action_Post |
| D) Relationship Building | D_Relationship_Building_Post |
| E) Collaborative Values | E_Collaborative_Values_Post |

---

### SECTION: Next Steps (ALL training types)

| # | Question Label (EN) | CRM Field | Required |
|---|---------------------|-----------|----------|
| 1 | Sum up what you learned at the training | Sum_up_what_you_learned_at_our_training | No |
| 2 | Action Plans in the next 3 months | Action_Plans_in_the_next_3_months | Yes |
| 3 | Suggestions for the next workshop | Suggestions_in_the_next_workshop | No |
| 4 | Testimonial | Willingness_to_provide_a_testimonial | No |
| 5 | Anything else you'd like to share or ask | Anything_else_you_d_like_to_share_or_ask | No |

---

## Custom Questions Block

Appears at the end of both Pre and Post forms. Answers stored in `Custom_Responses` JSON array on the Deal record:
```json
[{"Q1": "Question text", "A1": "answer string or integer"}, ...]
```
Integer-type answers (e.g. Rating fields) must be stored as integers, not strings.

---

## Open Items (TBD)

- **TOT Experience field**: Second Reason_for_Applying usage needs to be disambiguated — confirm with Gino whether it maps to a separate field or the same field
- **Other countries (PK, KR, ID)**: Question translations and country-specific options to be added after PH validation
