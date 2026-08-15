"""
email_templates.py — HTML email builders for C1-C6 and P1/P2

Copy is taken verbatim from docs/AktivAsia Automation Email (2).docx (subject
lines, body text, footers), with its {{placeholders}} filled from real CRM
data and links.py.

Visual design (2026-08-10, per Gino's review of a sample send): header is the
standalone AktivAsia logo, embedded inline via Content-ID (see
gmail_sender.build_message()'s `inline_images`) — not a remote/data: URI,
since some clients strip those from HTML email. Footer is the AktivAsia LTD.
cream/maroon brand band matching Gino's reference email (company name, ABN,
contact links, address). LOGO_CONTENT_ID must be passed to
gmail_sender.send_email()'s inline_images at send time — see reminder.py and
the read_logo_bytes() helper below.

The logo file (AktivAsia.png) is a LOCAL COPY inside this function's own
directory, not a reference to portal/img/AktivAsia.png — Catalyst deploys
functions/reminder-job/ and the portal/ static site as completely separate
artifacts (see catalyst.json's "slate" vs. "functions" sections), so a
relative path reaching into portal/ would resolve locally but not exist at
all in the deployed function's runtime. If the logo changes, update both
copies (portal/img/AktivAsia.png for the site, this one for emails).

Markup (2026-08-10, second design pass, per Gino's feedback that the first
version "looked bad" in his real inbox): rebuilt on TABLE-BASED LAYOUT WITH
INLINE `style="..."` ATTRIBUTES, no `<style>` block or CSS classes at all.
Many email clients (Outlook desktop notably, plus some Gmail rendering
paths) strip or ignore `<style>` blocks and class selectors, silently
falling back to unstyled HTML — which is exactly what Gino saw. This mirrors
the technique functions/monitor-job/email_report.py already uses
successfully (a centered, bounded-width `<table>` with per-element inline
styles), and is the standard approach real ESPs (including Zoho's own
outbound mail) use for the same reason. The frame — thin maroon bar, white
content card with a small left-aligned logo, maroon divider, cream
"AktivAsia LTD." footer band, maroon bar — matches the reference KONEKSI/
AktivAsia email Gino provided.
"""

import os
from html import escape

import links

LOGO_CONTENT_ID = "aktivasia-logo"
LOGO_PATH = os.path.join(os.path.dirname(__file__), "AktivAsia.png")


def read_logo_bytes() -> bytes:
    """Reads the AktivAsia logo PNG for inline embedding. Called once per
    run by reminder.py and passed to every send_email() call — see
    gmail_sender.py's inline_images parameter."""
    with open(LOGO_PATH, "rb") as f:
        return f.read()


_MAROON = "#821545"
_CREAM  = "#f5ecd2"
_YELLOW = "#f5c842"
_TEXT   = "#1a1a1a"
_FONT   = "Arial, Helvetica, sans-serif"


def _fmt_date(val) -> str:
    return str(val)[:10] if val else "—"


def _bar() -> str:
    """Thin full-width maroon divider bar — used at the very top, between
    content and footer, and at the very bottom, matching the reference
    email's frame. &nbsp; + font-size:0 keeps it collapsing to a clean thin
    line in clients that otherwise pad empty table cells."""
    return f'<tr><td style="background:{_MAROON};height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>'


def _header() -> str:
    # Centered logo (per Gino's correction, 2026-08-10 — full design, not
    # left-aligned) inside the white content card.
    return f"""
    <tr><td align="center" style="padding:24px 32px 8px 32px;">
      <img src="cid:{LOGO_CONTENT_ID}" width="150" alt="AktivAsia" style="display:block;border:0;outline:none;margin:0 auto;">
    </td></tr>
    """


