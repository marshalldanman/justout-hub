#!/usr/bin/env python3
"""
THE FINGER — JustOut Autonomous Prototype

One finger of a much larger body. This script:
  1. Connects to a Google Sheet (your command center)
  2. Reads the "Tasks" tab for deadlines you're about to forget
  3. Reads the "Commands" tab for [bracketed commands] you drop in
  4. Scans ALL other tabs for stray [brackets] dropped anywhere
  5. Acts: sends urgent email, logs what it did

Usage:
  python3 finger.py              # normal run — checks & sends
  python3 finger.py --dry-run    # shows what it WOULD do, sends nothing
  python3 finger.py --status     # prints current tasks & commands, no action
  python3 finger.py --reset      # clears the sent log (re-alerts everything)

Config:
  Create finger_config.json (see SETUP_FINGER.txt) or use env vars.
"""

import argparse
import os
import re
import json
import smtplib
import sys
from email.mime.text import MIMEText
from datetime import datetime, timedelta

import gspread
from google.oauth2.service_account import Credentials

# ──────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "finger_config.json")
LOG_FILE = os.path.join(SCRIPT_DIR, ".finger_log.json")

# Bracket command pattern
BRACKET_RE = re.compile(r'\[([^\]]+)\]')

# Column headers that look like brackets but aren't commands
IGNORE_BRACKETS = frozenset({
    "amount", "date", "description", "total", "balance",
    "debit", "credit", "category", "name", "notes",
    "status", "priority", "source", "result", "type",
    "id", "ref", "memo", "qty", "unit", "rate", "tax",
    "subtotal", "paid", "due", "from", "to", "cc", "bcc",
})

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]


def load_config():
    """Load from finger_config.json, falling back to env vars, then defaults."""
    cfg = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            cfg = json.load(f)

    return {
        "service_account_file": cfg.get("service_account_file",
            os.environ.get("GOOGLE_SA_KEY",
                os.path.join(SCRIPT_DIR, "service_account.json"))),
        "spreadsheet": cfg.get("spreadsheet",
            os.environ.get("FINGER_SHEET", "AI Central Command")),
        "email_to": cfg.get("email_to",
            os.environ.get("FINGER_EMAIL_TO", "")),
        "email_from": cfg.get("email_from",
            os.environ.get("FINGER_EMAIL_FROM", "")),
        "email_password": cfg.get("email_password",
            os.environ.get("FINGER_EMAIL_PASS", "")),
        "smtp_server": cfg.get("smtp_server", "smtp.gmail.com"),
        "smtp_port": cfg.get("smtp_port", 587),
        "warn_hours": cfg.get("warn_hours", 48),
    }


# ──────────────────────────────────────────────
# GOOGLE SHEETS CONNECTION
# ──────────────────────────────────────────────
def connect_sheet(config):
    creds = Credentials.from_service_account_file(
        config["service_account_file"], scopes=SCOPES
    )
    gc = gspread.authorize(creds)
    return gc.open(config["spreadsheet"])


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
# STATS — track what happened this run
# ──────────────────────────────────────────────
class RunStats:
    def __init__(self):
        self.emails_sent = 0
        self.emails_failed = 0
        self.tasks_checked = 0
        self.tasks_urgent = 0
        self.commands_processed = 0
        self.brackets_found = 0
        self.tabs_scanned = 0

    def summary(self):
        lines = [
            f"  Tasks checked:       {self.tasks_checked}",
            f"  Tasks urgent/overdue:{self.tasks_urgent}",
            f"  Commands processed:  {self.commands_processed}",
            f"  Brackets found:      {self.brackets_found}",
            f"  Tabs scanned:        {self.tabs_scanned}",
            f"  Emails sent:         {self.emails_sent}",
        ]
        if self.emails_failed:
            lines.append(f"  Emails FAILED:       {self.emails_failed}")
        return "\n".join(lines)


stats = RunStats()


