"""Tests for reminder_logic.py — pure date logic, no CRM or Gmail calls."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

from datetime import date
import reminder_logic as rl


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_plan(name, start_date, organised_by="Philippines"):
    return {"id": "p1", "Name": name, "Start_Date": start_date, "Organised_By": organised_by}

def make_training(id_, title, organised_by, close_date=None, end_date=None, plan_name=None):
    return {
        "id": id_, "Solution_Title": title, "Organised_By": organised_by,
        "Application_Form_Close_Date": close_date,
        "End_Date": end_date,
        "Training_Title_Plan": plan_name,
    }

def make_deal(id_, training_id, stage, email="a@b.com", first="Ann", last="Lee", org="Org"):
    return {
        "id": id_, "Training_Applied": {"id": training_id},
        "Stage": stage, "Email": email,
        "First_Name": first, "Last_Name": last,
        "Account_Name": {"name": org},
    }


# ── Reminder 1 ────────────────────────────────────────────────────────────────

def test_reminder1_fires_at_60_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Alpha Training", date(2026, 3, 2))  # 60 days away
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert len(result) == 1
    assert result[0]["plan"]["Name"] == "Alpha Training"
    assert result[0]["days"] == 60

def test_reminder1_fires_at_45_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Beta Training", date(2026, 2, 15))  # 45 days away
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert len(result) == 1
    assert result[0]["days"] == 45

def test_reminder1_fires_at_30_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Gamma Training", date(2026, 1, 31))  # 30 days away
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert len(result) == 1
    assert result[0]["days"] == 30

def test_reminder1_suppressed_if_linked_solution_exists():
    today = date(2026, 1, 1)
    plan  = make_plan("Alpha Training", date(2026, 3, 2))
    sol   = make_training("s1", "Alpha Training Session", "Philippines", plan_name="Alpha Training")
    result = rl.check_reminder1([plan], solutions=[sol], today=today)
    assert result == []

def test_reminder1_does_not_fire_on_other_days():
    today = date(2026, 1, 1)
    plan  = make_plan("Alpha Training", date(2026, 2, 20))  # 50 days away — not a trigger day
    result = rl.check_reminder1([plan], solutions=[], today=today)
    assert result == []


# ── Reminder 2 ────────────────────────────────────────────────────────────────

def test_reminder2_fires_when_window_closed_and_pending_exist():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=date(2026, 5, 9))
    deal     = make_deal("d1", "t1", "Still in Applied Stage")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert len(result) == 1
    assert result[0]["training"]["id"] == "t1"
    assert len(result[0]["pending"]) == 1

def test_reminder2_suppressed_when_all_resolved():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=date(2026, 5, 9))
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert result == []

def test_reminder2_suppressed_when_window_still_open():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=date(2026, 5, 11))
    deal     = make_deal("d1", "t1", "Still in Applied Stage")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert result == []

def test_reminder2_skipped_if_no_close_date():
    today    = date(2026, 5, 10)
    training = make_training("t1", "PH Training", "Philippines", close_date=None)
    deal     = make_deal("d1", "t1", "Still in Applied Stage")
    result   = rl.check_reminder2([training], [deal], today=today)
    assert result == []


# ── Reminder 3 ────────────────────────────────────────────────────────────────

def test_reminder3_fires_when_training_ended_and_selected_remain():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 6, 4))
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert len(result) == 1
    assert len(result[0]["pending"]) == 1

def test_reminder3_suppressed_when_no_selected_remain():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 6, 4))
    deal     = make_deal("d1", "t1", "Attended Training")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert result == []

def test_reminder3_suppressed_when_training_not_ended():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 6, 6))
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert result == []

def test_reminder3_skipped_if_no_end_date():
    today    = date(2026, 6, 5)
    training = make_training("t1", "PH Training", "Philippines", end_date=None)
    deal     = make_deal("d1", "t1", "Selected")
    result   = rl.check_reminder3([training], [deal], today=today)
    assert result == []


# ── Reminder 4 ────────────────────────────────────────────────────────────────

def test_reminder4_fires_on_monday_below_90pct():
    monday   = date(2026, 5, 4)   # weekday() == 0
    assert monday.weekday() == 0
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 4, 30))
    attended  = make_deal("d1", "t1", "Attended Training")
    graduated = make_deal("d2", "t1", "Graduated or Post Evaluation Completed")
    result = rl.check_reminder4([training], [attended, graduated], today=monday)
    # 1 of 2 completed = 50% -> below 90%
    assert len(result) == 1
    assert result[0]["pct"] == 50
    assert len(result[0]["incomplete"]) == 1

def test_reminder4_suppressed_when_90pct_met():
    monday   = date(2026, 5, 4)
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 4, 30))
    deals = [make_deal(f"d{i}", "t1", "Graduated or Post Evaluation Completed") for i in range(9)]
    deals.append(make_deal("d9", "t1", "Attended Training"))
    result = rl.check_reminder4([training], deals, today=monday)
    # 9 of 10 = 90% -> threshold met -> no reminder
    assert result == []

def test_reminder4_does_not_fire_on_non_monday():
    tuesday  = date(2026, 5, 5)   # weekday() == 1
    training = make_training("t1", "PH Training", "Philippines", end_date=date(2026, 4, 30))
    deal     = make_deal("d1", "t1", "Attended Training")
    result   = rl.check_reminder4([training], [deal], today=tuesday)
    assert result == []

def test_reminder4_skipped_if_no_end_date():
    monday   = date(2026, 5, 4)
    training = make_training("t1", "PH Training", "Philippines", end_date=None)
    deal     = make_deal("d1", "t1", "Attended Training")
    result   = rl.check_reminder4([training], [deal], today=monday)
    assert result == []
