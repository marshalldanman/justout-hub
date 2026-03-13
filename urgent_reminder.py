#!/usr/bin/env python3
"""
Urgent Task Reminder — one trigger, one function.

TRIGGER: a task deadline is approaching or overdue
FUNCTION: send an urgent email notification

Setup:
  1. Fill in YOUR_EMAIL, YOUR_APP_PASSWORD, and SMTP settings below
  2. Add tasks to the TASKS list with deadlines
  3. Run:  python3 urgent_reminder.py
  4. Optional: schedule with cron to run every hour:
     0 * * * * cd /path/to/justout-hub && python3 urgent_reminder.py
"""

import smtplib
import json
import os
from email.mime.text import MIMEText
from datetime import datetime, timedelta

# ──────────────────────────────────────────────
# CONFIG — fill these in once
# ──────────────────────────────────────────────
EMAIL_TO = "YOUR_EMAIL@gmail.com"           # where to send alerts
EMAIL_FROM = "YOUR_EMAIL@gmail.com"         # sender (can be same)
EMAIL_PASSWORD = "YOUR_APP_PASSWORD"        # Gmail app password (not your login password)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# How many hours before a deadline counts as "approaching"
WARN_HOURS_BEFORE = 24

# ──────────────────────────────────────────────
# TASKS — add your important stuff here
# Format: {"task": "description", "deadline": "YYYY-MM-DD HH:MM"}
# ──────────────────────────────────────────────
TASKS = [
    {"task": "Example: Submit tax documents", "deadline": "2026-04-15 17:00"},
    {"task": "Example: Renew domain name",    "deadline": "2026-03-20 09:00"},
]

# Track which alerts already fired so you don't get spammed
SENT_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".reminder_sent.json")


def load_sent():
    if os.path.exists(SENT_LOG):
        with open(SENT_LOG) as f:
            return json.load(f)
    return []


def save_sent(sent):
    with open(SENT_LOG, "w") as f:
        json.dump(sent, f)


# ──────────────────────────────────────────────
# THE ONE FUNCTION: send urgent email
# ──────────────────────────────────────────────
def send_urgent_email(task, deadline, status):
    subject = f"🚨 URGENT: {task}"
    body = (
        f"URGENT REMINDER\n"
        f"{'=' * 40}\n\n"
        f"Task:     {task}\n"
        f"Deadline: {deadline}\n"
        f"Status:   {status}\n\n"
        f"— JustOut Reminder System"
    )

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = EMAIL_TO
    msg["X-Priority"] = "1"  # marks as high priority / urgent

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(EMAIL_FROM, EMAIL_PASSWORD)
        server.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())

    print(f"[SENT] Urgent email: {task}")


# ──────────────────────────────────────────────
# THE ONE TRIGGER: check if forgetting something
# ──────────────────────────────────────────────
def check_triggers():
    now = datetime.now()
    warn_window = timedelta(hours=WARN_HOURS_BEFORE)
    sent = load_sent()
    new_alerts = False

    for item in TASKS:
        task = item["task"]
        deadline = datetime.strptime(item["deadline"], "%Y-%m-%d %H:%M")
        key = f"{task}|{item['deadline']}"

        if key in sent:
            continue

        if now >= deadline:
            send_urgent_email(task, item["deadline"], "⚠️  OVERDUE — you missed this!")
            sent.append(key)
            new_alerts = True
        elif deadline - now <= warn_window:
            hours_left = (deadline - now).total_seconds() / 3600
            send_urgent_email(task, item["deadline"], f"⏰  Due in {hours_left:.1f} hours")
            sent.append(key)
            new_alerts = True

    if new_alerts:
        save_sent(sent)
    else:
        print("[OK] Nothing urgent right now.")


if __name__ == "__main__":
    check_triggers()
