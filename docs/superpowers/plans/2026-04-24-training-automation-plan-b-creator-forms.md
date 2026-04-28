# Training Automation — Plan B: Zoho Creator Forms + Deluge Scripts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "AA Training Hub" Zoho Creator app with 3 forms (Training Details, Pre-application Template, Post-application Template) and 3 Deluge automation scripts that create CRM records, clone forms per training, and trigger email workflows.

**Architecture:** All logic runs inside Zoho Creator using Deluge scripting. On Training Details Form submit: creates CRM Solutions record → clones Pre/Post form templates → saves links back to CRM → CRM workflow fires email. On Pre-app submit: creates CRM Deal. On Post-app submit: updates Deal + advances stage.

**Tech Stack:** Zoho Creator (form builder), Deluge scripting language (Zoho-proprietary), Zoho CRM integration via `zoho.crm.createRecord()` / `updateRecord()` / `searchRecords()`, Zoho Creator form API for cloning.

**Prerequisites:**
- Plan A must be complete (6 CRM fields must exist)
- Gino must complete one-time Creator app setup (Step 0 below)
- Questions doc must be provided to finalize locked/removable pre-set questions

**IMPORTANT — CRM Write Authorization:** POST/PUT/PATCH authorized by Gino 2026-04-24. DELETE requires explicit re-authorization.

---

## File Structure

All files below live inside Zoho Creator. Save copies to `docs/superpowers/deluge/` for version control.

| File | Location | Purpose |
|------|----------|---------|
| `docs/superpowers/deluge/on_training_details_submit.deluge` | Local copy | Deluge script: Training Details Form → CRM + clone forms |
| `docs/superpowers/deluge/on_pre_app_submit.deluge` | Local copy | Deluge script: Pre-app submit → create CRM Deal |
| `docs/superpowers/deluge/on_post_app_submit.deluge` | Local copy | Deluge script: Post-app submit → update CRM Deal + advance stage |
| `docs/superpowers/deluge/creator_css.css` | Local copy | AktivAsia brand CSS for Zoho Creator forms |

---

### Task 0: Zoho Creator one-time manual setup (Gino)

**This task is performed by Gino manually in the Zoho Creator UI.**

- [ ] **Step 1: Create the Creator app**

Go to https://creator.zoho.in → "Create Application" → Name: `AA Training Hub` → Blank app.

- [ ] **Step 2: Create "Training Details Form"**

In the app, click "Add Form" → Name: `Training Details Form`. Leave fields empty for now — Task 1 adds them programmatically via spec.

- [ ] **Step 3: Create "Pre-Application Template" form**

Add Form → Name: `Pre-Application Template`.

- [ ] **Step 4: Create "Post-Application Template" form**

Add Form → Name: `Post-Application Template`.

- [ ] **Step 5: Add Zoho CRM connection**

In Creator → Settings → Connections → Add Connection → Choose "Zoho CRM" → Authorize with your Zoho account. This enables `zoho.crm.*` functions in Deluge.

- [ ] **Step 6: Note App Link Name and Form IDs**

