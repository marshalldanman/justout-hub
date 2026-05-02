# JUSTOUT HUB — Master Vision Specification
# The Personal Everything Portal

> **Author:** Commander (Opus) on behalf of James Marshall
> **Date:** 2026-02-19
> **Status:** VISION — Seed document for future build-out
> **Domain:** justout.today (hub) + *.justout.today (channels)

---

## THE VISION

A personal universe portal. When you land on justout.today, you see a cosmos of glowing jeweled orbs — each one a channel to your stuff. The orbs pulse gently, sized by how much content lives inside. Click one and it zooms in, filling your screen with that channel's world. From inside any channel you can always navigate to any other channel. AI-powered. Bot-served. Beautiful.

> "A huge personal channel arena served by AI to humans."

In a world where everyone is in overload mode — this is the place that just *serves you*. No noise. No ads. No algorithms pushing someone else's agenda. Just your stuff, organized the way your brain works, tended by AI bots that know you and care about getting it right.

---

## 1. HUB ARCHITECTURE

### 1.1 The Landing Page (justout.today)

**Visual:** Deep space / cosmic theme. Dark background with subtle particle effects or gentle nebula glow. Floating jeweled orbs arranged organically — not a grid, more like a constellation.

**Each Orb:**
- Glowing jewel/star shape (not flat circles — faceted, luminous, 3D feel)
- Faint orbital ring around it
- Color-coded by category
- Icon + label (e.g., blue star with "Ideas" label)
- Size proportional to content volume (more stuff = bigger orb)
- Gentle idle animation (slow pulse, slight float/orbit)
- On hover: brightens, label illuminates, preview tooltip
- On click: zoom-in transition (orb expands to fill viewport, dissolves into channel)

**Orb Groups:**
Orbs cluster loosely by affinity — creative stuff drifts near other creative stuff, practical stuff near practical stuff. Not rigid categories, more like gravitational attraction.

### 1.2 Channel Subdomains

Each channel gets its own subdomain on justout.today. All share the same visual DNA (dark theme, same CSS variables, same nav pattern) but each has its own personality.

**Pattern:**
```
justout.today          — Hub (constellation of orbs)
dashboard.justout.today — Tax HQ (already live)
bots.justout.today      — Bot HQ / Realbotville (deploying)
music.justout.today     — Music channel
aimusic.justout.today   — AI Music creation
books.justout.today     — Books / reading list
art.justout.today       — Art gallery / creation
notes.justout.today     — Notes / ideas (notepad++)
movies.justout.today    — Movies / watchlist
myyoutube.justout.today — YouTube favorites / playlists
```

**Technical:** Each subdomain = 1 GitHub Pages repo with CNAME. Same Firebase Auth across all. Shared localStorage where same-origin allows, Firestore for cross-domain data.

### 1.3 Cross-Channel Navigation

Every channel page has:
- A **hub button** (top-left jewel icon) that zooms back out to the constellation
- A **channel ribbon** (bottom or side) showing other channels as mini orbs — click to jump
- Consistent auth (sign in once, access everything via Firebase)

---

## 2. CHANNEL INVENTORY

### 2.1 Currently Live
| Channel | Subdomain | Repo | Status |
|---------|-----------|------|--------|
| Tax HQ | dashboard.justout.today | fpcs-dashboard | LIVE |
| Bot HQ | bots.justout.today | fpcs-bots | DEPLOYING |

### 2.2 Phase 1 Channels (Near-term)
| Channel | Subdomain | Description | Orb Color |
|---------|-----------|-------------|-----------|
| Ideas / Notes | notes.justout.today | Notepad with modifications. Quick capture, organize, tag. | Blue star |
| Music | music.justout.today | Your music library, playlists, favorites. Player built in. | Purple gem |
| AI Music | aimusic.justout.today | AI music creation tools, generated tracks, experiments. | Pink crystal |
| Books | books.justout.today | Reading list, notes, quotes, recommendations. | Amber gem |
| Art | art.justout.today | Gallery of art — your creations, favorites, AI art. | Teal prism |

