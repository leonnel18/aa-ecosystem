"""Tests for functions/reminder-job/checks/*.py — pure date/window logic,
no CRM or Gmail calls. Mirrors the style of tests/test_reminder_logic.py
(the retired old reminder engine's test file)."""
import sys, os

# Only checks/ itself goes on sys.path (needed for its internal bare
# `from _dates import ...`), NOT the functions/reminder-job/ root — adding
# the root would also make that directory's gmail_sender.py importable as
# bare `gmail_sender`, colliding with tools/gmail_sender.py's identically-named
# module in tests/test_gmail_sender.py when both test files run in the same
# pytest session (whichever imports first "wins" via Python's sys.modules
# cache, silently breaking the other file's test).
_REMINDER_JOB_DIR = os.path.join(os.path.dirname(__file__), "..", "functions", "reminder-job")
sys.path.insert(0, os.path.join(_REMINDER_JOB_DIR, "checks"))

# checks/ itself isn't a top-level importable package unless its parent
# (functions/reminder-job) is also findable — but we deliberately don't want
# that parent on sys.path (see above). Load it directly from its file path
# instead, sidestepping the package-parent requirement entirely.
import importlib.util

def _load_checks_package():
    spec = importlib.util.spec_from_file_location(
        "checks", os.path.join(_REMINDER_JOB_DIR, "checks", "__init__.py"),
        submodule_search_locations=[os.path.join(_REMINDER_JOB_DIR, "checks")],
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules["checks"] = module
    spec.loader.exec_module(module)
    return module

_load_checks_package()


def _load_module_by_path(name, filename):
    """Import one module out of functions/reminder-job/ WITHOUT putting that
    directory on sys.path — same motivation as _load_checks_package() above
    (see the sys.path comment: a bare `gmail_sender` there would shadow
    tools/gmail_sender.py in tests/test_gmail_sender.py)."""
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(_REMINDER_JOB_DIR, filename))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


# links must land in sys.modules first — email_templates does a bare
# `import links` at module level, which would otherwise fail here.
_load_module_by_path("links", "links.py")
email_templates = _load_module_by_path("email_templates", "email_templates.py")

from datetime import date, timedelta

from checks import (
    c1_training_plan, c2_applications_open, c3_seven_day,
    c4_confirm_participants, c5_training_complete, c6_post_eval_nudge,
    p1_impact_eval_daily, p2_impact_eval_overdue,
)
from checks._dates import add_months, six_month_completed


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_plan(id_, name, start_date, organised_by="Philippines", status="Planned"):
    return {"id": id_, "Name": name, "Start_Date": start_date, "Organised_By": organised_by, "Status": status}

def make_solution(id_, title, organised_by, start_date=None, end_date=None, plan_ref=None):
    return {
        "id": id_, "Solution_Title": title, "Organised_By": organised_by,
        "Start_Date": start_date, "End_Date": end_date,
        "Training_Title_Plan": plan_ref,
    }

def make_deal(id_, training_id=None, stage="Still in Applied Stage", email="a@b.com",
              first="Ann", last="Lee", org="Org", graduate_date=None, six_fields=None):
    d = {
        "id": id_, "Training_Applied": {"id": training_id, "name": "Some Training"} if training_id else None,
        "Stage": stage, "Email": email,
        "First_Name": first, "Last_Name": last,
        "Account_Name": {"name": org},
        "Graduate_Date": graduate_date,
    }
    for f in ("B_Strategy_Tactics_6", "C_Communication_Strategy_6",
              "D_Facilitating_Workshops_Meetings_6", "E_Building_Connections_6"):
        d[f] = None
    if six_fields:
        d.update(six_fields)
    return d


# ── _dates helpers ───────────────────────────────────────────────────────────

def test_add_months_basic():
    assert add_months(date(2026, 1, 15), 6) == date(2026, 7, 15)

def test_add_months_clamps_short_month():
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)  # 2026 not a leap year

def test_six_month_completed_true_if_any_field_set():
    d = make_deal("d1", six_fields={"B_Strategy_Tactics_6": "4 - Agree"})
    assert six_month_completed(d) is True

def test_six_month_completed_false_if_all_blank():
    d = make_deal("d1")
    assert six_month_completed(d) is False


# ── C1 — Training Plan check-in ─────────────────────────────────────────────

def test_c1_fires_on_first_of_month_for_unconfirmed_plan():
    today = date(2026, 8, 1)
    plan = make_plan("p1", "Alpha Training", date(2026, 9, 1))
    result = c1_training_plan.due([plan], solutions=[], state={}, today=today)
    assert result == {"Philippines": [{"name": "Alpha Training", "planned_month": "September", "status": "Planned"}]}