In Creator app URL, note the **App Link Name** (e.g. `aa-training-hub`). Also note the form link names (shown in each form's URL): e.g. `Training_Details_Form`, `Pre_Application_Template`, `Post_Application_Template`.

Share these with the developer (needed in Deluge scripts as string literals).

---

### Task 1: Build Training Details Form — Section A (Training Identity)

**In Zoho Creator UI: Training Details Form → Add fields**

- [ ] **Step 1: Add Section A fields**

In the Training Details Form field editor, add these fields in order:

| Field Label | Creator Field Type | API Name (set manually) | Required |
|-------------|-------------------|------------------------|---------|
| Training Title | Single Line | Training_Title | Yes |
| Training Type | Dropdown | Training_Type | Yes |
| Country / Portal | Dropdown | Country_Portal | Yes |
| Language of Delivery | Multi Select | Language_of_Delivery | Yes |
| Format | Dropdown | Format | No |
| Start Date | Date | Start_Date | Yes |
| End Date | Date | End_Date | Yes |
| Target Participants | Number | Target_Participants | Yes |
| Countries Participated | Single Line | Countries_Participated | No |
| Venue Name | Single Line | Venue_Name | No |
| Venue Address | Multi Line | Venue_Address | No |
| Application Form Open Date | Date | App_Form_Open_Date | Yes |
| Application Form Close Date | Date | App_Form_Close_Date | Yes |
| Post Survey Open Date | Date | Post_Survey_Open_Date | Yes |
| Post Survey Close Date | Date | Post_Survey_Close_Date | Yes |

- [ ] **Step 2: Set Training Type dropdown values**

Click Training Type field → Edit values → Add:
- Foundational
- Training of Trainers (TOT)
- Feminist Leadership
- Public Narrative

- [ ] **Step 3: Set Country / Portal dropdown values**

- Philippines (PH)
- Pakistan (PK)
- Korea (KR)
- Indonesia (ID)
- Regional (backbone)

- [ ] **Step 4: Set Language of Delivery multi-select values**

- Filipino
- English
- Urdu
- Korean
- Bahasa Indonesia

- [ ] **Step 5: Set Format dropdown values**

- In-person
- Hybrid
- Online

---

### Task 2: Build Training Details Form — Sections B, C, D

- [ ] **Step 1: Add Section B — Facilitators (repeating subform)**

In Creator, add a **Subform** named `Facilitators`. Inside it, add:
- Facilitator Name (Single Line, Required) — will do CRM lookup via Deluge
- Role (Dropdown, Required) — values: Lead Facilitator, Senior Facilitator, Co-Facilitator, Junior/Peer Facilitator, Guest/External Facilitator, Coach, Shadow Coach, Support

- [ ] **Step 2: Add Section C — Associated Training Plan**

Add field: Associated Training Plan (Single Line, Not Required). Label hint: "Training Plan Title from CRM".

- [ ] **Step 3: Add Section D — Training Details**

| Field Label | Creator Field Type | Required |
|-------------|-------------------|---------|
| Who Is This Training For | Single Line | Yes |
| Training Objectives | Rich Text | Yes |
| Approach (Pedagogy) | Multi Line | No |
| Costs Covered | Rich Text | No |
| Costs Not Covered | Rich Text | No |
| Course Access Information | Multi Line | No |

---

### Task 3: Build Training Details Form — Sections E, F, G (custom questions)

- [ ] **Step 1: Add Section E — Pre-App Custom Questions (subform)**

Add a **Subform** named `Pre_Custom_Questions`. Inside it:

| Field Label | Type | Required | Notes |
|-------------|------|---------|-------|
| Question Text | Single Line | Yes | |
| Instructions | Single Line | No | |
| Placeholder | Single Line | No | |
| Translation (Filipino) | Single Line | No | |
| Field Type | Dropdown | Yes | Values: Text, Paragraph, Number, Dropdown, Checkbox, Date, Rating (1-7) |
| Options (comma-separated) | Single Line | No | Shown conditionally when Type = Dropdown or Checkbox |
| Option Translations | Single Line | No | |
| Required | Checkbox | Yes | Default checked |

- [ ] **Step 2: Add Section F — Post-App Custom Questions (subform)**

Add a **Subform** named `Post_Custom_Questions`. Same fields as Section E subform, plus:
- Mirror from Pre-app (Checkbox, default checked)

- [ ] **Step 3: Add Section G — Email Recipients**

Add field: Email Recipients (Email, Required). Allow multiple values (use Multi Line and parse on submit, or use Creator's multi-email field if available).

---

### Task 4: Build Pre-Application Template form

⚠️ **Note:** Pre-set questions (locked + removable) are defined per training type and country. The questions doc must be provided by Gino before this task. The locked/removable designations determine which fields get the "non-negotiable" flag in the Creator form. Until questions doc is provided, build the LOCKED blocks only (Demographics, Professional Info, Terms).

- [ ] **Step 1: Add LOCKED Demographics block**

| Field Label | Creator Type | API Name | Required |
|-------------|-------------|----------|---------|
| First Name | Single Line | First_Name | Yes |
| Last Name | Single Line | Last_Name | Yes |
| Preferred Name / Nickname | Single Line | Preferred_Name | Yes |
| Email | Email | Email | Yes |
| Phone / WhatsApp | Phone | Mobile | Yes |
| Street Address | Multi Line | Address | Yes |
| City / Province | Single Line | City_Province | Yes |
| Country of Residence | Dropdown | Country_of_Residence | Yes |
| Year of Birth | Number | Year_of_Birth | Yes |
| Gender | Radio | Gender | Yes |
| Pronoun | Radio | Pronoun | Yes |
| Other Pronoun | Single Line | Other_Pronoun | No |
| Preferred Language | Multi Select | Preferred_Language | Yes |
| Do you identify as | Multi Select | Identify_as | Yes |
| Special Requirements | Multi Line | Special_Requirements | No |
| Recent Photo | Image Upload | Recent_Photo | Yes |
| CV / Resume | File Upload | Import_CV | No |

- [ ] **Step 2: Set Gender radio values**

Female / Babae, Male / Lalaki, Transgender, Non-Binary, Prefer not to answer / Ayaw ko pong ipaalam, Other / Iba pa

- [ ] **Step 3: Set Pronoun radio values**

She/Her, He/Him, They/Them, Other / Iba pa

- [ ] **Step 4: Set Preferred Language multi-select values**

Filipino, English, Urdu, Korean, Bahasa Indonesia

- [ ] **Step 5: Set "Do you identify as" multi-select values**

Person with disability / Taong may kapansanan, Indigenous/First Nations / Katutubo, Frontline Community, LGBTIQ+ Person, Sole Parent / Nag-iisang magulang, None / Wala sa nabanggit, Other / Iba pa

- [ ] **Step 6: Add LOCKED Professional Information block**

| Field Label | Creator Type | Required | Notes |
|-------------|-------------|---------|-------|
| Training Applying For | Single Line | Yes | Read-only, pre-filled via URL param |
| Organization Name | Single Line | Yes | CRM lookup via Deluge on-change |
| Role in Organisation | Single Line | Yes | |
| Professional Bio | Multi Line | Yes | Max 100 words |

- [ ] **Step 7: Add LOCKED Terms & Conditions block**

Add a Checkbox field: "I agree to the terms" — Required. In the field description, paste the 3 statements:
1. I commit to active participation in the training.
2. I commit to creating a respectful and safe space for all participants.
3. I consent to the use of photos and media from this training.

Include Filipino translation below each statement (PH forms).

---

### Task 5: Build Post-Application Template form

- [ ] **Step 1: Add LOCKED Applicant Lookup block**

| Field Label | Creator Type | Required | Notes |
|-------------|-------------|---------|-------|
| First Name | Single Line | Yes | Typeahead — triggers Deluge lookup |
| Last Name | Single Line | Yes | |
| Email | Email | Yes | Auto-filled via Deluge, read-only |
| Training Applied For | Single Line | Yes | Auto-filled read-only |
| Training Type | Single Line | Yes | Auto-filled read-only |

- [ ] **Step 2: Add LOCKED Training Feedback block**

| Field Label | Creator Type | Required |
|-------------|-------------|---------|
| Overall Satisfaction (1-7) | Dropdown | Yes |
| Best Aspect of Workshop | Multi Line | Yes |
| Suggested Improvements | Multi Line | Yes |

Set Overall Satisfaction values: 1, 2, 3, 4, 5, 6, 7

- [ ] **Step 3: Add LOCKED Logistics & Communication block**

Add 4 Dropdown fields (values 1-7 each), all Required:
- Venue and Location
- Food / Catering
- Accessibility of Location
- Pre-workshop Coordination & Communication

- [ ] **Step 4: Add LOCKED Instruction block**

Add 7 Dropdown fields (values 1-7 each), all Required:
- Instructional methods were effective
- I learned valuable information
- The facilitators created a safe space
- The facilitators involved participants appropriately
- The facilitators were well prepared
- The guest speakers were engaging and useful
- The training resources and readings were helpful

- [ ] **Step 5: Add LOCKED Next Steps block**

| Field Label | Creator Type | Required |
|-------------|-------------|---------|
| Learning Summary (one sentence) | Multi Line | No |
| Action Plans (1-3, next 3 months) | Multi Line | Yes |
| Suggestions for Next Workshop | Multi Line | No |
| Testimonial | Multi Line | No |
| Additional Comments | Multi Line | No |

---

### Task 6: Write Deluge — `onTrainingDetailsSubmit`

**Files:**
- Create: `docs/superpowers/deluge/on_training_details_submit.deluge` (local copy)
- Paste into: Training Details Form → Workflow → On Submit in Creator UI

- [ ] **Step 1: Create local copy file**

Create `docs/superpowers/deluge/on_training_details_submit.deluge` with this content:

```javascript
// on_training_details_submit.deluge
// Triggered: Training Details Form submit
// Actions: Create CRM Solutions record → clone Pre/Post forms → save links → email

// ── 1. Map Training Type to CRM lookup ──────────────────────────────────────
trainingTypeMap = {"Foundational":"<PRODUCT_ID_FOUNDATIONAL>","Training of Trainers (TOT)":"<PRODUCT_ID_TOT>","Feminist Leadership":"<PRODUCT_ID_FEMINIST>","Public Narrative":"<PRODUCT_ID_PUBLIC_NARRATIVE>"};
trainingTypeId = trainingTypeMap.get(input.Training_Type);

// ── 2. Build Solutions payload ───────────────────────────────────────────────
solutionsPayload = map();
solutionsPayload.put("Solution_Title", input.Training_Title);
solutionsPayload.put("Organised_By", input.Country_Portal.removeAll(" (PH)").removeAll(" (PK)").removeAll(" (KR)").removeAll(" (ID)").removeAll(" (backbone)"));
solutionsPayload.put("Start_Date", input.Start_Date.toString("yyyy-MM-dd"));
solutionsPayload.put("End_Date", input.End_Date.toString("yyyy-MM-dd"));
solutionsPayload.put("Target_Participants", input.Target_Participants);
solutionsPayload.put("Language_of_Delivery", input.Language_of_Delivery.toString());
solutionsPayload.put("Venue", input.Venue_Name);
solutionsPayload.put("Venue_Address", input.Venue_Address);
solutionsPayload.put("Countries_Participated", input.Countries_Participated);
solutionsPayload.put("Who_is_this_training_for", input.Who_Is_This_Training_For);
solutionsPayload.put("Training_Objectives", input.Training_Objectives);
solutionsPayload.put("Approach_Pedagogy", input.Approach_Pedagogy);
solutionsPayload.put("Costs_Covered", input.Costs_Covered);
solutionsPayload.put("Costs_Not_Covered", input.Costs_Not_Covered);
solutionsPayload.put("Course_Access_Information", input.Course_Access_Information);
solutionsPayload.put("Application_Form_Open_Date", input.App_Form_Open_Date.toString("yyyy-MM-dd"));
solutionsPayload.put("Application_Form_Close_Date", input.App_Form_Close_Date.toString("yyyy-MM-dd"));
solutionsPayload.put("Post_Survey_Open_Date", input.Post_Survey_Open_Date.toString("yyyy-MM-dd"));
solutionsPayload.put("Post_Survey_Close_Date", input.Post_Survey_Close_Date.toString("yyyy-MM-dd"));

// Training Type lookup
if(trainingTypeId != null)
{
    trainingTypeLookup = map();
    trainingTypeLookup.put("id", trainingTypeId);
    solutionsPayload.put("Training_Type", trainingTypeLookup);
}

// ── 3. Map Organised_By value ────────────────────────────────────────────────
orgByMap = {"Philippines (PH)":"Philippines","Pakistan (PK)":"Pakistan","Korea (KR)":"Korea","Indonesia (ID)":"Indonesia","Regional (backbone)":"Regional"};
solutionsPayload.put("Organised_By", orgByMap.get(input.Country_Portal));

// ── 4. Create CRM Solutions record ──────────────────────────────────────────
crmResponse = zoho.crm.createRecord("Solutions", solutionsPayload);
solutionId = crmResponse.get("id");

// ── 5. Clone Pre-app form template ──────────────────────────────────────────
// NOTE: Zoho Creator form cloning via API requires Creator API v2
// App link name and form link names from one-time setup (Task 0)
APP_LINK_NAME = "aa-training-hub";  // Replace with actual app link name from Task 0
PRE_TEMPLATE_LINK = "Pre_Application_Template";  // Replace with actual form link name
POST_TEMPLATE_LINK = "Post_Application_Template";  // Replace with actual form link name

preFormName = input.Training_Title + " - Pre-Application";
postFormName = input.Training_Title + " - Post-Training Survey";

// Clone forms using Creator API
// The Creator API endpoint for cloning: POST /api/v2/{appLinkName}/form/{formLinkName}/clone
preCloneResp = invokeurl
[
    url: "https://creator.zoho.in/api/v2/" + APP_LINK_NAME + "/form/" + PRE_TEMPLATE_LINK + "/clone"
    type: POST
    parameters: {"form_name": preFormName}
    connection: "zohocrm"
];
preFormLinkName = preCloneResp.get("form_link_name");
preFormLink = "https://creatorapp.zoho.in/aktivasia/" + APP_LINK_NAME + "/#Form:" + preFormLinkName;

postCloneResp = invokeurl
[
    url: "https://creator.zoho.in/api/v2/" + APP_LINK_NAME + "/form/" + POST_TEMPLATE_LINK + "/clone"
    type: POST
    parameters: {"form_name": postFormName}
    connection: "zohocrm"
];
postFormLinkName = postCloneResp.get("form_link_name");
postFormLink = "https://creatorapp.zoho.in/aktivasia/" + APP_LINK_NAME + "/#Form:" + postFormLinkName;

// ── 6. Append custom questions to cloned Pre-app form ───────────────────────
// Custom questions from Section E subform rows
for each  row in input.Pre_Custom_Questions
{
    fieldDef = map();
    fieldDef.put("display_name", row.Question_Text);
    fieldDef.put("type", row.Field_Type.toLowerCase().replaceAll(" ", "_"));
    fieldDef.put("mandatory", row.Required);
    if(row.Options != "")
    {
        fieldDef.put("values", row.Options.split(","));
    }
    addFieldResp = invokeurl
    [
        url: "https://creator.zoho.in/api/v2/" + APP_LINK_NAME + "/form/" + preFormLinkName + "/field"
        type: POST
        parameters: fieldDef
        connection: "zohocrm"
    ];
}

// ── 7. Append custom questions to cloned Post-app form ──────────────────────
postQuestions = input.Post_Custom_Questions;
// If "Mirror from Pre-app" is checked, use Pre questions instead
if(input.Post_Custom_Questions.count() == 0 || input.Mirror_From_Pre)
{
    postQuestions = input.Pre_Custom_Questions;
}
for each  row in postQuestions
{
    fieldDef = map();
    fieldDef.put("display_name", row.Question_Text);
    fieldDef.put("type", row.Field_Type.toLowerCase().replaceAll(" ", "_"));
    fieldDef.put("mandatory", row.Required);
    if(row.Options != "")
    {
        fieldDef.put("values", row.Options.split(","));
    }
    addFieldResp = invokeurl
    [
        url: "https://creator.zoho.in/api/v2/" + APP_LINK_NAME + "/form/" + postFormLinkName + "/field"
        type: POST
        parameters: fieldDef
        connection: "zohocrm"
    ];
}

// ── 8. Save form links back to CRM Solutions record ─────────────────────────
updatePayload = map();
updatePayload.put("Application_Form", preFormLink);
updatePayload.put("Evaluation_Form", postFormLink);
zoho.crm.updateRecord("Solutions", solutionId, updatePayload);

// ── 9. Send email (CRM workflow will fire on record creation, but also send inline) ─
emailBody = "Dear Team,\n\nA new training has been set up in AktivAsia.\n\nTraining: " + input.Training_Title + "\nDates: " + input.Start_Date.toString("MMM dd, yyyy") + " — " + input.End_Date.toString("MMM dd, yyyy") + "\n\nPre-Application Form:\n" + preFormLink + "\n\nPost-Training Survey:\n" + postFormLink + "\n\nPlease share these links with participants.\n\nAktivAsia Team";

emailList = input.Email_Recipients.split(",");
for each  emailAddr in emailList
{
    sendmail
    [
        from: zoho.adminuserid
        to: emailAddr.trim()
        subject: "[AktivAsia] New Training Set Up: " + input.Training_Title
        message: emailBody
    ]
}

info "Training setup complete. Solution ID: " + solutionId;
```

> **⚠️ PLACEHOLDERS TO REPLACE before pasting into Creator:**
> - `<PRODUCT_ID_FOUNDATIONAL>` — Go to CRM → Products → open each Training Type record → copy the record ID from the URL
> - `<PRODUCT_ID_TOT>` — same
> - `<PRODUCT_ID_FEMINIST>` — same
> - `<PRODUCT_ID_PUBLIC_NARRATIVE>` — same
> - `APP_LINK_NAME` — replace `"aa-training-hub"` with actual app link name from Task 0 Step 6
> - `PRE_TEMPLATE_LINK` / `POST_TEMPLATE_LINK` — replace with actual form link names

- [ ] **Step 2: Paste script into Creator**

In Creator → Training Details Form → Workflow → On Submit → paste the Deluge code.

- [ ] **Step 3: Commit local copy**

```bash
git add docs/superpowers/deluge/on_training_details_submit.deluge
git commit -m "feat: add Deluge script for Training Details Form submission"
```

---

### Task 7: Write Deluge — `onPreAppSubmit`

**Files:**
- Create: `docs/superpowers/deluge/on_pre_app_submit.deluge`

- [ ] **Step 1: Create file and paste into Creator**

Create `docs/superpowers/deluge/on_pre_app_submit.deluge`:

```javascript
// on_pre_app_submit.deluge
// Triggered: Pre-Application Template (and all clones) → On Submit
// Action: Create CRM Deal with all applicant data

// ── 1. Find or create Organization (Account) ────────────────────────────────
orgName = input.Organization_Name;
orgSearch = zoho.crm.searchRecords("Accounts", "Account_Name:equals:" + orgName);
if(orgSearch.size() > 0)
{
    accountId = orgSearch.get(0).get("id");
}
else
{
    // Should not reach here if "Add Organization" flow was used,
    // but handle gracefully
    accountPayload = map();
    accountPayload.put("Account_Name", orgName);
    accountResp = zoho.crm.createRecord("Accounts", accountPayload);
    accountId = accountResp.get("id");
}

// ── 2. Get Training (Solution) ID from form parameter ───────────────────────
// Training ID is passed as a hidden field or URL parameter when form is cloned
trainingId = input.Training_ID;  // hidden field pre-filled at form clone time

// ── 3. Map confidence ratings per training type ──────────────────────────────
// Training type is stored in hidden field Training_Type_Code (pre-filled at clone)
trainingTypeCode = input.Training_Type_Code;

dealPayload = map();
dealPayload.put("Deal_Name", input.First_Name + " " + input.Last_Name);
dealPayload.put("First_Name", input.First_Name);
dealPayload.put("Last_Name", input.Last_Name);
dealPayload.put("Preferred_Name_Nick_Name", input.Preferred_Name);
dealPayload.put("Email", input.Email);
dealPayload.put("Mobile", input.Mobile);
dealPayload.put("Address", input.Address);
dealPayload.put("City_Province", input.City_Province);
dealPayload.put("Country_of_Residence", input.Country_of_Residence);
dealPayload.put("Year_of_Birth", input.Year_of_Birth);
dealPayload.put("Gender", input.Gender);
dealPayload.put("Pronoun", input.Pronoun);
dealPayload.put("Preferred_Pronoun", input.Other_Pronoun);
dealPayload.put("Preferred_Language", input.Preferred_Language.toString());
dealPayload.put("Identify_as_Multiple", input.Identify_as.toString());
dealPayload.put("Special_Requirements", input.Special_Requirements);
dealPayload.put("Role_in_the_Organisation", input.Role_in_Organisation);
dealPayload.put("Please_provide_a_100_word_bio_that_best_describes", input.Professional_Bio);
dealPayload.put("Stage", "Still in Applied Stage");

// Account lookup
accountLookup = map();
accountLookup.put("id", accountId);
dealPayload.put("Account_Name", accountLookup);

// Training lookup
trainingLookup = map();
trainingLookup.put("id", trainingId);
dealPayload.put("Training_Applied", trainingLookup);

// ── 4. Map Foundational confidence ratings ───────────────────────────────────
if(trainingTypeCode == "Foundational")
{
    dealPayload.put("A_Pre_Training_Strategy_Buildings", input.Strategy_Tactics_Pre.toString());
    dealPayload.put("B_Pre_Training_Building_Communication", input.Communication_Pre.toString());
    dealPayload.put("C_Pre_Training_Confident_facilitator", input.Facilitation_Pre.toString());
    dealPayload.put("D_Pre_Training_Confident_connector", input.Connections_Pre.toString());
}
// ── 5. Map TOT confidence ratings ───────────────────────────────────────────
else if(trainingTypeCode == "TOT")
{
    dealPayload.put("A_Experience_in_Facilitating_Pre", input.TOT_Facilitating_Pre.toString());
    dealPayload.put("B_Schedules_and_Agendas_Pre", input.TOT_Schedules_Pre.toString());
    dealPayload.put("C_Facilitating_and_Moderating_Pre", input.TOT_Facilitating_Moderating_Pre.toString());
    dealPayload.put("D_Designing_Workshops_Pre", input.TOT_Designing_Pre.toString());
    dealPayload.put("E_Confidently_Adaptable_Facilitation_Pre", input.TOT_Adaptable_Pre.toString());
}
// ── 6. Map Feminist Leadership confidence ratings ────────────────────────────
else if(trainingTypeCode == "Feminist")
{
    dealPayload.put("Confident_Analysis_Pre", input.FL_Gender_Mainstreaming_Pre.toString());
    dealPayload.put("Strategic_Confidence_Pre", input.FL_Gender_Lens_Pre.toString());
    dealPayload.put("F_Gendered_Leadership_Pre", input.FL_Self_Reflection_Pre.toString());
    dealPayload.put("F_Leadership_Coaching_Pre", input.FL_Coaching_Pre.toString());
}
// ── 7. Map Public Narrative confidence ratings ───────────────────────────────
else if(trainingTypeCode == "PublicNarrative")
{
    dealPayload.put("A_Campaign_Experience_Assessment_Pre", input.PN_Campaign_Experience_Pre.toString());
    dealPayload.put("B_Narrative_Application_Pre", input.PN_Narrative_Pre.toString());
    dealPayload.put("C_Collective_Action_Pre", input.PN_Collective_Pre.toString());
    dealPayload.put("D_Relationship_Building_Pre", input.PN_Relationship_Pre.toString());
    dealPayload.put("E_Collaborative_Values_Pre", input.PN_Values_Pre.toString());
}

// ── 8. Build Custom_Responses JSON for any custom questions ─────────────────
customResponses = list();
// Custom question fields are named Custom_Q1, Custom_A1, Custom_Q2, Custom_A2 etc.
// These are injected into the cloned form at creation time
// Loop up to 20 possible custom questions
for i = 1 to 20
{
    qField = "Custom_Q" + i;
    aField = "Custom_A" + i;
    qVal = input.get(qField);
    aVal = input.get(aField);
    if(qVal != null && qVal != "")
    {
        entry = map();
        entry.put("Q" + i, qVal);
        // Preserve integer values
        if(aVal.matches("[0-9]+"))
        {
            entry.put("A" + i, aVal.toLong());
        }
        else
        {
            entry.put("A" + i, aVal);
        }
        customResponses.add(entry);
    }
}
dealPayload.put("Custom_Responses", customResponses.toString());

// ── 9. Create the Deal ───────────────────────────────────────────────────────
dealResp = zoho.crm.createRecord("Deals", dealPayload);
dealId = dealResp.get("id");

info "Pre-app submitted. Deal ID: " + dealId;
```

- [ ] **Step 2: Add hidden fields to Pre-Application Template**

In Creator, add two hidden fields to the Pre-Application Template form:
- `Training_ID` (Single Line, hidden) — will be auto-filled when form is cloned
- `Training_Type_Code` (Single Line, hidden) — auto-filled at clone time

These are set programmatically in `on_training_details_submit.deluge` when the form is cloned.

- [ ] **Step 3: Paste script into Creator**

Pre-Application Template → Workflow → On Submit → paste the Deluge code.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/deluge/on_pre_app_submit.deluge
git commit -m "feat: add Deluge script for Pre-Application form submission"
```

---

### Task 8: Write Deluge — `onPostAppSubmit`

**Files:**
- Create: `docs/superpowers/deluge/on_post_app_submit.deluge`

- [ ] **Step 1: Create file and paste into Creator**

Create `docs/superpowers/deluge/on_post_app_submit.deluge`:

```javascript
// on_post_app_submit.deluge
// Triggered: Post-Application Template (and all clones) → On Submit
// Action: Update existing CRM Deal + advance Stage to Graduated

// ── 1. Find the Deal by name + training ─────────────────────────────────────
trainingId = input.Training_ID;  // hidden field pre-filled at clone time
applicantName = input.First_Name + " " + input.Last_Name;

// Search deals linked to this training
dealSearch = zoho.crm.searchRecords(
    "Deals",
    "(Training_Applied:equals:" + trainingId + " and Deal_Name:equals:" + applicantName + ")"
);

if(dealSearch.size() == 0)
{
    info "No Deal found for: " + applicantName + " in training " + trainingId;
    return;
}

dealId = dealSearch.get(0).get("id");

// ── 2. Build update payload ──────────────────────────────────────────────────
updatePayload = map();
updatePayload.put("Stage", "Graduated or Post Evaluation Completed");
updatePayload.put("Did_the_Training_meet_your_expectations", input.Overall_Satisfaction.toString());
updatePayload.put("Best_aspect_of_the_workshop", input.Best_Aspect);
updatePayload.put("Improvement_Suggestion_for_next_time", input.Suggested_Improvements);
updatePayload.put("Venue_and_Location", input.Venue_Location.toString());
updatePayload.put("Food_catering", input.Food_Catering.toString());
updatePayload.put("Accessibility_of_Location", input.Accessibility.toString());
updatePayload.put("Pre_workshop_Coordination_and_Communication", input.Pre_Workshop_Coordination.toString());
updatePayload.put("Instructional_methods_were_effective", input.Instructional_Methods.toString());
updatePayload.put("I_learned_valuable_information", input.Learned_Valuable.toString());
updatePayload.put("The_facilitators_created_a_safe_space_for_me", input.Safe_Space.toString());
updatePayload.put("The_facilitators_involved_me_other_participants", input.Participant_Involvement.toString());
updatePayload.put("The_facilitators_were_well_prepared_and_able_to", input.Facilitator_Prepared.toString());
updatePayload.put("The_guest_speakers_were_engaging_and_useful", input.Guest_Speaker.toString());
updatePayload.put("The_training_resources_and_readings_were_helpful", input.Training_Resources.toString());
updatePayload.put("Sum_up_what_you_learned_at_our_training", input.Learning_Summary);
updatePayload.put("Action_Plans_in_the_next_3_months", input.Action_Plans);
updatePayload.put("Suggestions_in_the_next_workshop", input.Next_Workshop_Suggestions);
updatePayload.put("Willingness_to_provide_a_testimonial", input.Testimonial);
updatePayload.put("Anything_else_you_d_like_to_share_or_ask", input.Additional_Comments);

// ── 3. Map post-training confidence by training type ─────────────────────────
trainingTypeCode = input.Training_Type_Code;

if(trainingTypeCode == "Foundational")
{
    updatePayload.put("A_Post_Training_Strategy_Building", input.Strategy_Tactics_Post.toString());
    updatePayload.put("B_Post_Training_Building_Communication", input.Communication_Post.toString());
    updatePayload.put("C_Post_Training_Confident_facilitator", input.Facilitation_Post.toString());
    updatePayload.put("D_Post_Training_Confident_connector", input.Connections_Post.toString());
}
else if(trainingTypeCode == "TOT")
{
    updatePayload.put("B_Schedules_and_Agendas_Post", input.TOT_Schedules_Post.toString());
    updatePayload.put("C_Facilitating_and_Moderating_Post", input.TOT_Facilitating_Moderating_Post.toString());
    updatePayload.put("D_Designing_Workshops_Post", input.TOT_Designing_Post.toString());
    updatePayload.put("E_Confidently_Adaptable_Facilitation_Post", input.TOT_Adaptable_Post.toString());
}
else if(trainingTypeCode == "Feminist")
{
    updatePayload.put("Confident_Analysis_Post", input.FL_Gender_Mainstreaming_Post.toString());
    updatePayload.put("Strategic_Confidence_Post", input.FL_Gender_Lens_Post.toString());
    updatePayload.put("Gender_Aware_Leadership_Post", input.FL_Gender_Climate_Post.toString());
    updatePayload.put("F_Confident_in_building_connections_Post", input.FL_Self_Reflection_Post.toString());
    updatePayload.put("F_Leadership_Coaching_Post", input.FL_Coaching_Post.toString());
}
else if(trainingTypeCode == "PublicNarrative")
{
    updatePayload.put("A_Campaign_Experience_Assessment_Post", input.PN_Campaign_Post.toString());
    updatePayload.put("B_Narrative_Application_Post", input.PN_Narrative_Post.toString());
    updatePayload.put("C_Collective_Action_Post", input.PN_Collective_Post.toString());
    updatePayload.put("D_Relationship_Building_Post", input.PN_Relationship_Post.toString());
    updatePayload.put("E_Collaborative_Values_Post", input.PN_Values_Post.toString());
}

// ── 4. Append custom responses ───────────────────────────────────────────────
customResponses = list();
for i = 1 to 20
{
    qField = "Custom_Q" + i;
    aField = "Custom_A" + i;
    qVal = input.get(qField);
    aVal = input.get(aField);
    if(qVal != null && qVal != "")
    {
        entry = map();
        entry.put("Q" + i, qVal);
        if(aVal.matches("[0-9]+"))
        {
            entry.put("A" + i, aVal.toLong());
        }
        else
        {
            entry.put("A" + i, aVal);
        }
        customResponses.add(entry);
    }
}
// Append to existing Custom_Responses (don't overwrite pre-app answers)
existingDeal = zoho.crm.getRecordById("Deals", dealId);
existingCustom = existingDeal.get("Custom_Responses");
if(existingCustom != null && existingCustom != "")
{
    // Append post-survey custom answers with a "post_" prefix key
    mergedResponses = existingCustom + " | POST: " + customResponses.toString();
    updatePayload.put("Custom_Responses", mergedResponses);
}
else
{
    updatePayload.put("Custom_Responses", customResponses.toString());
}

// ── 5. Update the Deal ───────────────────────────────────────────────────────
zoho.crm.updateRecord("Deals", dealId, updatePayload);

info "Post-app submitted. Deal " + dealId + " advanced to Graduated.";
```

- [ ] **Step 2: Paste into Creator**

Post-Application Template → Workflow → On Submit → paste the code.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/deluge/on_post_app_submit.deluge
git commit -m "feat: add Deluge script for Post-Application form submission"
```

---

### Task 9: Apply AktivAsia CSS branding to Creator forms

**Files:**
- Create: `docs/superpowers/deluge/creator_css.css`

- [ ] **Step 1: Create CSS file**

```css
/* creator_css.css — AktivAsia brand for Zoho Creator forms */

/* Import Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* Base */
body, .zc-form-container {
  font-family: 'Inter', sans-serif !important;
  background-color: #f5f4ee !important;
  color: #131625 !important;
}

/* Form card wrapper */
.zc-form-body {
  background: #ffffff !important;
  border-radius: 16px !important;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important;
  padding: 32px !important;
  max-width: 760px !important;
  margin: 40px auto !important;
}

/* Form title */
.zc-form-title, .zf-header-title {
  font-family: 'Inter', sans-serif !important;
  font-weight: 800 !important;
  font-size: 28px !important;
  color: #821545 !important;
  letter-spacing: -0.5px !important;
}

/* Section headings */
.zc-section-heading, .zf-section-header {
  font-weight: 700 !important;
  font-size: 16px !important;
  color: #821545 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  margin-top: 32px !important;
  padding-bottom: 8px !important;
  border-bottom: 2px solid #821545 !important;
}

/* Field labels */
.zc-field-label, label {
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #131625 !important;
}

/* Input fields */
input[type="text"],
input[type="email"],
input[type="number"],
input[type="tel"],
textarea,
select {
  border: 1.5px solid #e2e0dc !important;
  border-radius: 8px !important;
  padding: 10px 14px !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 14px !important;
  color: #131625 !important;
  background: #ffffff !important;
  transition: border-color 0.2s !important;
}

input:focus, textarea:focus, select:focus {
  border-color: #821545 !important;
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(130,21,69,0.1) !important;
}

/* Submit button */
input[type="submit"], .zc-submit-btn, button[type="submit"] {
  background: linear-gradient(135deg, #ff960b, #f93a3a) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 9999px !important;
  padding: 14px 40px !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  cursor: pointer !important;
  transition: opacity 0.2s !important;
}

input[type="submit"]:hover, button[type="submit"]:hover {
  opacity: 0.9 !important;
}

/* Required asterisk */
.zc-required, .zf-required {
  color: #f93a3a !important;
}

/* Helper/instruction text */
.zc-field-description, .zf-field-info {
  font-size: 12px !important;
  color: #788099 !important;
  margin-top: 4px !important;
}

/* Radio/checkbox labels */
.zc-radio-label, .zc-checkbox-label {
  font-size: 14px !important;
  color: #131625 !important;
}
```

- [ ] **Step 2: Paste CSS into Creator**

In Creator → App Settings → Theme → Custom CSS → paste the CSS.

- [ ] **Step 3: Preview forms**

Open the Training Details Form in Creator preview mode and verify:
- Inter font applied
- AktivAsia dark plum `#821545` used for title and section headers
- Orange-to-red gradient submit button
- Card-style form container with rounded corners

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/deluge/creator_css.css
git commit -m "feat: AktivAsia brand CSS for Zoho Creator forms"
```

---

### Task 10: Set up CRM email workflow

This task is performed in Zoho CRM UI (not scriptable).

- [ ] **Step 1: Create email template in Zoho CRM**

CRM → Settings → Templates → Email Templates → New Template:

- Template Name: `New Training Setup — Links Ready`
- Subject: `[AktivAsia] New Training Set Up: ${Solutions.Solution_Title}`
- Body:

```
Dear Team,

A new training has been set up in the AktivAsia system.

Training: ${Solutions.Solution_Title}
Dates: ${Solutions.Start_Date} — ${Solutions.End_Date}
Country: ${Solutions.Organised_By}

Pre-Application Form (share with applicants):
${Solutions.Application_Form}

Post-Training Survey (share after training):
${Solutions.Evaluation_Form}

Form availability:
- Pre-App: Open ${Solutions.Application_Form_Open_Date} | Close ${Solutions.Application_Form_Close_Date}
- Post-Survey: Open ${Solutions.Post_Survey_Open_Date} | Close ${Solutions.Post_Survey_Close_Date}

These links are also visible in the AktivAsia Portal Dashboard under "Training Forms".

Regards,
AktivAsia Automation
```

- [ ] **Step 2: Create CRM Workflow**

CRM → Settings → Automation → Workflow Rules → New Rule:
- Module: Solutions
- Trigger: Record Action → Create
- Condition: Application_Form is not empty
- Action: Email Notification → select template `New Training Setup — Links Ready`
- Recipients: Use the email field from the Training Details Form

> Note: Since the email recipients come from Creator (not a native CRM field), the Deluge script in Task 6 also sends the email directly via `sendmail`. The CRM workflow is a backup/additional notification.

- [ ] **Step 3: Test workflow**

Manually create a test Solutions record in CRM with `Application_Form` filled in → verify email is received.

---

### Task 11: End-to-end smoke test

- [ ] **Step 1: Submit Training Details Form**

Open the Training Details Form in Creator and submit with test data:
- Training Title: "TEST - Foundational PH 2026"
- Training Type: Foundational
- Country: Philippines (PH)
- Start/End: any future dates
- App Form Open/Close: set to today → tomorrow
- Email Recipients: your own email

- [ ] **Step 2: Verify CRM Solutions record created**

In CRM → Solutions → verify record exists with all fields populated.

- [ ] **Step 3: Verify cloned forms exist**

In Creator → Apps → AA Training Hub → verify two new forms exist:
- "TEST - Foundational PH 2026 - Pre-Application"
- "TEST - Foundational PH 2026 - Post-Training Survey"

- [ ] **Step 4: Verify form links on CRM record**

Open the Solutions record → verify `Application_Form` and `Evaluation_Form` URLs are populated.

- [ ] **Step 5: Verify email received**

Check your inbox for the notification email with both form links.

- [ ] **Step 6: Submit Pre-app form**

Open the Pre-app form URL → submit with test applicant data (use real-looking data for the Foundational type fields).

- [ ] **Step 7: Verify Deal created in CRM**

CRM → Deals → verify new Deal with Stage = "Still in Applied Stage" and all demographic fields populated.

- [ ] **Step 8: Submit Post-app form**

Open the Post-app form URL → enter the test applicant's name → verify auto-fill works → submit.

- [ ] **Step 9: Verify Deal updated**

CRM → Deals → find the Deal → verify Stage = "Graduated or Post Evaluation Completed" and post-training feedback fields populated.

- [ ] **Step 10: Commit progress**

```bash
git add docs/superpowers/deluge/
git add progress.md
git commit -m "feat: Plan B Creator forms and Deluge scripts complete — smoke test passed"
```

---

## Verification Checklist

- [ ] Training Details Form submit → CRM Solutions record created with all 25+ fields
- [ ] Pre/Post form clones appear in Creator with unique names
- [ ] Pre/Post form links saved to CRM `Application_Form` + `Evaluation_Form`
- [ ] Email received with correct links + dates
- [ ] Pre-app submit → CRM Deal created, Stage = "Still in Applied Stage"
- [ ] Post-app name lookup filters to current training only
- [ ] Post-app submit → Deal Stage = "Graduated or Post Evaluation Completed"
- [ ] Custom questions answered → `Custom_Responses` JSON on Deal is correct
- [ ] Integer answers in Custom_Responses preserved as integers (not strings)
- [ ] AktivAsia branding visible on all 3 forms (Inter font, dark plum, orange gradient button)
