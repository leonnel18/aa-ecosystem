# Zoho Creator App — IDs & Form Link Names

**App:** AA Training Hub  
**App Link Name:** `aa-training-hub`  
**Owner account:** `aktivasia`  
**Creator URL:** `https://creator.zoho.in/appbuilder/aktivasia/aa-training-hub/`

---

## Form Link Names

| Form | Link Name | Notes |
|------|-----------|-------|
| Training Details Form | `Training_Details_Form` | Confirmed from URL |
| Pre-Application Template | `Application_Form` | Confirmed from URL |
| Post-Training Survey Template | `Post_Training_Survey` | Confirmed from URL |

---

## Cloned Form Naming Convention

When the Training Details Form is submitted, Deluge clones the templates with these link names:

| Clone | Link Name Pattern | Example |
|-------|------------------|---------|
| Pre-Application (per training) | `{TrainingTitle}_{TrainingType}_Application` | `Pandayan_Foundational_Application` |
| Post-Training Survey (per training) | `{TrainingTitle}_{TrainingType}_PostTraining` | `Pandayan_Foundational_PostTraining` |

**Source templates:**
- Pre: clone from `Application_Form`
- Post: clone from `Post_Training_Survey`

**Note:** Use the `Solution_Title` and `Training_Type` values from the Training Details Form submission to construct the link names. Strip spaces and special characters to ensure valid Creator link names.

---

## API Endpoint for Cloning Forms

```
POST https://creator.zoho.in/api/v2/aktivasia/aa-training-hub/form/{source_form_link_name}/clone
```

Deluge equivalent:
```deluge
response = zoho.creator.cloneForm("aktivasia", "aa-training-hub", "Pre_Application_Template", {"form_link_name": newLinkName});
```

---

## Status

- [x] Application_Form created (confirmed 2026-04-24)
- [x] Post_Training_Survey created (confirmed 2026-04-24)
- [ ] CRM integration connection added in Creator settings (Gino — confirm)