# ──────────────────────────────────────────────
# EMAIL
# ──────────────────────────────────────────────
def send_urgent_email(config, subject_line, body_text, dry_run=False):
    if dry_run:
        print(f"  [DRY-RUN] Would send: {subject_line}")
        stats.emails_sent += 1
        return True

    if not config["email_to"] or not config["email_password"]:
        print(f"  [SKIP] Email not configured — {subject_line}")
        return False

    msg = MIMEText(body_text)
    msg["Subject"] = f"URGENT: {subject_line}"
    msg["From"] = config["email_from"]
    msg["To"] = config["email_to"]
    msg["X-Priority"] = "1"

    try:
        with smtplib.SMTP(config["smtp_server"], config["smtp_port"]) as server:
            server.starttls()
            server.login(config["email_from"], config["email_password"])
            server.sendmail(config["email_from"], config["email_to"], msg.as_string())
        print(f"  [SENT] {subject_line}")
        stats.emails_sent += 1
        return True
    except Exception as e:
        print(f"  [FAIL] Could not send '{subject_line}': {e}")
        stats.emails_failed += 1
        return False


# ──────────────────────────────────────────────
# FINGER 1: Check Tasks tab for deadlines
# ──────────────────────────────────────────────
def check_tasks(sheet, config, log, dry_run=False):
    try:
        ws = sheet.worksheet("Tasks")
    except gspread.exceptions.WorksheetNotFound:
        print("  [SKIP] No 'Tasks' tab found.")
        return

    rows = ws.get_all_values()
    if len(rows) < 2:
        print("  [OK] Tasks tab is empty.")
        return

    now = datetime.now()
    warn_window = timedelta(hours=config["warn_hours"])

    for i, row in enumerate(rows[1:], start=2):
        if len(row) < 4:
            continue

        task, deadline_str, priority, status = row[0], row[1], row[2], row[3]
        if not task or not deadline_str:
            continue
        if status.strip().lower() == "done":
            continue

        stats.tasks_checked += 1

        deadline = _parse_date(deadline_str)
        if deadline is None:
            print(f"  [WARN] Can't parse date '{deadline_str}' for: {task}")
            continue

        key = f"task|{task}|{deadline_str}"
        if key in log["sent_tasks"]:
            continue

        is_high = priority.strip().lower() in ("high", "urgent", "critical")

        if now >= deadline:
            days_over = (now - deadline).days
            send_urgent_email(config,
                f"{task} — OVERDUE",
                f"OVERDUE TASK\n{'=' * 40}\n\n"
                f"Task:     {task}\n"
                f"Deadline: {deadline_str}\n"
                f"Priority: {priority}\n"
                f"Status:   OVERDUE — was due {days_over} day(s) ago\n\n"
                f"— The Finger",
                dry_run=dry_run)
            stats.tasks_urgent += 1
            log["sent_tasks"].append(key)

        elif deadline - now <= warn_window or is_high:
            hours_left = (deadline - now).total_seconds() / 3600
            send_urgent_email(config,
                f"{task} — due in {hours_left:.0f}h",
                f"APPROACHING DEADLINE\n{'=' * 40}\n\n"
                f"Task:     {task}\n"
                f"Deadline: {deadline_str}\n"
                f"Priority: {priority}\n"
                f"Hours:    {hours_left:.0f}h remaining\n\n"
                f"— The Finger",
                dry_run=dry_run)
            stats.tasks_urgent += 1
            log["sent_tasks"].append(key)


# ──────────────────────────────────────────────
# FINGER 2: Check Commands tab for [brackets]
# ──────────────────────────────────────────────
def check_commands(sheet, config, log, dry_run=False):
    try:
        ws = sheet.worksheet("Commands")
    except gspread.exceptions.WorksheetNotFound:
        print("  [SKIP] No 'Commands' tab found.")
        return

    rows = ws.get_all_values()
    if len(rows) < 2:
        print("  [OK] Commands tab is empty.")
        return

    for i, row in enumerate(rows[1:], start=2):
        if len(row) < 3:
            continue

        source = row[0].strip()
        text = row[1].strip()
        status = row[2].strip().lower()

        if not text or status == "done":
            continue

        commands = BRACKET_RE.findall(text)
        if not commands:
            continue

        key = f"cmd|{i}|{text[:80]}"
        if key in log["done_commands"]:
            continue

        stats.commands_processed += 1
        clean_text = BRACKET_RE.sub('', text).strip()

        for cmd in commands:
            _dispatch_command(cmd, clean_text, source, config, dry_run)

        # Mark as done in the sheet
        if not dry_run:
            try:
                ws.update_cell(i, 3, "done")
                ws.update_cell(i, 4, f"Processed {datetime.now().strftime('%Y-%m-%d %H:%M')}")
            except Exception as e:
                print(f"  [WARN] Could not update row {i}: {e}")

        log["done_commands"].append(key)


