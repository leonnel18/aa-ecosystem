"""
email_report.py — Builds the daily HTML digest email from the 4 checks' results.

Each section shows "no changes today" plainly when empty, rather than being
omitted — an empty section is itself useful confirmation the check ran.
Failed checks (caught by monitor.py) get their own "[FAILED]" section instead
of aborting the whole run, so one broken check doesn't hide the other three.
"""

from html import escape


def _section(title: str, body_html: str) -> str:
    return f"""
    <tr><td style="padding:24px 0 8px 0;border-bottom:2px solid #821545;">
      <h2 style="margin:0;font-family:Arial,sans-serif;color:#131625;font-size:18px;">{escape(title)}</h2>
    </td></tr>
    <tr><td style="padding:12px 0 0 0;font-family:Arial,sans-serif;color:#131625;font-size:14px;line-height:1.5;">
      {body_html}
    </td></tr>
    """


def _no_changes() -> str:
    return '<p style="color:#788099;margin:0;">No changes today.</p>'


def _failed(check_name: str, error: str) -> str:
    return (
        f'<p style="color:#f93a3a;margin:0;">[FAILED] {escape(check_name)}: {escape(str(error))}</p>'
        '<p style="color:#788099;margin:4px 0 0 0;">This check will retry on the next run.</p>'
    )


def _list_items(items: list, formatter) -> str:
    if not items:
        return _no_changes()
    rows = "".join(f"<li>{formatter(item)}</li>" for item in items)
    return f'<ul style="margin:0;padding-left:20px;">{rows}</ul>'


def build_new_records_section(result) -> str:
    if isinstance(result, Exception):
        return _section("1. New Records", _failed("new-records check", result))

    if not result:
        return _section("1. New Records", _no_changes())

    parts = []
    for module, module_result in result.items():
        items = module_result.get("new", [])
        null_ts_count = module_result.get("null_ts_baseline_count", 0)
        if items:
            count = len(items)
            names = ", ".join(escape(str(i.get("name", i.get("id")))) for i in items[:20])
            more = f" (+{count - 20} more)" if count > 20 else ""
            parts.append(f"<li><strong>{escape(module)}</strong>: {count} new — {names}{more}</li>")
        if null_ts_count:
            parts.append(
                f"<li><strong>{escape(module)}</strong>: {null_ts_count} record(s) with no "
                f"creation-date recorded in CRM, counted once on this baseline run "
                f"(can't be individually tracked as new/old going forward — see CLAUDE.md).</li>"
            )
    body = f'<ul style="margin:0;padding-left:20px;">{"".join(parts)}</ul>' if parts else _no_changes()
    return _section("1. New Records", body)


def build_email_activity_section(result) -> str:
    if isinstance(result, Exception):
        return _section("2. CRM Email Activity", _failed("email-activity check", result))

    scope_note = (
        '<p style="color:#788099;margin:0 0 8px 0;font-size:12px;">'
        "Scope: participants of trainings active in the last 30 days only "
        "(not a full sweep of all applicants — see monitor-job plan for why)."
        "</p>"
    )

    if not result:
        return _section("2. CRM Email Activity", scope_note + _no_changes())

    def fmt(item):
        subjects = ", ".join(escape(e.get("subject") or "(no subject)") for e in item["new_emails"])
        return f'{escape(item["deal_name"])}: {len(item["new_emails"])} new email(s) — {subjects}'

    return _section("2. CRM Email Activity", scope_note + _list_items(result, fmt))


