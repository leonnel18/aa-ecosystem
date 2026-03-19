# Task Plan — aa-ecosystem
**Mental Folder:** [AktivAsia]
**Started:** 2026-03-18

---

## Protocol 0: Initialization ✅
- [x] Create project directory structure
- [x] Create `claude.md` (Project Constitution)
- [x] Create `task_plan.md`
- [x] Create `findings.md`
- [x] Create `progress.md`
- [x] Create `.env.example`
- [x] Create `requirements.txt`
- [x] Create `.gitignore`

---

## Phase 1: Blueprint ✅
- [x] Discovery Questions answered
- [x] CRM module names confirmed (by user)
- [x] Data schema defined in `claude.md`
- [x] Blueprint approved

---

## Phase 2: Link — API Verification
- [ ] Write `tools/verify_crm.py`
- [ ] Run `verify_crm.py` → PASS
  - [ ] Token refresh works
  - [ ] Module list printed (confirm API names)
  - [ ] Full `Deals` field list printed (confirm all field API names)
  - [ ] Sample record fetched
- [ ] Write `tools/verify_analytics.py`
- [ ] Run `verify_analytics.py` → PASS
  - [ ] Token refresh works
  - [ ] Workspace listed
  - [ ] 1-row test import succeeds
- [ ] Document confirmed field names in `claude.md`

**HALT: Do not proceed to Phase 3 until all Phase 2 items are PASS.**

---

## Phase 3: Architect — Build
- [ ] Write `architecture/01_crm_extract.md`
- [ ] Write `tools/crm_auth.py`
- [ ] Write `tools/crm_extract.py`
- [ ] Write `architecture/02_transform.md`
- [ ] Write `tools/transform.py`
- [ ] Write `architecture/03_data_writer.md`
- [ ] Write `tools/data_writer.py`
- [ ] Write `architecture/04_analytics_push.md`
- [ ] Write `tools/analytics_push.py`
- [ ] Write `architecture/06_orchestrator.md`
- [ ] Write `tools/orchestrator.py`
- [ ] End-to-end test: `python orchestrator.py --portal PH`
- [ ] Verify `.tmp/PH_report_payload.json` shape is correct
- [ ] Verify `data/dashboard_data.json` generated

---

## Phase 4: Stylize — Portal
- [ ] Write `architecture/05_portal.md`
- [ ] Write `portal/css/style.css` (AktivAsia design system)
- [ ] Write `portal/js/charts.js` (Chart.js wrappers)
- [ ] Write `portal/js/app.js` (data loading + routing)
- [ ] Write `portal/index.html` (country selector landing)
- [ ] Write `portal/portal.html` (country portal)
- [ ] Write `portal/backbone.html` (regional portal)
- [ ] UAT: all 5 portals render with real data
- [ ] Gino reviews and approves portal design

---

## Phase 5: Trigger — Deploy
- [ ] Write `run_pipeline.bat`
- [ ] Write `register_task.bat`
- [ ] Run `register_task.bat` → task scheduler registered
- [ ] Connect Cloudflare Pages to repo
- [ ] Push and verify auto-deploy works
- [ ] Add Maintenance Log entry to `claude.md`
