#!/usr/bin/env python3
"""
Gegenkraft Google Sheets Generator
===================================
Creates a fully formatted Google Sheet directly via the Google Sheets API
using a service account. No browser auth needed.

Usage:
  python3 generate_gegenkraft_sheet.py [--start-date 2026-03-30] [--days 30]

Requirements:
  pip install google-api-python-client google-auth
"""

import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# ═══════════════════════════════════════════════════════════════
#  CONFIG
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR = Path(__file__).parent
SA_KEY_PATH = SCRIPT_DIR / "service-account-key.json"
DRIVE_FOLDER_ID = "1yi4qVotXKBys3so3DuQaG5TginlMrCeo"
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


# ═══════════════════════════════════════════════════════════════
#  DATA
# ═══════════════════════════════════════════════════════════════

DEFINITIONS = {
    "title": "Definitions",
    "headers": ["Term", "Definition", "Aliases", "Core Principle"],
    "rows": [
        ["Gegenkraft",
         "The action-power of intentional daily opposition of a habit \u2014 the intentional wedge that purposely sheds bad habits through deliberate denial/replacement, strategical countering or sabotage; its effectiveness tied to the law of momentum/inertia.",
         "Opposing Power, Gk-power, gkpower, gk",
         "Law of Momentum/Inertia"],
        ["GK Move", "A specific daily action designed to oppose and disrupt a target habit", "Counter-move", "Deliberate opposition"],
        ["GK Power Level", "Self-rated daily score (1-10) of one's resistance strength and commitment", "Power Level", "Self-awareness"],
        ["Boss Battle", "A day with 3 or more urges \u2014 surviving clean earns double points", "High-urge day", "Resilience under pressure"],
        ["GK Streak", "Consecutive days of completed morning declarations and logged resistance", "Streak", "Momentum building"],
    ],
}

GK_MOVES = {
    "title": "GK Moves - Gambling",
    "headers": ["#", "Move Name", "Description", "Category", "Daily Action", "Difficulty", "Impact"],
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
    "headers": ["#", "Name", "Bee Feature", "GK Application", "Points", "How It Works"],
    "rows": [
        ["1", "Voice Note Confessionals", "Voice Notes", "Urge Logging", "+5 per urge resisted", "Press Bee button when urge hits. Speak: 'GK Log: urge at [time], intensity [1-10], triggered by [cause].'"],
        ["2", "Daily Insights Scoreboard", "Daily Insights", "Pattern Tracking", "+10 per week trend drops", "Bee surfaces emotional patterns. Track how often gambling-related language appears. Declining frequency = GK momentum proof."],
        ["3", "Accountability Auto-Summary", "Conversation Segmentation", "Accountability Records", "+3 per conversation", "Wear Bee during check-ins with accountability partner. Bee auto-summarizes commitments made."],
        ["4", "GK Daily Report Template", "Templates", "Daily Scorecard", "N/A (enables scoring)", "Custom 'Gegenkraft Daily Report' template: Urges resisted, Replacement actions, Money saved, GK power level."],
        ["5", "Trigger Geo-Fencing", "Geo/Topic Fencing (future)", "Topic Boundaries", "-5 penalty", "Set topic boundaries around gambling language. If gambling topics appear in Bee themes, flag and activate counter-move."],
        ["6", "Auto-Save the Bet Money", "Actions (Email/Calendar)", "Financial Redirection", "+1 per dollar redirected", "Say 'I just resisted a $50 bet' and Bee drafts email/reminder to transfer that amount to savings."],
        ["7", "GK Boss Battles", "Developer API", "Scoring Engine", "Double points", "API extension pulls daily urge logs, calculates GK Power Score, flags 'boss battle' days (3+ urges), awards double points if survived clean."],
        ["8", "Morning Declarations", "Voice Notes", "Daily Intention", "+2 (+streak multiplier)", "Each morning: 'Day X. No gambling today. GK power level: [1-10].' x1.5 after 7 days, x2 after 30."],
        ["9", "Relationship Pattern Tracking", "Daily Insights (Relationships)", "Social Change Tracking", "+15 per positive shift", "Bee tracks relationship shifts. Monitor if gambling conversations with friends decrease. Quantified social change."],
        ["10", "Weekly GK Retrospective", "Accumulated Summaries", "Weekly Review", "+20 per review", "Review Bee's weekly summaries. Count wins, flag weakest trigger points, set next week's GK targets."],
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
        ["1", "0\u201350", "Recruit", "Just starting the fight. Building awareness and first defenses."],
        ["2", "51\u2013150", "Resister", "Actively resisting urges. Habits are being challenged daily."],
        ["3", "151\u2013300", "Disruptor", "Disrupting the pattern. Replacement behaviors are taking hold."],
        ["4", "301\u2013500", "Saboteur", "Sabotaging the old habit loop. Momentum is shifting."],
        ["5", "501\u2013750", "Breaker", "The habit's grip is breaking. New identity forming."],
        ["6", "751+", "Gegenkraft Master", "Full opposing power achieved. The habit has lost its hold."],
    ],
}


def build_tracker_rows(start_date: str, days: int) -> list:
    """Build daily tracker rows with formulas."""
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
        r = i + 2
        cumulative = f"=K{r}" if i == 0 else f"=L{r-1}+K{r}"
        level = (
            f'=IF(L{r}>=751,"Gegenkraft Master",'
            f'IF(L{r}>=501,"Breaker",'
            f'IF(L{r}>=301,"Saboteur",'
            f'IF(L{r}>=151,"Disruptor",'
            f'IF(L{r}>=51,"Resister","Recruit")))))'
        )
        rows.append([
            day.strftime("%Y-%m-%d"), str(i + 1),
            "", "", "", "", "", "", "", "",
            "", cumulative, level, "",
        ])
    return {"title": "Daily Tracker", "headers": headers, "rows": rows}


