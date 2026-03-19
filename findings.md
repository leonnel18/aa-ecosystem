# Findings — aa-ecosystem
**Last updated:** 2026-03-18

---

## Zoho CRM

### API Version
- Current stable: **v8** (`zohocrmsdk8_0`)
- Python SDK: `pip install zohocrmsdk8_0`
- GitHub: https://github.com/zoho/zohocrm-python-sdk-8.0

### Authentication
- OAuth 2.0 with refresh tokens
- Region-specific endpoints: COM | IN | EU | AU | JP | CN
- Token refresh needed before each run (or cache with `expires_at` check)

### Rate Limits
- 5,000–100,000 API calls/day (edition-dependent)
- 5–25 concurrent calls max
- COQL pagination: max 200 records per page

### Confirmed Module API Names (provided by Gino, 2026-03-18)
| API Name | Human Name | Notes |
|----------|-----------|-------|
| `Deals` | Applications | One row per applicant |
| `Accounts` | Organizations | One row per org |
| `Solutions` | Trainings | One row per training event |
| `Products` | Training Types | 4 types total |
| `Forms` | Practice Sessions | One row per session |
| `Skill_Session_Participant` | Session Participants | For Practice Sessions only |

> ⚠️ Field API names within modules (especially `Deals`) must be confirmed via `verify_crm.py` in Phase 2.

---

## Zoho Analytics

### API Version
- v2 REST API
- Python SDK: Official v2.6.0+ (not pip-installable; use `requests` directly)
- Data push: Bulk CSV import via `POST /import`
- Import mode: `TRUNCATEADD` for full refresh per run

### Authentication
- Separate OAuth client from CRM
- Different scopes required

---

## AktivAsia Design System (from aktivasia.pages.dev)

### Colors
- Primary brand: `#821545` (Dark Plum)
- CTA gradient: `#ff960b → #f93a3a` (orange-to-red)
- Background: `#ffffff` primary, `#f5f4ee` beige alternate
- Text dark: `#131625`
- Text meta: `#788099`
- Hover/light accent: `#f3e8ff`

### Typography
- Display: 800–900 weight, uppercase, large (72px desktop → 36px mobile)
- Body: 300–400 weight, 14–20px
- UI labels: 500 weight, 0.75–1rem, uppercase with letter-spacing

### Components
- Cards: `border-radius: 16px`, box-shadow, hover `-4px translateY`
- Buttons: pill shape (`border-radius: 9999px`), inline-flex with arrow icons
- Framework: Custom CSS (BEM naming), Astro-influenced
- No Bootstrap/Tailwind dependency

### Hosting
- Currently on Cloudflare Pages (`aktivasia.pages.dev`)
- Portal will be deployed to the same infrastructure

---

## WhatsApp / Twilio
- **DROPPED** from scope (2026-03-18). Not available for now.

---

## CLI Tools
- **ZDK CLI**: Beta, CRM metadata management only (Sandbox). Not used in this project.
- No CLI for Analytics or Books.
