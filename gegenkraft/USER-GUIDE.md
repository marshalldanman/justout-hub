# Gegenkraft — User Guide

> **Gegenkraft** (noun): *The action-power of intentional daily opposition of a habit.*

---

## What Is It?

Gegenkraft (GK) is a gamified system for breaking phone gambling habits. You earn points for resisting urges, build streaks, level up from **Recruit** to **Gegenkraft Master**, and track everything in a Google Sheet dashboard.

It integrates with your **Bee AI wearable** ("Jap") to automatically log urges, capture accountability conversations, and generate daily insights.

---

## Quick Start

### 1. Generate Your Dashboard

**On Windows:**
```
cd gegenkraft
run.bat
```

**On any OS:**
```
pip install google-api-python-client google-auth google-auth-httplib2 openpyxl
python generate_gegenkraft_sheet.py --start-date 2026-03-31 --days 30
```

This creates a Google Sheet with 6 tabs (or a local `.xlsx` if API access is unavailable).

### 2. Set Up MCP Servers (Optional — for Claude Code users)

```bash
bash gegenkraft/setup-mcp-servers.sh
```

This installs Google Sheets, Playwright, Memory, Calendar, Sequential Thinking, and Brave Search MCP servers.

---

## Your 10 GK Moves

These are your daily weapons against gambling urges:

| # | Move | What To Do |
|---|------|-----------|
| 1 | **Delete & Block** | Uninstall gambling apps, enable content restrictions |
| 2 | **Kill the Funding** | Remove saved payment methods from gambling sites |
| 3 | **Redirect the Trigger** | Replace the urge moment with a 5-min action (walk, pushups, journaling) |
| 4 | **Screen Time Sabotage** | Set 0-minute limits on gambling apps; someone else holds the passcode |
| 5 | **Environment Poisoning** | Phone wallpaper = bank statement showing losses |
| 6 | **Announce the Bet You Didn't Make** | Log the bet you would have made + amount saved |
| 7 | **Notification Detox** | Unsubscribe from all gambling promos, block SMS marketing |
| 8 | **Accountability Ping** | Text one person daily: "Day X, no gambling" |
| 9 | **Cash the Urge** | Transfer would-be-bet money to a savings account |
| 10 | **Time Audit Log** | Log what you did with the time you would have spent gambling |

---

## Scoring

| Action | Points |
|--------|--------|
| Urge resisted (logged via Bee) | +5 |
| Weekly trend drops | +10 |
| Accountability conversation | +3 |
| Dollar redirected to savings | +1/dollar |
| Morning GK declaration | +2 |
| Positive relationship shift | +15 |
| Weekly retrospective | +20 |
| Gambling topics in Bee themes | -5 (penalty) |

### Multipliers
- **7-day streak** on morning declarations → x1.5
- **30-day streak** on morning declarations → x2.0
- **Boss Battle** (3+ urges in one day, survived clean) → x2.0 on all points that day

---

## Levels

| Points | Level | Title |
|--------|-------|-------|
| 0–50 | 1 | Recruit |
| 51–150 | 2 | Resister |
| 151–300 | 3 | Disruptor |
| 301–500 | 4 | Saboteur |
| 501–750 | 5 | Breaker |
| 751+ | 6 | Gegenkraft Master |

---

## Bee AI Integration

Wear your Bee device and use it throughout the day:

- **Morning**: Press button, say "Day X. No gambling today. GK power level: [1-10]."
- **When urge hits**: Press button, say "GK Log: urge at [time], intensity [1-10], triggered by [cause]."
- **After resisting**: Say "I just resisted a $[amount] bet" — Bee drafts a savings transfer reminder.
- **Accountability chats**: Wear Bee during check-ins — it auto-summarizes commitments.
- **End of day**: Log time reclaimed and activities done.
- **Weekly**: Review Bee's accumulated summaries, count wins, set next week's targets.

---

## Daily Tracker

Your Google Sheet's **Daily Tracker** tab has these columns:

| Column | What to fill in |
|--------|----------------|
| Morning Declaration | Y or N |
| Urges Resisted | Count of urges you fought off |
| Urge Intensity | Average intensity 1-10 |
| Replacement Actions | What you did instead |
| Money Saved | Dollar amount not gambled |
| Accountability Ping | Y or N |
| Bee Conversations | Number captured |
| Boss Battle Day | Y if 3+ urges |
| Notes | Anything else |

**GK Points** and **GK Level** calculate automatically via formulas.

---

## Tips

1. **Start with the easy moves** — Delete & Block, Kill the Funding, and Notification Detox take 5 minutes and have the highest impact.
2. **Never skip the morning declaration** — streaks compound your points fast.
3. **Boss battles are opportunities** — surviving a 3+ urge day doubles your points.
4. **Track the money** — seeing cumulative savings is one of the strongest motivators.
5. **Weekly reviews matter** — 20 points each, and they help you spot patterns before they become relapses.

---

*Gegenkraft: the opposing power is yours.*
