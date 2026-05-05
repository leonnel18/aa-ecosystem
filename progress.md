# Progress Log — aa-ecosystem

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