# ──────────────────────────────────────────────
# FINGER 3: Scan all tabs for stray [brackets]
# ──────────────────────────────────────────────
def scan_all_tabs(sheet, config, log, dry_run=False):
    skip_tabs = {"tasks", "commands"}

    for ws in sheet.worksheets():
        if ws.title.lower() in skip_tabs:
            continue

        stats.tabs_scanned += 1

        try:
            all_cells = ws.get_all_values()
        except Exception:
            continue

        for r, row in enumerate(all_cells, start=1):
            for c, cell in enumerate(row, start=1):
                if not cell or '[' not in cell:
                    continue

                commands = BRACKET_RE.findall(cell)
                real_commands = [
                    cmd for cmd in commands
                    if cmd.lower().strip() not in IGNORE_BRACKETS
                ]
                if not real_commands:
                    continue

                key = f"scan|{ws.title}|{r}:{c}|{cell[:60]}"
                if key in log["done_commands"]:
                    continue

                clean_text = BRACKET_RE.sub('', cell).strip()
                for cmd in real_commands:
                    stats.brackets_found += 1
                    print(f"  [FOUND] [{cmd}] in '{ws.title}' R{r}C{c}")
                    _dispatch_command(cmd, clean_text, ws.title, config, dry_run)

                log["done_commands"].append(key)


# ──────────────────────────────────────────────
# COMMAND DISPATCH
# ──────────────────────────────────────────────
def _dispatch_command(cmd, clean_text, source, config, dry_run):
    """Route a bracket command to the right action."""
    cmd_lower = cmd.lower().strip()

    if cmd_lower in ("remind", "reminder"):
        send_urgent_email(config,
            f"Reminder from {source or 'unknown'}",
            f"REMINDER\n{'=' * 40}\n\n"
            f"Source:  {source}\nMessage: {clean_text}\n\n— The Finger",
            dry_run=dry_run)

    elif cmd_lower in ("urgent", "asap", "critical"):
        send_urgent_email(config,
            f"CRITICAL from {source or 'unknown'}",
            f"CRITICAL ALERT\n{'=' * 40}\n\n"
            f"Source:  {source}\nMessage: {clean_text}\n\n— The Finger",
            dry_run=dry_run)

    elif cmd_lower in ("task", "todo"):
        send_urgent_email(config,
            f"New task: {clean_text[:60]}",
            f"TASK FLAGGED\n{'=' * 40}\n\n"
            f"Source:  {source}\nTask:    {clean_text}\n\n— The Finger",
            dry_run=dry_run)

    elif cmd_lower in ("note", "log", "fyi"):
        print(f"  [NOTE] {source}: {clean_text[:100]}")

    elif cmd_lower in ("email", "send"):
        send_urgent_email(config,
            f"Message from {source or 'unknown'}",
            f"FORWARDED MESSAGE\n{'=' * 40}\n\n"
            f"Source:  {source}\nMessage: {clean_text}\n\n— The Finger",
            dry_run=dry_run)

    elif cmd_lower in ("snooze", "skip", "ignore"):
        print(f"  [SNOOZE] Skipping: {clean_text[:80]}")

    else:
        # Unknown bracket = general notification
        send_urgent_email(config,
            f"[{cmd}] from {source or 'unknown'}",
            f"COMMAND DETECTED\n{'=' * 40}\n\n"
            f"Command: [{cmd}]\nSource:  {source}\n"
            f"Context: {clean_text}\n\n— The Finger",
            dry_run=dry_run)


