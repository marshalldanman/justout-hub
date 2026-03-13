#!/usr/bin/env python3
"""
THE FINGER — JustOut Autonomous Prototype

One finger of a much larger body. This script:
  1. Connects to a Google Sheet (your command center)
  2. Reads the "Tasks" tab for deadlines you're about to forget
  3. Reads the "Commands" tab for [bracketed commands] you drop in
  4. Acts: sends urgent email, logs what it did

Google Sheet expected structure:
  Tab "Tasks":    Task | Deadline (YYYY-MM-DD) | Priority (high/med/low) | Status (active/done)
  Tab "Commands": Source | Text | Status (pending/done) | Result

Setup:
  1. pip install -r requirements.txt
  2. Create a Google Cloud service account, download JSON key
  3. Share your Google Sheet with the service account email
  4. Copy config below or set env vars
  5. Run:  python3 finger.py
  6. Cron: */30 * * * * cd /path/to/justout-hub && python3 finger.py
"""

import os
import re
import json
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta

import gspread
from google.oauth2.service_account import Credentials

# ──────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────
SERVICE_ACCOUNT_FILE = os.environ.get(
    "GOOGLE_SA_KEY",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "service_account.json")
)
SPREADSHEET_NAME = os.environ.get("FINGER_SHEET", "AI Central Command")

# Email config
EMAIL_TO       = os.environ.get("FINGER_EMAIL_TO", "YOUR_EMAIL@gmail.com")
EMAIL_FROM     = os.environ.get("FINGER_EMAIL_FROM", "YOUR_EMAIL@gmail.com")
EMAIL_PASSWORD = os.environ.get("FINGER_EMAIL_PASS", "YOUR_APP_PASSWORD")
SMTP_SERVER    = "smtp.gmail.com"
SMTP_PORT      = 587

# How far ahead to warn (hours)
WARN_HOURS = 48

# Log file to avoid repeat alerts
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".finger_log.json")

# Bracket command pattern: matches [anything in brackets]
BRACKET_RE = re.compile(r'\[([^\]]+)\]')

# ──────────────────────────────────────────────
# GOOGLE SHEETS CONNECTION
# ──────────────────────────────────────────────
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

def connect_sheet():
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)
    return gc.open(SPREADSHEET_NAME)


# ──────────────────────────────────────────────
# LOG — track what we already acted on
# ──────────────────────────────────────────────
def load_log():
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE) as f:
            return json.load(f)
    return {"sent_tasks": [], "done_commands": []}


def save_log(log):
    with open(LOG_FILE, "w") as f:
        json.dump(log, f, indent=2)


# ──────────────────────────────────────────────
# THE ONE FUNCTION: send urgent email
# ──────────────────────────────────────────────
def send_urgent_email(subject_line, body_text):
    msg = MIMEText(body_text)
    msg["Subject"] = f"🚨 URGENT: {subject_line}"
    msg["From"] = EMAIL_FROM
    msg["To"] = EMAIL_TO
    msg["X-Priority"] = "1"

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(EMAIL_FROM, EMAIL_PASSWORD)
        server.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())

    print(f"  [SENT] {subject_line}")


