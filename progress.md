# Progress Log — aa-ecosystem

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