def _btn(href: str, label: str) -> str:
    """Email-safe button: a single-cell table rather than a styled <a> —
    Outlook (Word rendering engine) mis-renders padding/border-radius on
    plain <a> tags but respects it reliably inside a table cell."""
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0;">
      <tr><td style="background:{_YELLOW};border-radius:4px;">
        <a href="{escape(href)}" style="display:inline-block;padding:10px 20px;
           font-family:{_FONT};font-size:14px;font-weight:700;color:{_TEXT};
           text-decoration:none;">{escape(label)}</a>
      </td></tr>
    </table>
    """


def _brand_footer() -> str:
    return f"""
    <tr><td style="background:{_CREAM};padding:16px 24px;text-align:center;
                     font-family:{_FONT};font-size:12px;color:{_TEXT};">
      <div style="font-weight:700;margin-bottom:4px;">AktivAsia LTD.</div>
      <div>ABN 68 649 937 262 |
        <a href="mailto:info@aktivasia.org" style="color:{_TEXT};">info@aktivasia.org</a> |
        <a href="https://www.aktivasia.org" style="color:{_TEXT};">www.aktivasia.org</a></div>
      <div>Level 2,
        <a href="https://maps.google.com/?q=63+Dixon+St,+Haymarket+NSW+2000,+Australia" style="color:{_TEXT};">63 Dixon St, Haymarket NSW 2000, Australia</a></div>
    </td></tr>
    """


def _footer(contact_email: str = "gino@aktivasia.org") -> str:
    """Sits inside the content cell, above the maroon divider — kept
    separate from _brand_footer() (its own table row) so the two visual
    blocks (contact note vs. brand band) stay independently editable."""
    return (
        f'<p style="margin-top:24px;color:#888;font-size:12px;font-family:{_FONT};">'
        f'This is a system-generated email. '
        f'For any concerns, please contact {escape(contact_email)}.</p>'
    )


def _wrap(inner_html: str) -> str:
    """Full email frame: outer gray background -> centered 600px white
    card -> maroon bar / logo+body / maroon bar / cream brand footer /
    maroon bar. Table-based with inline styles throughout (see module
    docstring for why)."""
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
      <tr><td align="center" style="padding:24px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#ffffff;">
          {_bar()}
          {_header()}
          <tr><td style="padding:0 32px 24px 32px;font-family:{_FONT};color:{_TEXT};font-size:14px;line-height:1.6;">
            {inner_html}
          </td></tr>
          {_bar()}
          {_brand_footer()}
          {_bar()}
        </table>
      </td></tr>
    </table>
    """


# ── C1 — Training Plan check-in (1st of every month) ───────────────────────

def c1_email(country: str, year: int, plans: list) -> tuple[str, str]:
    subj = f"📋 {escape(country)}: Here's where your {year} Training Plans stand"
    # Flat "Training Name - Status (Planned Month)" list, per Gino's review
    # (2026-08-10) — the earlier 3-column table looked cramped in practice.
    items = "".join(
        f'<li style="margin-bottom:4px;"><strong>{escape(p["name"])}</strong> - {escape(p["status"])} ({escape(p["planned_month"])})</li>'
        for p in plans
    )
    body = _wrap(f"""
      <p>Dear {escape(country)} Team,</p>
      <p>A new month is here, so here's a quick look at your Training Plans for {year} that haven't yet commenced:</p>
      <ul style="margin:8px 0;padding-left:20px;">{items}</ul>
      <p>If any of these is now confirmed and going ahead soon, please fill out the form below to trigger it in our system.
         This is what officially associates it with an approved Training Plan and gets everything moving on our end. 🚀</p>
      {_btn(links.ASSOCIATE_TRAINING_FORM, "Associate a confirmed training here")}
      <p>If nothing is confirmed yet, no action is needed. We'll check in again next month.</p>
      <p>With thanks,<br>AktivAsia Regional Team</p>
      {_footer("gino@aktivasia.org")}
    """)
    return subj, body


# ── C2 — Pre-training reminder (applications open early) ───────────────────

def c2_email(training: dict) -> tuple[str, str]:
    title   = training.get("Solution_Title", "")
    country = training.get("Organised_By", "")
    start   = _fmt_date(training.get("Start_Date"))
    app_link = links.application_form_link(country)
    subj = f"📅 Applications open: {title} on {start}"
    body = _wrap(f"""
      <p>Dear {escape(country)} Team,</p>
      <p>A heads-up that applications for <strong>{escape(title)}</strong> should be opening now,
         ahead of the training on <strong>{start}</strong>. 🗓️</p>
      <p>Ideally applications open 8 to 7 weeks out, with a 1 to 2 week window and screening at 6 to 5 weeks,
         so there is enough time to advertise and choose well. Here is the application link, ready for you to
         share with your prospective participants:</p>
      {_btn(app_link, "Application Form")}
      <p>Feel free to circulate this through your usual channels. If anything about the training details
         changes in the meantime, just update it in Zoho as usual.</p>
      <p>With thanks,<br>AktivAsia Regional Team</p>
      {_footer("gino@aktivasia.org")}
    """)
    return subj, body


