# Training Plans ↔ Actual Trainings — 2026 connection lists

_Built from three sources on 2026-11-23: the **ALL TEAMS Calendar** sheet (Tara 25-27 Action Plan), Zoho **Training Plans** (167 records), Zoho **Trainings** (136 records) and the Zoho **Applications** stages for trainings since Sep-2025 (881 rows). Everything here is read-only — nothing in Zoho was changed._

## What we found

1. **The link already exists in Zoho, it just isn't filled in.** Trainings have a `Training Title Plan` field (a lookup to Training Plans). Only **20 of 136** trainings use it. Plans also have a `Training Title Actual` lookup, but it is a *separate* field — filling one side does not fill the other.
2. **The sheet already pairs them.** Its *Activity Code* column is the plan name and its *Actual Activity Name* column is the Zoho training title. 29 sheet rows have an actual; **15 are linked in Zoho, 5 are not linked, 9 have no Zoho record at all.**
3. **The pipeline never used the link** (it listed plans and trainings side by side). It also dropped every Philippines plan because the Zoho picklist spells it `Phillippines`. Both are fixed in `tools/transform.py` (takes effect at the next daily refresh).
4. **Attendance was under-counted.** The code still looked for the old stage spelling `Attended Traning`; the CRM now says `Attended Training`. Fixed. Pakistan shows 0 graduates but 30 + 1 attended — their stages were never moved to *Graduated*.

## 1. The 29 sheet pairs — link status and participants

Target = sheet target (Zoho plan target is the same wherever it is filled in). *Sheet actual* is what the team reported; *Zoho* is counted from Application stages.

| Region | Plan (sheet / Zoho) | Actual training | Target | Sheet actual | Zoho applied | Zoho attended | Zoho graduated | Attended vs target | Link in Zoho |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Pakistan | Movement Building event - Oct-25 | 1 day dialogue/workshop for cross-movement solidarity on Cli | 5 | 15 | 0 | 0 | 0 | 0% | ✅ Linked |
| Indonesia | Belantara - Kaltara (North Kalimantan) | Belantara X Setara 2025 | 25 | 21 | 26 | 20 | 20 | 80% | ✅ Linked |
| Indonesia | Belantara 1 (JAVA) | Belantara Jawa 2025 | 25 | 25 | 54 | 31 | 31 | 124% | ✅ Linked |
| Philippines | Kapihan 1 (Alumni & partners knowledge/skill share sessions) | Kapihan Session 1: “Climate Change or Flood Control?” | 15 | 27 |  |  |  |  | ⚠️ No Zoho record |
| Korea | Facilitation skill workshop PPF5 - Nov-25 | Facilitation Skill Workshop | 6 | 4 | 7 | 4 | 4 | 67% | ❌ Not linked |
| Korea | Pado Power Fellowship #5 | Pado Power Fellowship Batch 5 | 15 | 17 | 21 | 16 | 16 | 107% | ✅ Linked |
| Korea | Coalition collaboration training Y1 - KBF | KBF Annual Conference Meeting | 50 | 103 |  |  |  |  | ⚠️ No Zoho record |
| Korea | Peer Learning Session #1 | Peer Learning Session - PPF5 follow up | 15 | 15 |  |  |  |  | ⚠️ No Zoho record |
| Korea | CSO training for GreenUnited Y1 #1 | GreenKoreaUnited Campaign Strategy Workshop | 30 | 12 | 10 | 10 | 10 | 33% | ✅ Linked |
| Pakistan | Foundational 0.1 | Foundational Training in Karachi 2026 | 25 | 27 | 27 | 1 | 0 | 4% | ✅ Linked |
| Philippines | AktivAsia Tagpuan PH YR 1 - Feb-26 | AktivAsia Tagpuan 2026 PH Collective | 15 | 15 |  |  |  |  | ⚠️ No Zoho record |
| Philippines | Pandayan Bespoke Training 1 YR 1.0 | Pandayan Training on Campaigning and Organizing with Baguio  | 15 | 16 | 19 | 19 | 19 | 127% | ✅ Linked |
| Philippines | Campaign Strategy Project 1 (Sept 25 - April 26) - Sep-25 | The Green Covenant Network CN Strategic Planning Workshop  + |  | 28 |  |  |  |  | ⚠️ No Zoho record |
| Philippines | Pandayan Bespoke Training 2 YR 1.0 | KASARIG: Strengthening Youth Participation and Campaigns | 15 | 20 | 22 | 5 | 5 | 33% | ✅ Linked |
| Korea | Facilitation skill workshop PPF6 - May-26 | Facilitation skill workshop PPF6 | 6 | 4 |  |  |  |  | ⚠️ No Zoho record |
| Korea | Pado Power Fellowship #6 - Jun-26 | Pado Power Fellowship Batch 6 | 15 | 11 | 12 | 10 | 10 | 67% | ❌ Not linked |
| Pakistan | Foundational 1.1 | 2026 Pakistan Foundational Traning | 25 | 30 | 62 | 30 | 0 | 120% | ❌ Not linked |
| Philippines | Pandayan Bespoke Training 3 YR 1 (15 participants) - Aug-26 | Pandayan with PILCD and CYDO |  | 16 |  |  |  |  | ⚠️ No Zoho record |
| Indonesia | NEXT KSN Training (Foundational) | NEXT X KSN: SEKAR 2025 | 10 | 10 | 18 | 10 | 10 | 100% | ✅ Linked |
| Indonesia | Temu Bumi with Pundi Asa | Temu Bumi with Pundi Asa | 15 | 15 | 16 | 15 | 15 | 100% | ✅ Linked |
| Indonesia | TOT 1 (KALIMANTAN) | Katalis Kalimantan 2025 | 20 | 15 | 14 | 14 | 14 | 70% | ✅ Linked |
| Indonesia | TOT 2 (SULAWESI) | TOT 2 (SULAWESI) | 20 | 17 | 18 | 18 | 18 | 90% | ✅ Linked |
| Regional | Strategic Team Meeting 2026 | Strategic Meeting and Curriculum Dev | 20 | 20 |  |  |  |  | ⚠️ No Zoho record |
| Regional | Feminist Leadership 2026 | Gender Equity Leadership Program | 30 | 29 | 67 | 29 | 29 | 97% | ✅ Linked |
| Philippines | Pandayan Bespoke Training 3 YR 1 (15 participants) - Aug-26 | PAGBIRIK: Campaigners' Training (11+17) |  | 17 | 22 | 15 | 15 |  | ✅ Linked |
| Indonesia | Semesta | Semesta | 30 | 27 | 30 | 27 | 27 | 90% | ❌ Not linked |
| Indonesia | Belantara x Rhizoma | Belantara x Rhizoma | 25 | 12 | 19 | 13 | 13 | 52% | ❌ Not linked |
| Regional | Feminist Leadership 2026 | Gender Equity Leadership Program - Online Session | 30 | 27 |  |  |  |  | ⚠️ No Zoho record |
| Regional | Taiwan CSO Fellowship 2026 | 2026 Taiwan Campaign Strategy Workshop | 30 | 22 | 17 | 13 | 13 | 43% | ✅ Linked |