def build_graduate_mismatch_section(result) -> str:
    if isinstance(result, Exception):
        return _section("3. Graduate Date Check", _failed("graduate-mismatch check", result))

    result = result or {}
    new_missing = result.get("new_missing", [])
    new_mismatch = result.get("new_mismatch", [])
    baseline_seeded = result.get("baseline_seeded_count", 0)
    skipped = result.get("skipped_unwatermarked_count", 0)

    scope_note = (
        '<p style="color:#788099;margin:0 0 8px 0;font-size:12px;">'
        "Only Deals modified since the last run are (re-)checked "
        "(watermark-based, not a full-backlog rescan every day)."
        "</p>"
    )

    if not new_missing and not new_mismatch:
        body = scope_note + _no_changes()
        if baseline_seeded:
            body += (f'<p style="color:#788099;margin:8px 0 0 0;">'
                      f'{baseline_seeded} existing case(s) found on this baseline run '
                      f'(not listed individually here — future runs will report only new ones).</p>')
        if skipped:
            body += f'<p style="color:#788099;margin:8px 0 0 0;">{skipped} record(s) skipped (no usable modified-date).</p>'
        return _section("3. Graduate Date Check", body)

    parts = [scope_note]
    if new_missing:
        parts.append('<p style="margin:0 0 4px 0;"><strong>Newly graduated with no Graduate_Date recorded:</strong></p>')
        parts.append(_list_items(new_missing, lambda d: escape(d["name"])))
    if new_mismatch:
        parts.append('<p style="margin:12px 0 4px 0;"><strong>Graduate_Date differs from training End_Date by more than 7 days:</strong></p>')
        parts.append(_list_items(
            new_mismatch,
            lambda d: f'{escape(d["name"])}: graduated {escape(d["graduate_date"])}, '
                      f'training ended {escape(d["training_end_date"])} '
                      f'({d["days_off"]} days off)',
        ))
    if skipped:
        parts.append(f'<p style="color:#788099;margin:12px 0 0 0;">{skipped} record(s) skipped (no usable modified-date).</p>')

    return _section("3. Graduate Date Check", "".join(parts))


def build_six_month_due_section(result) -> str:
    if isinstance(result, Exception):
        return _section("4. Due for 6-Month Evaluation", _failed("six-month-due check", result))

    note = (
        '<p style="color:#788099;margin:0 0 8px 0;font-size:12px;">'
        "Report-only — no tag or field is written back to CRM."
        "</p>"
    )

    if not result:
        return _section("4. Due for 6-Month Evaluation", note + _no_changes())

    def fmt(item):
        return f'{escape(item["name"])} — graduated {escape(item["graduate_date"])}, 6-month mark {escape(item["six_month_mark"])}'

    return _section("4. Due for 6-Month Evaluation", note + _list_items(result, fmt))


def build_digest(results: dict, run_date_str: str, is_baseline_run: bool) -> tuple[str, str]:
    """
    results = {
      "new_records": dict | Exception,
      "email_activity": list | Exception,
      "graduate_mismatch": dict | Exception,
      "six_month_due": list | Exception,
    }
    Returns (subject, html_body).
    """
    baseline_note = ""
    if is_baseline_run:
        baseline_note = (
            '<tr><td style="padding:12px 16px;background:#f3e8ff;border-radius:8px;'
            'font-family:Arial,sans-serif;color:#131625;font-size:13px;">'
            "This is the first run — it establishes a baseline. New-record and "
            "6-month-due checks will report changes starting from the next run."
            "</td></tr>"
        )

    sections = "".join([
        build_new_records_section(results.get("new_records")),
        build_email_activity_section(results.get("email_activity")),
        build_graduate_mismatch_section(results.get("graduate_mismatch")),
        build_six_month_due_section(results.get("six_month_due")),
    ])

    html = f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
      <tr><td style="padding:0 0 16px 0;font-family:Arial,sans-serif;">
        <h1 style="margin:0;color:#821545;font-size:22px;">aa-ecosystem — Daily CRM Monitor</h1>
        <p style="margin:4px 0 0 0;color:#788099;font-size:13px;">{escape(run_date_str)} (Asia/Manila)</p>
      </td></tr>
      {baseline_note}
      {sections}
    </table>
    """

    subject = f"aa-ecosystem Daily CRM Monitor — {run_date_str}"
    return subject, html
