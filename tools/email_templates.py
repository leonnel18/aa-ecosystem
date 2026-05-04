"""
email_templates.py — HTML email builders for each reminder type

Each function returns (subject: str, html_body: str).
"""

PORTAL_BASE = "https://aktivasia-portal.pages.dev"

_STYLE = """
<style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; }
  .header { background: #1a1a1a; color: #fff; padding: 16px 24px; }
  .header span { color: #f5c842; font-weight: 700; }
  .content { padding: 24px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .btn { display: inline-block; background: #f5c842; color: #1a1a1a;
         padding: 10px 20px; text-decoration: none; border-radius: 4px;
         font-weight: 700; margin-top: 16px; }
</style>
"""

def _header() -> str:
    return '<div class="header">Aktiv<span>Asia</span> — Training Reminder</div>'

def _fmt_date(val) -> str:
    return str(val)[:10] if val else "—"

def _deal_name(d: dict) -> str:
    return f"{d.get('First_Name', '')} {d.get('Last_Name', '')}".strip()

def _deal_org(d: dict) -> str:
    acc = d.get("Account_Name")
    if isinstance(acc, dict):
        return acc.get("name", "")
    return str(acc or "")


def reminder1_email(plan: dict, days: int) -> tuple[str, str]:
    name  = plan.get("Name", "")
    start = _fmt_date(plan.get("Start_Date"))
    subj  = f"[AktivAsia] Reminder: Training Plan \"{name}\" starts in {days} days"
    body  = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p>This is a reminder that the training plan <strong>{name}</strong> is starting in <strong>{days} days</strong> ({start}).</p>
  <p>Please submit the Training Details form so participants can apply.</p>
  <p><strong>Training Plan:</strong> {name}<br>
     <strong>Country:</strong> {plan.get("Organised_By", "")}<br>
     <strong>Planned Start Date:</strong> {start}</p>
  <a class="btn" href="{PORTAL_BASE}/create-training.html">Submit Training Details</a>
  <p style="margin-top:24px; color:#888; font-size:12px;">
    This reminder was sent automatically. You will receive this at 60, 45, and 30 days before the planned start date.
  </p>
</div>
"""
    return subj, body


def reminder2_email(training: dict, pending: list) -> tuple[str, str]:
    title    = training.get("Solution_Title", "")
    close    = _fmt_date(training.get("Application_Form_Close_Date"))
    tid      = training.get("id", "")
    subj     = f"[AktivAsia] Action Required: Select participants for \"{title}\""
    rows     = "".join(
        f"<tr><td>{_deal_name(d)}</td><td>{_deal_org(d)}</td><td>{d.get('Email', '')}</td></tr>"
        for d in pending
    )
    body     = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p>The application window for <strong>{title}</strong> closed on {close}.</p>
  <p>There are <strong>{len(pending)} applicant(s)</strong> still awaiting your selection decision:</p>
  <table>
    <tr><th>Name</th><th>Organization</th><th>Email</th></tr>
    {rows}
  </table>
  <a class="btn" href="{PORTAL_BASE}/admin.html?training_id={tid}&view=selection">Go to Selection Page</a>
</div>
"""
    return subj, body


def reminder3_email(training: dict, pending: list) -> tuple[str, str]:
    title = training.get("Solution_Title", "")
    end   = _fmt_date(training.get("End_Date"))
    tid   = training.get("id", "")
    subj  = f"[AktivAsia] Action Required: Confirm attendance for \"{title}\""
    rows  = "".join(
        f"<tr><td>{_deal_name(d)}</td><td>{_deal_org(d)}</td><td>{d.get('Email', '')}</td></tr>"
        for d in pending
    )
    body  = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p><strong>{title}</strong> ended on {end}.</p>
  <p>Please confirm attendance for the <strong>{len(pending)} participant(s)</strong> still in "Selected" status:</p>
  <table>
    <tr><th>Name</th><th>Organization</th><th>Email</th></tr>
    {rows}
  </table>
  <a class="btn" href="{PORTAL_BASE}/admin.html?training_id={tid}&view=attendance">Confirm Attendance</a>
  <p style="margin-top:24px; color:#888; font-size:12px;">
    This reminder is sent daily until all selected participants have been confirmed.
  </p>
</div>
"""
    return subj, body


def reminder4_email(training: dict, incomplete: list, completed: int,
                    attended_total: int, pct: int) -> tuple[str, str]:
    title = training.get("Solution_Title", "")
    tid   = training.get("id", "")
    subj  = f"[AktivAsia] Weekly: Post-survey follow-up for \"{title}\" ({pct}% complete)"
    rows  = "".join(
        f"<tr><td>{_deal_name(d)}</td><td>{d.get('Email', '')}</td><td>{d.get('Stage', '')}</td></tr>"
        for d in incomplete
    )
    body  = f"""
{_STYLE}
{_header()}
<div class="content">
  <p>Hi team,</p>
  <p>Post-survey completion for <strong>{title}</strong>:</p>
  <p style="font-size:24px; font-weight:700;">{pct}% <span style="font-size:14px; font-weight:400;">({completed} of {attended_total} participants)</span></p>
  <p>The following <strong>{len(incomplete)} participant(s)</strong> have not yet completed the post-survey:</p>
  <table>
    <tr><th>Name</th><th>Email</th><th>Current Stage</th></tr>
    {rows}
  </table>
  <a class="btn" href="{PORTAL_BASE}/admin.html?training_id={tid}&view=post_survey">View Post-Survey Status</a>
  <p style="margin-top:24px; color:#888; font-size:12px;">
    This reminder is sent weekly on Mondays until 90% of participants complete the post-survey.
  </p>
</div>
"""
    return subj, body