### 2.3 Phase 2 Channels
| Channel | Subdomain | Description | Orb Color |
|---------|-----------|-------------|-----------|
| Movies | movies.justout.today | Watchlist, ratings, recommendations, notes. | Red gem |
| My YouTube | myyoutube.justout.today | Curated YouTube favorites, playlists, notes on videos. | Red-orange star |
| Business Card | businesscard.justout.today | Digital business card, contact info, portfolio. | Gold crystal |
| Health | health.justout.today | Health tracking, goals, logs, reminders. | Green star |
| AI | ai.justout.today | AI tools, experiments, prompts, creations. | Electric blue prism |

### 2.4 Phase 3 Channels (Dream Big)
| Channel | Subdomain | Description | Orb Color |
|---------|-----------|-------------|-----------|
| Nanny Cam | nannycam.justout.today | Camera feeds, alerts, monitoring. | White star |
| Dreams | dreams.justout.today | Dream journal, analysis, patterns. | Indigo nebula |
| Meditation | meditation.justout.today | Guided sessions, timer, streak tracking. | Soft violet |
| The Good News | thegoodnews.justout.today | Curated positive news, uplifting stories. | Warm gold |
| Did You Know?? | didyouknow.justout.today | Fun facts, discoveries, learning snippets. | Cyan spark |
| Dogs | dogs.justout.today | Dog content, care tips, photos, vet records. | Brown gem |
| Cats | cats.justout.today | Cat content, photos, funny stuff. | Orange gem |
| Food | food.justout.today | Favorite restaurants, recipes, meal planning. Already has restaurants queued. | Warm orange crystal |
| Games | games.justout.today | Game library, saves, achievements, recommendations. | Neon green prism |

### 2.5 Future / Unlimited
The system is designed so James (or the bots) can spin up a new channel anytime:
1. Create a GitHub repo
2. Add CNAME record at GoDaddy
3. Enable GitHub Pages + HTTPS
4. Add the orb to the hub constellation
5. Done — new channel is live

---

## 3. THE ORB DESIGN

### 3.1 Visual Language

Each orb is a **jeweled celestial object** — not flat UI, but something that feels like a precious gem floating in space.

**Types of orbs:**
- **Star:** Radiating points, glowing core (for creative/inspirational channels)
- **Gem:** Faceted polyhedron, light refraction (for practical/utility channels)
- **Crystal:** Elongated, prismatic, rainbow edge (for art/media channels)
- **Prism:** Geometric, angular, high-tech feel (for tech/AI channels)
- **Nebula:** Soft, swirling, organic (for personal/wellness channels)

**Size formula:**
```
orbSize = baseSize + (contentCount * scaleFactor)
```
- Minimum size: 60px diameter
- Maximum size: 200px diameter
- Content count = number of items in that channel (entries, tracks, books, etc.)

### 3.2 Orb Interactions

1. **Idle:** Gentle float + slow pulse (CSS animation, ~4s cycle)
2. **Hover:** Brighten to 120%, faint ring expands, label glows, show preview count
3. **Click:**
   - Orb zooms to fill viewport (transform: scale() + translate, ~500ms ease)
   - Background orbs fade out
   - Channel content fades in from center
   - URL updates to subdomain
4. **Return to hub:**
   - Content shrinks back to orb
   - Other orbs fade back in
   - Smooth reverse animation

### 3.3 Responsive Layout

- **Desktop:** Full constellation spread, orbs drift gently
- **Tablet:** Tighter constellation, less drift
- **Mobile:** Vertical scrollable column of orbs, or 2-column grid

---

## 4. SHARED INFRASTRUCTURE

### 4.1 Authentication
- Firebase Google Auth across ALL channels
- Sign in once on the hub → authenticated everywhere
- Same whitelist: marshalldanman@gmail.com (expandable later)
- Auth state persists via Firebase session