## 2. Links to set in Zoho

Set this on the **Training** record: open it → field **Training Title Plan** → choose the plan. One plan can have several trainings (e.g. Taiwan fellowship), so use the Training side, not the plan side.

_Semesta and Belantara x Rhizoma are marked **Unplanned** in the sheet, so there is no plan to link them to._

| Confidence | Training (Zoho) | Set Training Title Plan to | Why |
|---|---|---|---|
| Sheet-confirmed | Facilitation Skill Workshop (Korea) | Facilitation skill workshop PPF5 - Nov-25 | Sheet pairs them |
| Sheet-confirmed | Pado Power Fellowship Batch 6 (Korea) | Pado Power Fellowship #6 - Jun-26 | Sheet pairs them |
| Sheet-confirmed | 2026 Pakistan Foundational Traning (Pakistan) | Foundational 1.1 | Sheet pairs them |
| Medium - confirm | Belantara Lestara 2026 (Indonesia) | Belantara 7 (sheet: "Belantara 7 (Southeast Sulawesi)") | Name/date match, not in sheet pair list |
| High | 녹색철강네트워크 워크숍 (Coalition collaboration training - GreenSteelN (Korea) | Coalition collaboration training Y2 - GreenSteel - Oct-26 | Name/date match, not in sheet pair list |
| High | Facilitation skill workshop PPF7 (Korea) | Facilitation skill workshop PPF7 - Oct-26 | Name/date match, not in sheet pair list |
| High | Pado Power Fellowship Batch 7 (Korea) | Pado Power Fellowship #7 - Nov-26 | Name/date match, not in sheet pair list |
| Low - confirm | Pagbirik: Bicol Youth Campaigner's Training (Philippines) | Pandayan Bespoke Training 4 YR 1 (15 participants) - Sep-26 | Name/date match, not in sheet pair list |

## 3. In the sheet as done, but no matching training in Zoho

These happened (per the team) but there is no Training record, so nothing can be linked or counted. Create the Training in Zoho (or tell me they are internal and should stay out of the portal).

| Region | Plan | Actual activity (sheet) | Date | Participants (sheet) |
|---|---|---|---|---:|
| Philippines | Kapihan 1 (Alumni & partners knowledge/skill share sessions) | Kapihan Session 1: “Climate Change or Flood Control?” | 5 Dec 2025 | 27 |
| Korea | Coalition collaboration training Y1 - KBF | KBF Annual Conference Meeting | 15 Dec 25 | 103 |
| Korea | Peer Learning Session #1 | Peer Learning Session - PPF5 follow up | 3 April 2026 | 15 |
| Philippines | AktivAsia Tagpuan PH YR 1 - Feb-26 | AktivAsia Tagpuan 2026 PH Collective | 30 Mar 2026 | 15 |
| Philippines | Campaign Strategy Project 1 (Sept 25 - April 26) - Sep-25 | The Green Covenant Network CN Strategic Planning Workshop  + Pagbirik: | 22 Jan 2026 | 28 |
| Korea | Facilitation skill workshop PPF6 - May-26 | Facilitation skill workshop PPF6 | 26 Jun 2026 | 4 |
| Philippines | Pandayan Bespoke Training 3 YR 1 (15 participants) - Aug-26 | Pandayan with PILCD and CYDO | 28 Nov 2025 | 16 |
| Regional | Strategic Team Meeting 2026 | Strategic Meeting and Curriculum Dev | 9 February | 20 |
| Regional | Feminist Leadership 2026 | Gender Equity Leadership Program - Online Session |  | 27 |

_Note: "Pandayan with PILCD and CYDO" (28 Nov 2025, 16 people) may be the same event as Zoho's "Pandayan with Local Groups in Calbayog, Samar" (28–29 Nov 2025) — please confirm; "Gender Equity Leadership Program – Online Sessions" is part of the same Zoho GELP record._

## 4. Zoho trainings in 2026 that have no plan

| Region | Training | Start | Applied | Attended | Graduated | Suggested plan |
|---|---|---|---:|---:|---:|---|
| Indonesia | Belantara Lestara 2026 | 2026-11-10 | 19 | 19 | 19 | Belantara 7 (sheet: "Belantara 7 (Southeast Sulawesi)") (Medium - confirm) |
| Korea | 녹색철강네트워크 워크숍 (Coalition collaboration training - GreenSteelN | 2026-10-21 | 9 | 9 | 9 | Coalition collaboration training Y2 - GreenSteel - Oct-26 (High) |
| Korea | Facilitation skill workshop PPF7 | 2026-10-23 | 0 | 0 | 0 | Facilitation skill workshop PPF7 - Oct-26 (High) |
| Korea | Campaign Clinic for Climate Action NOW (PPF6 Follow up Works | 2026-10-30 | 0 | 0 | 0 | — none obvious (unplanned / needs your call) |
| Korea | Campaign Clinic for IGT (PPF6 Follow up Workshop) | 2026-11-05 | 0 | 0 | 0 | — none obvious (unplanned / needs your call) |
| Korea | Peer Learning Session 배움나눔터 세션 피드백 | 2026-11-06 | 0 | 0 | 0 | — none obvious (unplanned / needs your call) |
| Korea | Campaign Clinic for YSHS KFEM (PPF6 Follow up Workshop) | 2026-11-10 | 0 | 0 | 0 | — none obvious (unplanned / needs your call) |
| Korea | Pado Power Fellowship Batch 7 | 2026-11-30 | 18 | 0 | 0 | Pado Power Fellowship #7 - Nov-26 (High) |
| Philippines | Pagbirik: Bicol Youth Campaigner's Training | 2026-10-01 | 21 | 5 | 5 | Pandayan Bespoke Training 4 YR 1 (15 participants) - Sep-26 (Low - confirm) |
| Philippines | Youth Leadership Training for Active Citizen Science on Sust | 2026-10-23 | 11 | 11 | 11 | — none obvious (unplanned / needs your call) |
| Regional | 2026 Taiwan Campaign Strategy and Organising Fellowship - Re | 2026-06-12 | 11 | 8 | 8 | already linked: Taiwan CSO Fellowship 2026 |
| Regional | Gender Equity Leadership Program - Symposium | 2026-09-09 | 0 | 0 | 0 | — none obvious (unplanned / needs your call) |
| Regional | Bangkok Climate Action Week 2026 (BKKCAW) | 2026-10-07 | 152 | 0 | 0 | — none obvious (unplanned / needs your call) |
| Regional | Climate Finance Training | 2026-10-12 | 0 | 0 | 0 | — none obvious (unplanned / needs your call) |
| Regional | PowerShift Asia | 2026-10-12 | 90 | 25 | 25 | — none obvious (unplanned / needs your call) |

_The three Korea "Campaign Clinic" follow-ups and the Peer Learning Session (배움나눔터) have 0 applications in Zoho. Sheet note says Peer Learning Session #2 was "postponed to October", but the CRM plan names are numbered differently (CRM #2 = Jan-26, #3 = Jul-26; sheet #1 = Jan-26, #2 = Jul-26) — decide which plan record is right before linking._

## 5. Planned in 2025-26 but still open

Sheet rows in the Sep-25 → Dec-26 window with no actual yet (excludes operations, unfunded and equipment lines).

| Region | Plan | Month | Target | Note |
|---|---|---|---:|---|
| Indonesia | Alumni Gathering 26 | Aug-26 | 50 |  |
| Indonesia | Belantara 2 (NORTH MALUKU) | Jan-26 | 25 |  |
| Indonesia | Belantara 3 (CENTRAL SULAWESI) | Apr-26 | 25 |  |
| Indonesia | Belantara 5 (BANTEN) | Oct-26 | 25 |  |
| Indonesia | Belantara 7 (SOUTHEAST SULAWESI) | Nov-26 | 25 |  |
| Philippines | AA Young Women's Leadership YR 1 | May-26 | 15 | Postponed for Year 2 |
| Korea | CSO training for KFEM Y1 #2 | Jun-26 | 25 | Postponed to October |
| Philippines | AA Pamitinan Foundational YR 1 | Jun-26 | 15 | Postponed for Year 2 |
| Korea | Peer Learning Session #2 | Jul-26 | 15 | Postponed to October |
| Philippines | AA Sanayan Facilitators' Skillshare YR 1 | Jul-26 | 10 | Postponed for Year 2 |
| Pakistan | Movement Building event - Jun-26 | Oct-26 | 5 |  |
| Korea | Coalition collaboration training Y2 - GreenSteel | Oct-26 | 20 |  |
| Korea | Facilitation skill workshop PPF7 | Oct-26 | 6 |  |
| Philippines | Kapihan 4 (Alumni & partners knowledge/skill share sessions) | Nov-26 | 15 |  |
| Korea | Pado Power Fellowship #7 | Nov-26 | 15 |  |
| Philippines | Regional events e.g. Asia Energy Network, ADB NGO Week, APNE | Nov-26 |  |  |
| Korea | Coalition collaboration training Y2 - KBF | Dec-26 | 50 |  |
| Indonesia | TOT 3 (JAVA) | Sep-26 | 20 |  |

## 6. How to connect the dots

**Option A — by hand in Zoho (safest, ~10 minutes):** use `docs/plan-actual-link-updates.csv`. For each row: Trainings → open the training → *Training Title Plan* → pick the plan → Save. Do the *Sheet-confirmed* rows first, then the High-confidence ones.

**Option B — I do it for you:** I can update `Training_Title_Plan` on those Zoho Training records through the Zoho connector. That is a CRM write, so per your rule I'll only do it after you say so — and I'd start with the *Sheet-confirmed* rows only.

**After linking:** the portal can then show each plan with its actual, target and attended/graduated counts. The next step in the pipeline is to read `Training_Title_Plan` instead of listing the two side by side — I haven't changed that yet because it only pays off once the links are filled in.

**Housekeeping that makes this stick:**
- Fix the plan date glitch: many plans have an *End Date* a day before the *Start Date* (e.g. 2026-04-01 → 2026-03-31).
- Rename the picklist value `Phillippines` → `Philippines` in Training Plans › Organised By.
- Move people from *Attended Training* to *Graduated…* once the post-survey is done (Pakistan: 31 attended, 0 graduated).
- Align sheet and Zoho names (Peer Learning Session numbering; the sheet's `Activity #` is duplicated across rows, so the name is the reliable key).