def test_c1_suppressed_if_linked_solution_exists():
    today = date(2026, 8, 1)
    plan = make_plan("p1", "Alpha Training", date(2026, 9, 1))
    sol = make_solution("s1", "Alpha Training Session", "Philippines", plan_ref={"id": "p1"})
    result = c1_training_plan.due([plan], solutions=[sol], state={}, today=today)
    assert result == {}

def test_c1_does_not_fire_on_non_first_day():
    today = date(2026, 8, 15)
    plan = make_plan("p1", "Alpha Training", date(2026, 9, 1))
    result = c1_training_plan.due([plan], solutions=[], state={}, today=today)
    assert result == {}

def test_c1_suppressed_if_already_sent_this_month():
    today = date(2026, 8, 1)
    plan = make_plan("p1", "Alpha Training", date(2026, 9, 1))
    state = {"c1_last_sent_month": "2026-08"}
    result = c1_training_plan.due([plan], solutions=[], state=state, today=today)
    assert result == {}

def test_c1_skips_plans_from_other_years():
    today = date(2026, 8, 1)
    plan = make_plan("p1", "Alpha Training", date(2027, 2, 1))
    result = c1_training_plan.due([plan], solutions=[], state={}, today=today)
    assert result == {}


# ── C2 — Applications open (8-7 weeks out) ──────────────────────────────────

def test_c2_fires_at_8_weeks_out():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=today + timedelta(weeks=8))
    result = c2_applications_open.due([sol], state={}, today=today)
    assert len(result) == 1
    assert result[0]["training"]["id"] == "s1"

def test_c2_fires_at_7_weeks_out():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=today + timedelta(weeks=7))
    result = c2_applications_open.due([sol], state={}, today=today)
    assert len(result) == 1

def test_c2_does_not_fire_outside_band():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=today + timedelta(weeks=6))
    result = c2_applications_open.due([sol], state={}, today=today)
    assert result == []

def test_c2_suppressed_if_already_sent():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=today + timedelta(weeks=8))
    state = {"c2_sent_training_ids": ["s1"]}
    result = c2_applications_open.due([sol], state=state, today=today)
    assert result == []

def test_c2_prune_drops_past_trainings():
    today = date(2026, 6, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 5, 1))
    kept = c2_applications_open.prune_state_ids([sol], ["s1"], today=today)
    assert kept == []

def test_c2_prune_keeps_future_trainings():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 6, 1))
    kept = c2_applications_open.prune_state_ids([sol], ["s1"], today=today)
    assert kept == ["s1"]


# ── C3 — 7-day pre-training reminder ────────────────────────────────────────

def test_c3_fires_exactly_7_days_out():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 8))
    result = c3_seven_day.due([sol], state={}, today=today)
    assert len(result) == 1

def test_c3_does_not_fire_at_6_or_8_days():
    today = date(2026, 1, 1)
    sol6 = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 7))
    sol8 = make_solution("s2", "PH Training", "Philippines", start_date=date(2026, 1, 9))
    assert c3_seven_day.due([sol6], state={}, today=today) == []
    assert c3_seven_day.due([sol8], state={}, today=today) == []

def test_c3_suppressed_if_already_sent():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 8))
    state = {"c3_sent_training_ids": ["s1"]}
    assert c3_seven_day.due([sol], state=state, today=today) == []


# ── C4 — Participant confirmation (5-1 days out, while pending remain) ─────

def test_c4_fires_when_pending_applicants_in_window():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 4))  # 3 days out
    deal = make_deal("d1", training_id="s1", stage="Still in Applied Stage")
    result = c4_confirm_participants.due([sol], [deal], state={}, today=today)
    assert len(result) == 1
    assert len(result[0]["pending"]) == 1

def test_c4_suppressed_when_no_pending():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 4))
    deal = make_deal("d1", training_id="s1", stage="Selected")
    result = c4_confirm_participants.due([sol], [deal], state={}, today=today)
    assert result == []

def test_c4_suppressed_outside_5_1_day_window():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 10))  # 9 days out
    deal = make_deal("d1", training_id="s1", stage="Still in Applied Stage")
    result = c4_confirm_participants.due([sol], [deal], state={}, today=today)
    assert result == []

def test_c4_suppressed_if_already_sent_today():
    today = date(2026, 1, 1)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 4))
    deal = make_deal("d1", training_id="s1", stage="Still in Applied Stage")
    state = {"c4_last_sent": {"s1": today.isoformat()}}
    result = c4_confirm_participants.due([sol], [deal], state=state, today=today)
    assert result == []

