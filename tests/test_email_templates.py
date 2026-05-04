import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

from email_templates import (
    reminder1_email, reminder2_email, reminder3_email, reminder4_email
)

PORTAL_BASE = "https://aktivasia-portal.pages.dev"

def make_plan():
    from datetime import date
    return {"id": "p1", "Name": "PH Foundational 2026", "Start_Date": date(2026, 7, 1), "Organised_By": "Philippines"}

def make_training():
    from datetime import date
    return {"id": "t1", "Solution_Title": "PH Foundational July", "Organised_By": "Philippines",
            "Application_Form_Close_Date": date(2026, 5, 15), "End_Date": date(2026, 7, 10)}

def make_deal(stage="Still in Applied Stage"):
    return {"id": "d1", "First_Name": "Ana", "Last_Name": "Reyes", "Email": "ana@example.com",
            "Account_Name": {"name": "GreenOrg"}, "Stage": stage,
            "Training_Applied": {"id": "t1"}}


def test_reminder1_subject():
    subj, _ = reminder1_email(make_plan(), days=30)
    assert "PH Foundational 2026" in subj
    assert "30" in subj

def test_reminder1_body_has_create_link():
    _, body = reminder1_email(make_plan(), days=30)
    assert "create-training.html" in body

def test_reminder2_subject():
    subj, _ = reminder2_email(make_training(), pending=[make_deal()])
    assert "PH Foundational July" in subj

def test_reminder2_body_has_participant_table():
    _, body = reminder2_email(make_training(), pending=[make_deal()])
    assert "Ana Reyes" in body
    assert "ana@example.com" in body
    assert "admin.html" in body

def test_reminder3_subject():
    subj, _ = reminder3_email(make_training(), pending=[make_deal("Selected")])
    assert "PH Foundational July" in subj

def test_reminder3_body_has_participant_table():
    _, body = reminder3_email(make_training(), pending=[make_deal("Selected")])
    assert "Ana Reyes" in body
    assert "admin.html" in body

def test_reminder4_subject_has_pct():
    subj, _ = reminder4_email(make_training(), incomplete=[make_deal("Attended Training")],
                               completed=1, attended_total=2, pct=50)
    assert "50%" in subj

def test_reminder4_body_has_email_column():
    _, body = reminder4_email(make_training(), incomplete=[make_deal("Attended Training")],
                               completed=1, attended_total=2, pct=50)
    assert "ana@example.com" in body
    assert "admin.html" in body
