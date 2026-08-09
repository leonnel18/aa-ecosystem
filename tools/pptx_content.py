"""
All slide content for the AktivAsia Portal Presentation (.pptx).
Each slide is a dict with: title, layout, and content fields.
"""

SLIDES = [
    {
        "type": "cover",
        "title": "AktivAsia Training Portal",
        "subtitle": "Your Guide to Tracking Training Impact Across the Region",
        "author": "Gideon Noel Valera",
        "role": "Digital Projects Manager | Regional Team",
        "date": "May 2026",
    },
    {
        "type": "bullets",
        "title": "Why This Portal Exists 🌟",
        "screenshot": "01_landing_page",
        "bullets": [
            ("The Problem", "Tracking applicants, graduates, and training impact was manual — spreadsheets, emails, and scattered data across the team."),
            ("What It Replaces", "No more manual reports. The portal collects and displays all training data automatically, in real time."),
            ("What It Enables", "Country teams and leadership get clear, consistent reports — who applied, who graduated, and what impact was made — at any time, from anywhere."),
        ],
    },
    {
        "type": "grid",
        "title": "The 5 Portals at a Glance 🌏",
        "intro": "Each country has its own portal. The Backbone shows the full regional picture.",
        "items": [
            ("🌐", "Backbone (Regional)", "Combined view of all countries + regional trainings"),
            ("🇵🇭", "Philippines (PH)", "Philippines country portal"),
            ("🇵🇰", "Pakistan (PK)", "Pakistan country portal"),
            ("🇰🇷", "Korea (KR)", "Korea country portal"),
            ("🇮🇩", "Indonesia (ID)", "Indonesia country portal"),
        ],
    },
    {
        "type": "flow",
        "title": "The Applicant Journey 🚀",
        "intro": "Every applicant goes through the same journey — from application to impact.",
        "steps": [
            ("📝", "Apply", "Applicant fills in the online application form"),
            ("✅", "Selected", "Country team reviews and selects participants"),
            ("🏫", "Training", "Training takes place — attendance is recorded"),
            ("🎓", "Graduate", "Participant completes training + post-survey"),
            ("📊", "6-Month Eval", "Graduate shares their impact 6 months later"),
        ],
    },
    {
        "type": "four_cards",
        "title": "What You Can See — 4 Reports 📊",
        "intro": "Every country portal has 4 report tabs. Each answers a different question.",
        "cards": [
            ("📊", "Overview", "How many people applied, graduated, and are ongoing?"),
            ("📅", "Training Plan", "What trainings are planned, ongoing, and completed?"),
            ("💡", "Impact", "How did participants rate their skills — before, after, and 6 months later?"),
            ("👥", "Demographics", "Who are our participants — by gender, age, and region?"),
        ],
    },
    {
        "type": "detail",
        "title": "Report 1: Overview 📈",
        "screenshot": "02_portal_ph_overview",
        "lead": "Your training programme at a glance.",
        "points": [
            ("🔢 Total Applicants", "Everyone who ever applied to a training in your country"),
            ("🎓 Total Graduates", "Participants who completed training AND the post-survey"),
            ("⏳ Ongoing", "Participants selected for a current or upcoming training"),
            ("📉 Application Funnel", "See where people drop off: Applied → Attended → Graduated → 6-Month Eval"),
            ("📆 Year-Over-Year Trend", "Is your programme growing? Compare applicants and graduates by year"),
        ],
    },
    {
        "type": "detail",
        "title": "Report 2: Training Plan 📅",
        "screenshot": "03_portal_ph_training_plan",
        "lead": "Everything about your training schedule — past and future.",
        "points": [
            ("📋 Trainings by Type", "How many Foundational, TOT, Feminist Leadership, and Public Narrative trainings have been run vs. planned"),
            ("🧑‍🤝‍🧑 Practice Sessions", "Skills sessions held — with dates and attendance counts"),
            ("📌 Upcoming Trainings", "What's planned next — name, type, and date"),
            ("✅ Completed Trainings", "Full history of past trainings with applicant and graduate counts"),
        ],
    },
    {
        "type": "detail",
        "title": "Report 3: Impact 💡",
        "screenshot": "04_portal_ph_impact",
        "lead": "Did the training make a difference? Here's the evidence.",
        "points": [
            ("📊 Likert Skill Scores", "Average self-rated scores (1–5) on 4 skills: Strategy, Communication, Facilitating, and Building Connections — measured Before, After, and at 6 Months"),
            ("💬 Post-Survey Feedback", "Written responses from participants: what went well, what they learned, their action plans"),
            ("🔍 6-Month Evaluation", "How graduates applied their learning, what changed in their campaigns and work"),
        ],
        "callout": "Look for rising scores from Pre → Post → 6 Months. That's your proof of lasting impact.",
    },
    {
        "type": "detail",
        "title": "Report 4: Demographics 👥",
        "screenshot": "05_portal_ph_demographics",
        "lead": "Who is your training reaching?",
        "points": [
            ("⚥ By Gender", "Male / Female / Other breakdown — are we reaching a balanced audience?"),
            ("🎂 By Age Group", "18–24 / 25–34 / 35–44 / 45+ — which age groups are we serving most?"),
            ("📍 By Region", "City and province breakdown — are we reaching beyond the capital?"),
        ],
        "callout": "Use Demographics to guide outreach — if one group is underrepresented, target them in the next training cycle.",
    },
    {
        "type": "three_steps",
        "title": "Managing a Training ⚙️",
        "screenshot": "07_admin_panel",
        "intro": "The Admin Panel has 3 steps. Always do them in order.",
        "steps": [
            (
                "Step 1\n✅ Select",
                "After applications close:\nReview applicants one by one\nMark each as Selected or Rejected\nClick Save Changes",
            ),
            (
                "Step 2\n📍 Attend",
                "On or after training day:\nMark each selected participant as Attended or Not Attended\nClick Save Changes",
            ),
            (
                "Step 3\n🎓 Graduate",
                "After post-survey closes:\nMark participants who completed the survey as Graduated\nTrack 6-Month Eval progress bar",
            ),
        ],
    },
    {
        "type": "numbered",
        "title": "Creating a New Training ➕",
        "screenshot": "11_create_training",
        "intro": "Use the Create Training form to add a new training to the system.",
        "steps": [
            "Go to: aktivasia.pages.dev/create-training.html",
            "Fill in the Training Title (use the official name format)",
            "Select the Training Type: Foundational / TOT / Feminist Leadership / Public Narrative",
            "Select the Country (Organised By) and enter Start & End Dates",
            "Set Application Form dates (open & close) and Post-Survey dates",
            "Click 'Create Training' — done! ✅ The training appears in the portal within 24 hours",
        ],
    },
    {
        "type": "reminders",
        "title": "Automated Reminders 🔔",
        "intro": "The system sends these emails automatically. You don't need to do anything!",
        "reminders": [
            ("📅", "Training Countdown", "7 days before training starts", "Country team"),
            ("👥", "Selection Reminder", "After applications close — if applicants are still waiting", "Facilitator"),
            ("📍", "Attendance Reminder", "Day before / day of training", "Facilitator"),
            ("📝", "Post-Survey Reminder", "After training ends, when survey window opens", "Participants"),
        ],
    },
    {
        "type": "getting_started",
        "title": "Getting Started ✅",
        "intro": "Here's what to do right now:",
        "actions": [
            ("🌐", "Open the Portal", "Go to aktivasia.pages.dev — bookmark it in your browser"),
            ("⚙️", "Bookmark Admin", "Save the Admin Panel link for your country's trainings"),
            ("📧", "Check Your Email", "Make sure your email is registered — reminders will go there"),
        ],
        "note": "Have a question or something looks wrong? Reach out to the Regional Team!",
    },
    {
        "type": "contact",
        "title": "Questions? We're Here to Help! 💬",
        "name": "Gideon Noel Valera",
        "role": "Digital Projects Manager | Regional Team",
        "email": "gideon.valera@gmail.com",
        "tagline": "Thank you for being part of the AktivAsia community 🌏",
    },
]
