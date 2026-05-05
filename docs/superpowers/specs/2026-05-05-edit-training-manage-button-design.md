# Edit Training — Manage Button Design

**Date:** 2026-05-05  
**Status:** Approved  

---

## Context

The Training Report table in the portal has a "Manage" column that currently renders either a gold "Manage" link (navigating directly to `admin.html`) or `—` when no training ID exists. The requirement is to replace this with an "Edit" button that presents two choices — editing training details inline, or managing participant statuses via the existing admin page.

---

## Feature Overview

Replace the Manage column cell with an **Edit button + dropdown** pattern. The dropdown offers two actions with icons:
- ✏️ Edit Training Details — opens a full-screen modal with a pre-filled accordion form
- 👥 Edit Participant Status — navigates to `admin.html?training_id={id}&view=selection`

---

## Section 1: Edit Button & Dropdown

**Location:** `portal/js/app.js:536` inside `renderRowFn`

- When `t.id` exists, render a gold `Edit` button (same style as the existing Manage button)
- Clicking the button calls `toggleEditDropdown(trainingId)` which shows/hides a small absolutely-positioned dropdown below the button
- Dropdown items:
  - ✏️ **Edit Training Details** — calls `openEditModal(t.id, t.name)`
  - 👥 **Edit Participant Status** — navigates to `admin.html?training_id={id}&view=selection`
- Only one dropdown open at a time — opening a new one closes any previously open one
- A document-level click listener closes any open dropdown when clicking outside

**Markup pattern (inline in renderRowFn):**
```html
<div class="edit-cell" style="position:relative">
  <button class="btn-edit" onclick="toggleEditDropdown('${t.id}', event)">Edit ▾</button>
  <div class="edit-dropdown" id="edit-dd-${t.id}" style="display:none">
    <button onclick="openEditModal('${t.id}', '${escapedName}')">✏️ Edit Training Details</button>
    <a href="admin.html?training_id=${t.id}&view=selection">👥 Edit Participant Status</a>
  </div>
</div>
```

---

## Section 2: Edit Training Details Modal

**Location:** Static HTML added to `portal/portal.html` (hidden by default), logic in `portal/js/app.js`

### Modal Structure
- **Overlay:** Fixed full-screen backdrop (`z-index: 1000`)
- **Panel:** Centered card, max-width 760px, max-height 90vh, scrollable body
- **Header:** "Edit Training Details" title + training name subtitle + X close button
- **Body:** Scrollable accordion form (reuses `.section-card` pattern from `create-training.html`)
- **Footer (sticky):** "Save Changes" (primary gradient button) + "Cancel" (secondary button)

### Accordion Sections (all collapsible, Basic Info open by default)

| # | Section | Fields |
|---|---------|--------|
| 1 | **Basic Info** | Training Plan (`Training_Title_Plan` lookup), Training Title (`Solution_Title`), Training Type (`Training_Type` lookup), Organised By (`Organised_By` picklist), Format (`Format` picklist), Target Participants (`Target_Participants` integer) |
| 2 | **Dates** | Start Date (`Start_Date`), End Date (`End_Date`), Application Form Open (`Application_Form_Open_Date`), Application Form Close (`Application_Form_Close_Date`), Post Survey Open (`Post_Survey_Open_Date`), Post Survey Close (`Post_Survey_Close_Date`) |
| 3 | **Location & Logistics** | Venue (`Venue`), Venue Address (`Venue_Address`), Language of Delivery (`Language_of_Delivery`), Co-host (`Co_host`), Countries Participated (`Countries_Participated`) — shown only when Organised By = Regional |
| 4 | **Training Content** | Who is this training for (`Who_is_this_training_for`), Training Objectives (`Training_Objectives`), Approach/Pedagogy (`Approach_Pedagogy`), Costs Covered (`Costs_Covered`), Costs Not Covered (`Costs_Not_Covered`), Course Access Information (`Course_Access_Information`) |
| 5 | **Facilitators** | 10 facilitator slots, each with Name (text) and Role picklist: Lead Facilitator, Senior Facilitator, Co-Facilitator, Junior/Peer Facilitator, Guest/External Facilitator, Coach, Shadow Coach, Support |

### Accordion Behavior
- Each section card header is clickable — toggles a chevron (▶/▼) and collapses/expands the card body
- Section 1 (Basic Info) is expanded by default; all others collapsed

---

## Section 3: Data Flow

### On Modal Open (`openEditModal(id, name)`)
1. Show modal overlay immediately with a loading skeleton in the body
2. In parallel, fetch:
   - `GET /solutions/:id?fields=Solution_Title,Training_Title_Plan,Training_Type,Organised_By,Format,Target_Participants,Start_Date,End_Date,Application_Form_Open_Date,Application_Form_Close_Date,Post_Survey_Open_Date,Post_Survey_Close_Date,Venue,Venue_Address,Language_of_Delivery,Co_host,Countries_Participated,Who_is_this_training_for,Training_Objectives,Approach_Pedagogy,Costs_Covered,Costs_Not_Covered,Course_Access_Information,Facilitator,Facilitator_Type_for_Trainer_1,...` (all editable fields)
   - `GET /training-plans/search?organised_by=` (no filter — fetch all plans for the dropdown)
3. Pre-fill all form inputs with the returned values
4. If fetch fails: show error message + Retry button inside modal body

### On Save (`saveTrainingEdit(id)`)
1. Collect full payload from all form fields (same approach as `create-training.js` — send all fields, not just diffs)
2. Disable Save button, show spinner
3. Call `PUT /solutions/:id` via proxy with the payload
4. On success: show success toast ("Training updated ✓"), close modal after 1.5s, update the training row in the table with changed name/dates from the form
5. On error: show inline error in modal footer, re-enable Save button, keep modal open

### Proxy Changes
- `GET /solutions/:id` — already exists (`crm-proxy.js:125-134`), no changes needed
- `PUT /solutions/:id` — already exists (`crm-proxy.js:112-123`), no changes needed
- `GET /training-plans/search` — already exists (`crm-proxy.js:285-291`), no changes needed

---

## Section 4: Code Organization

### Files Modified

| File | Change |
|------|--------|
| `portal/js/app.js` | Replace Manage link at line 536; add `toggleEditDropdown()`, `openEditModal()`, `closeEditModal()`, `loadTrainingForEdit()`, `saveTrainingEdit()`, `buildAccordionSection()`, facilitator slot helpers, document click-outside listener |
| `portal/portal.html` | Add hidden modal HTML at bottom of body; add CSS for overlay, dropdown, accordion chevron, loading skeleton, toast, sticky modal footer |
| `portal/workers/crm-proxy.js` | No changes required |

### No new files needed.

---

## Verification

1. Open portal at `aktivasia-portal.pages.dev/portal?country=PH`
2. Go to Training Report tab — confirm "Edit ▾" button appears for trainings with an ID, and `—` for those without
3. Click Edit ▾ — confirm dropdown appears with ✏️ and 👥 items; click outside — confirm dropdown closes
4. Click 👥 Edit Participant Status — confirm navigation to `admin.html` with correct `training_id`
5. Click ✏️ Edit Training Details — confirm modal opens with loading skeleton then pre-filled form
6. Verify all accordion sections collapse/expand; Basic Info is open by default
7. Verify Countries Participated field shows/hides based on Organised By value
8. Modify a field and click Save — confirm `PUT /solutions/:id` is called, toast appears, modal closes, table row updates
9. Simulate a save error (e.g., invalid token) — confirm error message appears in footer and modal stays open