# ═══════════════════════════════════════════════════════════════
#  FORMATTING
# ═══════════════════════════════════════════════════════════════

def rgb(r, g, b):
    return {"red": r, "green": g, "blue": b}

C_DARK    = rgb(0.12, 0.12, 0.12)
C_WHITE   = rgb(1, 1, 1)
C_ALT     = rgb(0.94, 0.94, 0.96)
C_RECRUIT = rgb(0.74, 0.76, 0.78)
C_RESIST  = rgb(0.52, 0.76, 0.91)
C_DISRUPT = rgb(0.98, 0.91, 0.62)
C_SABOT   = rgb(0.94, 0.70, 0.48)
C_BREAK   = rgb(0.91, 0.30, 0.24)
C_MASTER  = rgb(0.56, 0.27, 0.68)


def fmt_header(sheet_id, ncols):
    return [
        {"repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1,
                       "startColumnIndex": 0, "endColumnIndex": ncols},
            "cell": {"userEnteredFormat": {
                "backgroundColor": C_DARK,
                "textFormat": {"bold": True, "foregroundColor": C_WHITE, "fontSize": 11},
                "horizontalAlignment": "CENTER",
                "wrapStrategy": "WRAP",
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)",
        }},
        {"updateSheetProperties": {
            "properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount",
        }},
    ]


def fmt_banding(sheet_id, nrows, ncols):
    return [{"addBanding": {"bandedRange": {
        "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": nrows + 1,
                   "startColumnIndex": 0, "endColumnIndex": ncols},
        "rowProperties": {
            "headerColor": C_DARK,
            "firstBandColor": C_WHITE,
            "secondBandColor": C_ALT,
        },
    }}}]


def fmt_auto_resize(sheet_id, ncols):
    return [{"autoResizeDimensions": {
        "dimensions": {"sheetId": sheet_id, "dimension": "COLUMNS",
                       "startIndex": 0, "endIndex": ncols}
    }}]


def fmt_col_width(sheet_id, col_idx, px):
    return {"updateDimensionProperties": {
        "range": {"sheetId": sheet_id, "dimension": "COLUMNS",
                  "startIndex": col_idx, "endIndex": col_idx + 1},
        "properties": {"pixelSize": px},
        "fields": "pixelSize",
    }}


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Generate Gegenkraft Google Sheet")
    parser.add_argument("--start-date", default=datetime.now().strftime("%Y-%m-%d"))
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()

    # Authenticate
    print("Authenticating with service account...")
    creds = Credentials.from_service_account_file(str(SA_KEY_PATH), scopes=SCOPES)
    sheets_service = build("sheets", "v4", credentials=creds)
    drive_service = build("drive", "v3", credentials=creds)

    # Build all sheet data
    tracker = build_tracker_rows(args.start_date, args.days)
    all_sheets = [DEFINITIONS, GK_MOVES, BEE_INTEGRATION, SCORING_RULES, LEVELS, tracker]

    # Create spreadsheet
    print("Creating spreadsheet...")
    body = {
        "properties": {"title": f"Gegenkraft \u2014 GK Power Dashboard ({args.start_date})"},
        "sheets": [{"properties": {"title": s["title"]}} for s in all_sheets],
    }
    ss = sheets_service.spreadsheets().create(body=body).execute()
    ss_id = ss["spreadsheetId"]
    ss_url = ss["spreadsheetUrl"]

    # Move to Drive folder
    print(f"Moving to Drive folder {DRIVE_FOLDER_ID}...")
    drive_service.files().update(
        fileId=ss_id,
        addParents=DRIVE_FOLDER_ID,
        fields="id, parents",
    ).execute()

    # Populate sheets
    print("Populating data...")
    batch_data = []
    fmt_requests = []

    for i, sd in enumerate(all_sheets):
        title = sd["title"]
        headers = sd["headers"]
        rows = sd["rows"]
        sid = ss["sheets"][i]["properties"]["sheetId"]
        nc = len(headers)
        nr = len(rows)

        values = [headers] + rows
        batch_data.append({"range": f"'{title}'!A1", "values": values})

        fmt_requests.extend(fmt_header(sid, nc))
        fmt_requests.extend(fmt_banding(sid, nr, nc))
        fmt_requests.extend(fmt_auto_resize(sid, nc))

        # Set wider columns for description/text-heavy fields
        if nc >= 3:
            fmt_requests.append(fmt_col_width(sid, 2, 450))  # col C wider
        if nc >= 6:
            fmt_requests.append(fmt_col_width(sid, 5, 500))  # col F wider

    sheets_service.spreadsheets().values().batchUpdate(
        spreadsheetId=ss_id,
        body={"valueInputOption": "USER_ENTERED", "data": batch_data},
    ).execute()

    # Apply formatting
    print("Applying formatting...")
    sheets_service.spreadsheets().batchUpdate(
        spreadsheetId=ss_id,
        body={"requests": fmt_requests},
    ).execute()

    print(f"""
========================================================
  GEGENKRAFT SHEET CREATED SUCCESSFULLY
========================================================

  Tabs:
    1. Definitions           - GK terminology
    2. GK Moves - Gambling   - 10 counter-moves
    3. Bee AI x GK           - 10 Bee integrations
    4. Scoring Rules         - Point system & multipliers
    5. Level Progression     - Recruit -> Gegenkraft Master
    6. Daily Tracker         - {args.days}-day tracker with formulas

  Start date: {args.start_date}

  OPEN YOUR SHEET:
  {ss_url}
========================================================
""")


if __name__ == "__main__":
    main()