# ──────────────────────────────────────────────
# FINGER 1: Check Tasks tab for deadlines
# ──────────────────────────────────────────────
def check_tasks(sheet, log):
    """
    Expected columns: Task | Deadline | Priority | Status
    Row 1 is header.
    """
    try:
        ws = sheet.worksheet("Tasks")
    except gspread.exceptions.WorksheetNotFound:
        print("[SKIP] No 'Tasks' tab found in sheet.")
        return

    rows = ws.get_all_values()
    if len(rows) < 2:
        print("[OK] Tasks tab is empty.")
        return

    now = datetime.now()
    warn_window = timedelta(hours=WARN_HOURS)

    for i, row in enumerate(rows[1:], start=2):  # skip header
        if len(row) < 4:
            continue

        task, deadline_str, priority, status = row[0], row[1], row[2], row[3]

        if not task or not deadline_str:
            continue
        if status.strip().lower() == "done":
            continue

        # Parse deadline (flexible formats)
        deadline = None
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d %H:%M"):
            try:
                deadline = datetime.strptime(deadline_str.strip(), fmt)
                break
            except ValueError:
                continue

        if deadline is None:
            print(f"  [WARN] Can't parse deadline '{deadline_str}' for task: {task}")
            continue

        key = f"task|{task}|{deadline_str}"
        if key in log["sent_tasks"]:
            continue

        is_high = priority.strip().lower() in ("high", "urgent", "critical")

        if now >= deadline:
            send_urgent_email(
                f"{task} — OVERDUE",
                f"OVERDUE TASK\n{'=' * 40}\n\n"
                f"Task:     {task}\n"
                f"Deadline: {deadline_str}\n"
                f"Priority: {priority}\n"
                f"Status:   OVERDUE — was due {(now - deadline).days} day(s) ago\n\n"
                f"— The Finger"
            )
            log["sent_tasks"].append(key)

        elif deadline - now <= warn_window or is_high:
            hours_left = (deadline - now).total_seconds() / 3600
            send_urgent_email(
                f"{task} — due in {hours_left:.0f}h",
                f"APPROACHING DEADLINE\n{'=' * 40}\n\n"
                f"Task:     {task}\n"
                f"Deadline: {deadline_str}\n"
                f"Priority: {priority}\n"
                f"Status:   ⏰ Due in {hours_left:.0f} hours\n\n"
                f"— The Finger"
            )
            log["sent_tasks"].append(key)


