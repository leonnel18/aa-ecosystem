"""
All text content for the AktivAsia Portal User Guide & SOP (.docx).
"""

COVER = {
    "title": "AktivAsia Portal",
    "subtitle": "User Guide & Standard Operating Procedure",
    "tagline": "For Country Teams & Leadership",
    "author": "Gideon Noel Valera",
    "role": "Digital Projects Manager | Regional Team",
    "date": "May 2026",
    "version": "Version 1.0",
}

SECTIONS = [
    {
        "heading": "1. Welcome 👋",
        "intro": (
            "Welcome to the AktivAsia Portal User Guide! This document is your "
            "step-by-step companion for using the AktivAsia training portal — from "
            "reading your country's reports to managing applicants and creating new trainings."
        ),
        "subsections": [
            {
                "title": "Who Is This Guide For?",
                "body": (
                    "This guide is written for:\n"
                    "• 🇵🇭 🇵🇰 🇰🇷 🇮🇩  Country Teams — the people who run trainings on the ground\n"
                    "• 🌐  Country Leads — leaders overseeing training programmes\n"
                    "• 🏢  Regional Team — the backbone team supporting all countries\n\n"
                    "You do not need any technical background to use this guide."
                ),
            },
            {
                "title": "How To Use This Guide",
                "body": (
                    "Jump to the section you need — you don't have to read it all at once!\n\n"
                    "📖  Reading the portal? → Go to Section 3 & 4\n"
                    "⚙️  Managing a training? → Go to Section 5\n"
                    "➕  Creating a new training? → Go to Section 6\n"
                    "📋  Sharing application or survey forms? → Go to Section 7\n"
                    "🔔  Questions about automatic reminders? → Go to Section 8\n"
                    "❓  Looking for a definition? → Go to the Glossary in Section 9"
                ),
            },
        ],
    },
    {
        "heading": "2. What Is the AktivAsia Portal? 🌏",
        "intro": (
            "The AktivAsia Portal is a live online dashboard that shows you all the data "
            "about your trainings — in one place, updated automatically, and easy to read."
        ),
        "subsections": [
            {
                "title": "Why Does It Exist?",
                "body": (
                    "Before the portal, tracking applicants, graduates, and training impact "
                    "meant collecting data manually — through spreadsheets, emails, and separate "
                    "survey tools. The portal replaces all of that.\n\n"
                    "✅  No more manual data collection\n"
                    "✅  Real-time visibility for country teams and leadership\n"
                    "✅  Consistent reports across all countries\n"
                    "✅  All applicant and training data in one secure place"
                ),
            },
            {
                "title": "The 5 Portals",
                "body": (
                    "There is one portal for each country, plus a regional overview:\n\n"
                    "🇵🇭  Philippines Portal (PH)\n"
                    "🇵🇰  Pakistan Portal (PK)\n"
                    "🇰🇷  Korea Portal (KR)\n"
                    "🇮🇩  Indonesia Portal (ID)\n"
                    "🌐  Backbone Portal — shows data from ALL countries combined\n\n"
                    "Each country team sees their own portal with their own data."
                ),
            },
            {
                "title": "How Does the Data Flow?",
                "body": (
                    "Here is the simple journey of data from an applicant to the portal:\n\n"
                    "  [1] Applicant fills in the application form\n"
                    "         ↓\n"
                    "  [2] Country team reviews and selects participants\n"
                    "         ↓\n"
                    "  [3] Training takes place — attendance is recorded\n"
                    "         ↓\n"
                    "  [4] Graduates are tracked and post-survey is sent\n"
                    "         ↓\n"
                    "  [5] 6-Month Impact Evaluation is sent to graduates\n"
                    "         ↓\n"
                    "  [6] All of this appears automatically in the portal 📊\n\n"
                    "You do not need to update anything manually — the portal refreshes automatically."
                ),
            },
        ],
    },
    {
        "heading": "3. Navigating the Portal 🗺️",
        "intro": "This section walks you through how to open the portal and find your way around.",
        "subsections": [
            {
                "title": "Step 1 — Open the Portal",
                "body": (
                    "1. Open your web browser (Chrome, Edge, or Firefox recommended)\n"
                    "2. Go to: https://aktivasia.pages.dev\n"
                    "3. You will see the Landing Page — this is the home screen showing all 5 portals"
                ),
            },
            {
                "title": "Step 2 — The Landing Page",
                "body": (
                    "The Landing Page gives you a quick overview of the entire AktivAsia ecosystem:\n\n"
                    "🔢  Grand Total Numbers — At the top, you'll see the combined totals across "
                    "all countries: total applicants, total graduates, and more.\n\n"
                    "🗂️  Portal Cards — Below the totals, you will see 5 cards — one for each "
                    "country portal and one for the Backbone (Regional). Each card shows a "
                    "quick summary of that country's numbers.\n\n"
                    "👆  Click any card to open that country's portal."
                ),
            },
            {
                "title": "Step 3 — Your Country Portal: The 4 Tabs",
                "body": (
                    "Once you open your country portal, you will see 4 tabs at the top of the page. "
                    "Click any tab to switch between views:\n\n"
                    "📊  Overview — Your key numbers at a glance (applicants, graduates, trends)\n"
                    "📅  Training Plan — All trainings: what's planned, what's completed\n"
                    "💡  Impact — How participants rated their learning experience\n"
                    "👥  Demographics — Who your participants are (gender, age, region)\n\n"
                    "Each tab is explained in detail in Section 4."
                ),
            },
        ],
    },
    {
        "heading": "4. How To: Read Your Reports 📈",
        "intro": (
            "This section explains each of the 4 report tabs — what every number means "
            "and what to look for."
        ),
        "subsections": [
            {
                "title": "4.1 — Overview Tab 📊",
                "body": (
                    "The Overview tab is your dashboard summary. It tells you the health of your "
                    "training programme at a glance.\n\n"
                    "What you'll see:\n\n"
                    "🔢  Total Applicants\n"
                    "    What it means: The total number of people who submitted an application "
                    "for any training in your country — ever, since the system began.\n\n"
                    "🎓  Total Graduates\n"
                    "    What it means: The number of participants who completed a training AND "
                    "finished the post-training survey. This is your main success metric.\n\n"
                    "⏳  Ongoing Participants\n"
                    "    What it means: Participants who have been selected for an upcoming or "
                    "current training but haven't yet graduated.\n\n"
                    "📉  Application Funnel\n"
                    "    What it means: A step-by-step breakdown of how many people moved "
                    "through each stage:\n"
                    "    Applied → Attended Training → Graduated → Completed 6-Month Evaluation\n"
                    "    This tells you where people are dropping off in the journey.\n\n"
                    "📆  Year-Over-Year Trend\n"
                    "    What it means: A chart showing applicant and graduate numbers by year. "
                    "Use this to see if your programme is growing.\n\n"
                    "⚠️  If a number looks wrong: Do not edit anything. Contact the Regional Team "
                    "at gideon.valera@gmail.com."
                ),
            },
            {
                "title": "4.2 — Training Plan Tab 📅",
                "body": (
                    "The Training Plan tab shows you all trainings — both planned and completed.\n\n"
                    "What you'll see:\n\n"
                    "📋  Trainings by Type\n"
                    "    What it means: A table showing how many trainings of each type have been "
                    "conducted vs. how many were planned.\n"
                    "    The 4 training types are:\n"
                    "    • Foundational Training\n"
                    "    • Training of Trainers (TOT)\n"
                    "    • Feminist Leadership\n"
                    "    • Public Narrative\n\n"
                    "🧑‍🤝‍🧑  Practice Sessions\n"
                    "    What it means: The number of practice/skills sessions held, along with "
                    "a list of each session — its name, date, and how many people attended.\n\n"
                    "📌  Upcoming Trainings\n"
                    "    What it means: Trainings that are planned but not yet completed. "
                    "Shows the training name, type, and planned date.\n\n"
                    "✅  Completed Trainings\n"
                    "    What it means: A list of all past trainings with their dates, "
                    "number of applicants, and number of graduates.\n\n"
                    "⚠️  If a training is missing: The training may not have been created in the "
                    "system yet. See Section 6 on how to create a training."
                ),
            },
            {
                "title": "4.3 — Impact Tab 💡",
                "body": (
                    "The Impact tab shows how participants rated their skills and confidence — "
                    "before training, right after, and 6 months later.\n\n"
                    "What you'll see:\n\n"
                    "📊  Likert Scale Charts (Skills Rating)\n"
                    "    What it means: Participants rated themselves on 4 skill areas using a "
                    "1–5 scale (1 = Strongly Disagree, 5 = Strongly Agree). The chart shows "
                    "the average score Before Training, After Training, and at 6 Months.\n\n"
                    "    The 4 skill areas are:\n"
                    "    • 🎯 Strategy & Tactics\n"
                    "    • 📢 Communication Strategy\n"
                    "    • 🙋 Facilitating Workshops & Meetings\n"
                    "    • 🤝 Building Connections\n\n"
                    "    What to look for: You want to see the score go UP from Pre → Post. "
                    "A rising score means participants felt more confident after training. "
                    "The 6-Month score tells you if that growth lasted.\n\n"
                    "💬  Post-Survey Feedback\n"
                    "    What it means: Written responses from participants right after training. "
                    "Includes: what went well, what they learned, their action plans, and "
                    "suggestions for improvement.\n\n"
                    "🔍  6-Month Impact Evaluation\n"
                    "    What it means: Responses from graduates 6 months after training — "
                    "how they applied their learning, whether it changed their work, and "
                    "what impact they've had.\n\n"
                    "⚠️  If 6-Month scores are missing: The evaluation may not have been sent "
                    "yet, or participants have not responded. The system sends reminders automatically."
                ),
            },
            {
                "title": "4.4 — Demographics Tab 👥",
                "body": (
                    "The Demographics tab shows who your participants are.\n\n"
                    "What you'll see:\n\n"
                    "⚥  By Gender\n"
                    "    What it means: A breakdown of all applicants by gender "
                    "(Male, Female, Other). Use this to check for gender balance in your programme.\n\n"
                    "🎂  By Age Group\n"
                    "    What it means: Applicants grouped by age:\n"
                    "    • 18–24 years old\n"
                    "    • 25–34 years old\n"
                    "    • 35–44 years old\n"
                    "    • 45+ years old\n"
                    "    Use this to understand which age groups you are reaching most.\n\n"
                    "📍  By Region\n"
                    "    What it means: A breakdown of applicants by city or province within "
                    "your country. Use this to see if you are reaching different parts of the country "
                    "or if participation is concentrated in one area.\n\n"
                    "⚠️  If numbers look too low: Demographics are based on the information "
                    "applicants filled in on the application form. Missing data means some "
                    "applicants did not complete all fields."
                ),
            },
        ],
    },
    {
        "heading": "5. How To: Manage a Training (Admin Panel) ⚙️",
        "intro": (
            "The Admin Panel is where you manage what happens to each applicant after they apply. "
            "It has 3 steps: Select applicants → Mark attendance → Track graduates. "
            "You must complete each step in order."
        ),
        "subsections": [
            {
                "title": "5.1 — How to Open the Admin Panel",
                "body": (
                    "1. Open your country portal in your browser\n"
                    "   (e.g., https://aktivasia.pages.dev/portal.html?country=PH)\n\n"
                    "2. Click the '📅 Training Plan' tab at the top of the page\n\n"
                    "3. Find the training you want to manage in the list of trainings\n\n"
                    "4. On the right side of that training row, click the orange "
                    "'⚙️ Manage Training' button\n\n"
                    "5. The Admin Panel will open. At the top you will see:\n"
                    "   • The training name and dates\n"
                    "   • 3 tabs: Selection | Attendance | Graduates\n\n"
                    "ℹ️  You are now inside the Admin Panel for that specific training. "
                    "Any changes you make here only affect this training."
                ),
            },
            {
                "title": "5.2 — Step 1: Selecting Applicants (Selection Tab)",
                "body": (
                    "Use this step after the application window closes to decide who joins the training.\n\n"
                    "1. Click the 'Selection' tab at the top of the Admin Panel\n\n"
                    "2. You will see a list of everyone who applied. Each row shows:\n"
                    "   • The applicant's name\n"
                    "   • Their organization\n"
                    "   • A status dropdown on the right\n\n"
                    "3. For each applicant, click the dropdown and choose:\n"
                    "   ✅  'Selected' — this person will join the training\n"
                    "   ❌  'Rejected' — this person will not be selected\n\n"
                    "4. To select all applicants at once:\n"
                    "   Click the '✅ Select All' button at the top of the list\n\n"
                    "5. To reject all applicants at once:\n"
                    "   Click the '❌ Reject All' button at the top of the list\n\n"
                    "6. When you are done reviewing all applicants:\n"
                    "   Click the orange 'Save Changes' button at the bottom right of the page\n\n"
                    "7. A green success message will appear at the top of the screen.\n"
                    "   This means your selections have been saved. ✅\n\n"
                    "⚠️  Important: Do not close the page before clicking Save Changes. "
                    "Unsaved changes will be lost."
                ),
            },
            {
                "title": "5.3 — Step 2: Marking Attendance (Attendance Tab)",
                "body": (
                    "Use this step on or after training day to record who showed up.\n\n"
                    "1. Click the 'Attendance' tab at the top of the Admin Panel\n\n"
                    "2. You will see only the applicants you previously marked as 'Selected'\n"
                    "   (Rejected applicants do not appear here)\n\n"
                    "3. For each participant, click the dropdown and choose:\n"
                    "   ✅  'Attended Training' — they came to the training\n"
                    "   ❌  'Rejected or Not Attended' — they were selected but did not attend\n\n"
                    "4. Go through the full list and mark each person\n\n"
                    "5. Click the orange 'Save Changes' button at the bottom right\n\n"
                    "6. A green success message confirms your attendance records are saved. ✅\n\n"
                    "ℹ️  Tip: Only participants marked as 'Attended Training' will appear as "
                    "potential graduates in the next step."
                ),
            },
            {
                "title": "5.4 — Step 3: Tracking Graduates (Graduates Tab)",
                "body": (
                    "Use this step after the post-training survey has been sent and completed.\n\n"
                    "1. Click the 'Graduates' tab at the top of the Admin Panel\n\n"
                    "2. You will see all participants who attended the training\n\n"
                    "3. For each participant who has completed the post-training survey,\n"
                    "   click the dropdown and choose:\n"
                    "   🎓  'Graduated or Post Evaluation Completed'\n\n"
                    "4. At the top of the page, you will see a progress bar showing:\n"
                    "   '6-Month Evaluation: X of Y completed'\n"
                    "   This bar fills up automatically as graduates complete their 6-month survey.\n"
                    "   You do not need to update this manually.\n\n"
                    "5. To sort the list alphabetically:\n"
                    "   Click '🔼 A → Z' or '🔽 Z → A' at the top of the list\n\n"
                    "6. Click the orange 'Save Changes' button when done. ✅\n\n"
                    "ℹ️  The portal will reflect updated graduate counts after the next "
                    "data refresh (within 24 hours)."
                ),
            },
        ],
    },
    {
        "heading": "6. How To: Create a New Training ➕",
        "intro": (
            "Use this form when you need to add a new training to the system. "
            "Once created, the training will appear in the portal and applicants can register."
        ),
        "subsections": [
            {
                "title": "Step-by-Step: Creating a Training",
                "body": (
                    "1. Open your browser and go to the Create Training page:\n"
                    "   https://aktivasia.pages.dev/create-training.html\n\n"
                    "2. Fill in the Training Title\n"
                    "   Use the official name format, e.g.:\n"
                    "   'PH Foundational Training — Batch 3'\n\n"
                    "3. Select the Training Type from the dropdown:\n"
                    "   • Foundational Training\n"
                    "   • Training of Trainers (TOT)\n"
                    "   • Feminist Leadership\n"
                    "   • Public Narrative\n\n"
                    "4. Select the Country\n"
                    "   Choose your country from the 'Organised By' dropdown:\n"
                    "   Philippines / Pakistan / Korea / Indonesia / Regional\n\n"
                    "5. Enter the Start Date and End Date\n"
                    "   Click each date field and select from the calendar picker.\n\n"
                    "6. Enter the Target Number of Participants\n"
                    "   Type in the maximum number of people you plan to train.\n\n"
                    "7. Set Application Form Dates\n"
                    "   • Application Open Date — when applicants can start registering\n"
                    "   • Application Close Date — when registration closes\n\n"
                    "8. Set Post-Survey Dates\n"
                    "   • Post-Survey Open Date — when the feedback form opens (usually = training end date)\n"
                    "   • Post-Survey Close Date — when feedback submissions close\n\n"
                    "9. Review all fields carefully before submitting.\n"
                    "   Double-check the country, dates, and training type.\n\n"
                    "10. Click the orange 'Create Training' button at the bottom of the form\n\n"
                    "11. A confirmation message will appear:\n"
                    "    '✅ Training created successfully!'\n"
                    "    The training is now in the system.\n\n"
                    "12. The training will appear in the portal within 24 hours\n"
                    "    (after the next automatic data refresh).\n\n"
                    "⚠️  If you see an error message: Do not submit the form again. "
                    "Take a screenshot and contact the Regional Team."
                ),
            },
        ],
    },
    {
        "heading": "7. How To: Share Application & Survey Forms 📋",
        "intro": (
            "The application form is how people register for a training. "
            "The post-survey form is how graduates give feedback after the training. "
            "This section explains when and how to share both."
        ),
        "subsections": [
            {
                "title": "The Application Form",
                "body": (
                    "Each country has its own application form link:\n\n"
                    "🇵🇭  Philippines: https://aktivasia.pages.dev/apply-ph.html\n"
                    "🇵🇰  Pakistan:     https://aktivasia.pages.dev/apply-pk.html\n"
                    "🇰🇷  Korea:        https://aktivasia.pages.dev/apply-kr.html\n"
                    "🇮🇩  Indonesia:    https://aktivasia.pages.dev/apply-id.html\n"
                    "🌐  Regional:    https://aktivasia.pages.dev/apply-regional.html\n\n"
                    "When to share it:\n"
                    "Share the link as soon as your training's Application Open Date arrives. "
                    "Stop sharing it on the Application Close Date.\n\n"
                    "What applicants fill in:\n"
                    "• Full name, email, phone number\n"
                    "• Organization and position\n"
                    "• Gender and date of birth\n"
                    "• City / Province (specific to their country)\n"
                    "• Why they are interested in the training\n"
                    "• A short self-assessment (optional Likert scale questions)\n\n"
                    "How to share the link:\n"
                    "Copy the link above and paste it in your WhatsApp group, email, "
                    "Facebook post, or any communication channel your community uses.\n\n"
                    "ℹ️  You can share the same link for multiple training batches — "
                    "applicants select which training they are applying for inside the form."
                ),
            },
            {
                "title": "The Post-Survey Form",
                "body": (
                    "The post-survey is sent to participants after training ends to collect "
                    "their feedback and skill ratings.\n\n"
                    "When to share it:\n"
                    "Share it on or right after the last day of training. "
                    "The system will also send an automatic reminder email to participants "
                    "(see Section 8).\n\n"
                    "What participants fill in:\n"
                    "• Skills self-assessment (same 4 skill areas as the pre-survey)\n"
                    "• What went well in the training\n"
                    "• What they learned and plan to apply\n"
                    "• Suggestions for improvement\n"
                    "• Whether they'd like to provide a testimonial\n\n"
                    "Post-survey link (Philippines example):\n"
                    "https://aktivasia.pages.dev/trainingsurvey-ph.html\n\n"
                    "ℹ️  Contact the Regional Team for the post-survey link for other countries."
                ),
            },
        ],
    },
    {
        "heading": "8. Automated Reminders 🔔",
        "intro": (
            "The system automatically sends email reminders so you never miss an important "
            "action. You do not need to set anything up — these run on their own every day."
        ),
        "subsections": [
            {
                "title": "The 4 Automatic Reminders",
                "body": (
                    "📅  Reminder 1 — Training Countdown\n"
                    "    When it's sent: 7 days before a training starts\n"
                    "    Who receives it: The country team\n"
                    "    What it says: 'Training [Name] starts in 7 days — make sure everything is ready!'\n\n"
                    "👥  Reminder 2 — Selection Reminder\n"
                    "    When it's sent: After the application window closes, if applicants are still waiting\n"
                    "    Who receives it: The training facilitator\n"
                    "    What it says: 'You have [X] applicants waiting for a selection decision.'\n\n"
                    "📍  Reminder 3 — Attendance Reminder\n"
                    "    When it's sent: The day before or the day of the training\n"
                    "    Who receives it: The training facilitator\n"
                    "    What it says: 'Training [Name] is happening today/tomorrow!'\n\n"
                    "📝  Reminder 4 — Post-Survey Reminder\n"
                    "    When it's sent: After the training ends, when the post-survey window opens\n"
                    "    Who receives it: Training participants (via the email they used to apply)\n"
                    "    What it says: 'Please complete your post-training feedback survey.'\n\n"
                    "ℹ️  All reminders run automatically every morning. "
                    "If you are not receiving reminders, contact the Regional Team to check "
                    "that your email is registered in the system."
                ),
            },
        ],
    },
    {
        "heading": "9. Glossary 📖",
        "intro": "Here are plain-language definitions for terms used in the portal and this guide.",
        "subsections": [
            {
                "title": "People & Stages",
                "body": (
                    "Applicant — Someone who has submitted an application to attend a training.\n\n"
                    "Selected — An applicant who has been approved to join the training.\n\n"
                    "Rejected — An applicant who was not selected for the training.\n\n"
                    "Attended — A selected participant who showed up to the training.\n\n"
                    "Graduate — A participant who attended AND completed the post-training survey.\n\n"
                    "6-Month Evaluatee — A graduate who has been sent (or completed) the "
                    "6-Month Impact Evaluation survey."
                ),
            },
            {
                "title": "Portal Terms",
                "body": (
                    "Landing Page — The home screen of the portal showing all 5 country cards.\n\n"
                    "Backbone Portal — The regional view that combines data from all 4 countries "
                    "plus any regional trainings.\n\n"
                    "Admin Panel — The management screen where you select applicants, mark "
                    "attendance, and track graduates.\n\n"
                    "Dashboard — Another name for the portal — the main screen showing your reports.\n\n"
                    "Training Type — The category of training: Foundational, TOT, "
                    "Feminist Leadership, or Public Narrative.\n\n"
                    "Organised By — The country that runs the training "
                    "(Philippines, Pakistan, Korea, Indonesia, or Regional)."
                ),
            },
            {
                "title": "Report Terms",
                "body": (
                    "Overview Tab — The summary report showing total applicants, graduates, "
                    "ongoing participants, funnel, and year-over-year trends.\n\n"
                    "Training Plan Tab — The report showing planned and completed trainings "
                    "and practice sessions.\n\n"
                    "Impact Tab — The report showing Likert skill scores and qualitative "
                    "survey responses.\n\n"
                    "Demographics Tab — The report showing participant breakdown by gender, "
                    "age group, and region.\n\n"
                    "Likert Scale — A 1–5 rating scale used to measure skills and confidence. "
                    "1 = Strongly Disagree, 5 = Strongly Agree.\n\n"
                    "Application Funnel — A step-by-step visual showing how many people "
                    "moved from Applied → Attended → Graduated → 6-Month Evaluation.\n\n"
                    "Year-Over-Year Trend — A chart comparing applicant and graduate numbers "
                    "across different years.\n\n"
                    "Post-Survey — The feedback form sent to participants right after a training.\n\n"
                    "6-Month Impact Evaluation — A follow-up survey sent to graduates 6 months "
                    "after training to measure lasting impact.\n\n"
                    "Reminder Engine — The automated system that sends emails to country teams "
                    "and participants at key moments."
                ),
            },
        ],
    },
    {
        "heading": "10. Need Help? 📞",
        "intro": "If something looks wrong or you are not sure what to do, reach out — we're here to help!",
        "subsections": [
            {
                "title": "Contact the Regional Team",
                "body": (
                    "👤  Gideon Noel Valera\n"
                    "    Digital Projects Manager | Regional Team\n"
                    "    📧  gideon.valera@gmail.com\n\n"
                    "⚠️  Important Rule:\n"
                    "If any data in the portal looks incorrect or you are unsure about something, "
                    "please contact the Regional Team first. Do not attempt to edit data directly "
                    "in Zoho CRM or other systems — this can cause errors in the portal.\n\n"
                    "✅  What the Regional Team can help with:\n"
                    "• Fixing incorrect data in the portal\n"
                    "• Adding or updating email addresses for reminders\n"
                    "• Troubleshooting the Admin Panel or Create Training form\n"
                    "• Answering questions about how the system works\n"
                    "• Generating custom reports or exports"
                ),
            },
        ],
    },
]
