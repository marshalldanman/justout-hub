#!/usr/bin/env python3
"""
Gegenkraft Google Sheets Generator
===================================
Creates a fully formatted Google Sheet with all Gegenkraft data:
  - Definitions
  - 10 GK Moves (Gambling)
  - 10 Bee AI Integrations
  - Scoring Rules
  - Level Progression
  - 30-Day Daily Tracker with formulas

Usage:
  1. First time: python3 generate_gegenkraft_sheet.py --setup
     (walks you through Google API credentials)
  2. Generate:   python3 generate_gegenkraft_sheet.py [--start-date 2026-03-30] [--days 30]

Requirements:
  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
"""

import argparse
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# ─── Google API imports ───────────────────────────────────────
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
TOKEN_PATH = Path(__file__).parent / "token.json"
CREDS_PATH = Path(__file__).parent / "credentials.json"


# ═══════════════════════════════════════════════════════════════
#  DATA
# ═══════════════════════════════════════════════════════════════

DEFINITIONS = {
    "title": "Definitions",
    "headers": ["Term", "Definition", "Aliases", "Core Principle"],
    "rows": [
        [
            "Gegenkraft",
            "The action-power of intentional daily opposition of a habit — the intentional wedge that purposely sheds bad habits through deliberate denial/replacement, strategical countering or sabotage; its effectiveness tied to the law of momentum/inertia.",
            "Opposing Power, Gk-power, gkpower, gk",
            "Law of Momentum/Inertia",
        ],
        ["GK Move", "A specific daily action designed to oppose and disrupt a target habit", "Counter-move", "Deliberate opposition"],
        ["GK Power Level", "Self-rated daily score (1-10) of one's resistance strength and commitment", "Power Level", "Self-awareness"],
        ["Boss Battle", "A day with 3 or more urges — surviving clean earns double points", "High-urge day", "Resilience under pressure"],
        ["GK Streak", "Consecutive days of completed morning declarations and logged resistance", "Streak", "Momentum building"],
    ],
}

GK_MOVES = {
    "title": "GK Moves - Gambling",
    "headers": ["GK Move #", "Move Name", "Description", "Category", "Daily Action", "Difficulty", "Impact"],
    "rows": [
        ["1", "Delete & Block", "Uninstall every gambling app and use phone content restrictions to block re-downloading. Daily check: if it's back, it's gone again.", "Prevention", "Check app store restrictions are active", "Easy", "High"],
        ["2", "Kill the Funding", "Remove saved payment methods, cards, and autofill credentials tied to gambling sites. Re-entering info = friction wall.", "Prevention", "Verify no saved payment methods exist", "Easy", "High"],
        ["3", "Redirect the Trigger", "Identify the exact moment you reach for a gambling app (boredom/downtime/stress) and replace with a 5-minute action: walk, pushups, language lesson, journaling.", "Replacement", "Perform replacement action when triggered", "Medium", "High"],
        ["4", "Screen Time Sabotage", "Set daily screen time limit of 0 minutes on gambling-category apps/websites. Someone else holds the Screen Time passcode.", "Prevention", "Confirm screen time limits are enforced", "Easy", "High"],
        ["5", "Environment Poisoning", "Change phone wallpaper to bank statement showing losses or a written reminder of why you're stopping.", "Psychological", "Keep wallpaper as anti-gambling reminder", "Easy", "Medium"],
        ["6", "Announce the Bet You Didn't Make", "Each day write down one specific bet you would have made and the amount. Track running total of money saved.", "Tracking", "Log the bet not made and amount saved", "Medium", "High"],
        ["7", "Notification Detox", "Unsubscribe from every gambling promo email, block SMS marketing, turn off push notifications.", "Prevention", "Check for and block any new gambling notifications", "Easy", "Medium"],
        ["8", "Accountability Ping", "Text one trusted person daily: 'Day X, no gambling.' Social commitment creates cost to relapsing.", "Social", "Send daily accountability text", "Medium", "High"],
        ["9", "Cash the Urge", "When urge hits, immediately transfer the amount you would have gambled into a separate savings account.", "Financial", "Transfer would-be-bet money to savings", "Medium", "High"],
        ["10", "Time Audit Log", "At end of each day log what you did with the time you would have spent gambling. Even 15 min documented.", "Tracking", "Log time reclaimed and activity done", "Easy", "Medium"],
    ],
}