# ──────────────────────────────────────────────
# FINGER 2: Check Commands tab for [brackets]
# ──────────────────────────────────────────────
def check_commands(sheet, log):
    """
    Expected columns: Source | Text | Status | Result
    Row 1 is header.

    Scans the Text column for [bracketed commands].
    A command is anything in [square brackets].
    If Status is "pending" or blank, it gets processed.

    Known commands:
      [remind]    — sends an email reminder with the surrounding text
      [urgent]    — sends an urgent priority email
      [task]      — creates/flags a task alert
      [note]      — logs it (no email, just acknowledgement)
      [anything]  — treated as a general flag, sends notification
    """
    try:
        ws = sheet.worksheet("Commands")
    except gspread.exceptions.WorksheetNotFound:
        print("[SKIP] No 'Commands' tab found in sheet.")
        return

    rows = ws.get_all_values()
    if len(rows) < 2:
        print("[OK] Commands tab is empty.")
        return

    for i, row in enumerate(rows[1:], start=2):  # skip header
        if len(row) < 3:
            continue

        source = row[0].strip()
        text = row[1].strip()
        status = row[2].strip().lower()

        if not text:
            continue
        if status == "done":
            continue

        # Find all [bracketed commands] in the text
        commands = BRACKET_RE.findall(text)
        if not commands:
            continue

        key = f"cmd|{i}|{text[:80]}"
        if key in log["done_commands"]:
            continue

        # Process each command found
        for cmd in commands:
            cmd_lower = cmd.lower().strip()
            clean_text = BRACKET_RE.sub('', text).strip()

            if cmd_lower in ("remind", "reminder"):
                send_urgent_email(
                    f"Reminder from {source or 'Command Sheet'}",
                    f"REMINDER\n{'=' * 40}\n\n"
                    f"Source:  {source}\n"
                    f"Message: {clean_text}\n\n"
                    f"— The Finger"
                )

            elif cmd_lower in ("urgent", "asap", "critical"):
                send_urgent_email(
                    f"CRITICAL from {source or 'Command Sheet'}",
                    f"CRITICAL ALERT\n{'=' * 40}\n\n"
                    f"Source:  {source}\n"
                    f"Message: {clean_text}\n\n"
                    f"— The Finger"
                )

            elif cmd_lower in ("task", "todo"):
                send_urgent_email(
                    f"New task flagged: {clean_text[:60]}",
                    f"TASK FLAGGED\n{'=' * 40}\n\n"
                    f"Source:  {source}\n"
                    f"Task:    {clean_text}\n\n"
                    f"— The Finger"
                )

            elif cmd_lower in ("note", "log", "fyi"):
                print(f"  [NOTE] {source}: {clean_text}")

            else:
                # Unknown bracket = general notification
                send_urgent_email(
                    f"[{cmd}] from {source or 'Command Sheet'}",
                    f"COMMAND DETECTED\n{'=' * 40}\n\n"
                    f"Command: [{cmd}]\n"
                    f"Source:  {source}\n"
                    f"Context: {clean_text}\n\n"
                    f"— The Finger"
                )

        # Mark as done in the sheet
        try:
            ws.update_cell(i, 3, "done")
            ws.update_cell(i, 4, f"Processed {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        except Exception as e:
            print(f"  [WARN] Could not update row {i} status: {e}")

        log["done_commands"].append(key)


# ──────────────────────────────────────────────
# FINGER 3: Scan any tab for stray [brackets]
# ──────────────────────────────────────────────
def scan_all_tabs(sheet, log):
    """
    Quick scan across ALL tabs for [bracketed commands] that
    might be dropped anywhere — brainstorm sheets, ledger notes, etc.
    Only looks at cells that contain brackets.
    Skips Tasks and Commands tabs (already handled).
    """
    skip_tabs = {"tasks", "commands"}

    for ws in sheet.worksheets():
        if ws.title.lower() in skip_tabs:
            continue

        try:
            all_cells = ws.get_all_values()
        except Exception:
            continue

        for r, row in enumerate(all_cells, start=1):
            for c, cell in enumerate(row, start=1):
                if not cell or '[' not in cell:
                    continue

                commands = BRACKET_RE.findall(cell)
                if not commands:
                    continue

                # Filter out obviously non-command brackets
                # (e.g. spreadsheet formulas, column headers like [Amount])
                real_commands = [
                    cmd for cmd in commands
                    if cmd.lower() not in (
                        "amount", "date", "description", "total", "balance",
                        "debit", "credit", "category", "name", "notes",
                        "status", "priority", "source", "result", "type",
                    )
                ]

                if not real_commands:
                    continue

                key = f"scan|{ws.title}|{r}:{c}|{cell[:60]}"
                if key in log["done_commands"]:
                    continue

                clean_text = BRACKET_RE.sub('', cell).strip()
                for cmd in real_commands:
                    print(f"  [FOUND] [{cmd}] in '{ws.title}' row {r}: {clean_text[:80]}")
                    send_urgent_email(
                        f"[{cmd}] found in {ws.title}",
                        f"BRACKET COMMAND DETECTED\n{'=' * 40}\n\n"
                        f"Sheet:   {ws.title}\n"
                        f"Cell:    Row {r}, Col {c}\n"
                        f"Command: [{cmd}]\n"
                        f"Context: {clean_text}\n\n"
                        f"— The Finger"
                    )

                log["done_commands"].append(key)


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
def main():
    print(f"=== THE FINGER — {datetime.now().strftime('%Y-%m-%d %H:%M')} ===")
    print()

    log = load_log()

    try:
        sheet = connect_sheet()
        print(f"[OK] Connected to '{SPREADSHEET_NAME}'")
    except FileNotFoundError:
        print(f"[ERROR] Service account key not found: {SERVICE_ACCOUNT_FILE}")
        print("  → Download from Google Cloud Console and save as service_account.json")
        return
    except Exception as e:
        print(f"[ERROR] Can't connect to Google Sheet: {e}")
        return

    print()
    print("--- Checking Tasks ---")
    check_tasks(sheet, log)

    print()
    print("--- Checking Commands ---")
    check_commands(sheet, log)

    print()
    print("--- Scanning all tabs for [brackets] ---")
    scan_all_tabs(sheet, log)

    save_log(log)

    print()
    print("[DONE] Finger check complete.")


if __name__ == "__main__":
    main()