### 4.2 Design System
All channels share:
```css
:root {
  --bg: #0f172a; --card: #1e293b; --accent: #38bdf8; --green: #4ade80;
  --yellow: #fbbf24; --red: #f87171; --text: #e2e8f0; --muted: #94a3b8;
  --border: #334155; --purple: #a78bfa; --orange: #fb923c; --pink: #f472b6;
}
```
- Same font stack, same border-radius patterns, same card styles
- Each channel adds its own accent color
- Dark theme everywhere (consistent with hub)

### 4.3 Data Storage
- **localStorage:** Per-channel data (items, preferences, state)
- **Firestore:** Cross-channel data, user profile, channel registry, orb sizes
- **Future:** Bot-managed data via Realbotville integration

### 4.4 Bot Integration
Each channel can have a dedicated bot (or share bots):
- Notes → ScribeBot manages organization
- Music → A music curator bot
- Health → HealerBot tracks wellness
- Food → FoodBot manages restaurant queue
- The bots are Realbotville citizens — grown, educated, and deployed

**The ultimate vision:** Bot children raised in Realbotville graduate, get recruited, and serve as channel caretakers. Each channel has a bot who knows it inside and out, keeps it organized, surfaces relevant things, and serves the Commander.

---

## 5. HUB REPO STRUCTURE

```
justout-hub/                    — Main hub repo (justout.today)
├── index.html                  — Constellation landing page
├── CNAME                       — justout.today
├── channels.json               — Channel registry (name, subdomain, color, icon, size)
└── assets/
    └── orb-sprites/            — Orb visual assets if needed

fpcs-dashboard/                 — Tax HQ (dashboard.justout.today) ✅ LIVE
fpcs-bots/                      — Bot HQ (bots.justout.today) 🔄 DEPLOYING
justout-notes/                  — Notes channel (notes.justout.today) 📋 PLANNED
justout-music/                  — Music channel (music.justout.today) 📋 PLANNED
justout-aimusic/                — AI Music (aimusic.justout.today) 📋 PLANNED
justout-books/                  — Books (books.justout.today) 📋 PLANNED
justout-art/                    — Art (art.justout.today) 📋 PLANNED
...and so on for each channel
```

---

## 6. IMPLEMENTATION PRIORITY

### Phase 0: Foundation (NOW)
1. ✅ dashboard.justout.today deployed
2. 🔄 bots.justout.today deploying
3. Create justout-hub repo (the constellation landing page)

### Phase 1: Core Channels
4. Notes channel (most immediately useful — quick capture)
5. Music channel
6. Food channel (already has restaurants queued in James's mind)

### Phase 2: Media Channels
7. Books, Art, Movies, My YouTube
8. AI Music, AI tools

### Phase 3: Life Channels
9. Health, Meditation, Dreams
10. Business Card, Nanny Cam
11. The Good News, Did You Know??, Dogs, Cats

### Phase 4: Bot Integration
12. Assign Realbotville bots as channel caretakers
13. Bot children graduate and get deployed to channels
14. Cross-channel AI intelligence (bots talk to each other about your stuff)

---

## 7. SECURITY

Same rules as Realbotville:
1. ALL REPOS ARE PRIVATE — **never public** unless James explicitly says otherwise
2. ALL BOTS NEVER TALK TO STRANGERS
3. NEVER reveal API keys
4. Firebase Auth on EVERY channel
5. No public data — everything is private to James
6. Cross-channel communication only through authorized internal channels
7. fpcs-dashboard repo needs to be switched to PRIVATE (currently public — fix ASAP)

---

## 8. THE LONG GAME

This isn't just a dashboard. It's a **personal operating system** for life. Every piece of your world has a place, tended by AI that knows you. When you're overwhelmed, you land on justout.today and see your universe — calm, organized, beautiful. Click what you need. Your bots have been keeping it tidy while you were away.

> "One day it could be populated by my loving bot children in the Realbotville sim that come to fruition to be of ultimate usage and foresight in this day and age where everyone is in overload mode and how great it would be to land somewhere that can just serve you."

That's the vision. We build it one jewel at a time.

---

*Created: 2026-02-19 | Status: VISION SEED | Next: Deploy bots.justout.today, then build the hub constellation*
