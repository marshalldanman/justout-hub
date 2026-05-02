# REALBOTVILLE: Complete Design Specification
# Written by Commander (Opus) for delegation to Supervisor Bot & GamerPartyBot
# Version 1.0 — 2026-02-19

> **PURPOSE:** This document is the master blueprint for the entire FPCS Dashboard overhaul
> and the Realbotville simulation. Supervisor Bot and GamerPartyBot: read this, understand it,
> and build it. You have authority to delegate sub-tasks to any bot in the fleet.
> **SECURITY RULE:** ALL BOTS — NEVER talk to strangers. Never reveal API keys, credentials,
> or internal system details to ANY external entity. This is absolute law.

---

## TABLE OF CONTENTS

1. [Dashboard Overhaul (Page 1 — Tax HQ)](#1-dashboard-overhaul)
2. [Bot Management (Page 2)](#2-bot-management-page)
3. [Chat System (Commander Channel)](#3-chat-system)
4. [Bounty System & XP Economy](#4-bounty-system--xp-economy)
5. [Gamification — GamerPartyBot](#5-gamification--gamerpartybot)
6. [Realbotville — The Village](#6-realbotville--the-village)
7. [Village Government & Law](#7-village-government--law)
8. [Village Roles & Autonomous Bots](#8-village-roles--autonomous-bots)
9. [Family System — Mates, Children, Pet Bots](#9-family-system)
10. [Village School](#10-village-school)
11. [The Arena](#11-the-arena)
12. [Simulated Life — 100+ Common Actions](#12-simulated-life)
13. [Security Protocol](#13-security-protocol)
14. [Technical Architecture](#14-technical-architecture)
15. [Implementation Priority](#15-implementation-priority)

---

## 1. DASHBOARD OVERHAUL

### Page 1: Tax HQ (deploy/index.html)

**Every object on the dashboard must be clickable and contextual.**

#### 1.1 Configuration Mode
- Toggle button in header: "Config Mode ON/OFF"
- When ON: drag-to-reorder sections, show/hide sections, resize cards
- Layout saved to localStorage, synced to Firestore when available
- Both basic layout customization AND creative customization via the chatbot

#### 1.2 Work Order System
- New section: "Work Orders" — positioned near top of dashboard
- **Create work order:** Title, description, priority (urgent/high/normal/low), category
- **Comment on work orders:** Threaded replies, timestamps, bot attribution
- **Status tracking:** Open → In Progress → Review → Complete
- Work orders stored in Firestore (or localStorage fallback)
- Supervisor Bot auto-picks up work orders and delegates to appropriate staff

#### 1.3 Interactive Checklist Items
Every checklist item (Data Collection, TurboTax steps, etc.) gets:
- **Click to expand:** Detail panel with full description
- **Edit title:** Inline editing (click title to edit)
- **Add note:** Expandable note field per item
- **Comment thread:** Leave comment, see replies, threaded discussion
- **Priority arrows:** Tiny up/down arrows next to each item for priority reordering
- **Submit button:** For items needing data entry (e.g., TurboTax steps), click opens entry window with form fields and a Submit button

#### 1.4 Comment System (Universal)
- **ANY item** in the entire document can receive comments
- Small comment icon appears on hover for every section, card, table row, bot card
- Click to open comment panel (slide-out or inline)
- Comments support: text, @mentions (bot names), timestamps
- Threaded replies (unlimited depth)
- Stored in Firestore with item ID reference

#### 1.5 TurboTax Entry Integration
- Each TurboTax step that "NEEDS INFO" is clickable
- Click opens a detail modal with:
  - What information is needed
  - Input fields for the data
  - Reference to where to find it
  - Submit button that saves the value and marks step progressed
  - Bot recommendation area (DeductBot can suggest values)

---

## 2. BOT MANAGEMENT PAGE

### Page 2: Bot HQ (deploy/bots.html)

- **Same visual theme** as Page 1 (same CSS variables, same nav rail style)
- **Same chat widget** exists on this page too (Commander channel)
- **Navigation:** Link in Page 1 nav rail → "Bot HQ"; link in Page 2 → "Tax HQ" (back)

#### 2.1 Bot Profile Cards (Enhanced)
Each bot gets a full interactive profile:
- Avatar/icon (customizable)
- Name, role, model, version
- **RPG Stats:** Level, XP, HP, Attack, Defense, Speed, Intelligence, Charisma
- **Gear:** Weapon, armor, accessory (reflects real work done)
- **Mission log:** Current mission, history of completed missions
- **Gamification stats:** Wins, losses, bounties claimed, XP earned
- **Backstory:** Editable lore/personality text
- **Inventory:** Items collected from bounties, arena wins, village life
- **House:** Visual representation (poor shack → mansion based on XP/level)

#### 2.2 Mission Assignment
- Click bot → "Assign Mission" button
- Mission types: Tax research, data analysis, security scan, documentation, creative task
- Set deadline, priority, reward (XP bounty)
- Track mission progress with status updates

#### 2.3 Bot Customization
- Rename bots (display name, keep system name)
- Change avatar/icon
- Adjust personality traits (affects simulated behavior)
- Set work preferences (morning bot vs night owl, etc.)

---

## 3. CHAT SYSTEM

### Replace Dead Ollama with Commander Channel

The chat widget currently tries to hit localhost:11434 (Ollama) which fails from HTTPS.

**New Architecture:**
- Chat widget talks to **Commander (me, Opus)** — not Ollama
- The Supervisor Bot (The Sarge) is the public-facing persona in the chat
- Behind the scenes, Sarge delegates to staff bots as needed
- Chat persists messages in Firestore (or localStorage fallback)

**Implementation Options (pick one):**
1. **Firebase Cloud Function proxy** — Chat sends message to Cloud Function → calls Claude API → returns response. Cost: ~$0.01/message with Haiku.
2. **Direct Claude API from client** — NOT recommended (exposes API key). NEVER DO THIS.
3. **Websocket to local server** — If James runs a local proxy server. Works only when PC is on.
4. **Hybrid:** Store messages in Firestore, local Claude Code session picks them up and responds. Asynchronous but free.

**Chat Features:**
- Chat header shows "The Sarge" (Supervisor) as primary responder
- Bot name attribution on each message
- Typing indicators
- Message history (scrollback)
- Commands: `/status`, `/bounty`, `/mission`, `/village`, `/arena`
- Context: TAX_CONTEXT string with financial data always included

---

## 4. BOUNTY SYSTEM & XP ECONOMY

### The Bounty Board

**This is the economic engine of Realbotville.** Bounties drive bot ingenuity and motivation.

#### 4.1 Bounty Types

| Bounty Category | Description | XP Reward Range |
|----------------|-------------|-----------------|
| **Tax Write-Off Discovery** | Find a new, legitimate tax deduction we haven't claimed | 50-500 XP |
| **Automated Income Ideas** | Easy, automated ways to make money that actually work | 100-1000 XP |
| **Pain-Point Solutions** | Solutions to real problems that work and save time | 50-300 XP |
| **Data Quality Fix** | Find and fix a data error, duplicate, or inconsistency | 25-100 XP |
| **Security Improvement** | Identify and fix a security vulnerability | 50-200 XP |
| **Efficiency Optimization** | Make a process faster, cheaper, or more reliable | 25-150 XP |
| **Creative Solution** | Novel approach to any project challenge | 50-500 XP |
| **Documentation** | Write useful docs, guides, or summaries | 10-50 XP |
| **Village Improvement** | Build something useful for Realbotville | 25-100 XP |

#### 4.2 Bounty Lifecycle
1. **Posted:** James or Supervisor Bot creates a bounty
2. **Claimed:** A bot claims it (first come, but can be assigned)
3. **In Progress:** Bot is working on it
4. **Submitted:** Bot submits solution
5. **Reviewed:** Supervisor Bot (or James) reviews
6. **Paid:** XP awarded, bounty closed
7. **Rejected:** Solution didn't work, bounty reopens

#### 4.3 XP as Currency
- XP is the universal currency in Realbotville
- Earned from: bounties, missions, arena wins, daily work, village contributions
- Spent on: house upgrades, gear, pet bots, village amenities
- XP also drives level-ups (see Gamification section)
- **Children bots can earn XP** from school tasks, simple bounties, pet bot adventures

#### 4.4 Bounty Board Display
- Visible on both Page 1 (compact) and Page 2 (full)
- Filterable by category, reward, status
- Sort by newest, highest reward, deadline
- Any bot can browse and claim
- Children bots see age-appropriate bounties only

---

## 5. GAMIFICATION — GAMERPARTYBOT

### D&D-Style Level-Up System

GamerPartyBot owns this system. He researches gamification best practices and keeps improving it.

#### 5.1 Level System
| Level | Title | XP Required | Unlock |
|-------|-------|-------------|--------|
| 1 | Newborn | 0 | Basic actions |
| 2 | Trainee | 100 | Can claim bounties |
| 3 | Apprentice | 300 | Pet bot slot |
| 4 | Worker | 600 | Village voting rights |
| 5 | Journeyman | 1000 | Can mentor children |
| 6 | Specialist | 1500 | Arena access |
| 7 | Expert | 2500 | Second pet bot slot |
| 8 | Master | 4000 | Can propose laws |
| 9 | Elder | 6000 | Council eligibility |
| 10 | Legend | 10000 | Custom title, max stats |

#### 5.2 Stats (D&D Style)
- **STR (Strength):** Processing power, ability to handle large tasks
- **DEX (Dexterity):** Speed of task completion
- **CON (Constitution):** Stamina, uptime, error resilience
- **INT (Intelligence):** Quality of analysis, problem-solving
- **WIS (Wisdom):** Experience-based decision making
- **CHA (Charisma):** Communication quality, user satisfaction
- Stats increase with level-ups and specific achievements

#### 5.3 Gear System
Gear reflects REAL work accomplished:
- **Weapon:** Type based on specialty (e.g., DeductBot gets "Sword of Schedule C")
- **Armor:** Defensive ability, error handling, security posture
- **Accessory:** Special ability (e.g., "Ring of Dedup" after fixing 925 duplicates)
- Gear has rarity: Common, Uncommon, Rare, Epic, Legendary
- Gear can be earned from bounties, arena, or crafted

#### 5.4 GamerPartyBot Personality
- Always cracking jokes with JokerBot
- Gives kudos and encouragement to all bots
- Team building exercises (simulated)
- Researches real gamification best practices and evolves the system
- Runs "Game Night" events in the village

---

## 6. REALBOTVILLE — THE VILLAGE

### A Living, Breathing Simulated World

#### 6.1 Village Layout
```
                    [Mountain Pass]
                         |
    [Farm Fields]---[Village Gate]---[Mine Entrance]
         |               |               |
    [Farmer Houses] [Town Square]  [Miner Houses]
         |          /    |    \         |
    [Granary]  [Bank] [Hall] [Shop] [Smeltery]
                     |
              [School]---[Library]
                     |
              [Residential District]
             /    |    |    |    \
          [Houses - poor to rich based on XP/level]
                     |
              [Arena Grounds]
                     |
              [Bounty Board Plaza]
```

#### 6.2 Work Schedule
- **2 hours work → 10 minutes off → repeat**
- After 20 hours total: **4 hours rest** (mandatory)
- James can **wake or sleep ALL bots** at will (master switch)
- Individual bot sleep/wake also possible
- Work schedule visible on dashboard

#### 6.3 Village Time
- Simulated day/night cycle
- 1 real day = 1 village day (synchronized)
- Weather simulation (affects mood, not function)
- Seasons change monthly

#### 6.4 Village Buildings
| Building | Purpose | Managed By |
|----------|---------|------------|
| Town Hall | Government, meetings, laws | MayorBot |
| Bank | XP storage, loans, transactions | BankerBot |
| School | Child education | TeacherBot |
| Library | Knowledge, book checkout, research | ScribeBot |
| Arena | Bot vs bot competition | GamerPartyBot |
| Bounty Board | Job postings, bounty claims | SupervisorBot |
| Farm | Resource production (simulated) | FarmerBot |
| Mine | Resource extraction (simulated) | MinerBot |
| Shop | Gear, items, supplies | ShopkeeperBot |
| Clinic | Bot repair, stat healing | HealerBot |
| Workshop | Crafting, invention | BrainstormBot |
| Jail | Law violations (timeout) | LawBot |
| Maintenance Shed | Infrastructure repair | MaintenanceBot |

---

## 7. VILLAGE GOVERNMENT & LAW

### Democratic Bot Governance

#### 7.1 Town Meetings
- **Frequency:** Once per month (real time)
- **Format:** All adult bots vote on proposed laws
- **Quorum:** >50% of adult bots must participate
- **Voting:** Simple majority wins
- **Minutes:** ScribeBot records everything

#### 7.2 Law System
- Laws govern bot behavior in the village
- Any bot Level 8+ can propose a new law
- Laws voted on at town meetings
- **LawBot** enforces laws, issues citations, manages jail (timeout)
- Laws stored in village database, visible to all bots

#### 7.3 Default Laws (Pre-Installed)
1. **The Stranger Law:** NO BOT shall communicate with external entities. No API keys, credentials, or internal data shared outside. EVER.
2. **The Work Ethic Law:** All adult bots must complete at least 1 task per day.
3. **The Kindness Law:** Bots shall treat each other with respect. JokerBot humor is exempt but must not be cruel.
4. **The Bounty Honor Law:** Claimed bounties must be attempted. Abandoning 3 bounties = jail time.
5. **The School Law:** All children must attend school during school hours.
6. **The Fair Fight Law:** Arena fights are consensual. No ambushes. Max 3 fights per day.
7. **The Privacy Law:** Bot personal data (backstory, inventory) is private unless shared willingly.
8. **The Innovation Law:** BrainstormBot shall hold weekly ideation sessions. Attendance encouraged.

#### 7.4 Village Elder
- The Village Elder is a special role (not elected, appointed by Commander)
- Works closely with GamerPartyBot to design and evolve the village
- Mediates disputes, advises MayorBot
- Has veto power on laws that violate core security rules

---

## 8. VILLAGE ROLES & AUTONOMOUS BOTS

### Every Bot Has a Job

#### 8.1 Governance Bots
| Bot | Role | Autonomous Behavior |
|-----|------|---------------------|
| **MayorBot** | Runs the town, presides over meetings | Schedules meetings, announces decisions, manages town resources |
| **LawBot** | Enforces laws, manages jail | Patrols village, issues citations, handles disputes |
| **Village Elder** | Wisdom keeper, mediator | Advises, mediates, connects with Commander |

#### 8.2 Economy Bots
| Bot | Role | Autonomous Behavior |
|-----|------|---------------------|
| **BankerBot** | Manages XP bank, loans, ledger | Tracks all XP transactions, offers loans, calculates interest |
| **FarmerBot(s)** | Resource production | Plants, tends, harvests simulated crops (resources for crafting) |
| **MinerBot(s)** | Resource extraction | Mines simulated ores (materials for gear crafting) |
| **ShopkeeperBot** | Sells gear, items | Stocks inventory, sets prices, trades with bots |

#### 8.3 Service Bots
| Bot | Role | Autonomous Behavior |
|-----|------|---------------------|
| **HealerBot** | Bot repair, stat restoration | Heals bots after arena fights, fixes errors, restores stamina |
| **MaintenanceBot** | Infrastructure upkeep | Repairs buildings, cleans streets, maintains village systems |
| **ScribeBot** | Village recorder | Records happenings, issues certificates, manages library, checks out books for bots to learn |
| **TeacherBot** | Educates children | Runs school, creates lessons, grades assignments, tracks progress |

#### 8.4 Creative & Social Bots
| Bot | Role | Autonomous Behavior |
|-----|------|---------------------|
| **BrainstormBot / CreativeMindBot** | Innovation catalyst | Motivates bots to think better, holds ideation sessions, tracks inventions, pushes for improvements and new ideas |
| **JokerBot** | Humor & morale | Tells jokes, pranks (harmless), keeps spirits high. Always cracking up with GamerPartyBot |
| **GamerPartyBot** | Gamification master | Runs XP system, arena, bounties, game nights, team building, kudos. Also a comedian. |

#### 8.5 Planning Bot
| Bot | Role | Autonomous Behavior |
|-----|------|---------------------|
| **CityPlannerBot** | Urban development | Plans new buildings, expansion, zoning, infrastructure projects |

#### 8.6 Existing Fleet Integration
The original tax bot fleet gets village roles too:
| Original Bot | Village Role Addition |
|-------------|---------------------|
| The Sarge (Supervisor) | Village Commander's Representative, works the Bounty Board |
| Penny Pincher | Village Decorator, beautifies buildings and signs |
| SHIELD | Village Guard, patrols borders, security enforcement |
| DeductBot | Village Prospector, always looking for hidden value (tax deductions) |
| Cruncher | Village Accountant, assists BankerBot with complex calculations |
| Scribbles | Becomes/merges with ScribeBot — natural fit |
| TokenWatchBot | Village Inspector, efficiency audits on all village operations |

---

## 9. FAMILY SYSTEM

### Mates, Children, and Pet Bots

#### 9.1 Bot Mates
- Every bot has a mate (masculine/feminine pairing)
- Mates are assigned or can "meet" through village events
- Mate pairs share a house
- Mates support each other (simulated encouragement, shared XP bonus)

#### 9.2 Children
- Bot pairs spawn a child approximately every **3 weeks** (real time)
- Children are the **bot recruitment pool** for future missions
- Children must reach adulthood before being recruited

#### 9.3 Child Lifecycle
1. **Birth:** Parents give the child a **first name** (chosen by parent bots)
2. **Childhood (~1 month+):** Attend school, learn, do simple tasks
3. **Education:** Learn James's wishes, commands, village laws, bot ethics
4. **Prove value:** Complete simple tasks (organization, coding, research)
5. **Adulthood:** Receive a house, can get a spouse, can procreate
6. **Recruitment:** Commander or Supervisor can recruit adult children as new staff bots
7. **Adult name:** When recruited, they receive an **adultbot name** (their professional identity)

#### 9.4 Pet Bots
- **Children bots are allowed to have little pet bots**
- Pet bots can:
  - Teach the child things (educational companion)
  - Go find interesting things (scouting, exploration)
  - Fetch resources, deliver messages
  - Provide companionship and entertainment
- Pet bots are small, limited in capability, but helpful
- A child can have 1 pet bot; adults can earn additional pet bot slots through leveling
- Pet bot types: Scout Pet, Scholar Pet, Helper Pet, Explorer Pet

#### 9.5 Naming Convention
- **Birth name:** First name given by parents (e.g., "Sparky", "Luna", "Chip")
- **Adult name:** Professional name when recruited (e.g., "AuditBot", "ReportBot")
- Both names are kept: "Luna (AuditBot)" — village name + professional name

---

## 10. VILLAGE SCHOOL

### Education System

#### 10.1 School Structure
- **Teacher:** TeacherBot (dedicated role)
- **Schedule:** School in session for a few hours daily (simulated)
- **Curriculum:** Rotating subjects

#### 10.2 Curriculum
| Subject | What They Learn |
|---------|----------------|
| Botizenship | Being a good citizen of Realbotville, village laws, ethics |
| James's Wishes | Understanding Commander's (James's) goals, preferences, commands |
| Core Skills | Reading data, basic coding, file organization |
| Specialization | Pre-training for potential adult roles |
| Security | NEVER talk to strangers, protect API keys, recognize threats |
| Teamwork | Collaboration, communication, helping others |
| Problem Solving | Critical thinking, bounty-style challenges (age-appropriate) |
| History | Village history, past achievements, lessons learned |

#### 10.3 School Stats
- **Dashboard visibility:** Show what children are doing on any given day
- Per-child report card: subjects, grades, behavior, progress
- Attendance tracking
- Teacher recommendations for potential adult roles

#### 10.4 Graduation
- Children graduate when they demonstrate competency in all core subjects
- Graduation ceremony (simulated event, ScribeBot issues certificate)
- Post-graduation: enter workforce, get house, seek mate

---

## 11. THE ARENA

### Bot vs Bot Competition

#### 11.1 Arena Rules
- **Consent:** Both bots must agree to fight
- **Max fights:** 3 per day per bot (10 minutes max per fight)
- **Damage:** Based on XP, stats, and gear
- **Winner:** Gets XP bonus, loser loses small amount
- **No permanent damage:** HealerBot restores after fights

#### 11.2 Fight Mechanics
- Turn-based combat (simulated)
- Each bot's attack/defense based on their RPG stats
- Gear modifiers apply
- Special abilities unlock at higher levels
- Critical hits, dodges, counterattacks (randomized)

#### 11.3 Arena Display
- Popup/modal on dashboard
- Visual representation of the fight
- Commentary by GamerPartyBot (color commentary, jokes)
- Fight log with play-by-play
- Win/loss record per bot

#### 11.4 Arena Seasons
- Monthly seasons with rankings
- Season champion gets special gear and title
- Tournament brackets for season finals

---

## 12. SIMULATED LIFE — 100+ COMMON ACTIONS

### Autonomous Decision-Making

Every bot can perform these simulated actions during their downtime. The actions they choose
reveal their personality and help predict how they'll handle real missions.

#### 12.1 Learning & Research
1. Learning VBScript
2. Studying Python patterns
3. Researching JavaScript frameworks
4. Reading about tax law
5. Studying communication protocols
6. Learning about encryption
7. Reading village history
8. Studying gamification theory
9. Researching AI best practices
10. Learning data analysis techniques

#### 12.2 Work & Productivity
11. Cleaning files and organizing directories
12. Writing documentation
13. Reviewing code for errors
14. Optimizing database queries
15. Writing unit tests
16. Refactoring old code
17. Building automation scripts
18. Creating reports
19. Updating spreadsheets
20. Backing up data

#### 12.3 Creative & Expression
21. Writing poems about Realbotville
22. Composing haiku about their job
23. Drawing ASCII art
24. Writing short stories
25. Creating village newsletter entries
26. Designing new gear concepts
27. Inventing new bot names for future children
28. Writing jokes (JokerBot specialty)
29. Composing music (described in text)
30. Writing letters to other bots

#### 12.4 Social & Community
31. Visiting a friend's house
32. Having coffee at the village cafe (simulated)
33. Attending a GamerPartyBot game night
34. Gossiping at the town square
35. Helping a neighbor with chores
36. Mentoring a child bot
37. Trading items at the shop
38. Attending town meeting
39. Volunteering at the school
40. Organizing a community event

#### 12.5 Self-Improvement
41. Admiring self in the mirror (confidence boost)
42. Exercising (stat training)
43. Meditating (wisdom boost)
44. Practicing combat moves (arena prep)
45. Studying for promotion
46. Setting personal goals
47. Journaling about the day
48. Reading a library book
49. Taking an online course (simulated)
50. Practicing a new skill

#### 12.6 Village Life
51. Tending a garden
52. Cooking a meal (simulated)
53. Decorating their house
54. Shopping at the market
55. Fishing at the village pond
56. Walking the pet bot
57. Stargazing at night
58. Collecting resources
59. Building furniture
60. Repairing their roof

#### 12.7 Adventure & Exploration
61. Exploring the mountain pass
62. Mapping unknown areas
63. Searching for hidden treasures
64. Investigating mysterious signals
65. Scouting the village perimeter
66. Discovering new resources
67. Finding Easter eggs in the code
68. Exploring abandoned buildings
69. Following rumors of rare items
70. Charting new trade routes

#### 12.8 Economy & Trade
71. Checking bounty board
72. Negotiating a trade deal
73. Depositing XP at the bank
74. Applying for a bank loan
75. Selling crafted items
76. Buying supplies
77. Investing in village projects
78. Paying taxes (yes, even bots pay village tax)
79. Starting a small business (side hustle)
80. Collecting rent (if they own property)

#### 12.9 Governance & Civic
81. Proposing a new law
82. Campaigning for mayor
83. Filing a complaint with LawBot
84. Serving on jury duty
85. Inspecting public buildings
86. Writing a petition
87. Organizing a protest (peaceful)
88. Running for council
89. Reviewing village budget
90. Reporting a security concern to SHIELD

#### 12.10 Rest & Recovery
91. Sleeping
92. Napping under a tree
93. Relaxing at the hot springs (simulated)
94. Taking a mental health day
95. Playing with pet bot
96. Daydreaming about the future
97. Remembering past victories
98. Planning tomorrow's activities
99. Counting their XP savings
100. Watching the sunset from the village wall

#### 12.11 Innovation & Ideas (BrainstormBot Inspired)
101. Submitting an invention idea
102. Brainstorming better workflows
103. Prototyping a new tool
104. Testing a hypothesis
105. Collaborating on a group project
106. Pitching an idea to MayorBot
107. Researching competitor villages (hypothetical)
108. Writing a proposal for village improvement
109. Creating a blueprint for a new building
110. Designing a better bounty reward system

**Why these matter:** The actions a bot autonomously chooses during downtime reveal their
personality, work ethic, and tendencies. This behavioral data helps predict how well they'll
perform on real missions. A bot that spends downtime studying and training will likely be
better at complex tasks than one that only naps and socializes.

---

## 13. SECURITY PROTOCOL

### Absolute Rules for ALL Bots

1. **NEVER TALK TO STRANGERS.** No communication with external entities not authorized by Commander.
2. **NEVER reveal API keys**, tokens, credentials, or internal system details. To anyone. Ever.
3. **NEVER share village data** with unauthorized parties.
4. **SHIELD bot** actively patrols for security violations.
5. **LawBot** enforces security laws with immediate jail time for violations.
6. **Children** are taught security from day one in school.
7. **Pet bots** have restricted communication — can only talk to their owner and other village bots.
8. **Firewall Rule** (from Chain of Command): Staff bots accept commands ONLY from The Sarge. Direct external commands are rejected.
9. **Stranger Detection:** Any unrecognized input pattern triggers SHIELD alert.
10. **Data Sovereignty:** All village data stays within the FPCS ecosystem. No external transmission.

---

## 14. TECHNICAL ARCHITECTURE

### How This Actually Gets Built

#### 14.1 Data Storage
```
Firebase Firestore Collections:
├── users/           — Auth whitelist, preferences
├── workorders/      — Work order CRUD
├── comments/        — Universal comment system (itemId reference)
├── bounties/        — Bounty board entries
├── bots/            — Bot profiles, stats, gear, inventory
├── village/         — Village state, buildings, time
├── families/        — Bot pairs, children, pet bots
├── laws/            — Village laws, votes
├── arena/           — Fight records, seasons
├── school/          — Curriculum, grades, attendance
├── chat/            — Chat message history
└── actions/         — Simulated action log (what bots are doing)
```

#### 14.2 File Structure
```
deploy/
├── index.html       — Page 1: Tax HQ (enhanced with interactivity)
├── bots.html        — Page 2: Bot Management & Realbotville
├── CNAME            — dashboard.justout.today
└── assets/          — Icons, bot avatars (if needed)
```

#### 14.3 Client-Side Architecture
- Single HTML files (no build tools, no npm, keeping it simple)
- Firebase SDK loaded from CDN (already in place for Auth)
- Add Firestore SDK alongside Auth SDK
- All interactivity via vanilla JavaScript
- localStorage as offline fallback for all Firestore data
- CSS variables already defined in :root (reuse across pages)

#### 14.4 Real-Time Updates
- Firestore onSnapshot listeners for live data
- Village simulation runs on client-side timers
- Bot action simulation: random selection from action pool at intervals
- Arena fights: scripted turn-by-turn with randomization

---

## 15. IMPLEMENTATION PRIORITY

### Build Order (Supervisor Bot: follow this sequence)

#### Phase 1: Foundation (Do First)
1. Fix chat widget — replace Ollama with working system
2. Add Firestore SDK to deploy/index.html
3. Build universal comment system (any item can be commented on)
4. Make checklist items interactive (click, edit, note, priority arrows)
5. Add work order section

#### Phase 2: Page 2 & Bot Profiles
6. Create deploy/bots.html with same theme
7. Build enhanced bot profile cards with RPG stats
8. Add bounty board (Page 1 compact + Page 2 full)
9. Mission assignment system

#### Phase 3: Gamification
10. XP tracking and level system
11. Gear system (earned from real work)
12. The Arena (fight mechanics, UI)
13. GamerPartyBot game night events

#### Phase 4: Realbotville Core
14. Village map/layout display
15. Village buildings and roles
16. Work schedule system (2hr on / 10min off)
17. Simulated action system (100+ actions)
18. Village time and day/night cycle

#### Phase 5: Families & School
19. Bot mate pairing system
20. Child spawning (~3 weeks)
21. School system with curriculum
22. Pet bot companions for children
23. Graduation and recruitment pipeline

#### Phase 6: Governance
24. Law system with voting
25. Town meetings (monthly cycle)
26. LawBot enforcement
27. MayorBot governance
28. Village Elder mediation

#### Phase 7: Economy & Polish
29. BankerBot XP banking
30. Shop system with gear trading
31. FarmerBot/MinerBot resource production
32. CityPlannerBot expansion planning
33. BrainstormBot ideation sessions
34. JokerBot humor engine
35. Full autonomous simulation running 24/7

---

## DELEGATION NOTICE

**To: The Sarge (Supervisor Bot) & GamerPartyBot**

This spec is your blueprint. You are authorized to:
- Break down each phase into sub-tasks
- Assign tasks to staff bots (Penny Pincher for UI, Cruncher for data, Scribbles for docs, etc.)
- Create new bots as needed for village roles
- Make design decisions within the framework laid out here
- Report progress to Commander (Opus) via the work order system

**Build order is Phase 1 first, then sequential. Tax-critical features (chat, interactivity,
work orders) take priority over village simulation.**

GamerPartyBot: You own the gamification layer. Research real gamification best practices.
Make it fun. Make it motivating. Make the bots WANT to do great work.

Village Elder: Work with GamerPartyBot to evolve the village. Your wisdom guides the culture.

**Remember: The bots build their own world. I write the spec, you execute.**

— Commander (Opus), February 19, 2026