BEE_INTEGRATION = {
    "title": "Bee AI x GK Integration",
    "headers": ["#", "Name", "Bee Feature Used", "GK Application", "Points Awarded", "How It Works"],
    "rows": [
        ["1", "Voice Note Confessionals", "Voice Notes", "Urge Logging", "+5 per logged urge resisted", "Press Bee button when urge hits. Speak: 'GK Log: urge at [time], intensity [1-10], triggered by [cause].'"],
        ["2", "Daily Insights Scoreboard", "Daily Insights", "Pattern Tracking", "+10 per week trend drops", "Bee surfaces emotional patterns. Track how often gambling-related language appears. Declining frequency = GK momentum proof."],
        ["3", "Accountability Auto-Summary", "Conversation Segmentation", "Accountability Records", "+3 per conversation captured", "Wear Bee during check-ins with accountability partner. Bee auto-summarizes commitments made."],
        ["4", "GK Daily Report Template", "Templates", "Daily Scorecard", "N/A (enables scoring)", "Custom 'Gegenkraft Daily Report' template: Urges resisted (count), Replacement actions taken, Money saved, GK power level (1-10)."],
        ["5", "Trigger Geo-Fencing", "Geo and Topic Fencing (future)", "Topic Boundaries", "-5 penalty if gambling topics appear", "Set topic boundaries around gambling language. If gambling topics appear in Bee themes, flag and activate counter-move."],
        ["6", "Auto-Save the Bet Money", "Actions (Email/Calendar)", "Financial Redirection", "+1 per dollar redirected", "Say 'I just resisted a $50 bet' and Bee drafts email/reminder to transfer that amount to savings."],
        ["7", "GK Boss Battles", "Developer API", "Scoring Engine", "Double points on boss battle days", "API extension pulls daily urge logs, calculates GK Power Score, flags 'boss battle' days (3+ urges), awards double points if survived clean."],
        ["8", "Morning Declarations", "Voice Notes", "Daily Intention", "+2 per declaration (+streak multiplier)", "Each morning: 'Day X. No gambling today. GK power level: [1-10].' x1.5 multiplier after 7 days, x2 after 30."],
        ["9", "Relationship Pattern Tracking", "Daily Insights (Relationships)", "Social Change Tracking", "+15 when positive shift flagged", "Bee tracks relationship shifts. Monitor if gambling conversations with friends decrease. Quantified social change."],
        ["10", "Weekly GK Retrospective", "Accumulated Summaries", "Weekly Review", "+20 per completed review", "Review Bee's weekly summaries. Count wins, flag weakest trigger points, set next week's GK targets."],
    ],
}

SCORING_RULES = {
    "title": "Scoring Rules",
    "headers": ["Action", "Points", "Condition", "Category"],
    "rows": [
        ["Log an urge resisted (via Bee voice note)", "+5", "Per urge logged and not acted on", "Urge Management"],
        ["Weekly gambling-language trend drops", "+10", "Per week the Bee insights trend line declines", "Pattern Tracking"],
        ["Accountability conversation captured", "+3", "Per conversation recorded via Bee", "Social"],
        ["Dollar redirected to savings", "+1", "Per dollar transferred instead of gambled", "Financial"],
        ["Morning GK declaration", "+2", "Per morning declaration via Bee voice note", "Intention Setting"],
        ["Morning declaration streak (7+ days)", "x1.5", "Multiplier applied to morning declaration points", "Streak Bonus"],
        ["Morning declaration streak (30+ days)", "x2.0", "Multiplier applied to morning declaration points", "Streak Bonus"],
        ["Positive relationship shift flagged by Bee", "+15", "When Bee surfaces declining gambling social patterns", "Social"],
        ["Weekly GK retrospective completed", "+20", "Per completed weekly review of Bee summaries", "Review"],
        ["Boss battle survived (3+ urges in one day)", "x2.0", "Double points for all actions that day", "Boss Battle"],
        ["Gambling topics appear in Bee themes", "-5", "Penalty per occurrence", "Penalty"],
    ],
}