# ──────────────────────────────────────────────
# STATUS MODE — just print what's in the sheet
# ──────────────────────────────────────────────
def print_status(sheet):
    # Tasks
    print("\n--- TASKS ---")
    try:
        ws = sheet.worksheet("Tasks")
        rows = ws.get_all_values()
        if len(rows) < 2:
            print("  (empty)")
        else:
            now = datetime.now()
            for row in rows[1:]:
                if len(row) < 4:
                    continue
                task, deadline_str, priority, status = row[0], row[1], row[2], row[3]
                if not task:
                    continue
                deadline = _parse_date(deadline_str)
                marker = ""
                if deadline and status.strip().lower() != "done":
                    if now >= deadline:
                        marker = " ** OVERDUE **"
                    elif deadline - now <= timedelta(hours=48):
                        hours = (deadline - now).total_seconds() / 3600
                        marker = f" (due in {hours:.0f}h)"
                done = " [done]" if status.strip().lower() == "done" else ""
                print(f"  {priority:>8} | {deadline_str:>12} | {task}{done}{marker}")
    except gspread.exceptions.WorksheetNotFound:
        print("  (no Tasks tab)")

    # Commands
    print("\n--- COMMANDS ---")
    try:
        ws = sheet.worksheet("Commands")
        rows = ws.get_all_values()
        if len(rows) < 2:
            print("  (empty)")
        else:
            for row in rows[1:]:
                if len(row) < 3:
                    continue
                source, text, status = row[0], row[1], row[2]
                if not text:
                    continue
                done = " [done]" if status.strip().lower() == "done" else " [pending]"
                print(f"  {source:>14} | {text[:60]}{done}")
    except gspread.exceptions.WorksheetNotFound:
        print("  (no Commands tab)")

    # Other tabs — count brackets
    print("\n--- OTHER TABS ---")
    skip = {"tasks", "commands"}
    for ws in sheet.worksheets():
        if ws.title.lower() in skip:
            continue
        try:
            cells = ws.get_all_values()
            bracket_count = sum(
                1 for row in cells for cell in row
                if cell and BRACKET_RE.search(cell)
            )
            total = sum(1 for row in cells for cell in row if cell)
            print(f"  {ws.title}: {total} cells, {bracket_count} with [brackets]")
        except Exception:
            print(f"  {ws.title}: (could not read)")


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────
def _parse_date(s):
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d %H:%M", "%m-%d-%Y"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    return None


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="The Finger — JustOut autonomous checker")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without sending emails")
    parser.add_argument("--status", action="store_true",
                        help="Print current tasks & commands, take no action")
    parser.add_argument("--reset", action="store_true",
                        help="Clear the sent log so everything re-alerts")
    args = parser.parse_args()

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M')
    config = load_config()

    if args.reset:
        if os.path.exists(LOG_FILE):
            os.remove(LOG_FILE)
            print(f"[RESET] Cleared {LOG_FILE}")
        else:
            print("[RESET] Nothing to clear.")
        return

    mode = "DRY-RUN" if args.dry_run else ("STATUS" if args.status else "LIVE")
    print(f"=== THE FINGER [{mode}] — {now_str} ===")

    # Connect
    try:
        sheet = connect_sheet(config)
        print(f"[OK] Connected to '{config['spreadsheet']}'")
    except FileNotFoundError:
        print(f"[ERROR] Service account key not found: {config['service_account_file']}")
        print("  Download from Google Cloud Console → save as service_account.json")
        print("  Or create finger_config.json with the path.")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Can't connect: {e}")
        sys.exit(1)

    # Status mode — just print and exit
    if args.status:
        print_status(sheet)
        return

    # Normal / dry-run mode
    log = load_log()

    print("\n--- Tasks ---")
    check_tasks(sheet, config, log, dry_run=args.dry_run)

    print("\n--- Commands ---")
    check_commands(sheet, config, log, dry_run=args.dry_run)

    print("\n--- Scanning all tabs ---")
    scan_all_tabs(sheet, config, log, dry_run=args.dry_run)

    if not args.dry_run:
        save_log(log)

    print(f"\n--- Summary ---")
    print(stats.summary())
    print(f"\n[DONE] Finger check complete.")


if __name__ == "__main__":
    main()