def test_c4_refires_next_day_if_still_pending():
    day1 = date(2026, 1, 1)
    day2 = date(2026, 1, 2)
    sol = make_solution("s1", "PH Training", "Philippines", start_date=date(2026, 1, 4))
    deal = make_deal("d1", training_id="s1", stage="Still in Applied Stage")
    state = {"c4_last_sent": {"s1": day1.isoformat()}}
    result = c4_confirm_participants.due([sol], [deal], state=state, today=day2)
    assert len(result) == 1


# ── C5 — Training end date ───────────────────────────────────────────────────

def test_c5_fires_day_after_end_date():
    today = date(2026, 1, 5)
    sol = make_solution("s1", "PH Training", "Philippines", end_date=date(2026, 1, 4))
    result = c5_training_complete.due([sol], state={}, today=today)
    assert len(result) == 1

def test_c5_does_not_fire_on_end_date_itself():
    today = date(2026, 1, 4)
    sol = make_solution("s1", "PH Training", "Philippines", end_date=date(2026, 1, 4))
    result = c5_training_complete.due([sol], state={}, today=today)
    assert result == []

def test_c5_suppressed_if_already_sent():
    today = date(2026, 1, 5)
    sol = make_solution("s1", "PH Training", "Philippines", end_date=date(2026, 1, 4))
    state = {"c5_sent_training_ids": ["s1"]}
    assert c5_training_complete.due([sol], state=state, today=today) == []


# ── C6 — Post-eval nudge (7 days after training end) ────────────────────────

def test_c6_fires_7_days_after_end_date():
    today = date(2026, 1, 11)
    sol = make_solution("s1", "PH Training", "Philippines", end_date=date(2026, 1, 4))
    result = c6_post_eval_nudge.due([sol], state={}, today=today)
    assert len(result) == 1

def test_c6_does_not_fire_at_6_or_8_days():
    sol = make_solution("s1", "PH Training", "Philippines", end_date=date(2026, 1, 4))
    assert c6_post_eval_nudge.due([sol], state={}, today=date(2026, 1, 10)) == []
    assert c6_post_eval_nudge.due([sol], state={}, today=date(2026, 1, 12)) == []


# ── P1 — 6-month post-evaluation (daily, until deadline) ────────────────────

def test_p1_fires_at_six_month_mark():
    grad = date(2026, 1, 15)
    today = add_months(grad, 6)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    result = p1_impact_eval_daily.due([deal], state={}, today=today)
    assert len(result) == 1
    assert result[0]["deadline"] == today + timedelta(days=7)

def test_p1_fires_within_deadline_window():
    grad = date(2026, 1, 15)
    mark = add_months(grad, 6)
    today = mark + timedelta(days=3)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    result = p1_impact_eval_daily.due([deal], state={}, today=today)
    assert len(result) == 1

def test_p1_stops_once_six_month_fields_completed():
    grad = date(2026, 1, 15)
    today = add_months(grad, 6)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed",
                      graduate_date=grad, six_fields={"B_Strategy_Tactics_6": "4 - Agree"})
    result = p1_impact_eval_daily.due([deal], state={}, today=today)
    assert result == []

def test_p1_skipped_if_not_graduated():
    grad = date(2026, 1, 15)
    today = add_months(grad, 6)
    deal = make_deal("d1", training_id="s1", stage="Attended Training", graduate_date=grad)
    result = p1_impact_eval_daily.due([deal], state={}, today=today)
    assert result == []

def test_p1_skipped_if_no_graduate_date():
    today = date(2026, 7, 1)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=None)
    result = p1_impact_eval_daily.due([deal], state={}, today=today)
    assert result == []

def test_p1_skipped_before_six_month_mark():
    grad = date(2026, 1, 15)
    today = add_months(grad, 6) - timedelta(days=1)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    result = p1_impact_eval_daily.due([deal], state={}, today=today)
    assert result == []

def test_p1_skipped_after_deadline():
    grad = date(2026, 1, 15)
    today = add_months(grad, 6) + timedelta(days=8)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    result = p1_impact_eval_daily.due([deal], state={}, today=today)
    assert result == []

def test_p1_prune_state_drops_completed_deal():
    deal = make_deal("d1", six_fields={"B_Strategy_Tactics_6": "4 - Agree"})
    kept = p1_impact_eval_daily.prune_state([deal], {"d1": "2026-01-01"})
    assert kept == {}

def test_p1_prune_state_keeps_incomplete_deal():
    deal = make_deal("d1")
    kept = p1_impact_eval_daily.prune_state([deal], {"d1": "2026-01-01"})
    assert kept == {"d1": "2026-01-01"}


# ── P2 — 6-month post-evaluation, overdue (weekly) ──────────────────────────