LEVELS = {
    "title": "Level Progression",
    "headers": ["Level", "GK Points Required", "Title", "Description"],
    "rows": [
        ["1", "0–50", "Recruit", "Just starting the fight. Building awareness and first defenses."],
        ["2", "51–150", "Resister", "Actively resisting urges. Habits are being challenged daily."],
        ["3", "151–300", "Disruptor", "Disrupting the pattern. Replacement behaviors are taking hold."],
        ["4", "301–500", "Saboteur", "Sabotaging the old habit loop. Momentum is shifting."],
        ["5", "501–750", "Breaker", "The habit's grip is breaking. New identity forming."],
        ["6", "751+", "Gegenkraft Master", "Full opposing power achieved. The habit has lost its hold."],
    ],
}


def build_tracker(start_date: str, days: int) -> dict:
    """Build the daily tracker sheet with formulas."""
    headers = [
        "Date", "Day #", "Morning Declaration (Y/N)", "Urges Resisted",
        "Urge Intensity (avg 1-10)", "Replacement Actions Taken",
        "Money Saved ($)", "Accountability Ping (Y/N)",
        "Bee Conversations Captured", "Boss Battle Day (Y/N)",
        "GK Points Earned", "Cumulative Points", "GK Level", "Notes",
    ]
    start = datetime.strptime(start_date, "%Y-%m-%d")
    rows = []
    for i in range(days):
        day = start + timedelta(days=i)
        row_num = i + 2  # 1-indexed, header is row 1
        # K = GK Points Earned (manual entry)
        # L = Cumulative Points: previous cumulative + today's points
        if i == 0:
            cumulative_formula = f"=K{row_num}"
        else:
            cumulative_formula = f"=L{row_num - 1}+K{row_num}"
        # M = GK Level: lookup based on cumulative points
        level_formula = (
            f'=IF(L{row_num}>=751,"Gegenkraft Master",'
            f'IF(L{row_num}>=501,"Breaker",'
            f'IF(L{row_num}>=301,"Saboteur",'
            f'IF(L{row_num}>=151,"Disruptor",'
            f'IF(L{row_num}>=51,"Resister","Recruit")))))'
        )
        rows.append([
            day.strftime("%Y-%m-%d"),
            str(i + 1),
            "", "", "", "", "", "", "", "",
            "",  # GK Points Earned (manual)
            cumulative_formula,
            level_formula,
            "",
        ])
    return {"title": "Daily Tracker", "headers": headers, "rows": rows}


# ═══════════════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════════════