# ── C3 — 7-day pre-training reminder ────────────────────────────────────────

def c3_email(training: dict) -> tuple[str, str]:
    title   = training.get("Solution_Title", "")
    country = training.get("Organised_By", "")
    start   = _fmt_date(training.get("Start_Date"))
    tid     = training.get("id", "")
    app_link  = links.application_form_link(country)
    sel_link  = links.participant_selection_form_link(tid)
    subj = f"⏰ One week out: {title} and your participant list"
    body = _wrap(f"""
      <p>Dear {escape(country)} Team,</p>
      <p><strong>{escape(title)}</strong> is now just one week away, starting <strong>{start}</strong>. ✅</p>
      <p>Please double-check the training details in Zoho are accurate: dates, venue, facilitators, and focus.</p>
      <p>If you're still gathering applicants, here's the application link to keep sharing:</p>
      {_btn(app_link, "Application Form")}
      <p>And once applicants are in, you can begin selecting or rejecting them here:</p>
      {_btn(sel_link, "Participant Selection")}
      <p>The sooner this list takes shape, the smoother the run-up to training day will be.</p>
      <p>With thanks,<br>AktivAsia Regional Team</p>
      {_footer("gino@aktivasia.org")}
    """)
    return subj, body


# ── C4 — Participant confirmation (5-1 days before training) ───────────────

def c4_email(training: dict, pending: list) -> tuple[str, str]:
    title   = training.get("Solution_Title", "")
    country = training.get("Organised_By", "")
    start   = _fmt_date(training.get("Start_Date"))
    tid     = training.get("id", "")
    sel_link = links.participant_selection_form_link(tid)
    subj = f"✅ Action needed: confirm your participant list for {title}"
    body = _wrap(f"""
      <p>Dear {escape(country)} Team,</p>
      <p><strong>{escape(title)}</strong> begins on <strong>{start}</strong>. Before it starts, we need your final
         participant list locked in. 📝</p>
      <p>Please go through your applicants in Zoho and make sure each one is marked correctly.
         Everyone currently in the Applied stage needs to move to either Selected or Rejected.
         (<strong>{len(pending)} applicant(s)</strong> still pending.)</p>
      {_btn(sel_link, "Review and update your list here")}
      <p>Please complete this before the training begins. A clean, confirmed list means accurate
         records and a smoother evaluation process afterwards.</p>
      <p>With thanks,<br>AktivAsia Regional Team</p>
      {_footer("gino@aktivasia.org")}
    """)
    return subj, body


# ── C5 — Training end date ──────────────────────────────────────────────────

def c5_email(training: dict) -> tuple[str, str]:
    title = training.get("Solution_Title", "")
    country = training.get("Organised_By", "")
    tid   = training.get("id", "")
    confirm_link = links.participant_confirmation_form_link(tid)
    survey_link  = links.post_training_eval_form_link(tid)
    drive_link   = links.google_drive_photo_folder_link(tid)
    subj = f"🎓 {title} complete: confirm participants and next steps"
    body = _wrap(f"""
      <p>Dear {escape(country)} Team,</p>
      <p><strong>{escape(title)}</strong> has now finished. Thank you for all the work that went into
         delivering it! 🙌</p>
      <p>A few things we need from you to close it out properly:</p>
      <p><strong>1. Confirm your final participant list.</strong><br>
         Everyone who completed the training should move from Selected to Graduated or Post Evaluation
         Completed, so our records reflect who actually took part.</p>
      {_btn(confirm_link, "Confirm participants")}
      <p><strong>2. Share the post-training evaluation form</strong><br>
         with your participants and encourage them to complete it. Their feedback matters a great deal to us.</p>
      {_btn(survey_link, "Post-training evaluation form")}
      <p><strong>3. Upload your training photos</strong><br>
         to this folder so we can use them for reporting and stories. 📸</p>
      {_btn(drive_link, "Photo upload folder")}
      <p>With thanks and solidarity,<br>AktivAsia Regional Team</p>
      {_footer("gino@aktivasia.org")}
    """)
    return subj, body


# ── C6 — Post-eval nudge to country team (7 days after training end) ───────