def test_p2_fires_on_deadline_plus_7():
    grad = date(2026, 1, 15)
    mark = add_months(grad, 6)
    deadline = mark + timedelta(days=7)
    today = deadline + timedelta(days=7)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    result = p2_impact_eval_overdue.due([deal], state={}, today=today)
    assert len(result) == 1

def test_p2_does_not_fire_on_non_weekly_boundary():
    grad = date(2026, 1, 15)
    mark = add_months(grad, 6)
    deadline = mark + timedelta(days=7)
    today = deadline + timedelta(days=3)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    result = p2_impact_eval_overdue.due([deal], state={}, today=today)
    assert result == []

def test_p2_does_not_fire_before_deadline():
    grad = date(2026, 1, 15)
    mark = add_months(grad, 6)
    deadline = mark + timedelta(days=7)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    result = p2_impact_eval_overdue.due([deal], state={}, today=deadline)
    assert result == []

def test_p2_stops_once_completed():
    grad = date(2026, 1, 15)
    mark = add_months(grad, 6)
    deadline = mark + timedelta(days=7)
    today = deadline + timedelta(days=7)
    deal = make_deal("d1", training_id="s1", stage="Graduated or Post Evaluation Completed",
                      graduate_date=grad, six_fields={"E_Building_Connections_6": "5 - Strongly Agree"})
    result = p2_impact_eval_overdue.due([deal], state={}, today=today)
    assert result == []


# ── P2 — bounded cadence (added 2026-08-21) ─────────────────────────────────
# Without MAX_DAYS_PAST_DEADLINE, the first production run swept up 81 real
# graduates whose deadlines were 182-287 days past, none of whom had ever
# received a P1. These pin the cap so that can't come back.

def _p2_deal_due_at(days_past: int):
    """A graduated Deal whose P2 deadline is exactly `days_past` days ago,
    landing on a weekly boundary so only the cap decides the outcome."""
    grad = date(2026, 1, 15)
    deadline = add_months(grad, 6) + timedelta(days=7)
    deal = make_deal("d1", training_id="s1",
                     stage="Graduated or Post Evaluation Completed", graduate_date=grad)
    return deal, deadline + timedelta(days=days_past)

def test_p2_fires_on_last_weekly_boundary_within_cap():
    cap = p2_impact_eval_overdue.MAX_DAYS_PAST_DEADLINE
    last = cap - (cap % 7)  # 56 -> day 56, the final nudge
    deal, today = _p2_deal_due_at(last)
    assert len(p2_impact_eval_overdue.due([deal], state={}, today=today)) == 1

def test_p2_suppressed_past_cap():
    deal, today = _p2_deal_due_at(p2_impact_eval_overdue.MAX_DAYS_PAST_DEADLINE + 7)
    assert p2_impact_eval_overdue.due([deal], state={}, today=today) == []

def test_p2_suppressed_for_long_historical_backlog():
    # 203 days = the median of the real 2026-08-21 production backlog
    deal, today = _p2_deal_due_at(203)
    assert p2_impact_eval_overdue.due([deal], state={}, today=today) == []


# ── P1/P2 participant name rendering (added 2026-08-21) ─────────────────────
# Live Deals carry First_Name=None and "Last, First" values; both reached the
# rendered email verbatim ("Dear None,", a doubled comma in the subject).

def test_null_first_name_does_not_render_none():
    deal = {"id": "d1", "First_Name": None, "Last_Name": None, "Email": "x@y.org"}
    subj, body = email_templates.p2_email(deal, date(2026, 8, 14), "Some Training")
    assert "None" not in subj
    assert "Dear friend," in body
    assert "Dear None" not in body

def test_null_first_name_drops_trailing_subject_comma():
    deal = {"id": "d1", "First_Name": None, "Last_Name": None, "Email": "x@y.org"}
    subj, _ = email_templates.p1_email(deal, date(2026, 8, 28), "Some Training")
    assert subj == "💭 A few minutes for your Impact Evaluation"

def test_last_name_only_still_greets_by_name():
    deal = {"id": "d1", "First_Name": None, "Last_Name": "Cruz", "Email": "x@y.org"}
    subj, body = email_templates.p1_email(deal, date(2026, 8, 28), "Some Training")
    assert subj.endswith("Cruz")
    assert "Dear Cruz," in body

def test_trailing_comma_stripped_from_name():
    deal = {"id": "d1", "First_Name": "Po-Jen,", "Last_Name": "Wu", "Email": "x@y.org"}
    subj, body = email_templates.p2_email(deal, date(2026, 8, 14), "Some Training")
    assert subj.endswith("Po-Jen")
    assert "Dear Po-Jen Wu," in body