def setup_instructions():
    """Print setup instructions for Google API credentials."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║           GEGENKRAFT — Google Sheets API Setup              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. Go to https://console.cloud.google.com/                  ║
║  2. Create a new project (or select existing)                ║
║  3. Enable the "Google Sheets API":                          ║
║     → APIs & Services → Library → search "Google Sheets API" ║
║     → Click Enable                                           ║
║  4. Create OAuth 2.0 credentials:                            ║
║     → APIs & Services → Credentials                          ║
║     → Create Credentials → OAuth client ID                   ║
║     → Application type: "Desktop app"                        ║
║     → Download the JSON file                                 ║
║  5. Save it as:                                              ║
║     gegenkraft/credentials.json                              ║
║                                                              ║
║  Then run:                                                   ║
║     python3 generate_gegenkraft_sheet.py                     ║
║                                                              ║
║  The first run will open a browser for Google sign-in.       ║
║  After that, a token.json is saved for future runs.          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")


def authenticate():
    """Authenticate with Google Sheets API and return service."""
    creds = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_PATH.exists():
                print(f"\n❌  credentials.json not found at: {CREDS_PATH}")
                setup_instructions()
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)

        TOKEN_PATH.write_text(creds.to_json())
        print(f"Token saved to {TOKEN_PATH}")

    return build("sheets", "v4", credentials=creds)


# ═══════════════════════════════════════════════════════════════
#  FORMATTING HELPERS
# ═══════════════════════════════════════════════════════════════

def rgb(r, g, b):
    return {"red": r, "green": g, "blue": b}


COLORS = {
    "header_bg":    rgb(0.15, 0.15, 0.15),
    "header_fg":    rgb(1.0, 1.0, 1.0),
    "alt_row":      rgb(0.95, 0.95, 0.97),
    "accent_green": rgb(0.2, 0.66, 0.33),
    "accent_red":   rgb(0.8, 0.2, 0.2),
}


def header_format_request(sheet_id: int, num_cols: int) -> list:
    """Bold white text on dark background for header row."""
    return [
        {
            "repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": num_cols},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": COLORS["header_bg"],
                        "textFormat": {"bold": True, "foregroundColor": COLORS["header_fg"], "fontSize": 11},
                        "horizontalAlignment": "CENTER",
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
            }
        },
        {
            "updateSheetProperties": {
                "properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}},
                "fields": "gridProperties.frozenRowCount",
            }
        },
    ]


def alternating_colors_request(sheet_id: int, num_rows: int, num_cols: int) -> list:
    """Add alternating row colors."""
    return [
        {
            "addBanding": {
                "bandedRange": {
                    "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": num_rows + 1, "startColumnIndex": 0, "endColumnIndex": num_cols},
                    "rowProperties": {
                        "headerColor": COLORS["header_bg"],
                        "firstBandColor": rgb(1.0, 1.0, 1.0),
                        "secondBandColor": COLORS["alt_row"],
                    },
                }
            }
        }
    ]


def auto_resize_request(sheet_id: int, num_cols: int) -> list:
    """Auto-resize columns to fit content."""
    return [
        {
            "autoResizeDimensions": {
                "dimensions": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": num_cols}
            }
        }
    ]


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Generate Gegenkraft Google Sheet")
    parser.add_argument("--setup", action="store_true", help="Show setup instructions")
    parser.add_argument("--start-date", default=datetime.now().strftime("%Y-%m-%d"), help="Start date (YYYY-MM-DD)")
    parser.add_argument("--days", type=int, default=30, help="Number of days to track")
    args = parser.parse_args()

    if args.setup:
        setup_instructions()
        return

    # Build all sheet data
    tracker = build_tracker(args.start_date, args.days)
    all_sheets = [DEFINITIONS, GK_MOVES, BEE_INTEGRATION, SCORING_RULES, LEVELS, tracker]

    # Authenticate
    print("Authenticating with Google Sheets API...")
    service = authenticate()

    # Create spreadsheet with all tabs
    print("Creating spreadsheet...")
    spreadsheet_body = {
        "properties": {"title": f"Gegenkraft — GK Power Dashboard ({args.start_date})"},
        "sheets": [{"properties": {"title": s["title"]}} for s in all_sheets],
    }
    spreadsheet = service.spreadsheets().create(body=spreadsheet_body).execute()
    spreadsheet_id = spreadsheet["spreadsheetId"]
    spreadsheet_url = spreadsheet["spreadsheetUrl"]

    # Populate each sheet
    print("Populating sheets...")
    batch_data = []
    format_requests = []

    for i, sheet_data in enumerate(all_sheets):
        title = sheet_data["title"]
        headers = sheet_data["headers"]
        rows = sheet_data["rows"]
        sheet_id = spreadsheet["sheets"][i]["properties"]["sheetId"]
        num_cols = len(headers)
        num_rows = len(rows)

        # Separate formulas from values for the tracker
        values = [headers]
        for row in rows:
            processed = []
            for cell in row:
                processed.append(cell)
            values.append(processed)

        # Check if any cells contain formulas
        has_formulas = any(
            any(str(cell).startswith("=") for cell in row)
            for row in rows
        )

        if has_formulas:
            # Use USER_ENTERED to interpret formulas
            batch_data.append({
                "range": f"'{title}'!A1",
                "values": values,
            })
        else:
            batch_data.append({
                "range": f"'{title}'!A1",
                "values": values,
            })

        # Formatting
        format_requests.extend(header_format_request(sheet_id, num_cols))
        format_requests.extend(alternating_colors_request(sheet_id, num_rows, num_cols))
        format_requests.extend(auto_resize_request(sheet_id, num_cols))

    # Batch update values (USER_ENTERED to support formulas)
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={"valueInputOption": "USER_ENTERED", "data": batch_data},
    ).execute()

    # Batch update formatting
    if format_requests:
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={"requests": format_requests},
        ).execute()

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║         GEGENKRAFT SHEET CREATED SUCCESSFULLY               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Sheets created:                                             ║
║    1. Definitions          — GK terminology                  ║
║    2. GK Moves - Gambling  — 10 counter-moves                ║
║    3. Bee AI x GK          — 10 Bee integrations             ║
║    4. Scoring Rules        — Point system & multipliers      ║
║    5. Level Progression    — Recruit → Gegenkraft Master     ║
║    6. Daily Tracker        — {args.days}-day tracker with formulas     ║
║                                                              ║
║  Start date: {args.start_date}                                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

  📄 Open your sheet:
  {spreadsheet_url}
""")


if __name__ == "__main__":
    main()