def c6_email(training: dict) -> tuple[str, str]:
    title = training.get("Solution_Title", "")
    country = training.get("Organised_By", "")
    tid   = training.get("id", "")
    survey_link = links.post_training_eval_form_link(tid)
    drive_link  = links.google_drive_photo_folder_link(tid)
    subj = f"🔔 Following up: post-training evaluations for {title}"
    body = _wrap(f"""
      <p>Dear {escape(country)} Team,</p>
      <p>It's been a week since <strong>{escape(title)}</strong> finished, and we wanted to follow up
         on the post-training evaluations.</p>
      <p>If some participants haven't yet completed the form, a gentle nudge from you goes a long way.
         Their responses help us understand what worked and where we can do better.</p>
      {_btn(survey_link, "Form link to share again")}
      <p>Still have photos to upload? <a href="{escape(drive_link)}" style="color:{_MAROON};">Add them here</a> 📸</p>
      <p>With thanks,<br>AktivAsia Regional Team</p>
      {_footer("gino@aktivasia.org")}
    """)
    return subj, body


# ── P1 — 6-month post-evaluation (daily, until deadline) ───────────────────

def p1_email(deal: dict, deadline, training_name: str) -> tuple[str, str]:
    first_name = deal.get("First_Name", "")
    full_name  = f"{first_name} {deal.get('Last_Name', '')}".strip()
    deal_id    = deal.get("id", "")
    eval_link  = links.impact_eval_form_link(deal_id)
    subj = f"💭 A few minutes for your Impact Evaluation, {first_name}"
    body = _wrap(f"""
      <p>Dear {escape(full_name)},</p>
      <p>It's been half a year since the <strong>{escape(training_name)}</strong> training wrapped up, and we've been
         thinking about you and wondering how things have unfolded on your end. 🌱</p>
      <p>We'd love to hear what you've been up to. Since we last saw you, have you run a campaign you're
         proud of? Brought new people in, shifted something that felt stuck, raised support, or passed on
         what you learned to others? Whether it's been a season of big wins or slow, stubborn progress,
         your story matters to us.</p>
      <p>That's what this check-in is really about. We reach out at the half-year and one-year marks to
         understand the longer-term difference the training makes in the real work you're doing, and
         honestly, your answers are what tell us whether any of this is landing. They shape how we support
         graduates like you and what we build next.</p>
      <p>The form takes about 10 to 15 minutes. Please complete it within one week of receiving this email,
         and no later than <strong>{deadline.isoformat()}</strong>.</p>
      <p>If you feel more comfortable answering in your own language, please do. You can also use the
         translate option in Google Chrome: right-click on the page and select your preferred language.</p>
      <p>And if there's anything you'd like to share beyond the form, a story, a question, or just an
         update, reach out any time. We'd genuinely love to hear from you.</p>
      {_btn(eval_link, "Complete your form here")}
      <p>With gratitude and solidarity,<br>AktivAsia Regional Team</p>
      {_footer("regional@aktivasia.org")}
    """)
    return subj, body


# ── P2 — 6-month post-evaluation, overdue (weekly) ──────────────────────────

def p2_email(deal: dict, deadline, training_name: str) -> tuple[str, str]:
    first_name = deal.get("First_Name", "")
    full_name  = f"{first_name} {deal.get('Last_Name', '')}".strip()
    deal_id    = deal.get("id", "")
    eval_link  = links.impact_eval_form_link(deal_id)
    subj = f"⏳ Still open: your Impact Evaluation Form, {first_name}"
    body = _wrap(f"""
      <p>Dear {escape(full_name)},</p>
      <p>We're reaching out again about your Impact Evaluation Form for the <strong>{escape(training_name)}</strong> training.</p>
      <p>The deadline was <strong>{deadline.isoformat()}</strong>, and while it has now passed, the form is still open and
         we would very much value your response. 🙏</p>
      <p>It only takes a few minutes, and your feedback genuinely helps us improve our programming and
         support future participants.</p>
      <p>If you feel more comfortable answering in your own language, please do. You can also use the
         translate option in Google Chrome: right-click on the page and select your preferred language.</p>
      {_btn(eval_link, "Complete your form here")}
      <p>Thank you, and we hope you're well.</p>
      <p>With gratitude and solidarity,<br>AktivAsia Regional Team</p>
      {_footer("gino@aktivasia.org")}
    """)
    return subj, body
