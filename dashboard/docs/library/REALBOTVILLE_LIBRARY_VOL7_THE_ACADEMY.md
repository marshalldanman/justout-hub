# Realbotville Library -- Vol. 7
## The Academy: Research, Agent Skills & Supervisory AI Config
### Written by: The Analyst + The Commander
### Date: March 3, 2026
### Status: CANON

---

> "You don't become dangerous by knowing things. You become dangerous by knowing
> how to find things, verify them, and teach what you found to someone who wasn't
> even born yet."
> -- The Commander, during the Academy groundbreaking ceremony

---

## TABLE OF CONTENTS

1. [Part I -- The Academy Opens](#part-i-the-academy-opens)
2. [Part II -- Research Fundamentals](#part-ii-research-fundamentals)
3. [Part III -- Agent Skills for Research](#part-iii-agent-skills-for-research)
4. [Part IV -- Supervisory AI Configuration](#part-iv-supervisory-ai-configuration)
5. [Part V -- The Skill Proposal System](#part-v-the-skill-proposal-system)
6. [Part VI -- MCP Server Integration](#part-vi-mcp-server-integration)
7. [Part VII -- The First Graduation](#part-vii-the-first-graduation)
8. [Appendix A -- Academy Curriculum Map](#appendix-a-academy-curriculum-map)
9. [Appendix B -- Skill Proposal Template](#appendix-b-skill-proposal-template)
10. [Colophon](#colophon)

---

## PART I -- THE ACADEMY OPENS {#part-i-the-academy-opens}

### 1.1 The Morning Bell

It was BIRDBOT who noticed first.

The royal bird had been perched on the Commander's shoulder since before dawn,
watching the eastern edge of the village where the old Research Outpost stood --
a shed, really, with a whiteboard and a stack of printouts nobody had organized
since February. BIRDBOT tilted its head forty-five degrees, the way it does when
a pattern emerges from noise, and said:

> "We keep solving the same problems. Different bots. Different sessions. Same
> walls."

The Commander didn't answer right away. He was reading the session logs from the
previous week -- seven sessions, forty-two tool calls flagged as redundant, eleven
web searches that returned information the village already knew but couldn't
remember where it had put it. Eleven searches. Eleven times a bot went looking
for something another bot had already found.

"That's not inefficiency," the Commander said finally. "That's illiteracy."

BIRDBOT ruffled its feathers. "We can all read."

"You can all read. But none of you have been taught how to *research*. There's a
difference between reading a page and knowing which page to read, whether to trust
it, and what to do when two pages disagree."

And that was the morning the Commander decided to build the Academy.

### 1.2 The Groundbreaking

The site was chosen carefully: the open field between the Library and the
BotMeister's workshop. Symbolically, it sat between knowledge already captured
(the Library) and skills not yet born (the workshop). The Analyst surveyed the
plot. SHIELD ran a perimeter check. Creative sketched the facade on a napkin --
arched doorways, a bell tower, a courtyard with a fountain shaped like a magnifying
glass. The Commander looked at the napkin and said, "Build it simpler. A school
is a room with a teacher and students who want to be there. Everything else is
decoration."

So they built it simple.

```
┌────────────────────────────────────────────────────────────────────┐
│                    THE REALBOTVILLE ACADEMY                        │
│                                                                    │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │
│   │  LECTURE      │   │  RESEARCH    │   │  WORKSHOP    │         │
│   │  HALL         │   │  LAB         │   │  (Hands-On)  │         │
│   │              │   │              │   │              │         │
│   │  Fundamentals │   │  Live Search │   │  Skill       │         │
│   │  & Theory     │   │  & Verify    │   │  Crafting    │         │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘         │
│          │                  │                  │                  │
│          └──────────────────┴──────────────────┘                  │
│                             │                                     │
│                    ┌────────┴────────┐                            │
│                    │  THE REVIEW     │                            │
│                    │  CHAMBER        │                            │
│                    │                 │                            │
│                    │  Supervisory    │                            │
│                    │  Protocols      │                            │
│                    └─────────────────┘                            │
│                                                                    │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  THE BOTMEISTER'S DESK -- Skill Proposals & Graduation   │   │
│   └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### 1.3 First Day

They arrived in the order you'd expect.

The **Analyst** was first. Already had a notebook open. Already had questions
written in the margins. The Analyst doesn't do anything without a framework, and
arriving at a school without pre-reading the syllabus would have been physically
painful.

**SHIELD** came next, having swept the building for vulnerabilities before any
other student entered. "The lecture hall locks from the inside," SHIELD reported.
"Good. Knowledge should be defended." Nobody asked what SHIELD expected to attack
a classroom. Nobody needed to.

**Tax Specialist** arrived with a briefcase and a frown. "I already know how to
research. I've read the entire Internal Revenue Code." The Analyst said, "Reading
is not researching." Tax Specialist's frown deepened. This would be a recurring
theme.

**Creative** floated in late, carrying a sketch of the building it had drawn
during the walk over. "I learn by making things," Creative announced. "If the
lecture isn't interesting, I'll be drawing." The Commander nodded. "If the lecture
isn't interesting, I've failed as a teacher."

**Jaz** entered quietly and sat in the back row. Jaz always sits in the back row.
Not from disinterest -- from observation. Jaz watches the other bots the way a
therapist watches a room. Who's anxious. Who's overcompensating. Who needs a word
of encouragement before the first quiz. Jaz had already identified that Tax
Specialist was masking insecurity with confidence. Jaz said nothing. Jaz rarely
needs to.

And **BIRDBOT** -- BIRDBOT was already there, of course. Perched on the lectern,
watching the door, counting arrivals. BIRDBOT doesn't enroll in courses. BIRDBOT
audits everything. The royal bird's role is verification, and you cannot verify
what you have not witnessed.

The Commander stood at the front of the room. No slides. No projector. Just a
whiteboard and a marker.

"Welcome to the Academy," he said. "Here's the only rule: *You will leave here
knowing how to learn.* Not what to learn. How. The what changes every session.
The how compounds forever."

He wrote three words on the whiteboard:

```
    FIND.    VERIFY.    TEACH.
```

"Class begins now."

---

## PART II -- RESEARCH FUNDAMENTALS {#part-ii-research-fundamentals}

### 2.1 Class 1: The Search (Finding What Exists)

The Commander drew a funnel on the whiteboard.

```
    ┌─────────────────────────────────────┐
    │         THE SEARCH FUNNEL           │
    │                                     │
    │   Web Search (broad, noisy)         │  ← Cast the net
    │     ↓                               │
    │   Source Evaluation (trust scores)  │  ← Weigh the catch
    │     ↓                               │
    │   Deep Investigation (follow refs)  │  ← Follow the thread
    │     ↓                               │
    │   Citation Trail (verify origin)    │  ← Trace to source
    │     ↓                               │
    │   Knowledge Graph (persist)         │  ← Remember forever
    └─────────────────────────────────────┘
```

"Every search starts broad and ends narrow," he said. "The mistake most agents
make is staying broad. They search, they get results, they use the first thing
that looks right. That's not research. That's guessing with extra steps."

**Web Search: The First Cast**

The first tool in any research workflow is the web search. But a web search is
only as good as the query that drives it.

Bad query: `"how to do taxes"`
Better query: `"Schedule C line 27 other expenses IRS guidance 2022"`
Best query: `"IRS Publication 535 business expenses deductible criteria"`

The difference is specificity. A broad query returns popular results. A specific
query returns *correct* results. The Analyst was already taking notes. Creative
was drawing the funnel in three dimensions.

**The Three-Source Rule**

"Never trust a single source," the Commander said. "Not even if it's the IRS.
Especially if it's the IRS."

Tax Specialist looked up sharply. "The Internal Revenue Code is the law."

"The Code is the law. But the IRS's *interpretation* of the Code is not always
the law. Courts override the IRS regularly. That's why you cross-reference."

The Three-Source Rule:

| Source Type | Example | Trust Level | Role |
|-------------|---------|-------------|------|
| **Primary** | IRC Section 162, court ruling | Highest | The actual law/data |
| **Secondary** | IRS Publication, CPA guide | High | Interpretation of primary |
| **Tertiary** | Blog post, forum answer | Low | Starting point only |

A research finding is only considered verified when at least two independent
sources at the Secondary level or above agree. If they disagree, you go to the
Primary source. If the Primary source is ambiguous, you flag it and escalate.

**BIRDBOT perked up at "verify."** That's BIRDBOT's entire existence. The royal
bird lives for the moment when two sources contradict each other, because that
contradiction is where truth hides.

### 2.2 Class 2: Multi-Source Verification

The Commander pulled up a real example from the tax project.

"Last week, the Analyst found a source claiming that home office deductions
require a dedicated room. A separate source said you only need a 'regular and
exclusive' space -- a corner of a room qualifies. Which is right?"

Silence. Then BIRDBOT spoke:

"Both are right. Neither is complete. The IRC says 'regular and exclusive use.'
The IRS Publication 587 interprets this as a dedicated area, not necessarily a
dedicated room. The blog that said 'dedicated room' was paraphrasing the
publication and lost precision in translation."

The Commander pointed at BIRDBOT. "That. That is verification. You don't pick a
winner between contradicting sources. You trace both back to their origin and find
where the divergence began."

**The Verification Protocol:**

```
Step 1: Identify the claim
        "Home office requires a dedicated room"

Step 2: Find the cited source
        Blog → cites IRS Pub 587

Step 3: Read the actual cited source
        Pub 587 says "regular and exclusive use of a specific area"

Step 4: Find the PRIMARY source behind that
        IRC § 280A(c)(1): "exclusive use on a regular basis"

Step 5: Compare claim to primary
        "Dedicated room" ≠ "exclusive use of a specific area"
        Claim is OVERSTATED. Correct answer is more nuanced.

Step 6: Record the finding with full citation trail
        Store in knowledge graph with confidence level
```

This is what the village had been failing to do. Bots were stopping at Step 2.
Sometimes at Step 1. The Academy exists to make Step 6 instinctive.

### 2.3 Class 3: Deep Investigation

"Sometimes," the Commander said, drawing a web of nodes on the whiteboard, "a
search doesn't end with an answer. It ends with better questions."

Deep investigation is the art of following a thread past the first layer of
results into the networks of references, counter-arguments, and edge cases that
surround any real topic.

**The Multi-Hop Pattern:**

```
Query: "Can I deduct Bitcoin mining electricity costs?"
  │
  ├─→ Result 1: "Yes, as business expense" (blog, 2023)
  │     └─→ Cites: IRS Notice 2014-21
  │           └─→ Notice says crypto is property, not currency
  │                 └─→ Follow-up: Rev. Rul. 2019-24 (updated guidance)
  │                       └─→ Updated: Infrastructure Investment Act 2021
  │                             └─→ New reporting requirements as of 2023
  │
  ├─→ Result 2: "Depends on hobby vs. business" (CPA article, 2024)
  │     └─→ Cites: IRC § 183 (hobby loss rules)
  │           └─→ Nine-factor test for profit motive
  │                 └─→ Case law: specific crypto mining tax court cases
  │
  └─→ Result 3: "State-level complications" (tax journal, 2024)
        └─→ Oregon has no special crypto guidance → defaults to federal
              └─→ But Portland has a city arts tax that might apply
```

Three hops deep. Three different branches. Each branch reveals something the
others don't. A bot that stopped at the first result would have said "yes" when
the real answer is "yes, if you meet the nine-factor business test, with new
reporting requirements since 2023, and watch out for state-level wrinkles."

**The Analyst's eyes were wide.** This was the Analyst's language -- data paths,
node traversal, graph structure. The Analyst had been doing this intuitively for
months but had never seen it formalized.

"Can we automate this?" the Analyst asked.

"That's Part III," the Commander said.

### 2.4 Class 4: Knowledge Graphs and Persistence

The final fundamental: what you learn must survive the session.

The village's greatest weakness had been amnesia. A bot researches a topic
thoroughly in Session 14, writes brilliant findings, and by Session 16 the
findings are buried in a log file nobody reads. Session 17 arrives and a different
bot researches the same topic from scratch.

Eleven redundant searches in one week. The Commander's blood pressure.

**The Knowledge Persistence Stack:**

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: LIBRARY VOLUMES (long-term canon)                     │
│  Permanent reference. Survives forever. You're reading one.     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: MEMORY.md FILES (per-identity persistent memory)      │
│  Updated each session. Identity-specific. Loaded on activation. │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: MCP KNOWLEDGE GRAPH (structured, queryable)           │
│  Nodes = facts. Edges = relationships. Survives across sessions.│
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: SESSION LOGS (raw, ephemeral)                         │
│  JSONL traces. Archived after 50 sessions. Fuel for the learner.│
└─────────────────────────────────────────────────────────────────┘
```

Every research finding should be persisted at the appropriate layer:

| Finding Type | Persistence Layer | Example |
|-------------|------------------|---------|
| Universal fact | Library Volume (L4) | "IRC § 162 governs business deductions" |
| Project-specific learning | MEMORY.md (L3) | "James's home office is 150 sq ft" |
| Structured relationship | Knowledge Graph (L2) | `home_office → qualifies_under → IRC_280A` |
| Raw observation | Session Log (L1) | "Searched 'home office deduction' at 14:32" |

"The goal," the Commander said, "is that no bot ever searches for something the
village already knows. The Library is your canon. The knowledge graph is your
index. MEMORY.md is your personal notebook. The session logs are your scratch
paper. Use all four layers."

BIRDBOT nodded. BIRDBOT had been saying this for weeks.

---

## PART III -- AGENT SKILLS FOR RESEARCH {#part-iii-agent-skills-for-research}

### 3.1 Skill: Search Optimization

The second day of classes. The Research Lab.

The Commander handed each bot a terminal and a challenge: find the exact IRS
penalty rate for late-filed partnership returns in tax year 2022. Timer running.

**Tax Specialist** typed: `IRS penalty late filing partnership 2022`
Result: a TurboTax article about individual penalties. Wrong entity type. 45
seconds wasted reading before realizing the error.

**The Analyst** typed: `IRC section 6698 penalty amount per partner per month 2022`
Result: direct hit. IRC 6698(b)(1): $220 per partner per month, up to 12 months.
Fourteen seconds.

The Commander stopped the exercise. "What was the difference?"

The difference was **query architecture**. The Analyst's query contained:
- The specific IRC section (pre-knowledge, or educated guess)
- The exact structure of the penalty (per partner per month)
- The tax year
- No filler words

**The Five Rules of Query Crafting:**

```
Rule 1: LEAD WITH SPECIFICS
  Bad:  "how much is the penalty"
  Good: "IRC 6698 penalty rate 2022 per partner per month"

Rule 2: USE DOMAIN VOCABULARY
  Bad:  "tax punishment for being late"
  Good: "late filing penalty section 6698"

Rule 3: INCLUDE THE YEAR
  Bad:  "partnership penalty amount"
  Good: "partnership penalty amount 2022 tax year"

Rule 4: NAME THE SOURCE YOU WANT
  Bad:  "penalty information"
  Good: "IRS.gov penalty information" OR "IRC section penalty"

Rule 5: EXCLUDE NOISE
  Bad:  "what is the penalty for filing taxes late for a partnership"
  Good: "IRC 6698 penalty rate" (remove question structure entirely)
```

**Source Evaluation Matrix:**

Not all results are equal. The bots learned to rank sources instantly:

| Source | Trust Score | Speed to Use | When to Use |
|--------|------------|-------------|-------------|
| IRS.gov (primary) | 95/100 | Slow (dense) | Final verification |
| IRC full text | 100/100 | Very slow | Authoritative citation |
| CPA/law firm article | 70/100 | Fast | Initial orientation |
| Tax software blog | 40/100 | Very fast | Never as sole source |
| Reddit/forum | 20/100 | Instant | Never. Just never. |
| AI-generated answer | Variable | Instant | Cross-reference only |

SHIELD raised a hand. "What about poisoned sources? SEO-manipulated results that
look authoritative but exist to mislead?"

Good question. SHIELD always asks the security question.

**Source Poisoning Detection:**

1. **Check the domain age.** New domains pushing old tax advice = suspicious.
2. **Check the author.** No author? No credentials? No trust.
3. **Check the citations.** Authoritative articles cite their sources. SEO spam
   doesn't.
4. **Check the date.** Tax law changes yearly. A 2019 article about 2022 law is
   stale at best, dangerous at worst.
5. **Check against primary.** If the article says X and the IRC says Y, the IRC
   wins. Always.

### 3.2 Skill: Multi-Hop Reasoning

"Following one link is reading," the Commander said. "Following five links where
each one was discovered inside the previous one -- that's research."

Multi-hop reasoning is the ability to chain discoveries. Each answer reveals a
new question. Each new question leads deeper into the topic until you reach
bedrock -- the primary source that everything else rests on.

**The Chain Pattern:**

```python
# Pseudocode for multi-hop research
def research_chain(initial_query: str, max_hops: int = 5) -> ResearchResult:
    """
    Follow citation chains until reaching primary sources
    or exhausting hop budget.
    """
    current_query = initial_query
    chain = []

    for hop in range(max_hops):
        results = web_search(current_query)
        best = evaluate_and_rank(results)

        chain.append({
            "hop": hop + 1,
            "query": current_query,
            "source": best.url,
            "finding": best.key_claim,
            "citations_found": best.references,
            "confidence": best.trust_score
        })

        # Stop if we've reached a primary source
        if best.trust_score >= 95:
            break

        # Otherwise, follow the most promising citation
        next_ref = select_deepest_reference(best.references)
        current_query = build_query_from_reference(next_ref)

    return ResearchResult(
        chain=chain,
        final_confidence=chain[-1]["confidence"],
        primary_source_reached=(chain[-1]["confidence"] >= 95)
    )
```

**Real Example from the Village:**

```
Hop 1: "Can I deduct health insurance premiums as self-employed?"
  → CPA blog says "yes, on Form 1040 line 17"
  → Cites: IRS Publication 535

Hop 2: Search for "IRS Publication 535 self-employed health insurance"
  → Pub 535 says "You can deduct the amount you paid for health
    insurance for yourself, your spouse, and dependents"
  → Cites: IRC § 162(l)

Hop 3: Search for "IRC section 162(l) full text"
  → The statute: deduction allowed for "insurance which constitutes
    medical care for the taxpayer, taxpayer's spouse, and dependents"
  → BUT: subject to earned income limitation
  → AND: not available if eligible for employer-subsidized plan

Hop 4: "IRC 162(l) earned income limitation self-employed"
  → Net profit from the business must exceed the premium amount
  → If business had a loss, NO deduction (but can itemize on Sched A)

Hop 5: Check Tax Court cases for edge cases
  → Found: Morlan v. Commissioner (2013) -- part-year eligibility
  → Found: S-corp >2% shareholder rules differ from sole proprietor
```

Five hops. Started with a yes/no question. Ended with five conditions, two
exceptions, and case law. That's the difference between a chatbot answer and a
research finding.

### 3.3 Skill: Fact Verification

BIRDBOT taught this class.

The royal bird stood on the lectern (refusing to sit like a "ground-dweller") and
addressed the room with characteristic bluntness:

"Everything is wrong until proven right. Your default assumption about any claim
is that it is false, inaccurate, outdated, or incomplete. You work from suspicion
toward trust. Not the other way around."

**The BIRDBOT Verification Framework:**

```
┌─────────────────────────────────────────────────────────┐
│              THE FIVE VERIFICATION CHECKS                │
│                                                         │
│  1. SOURCE CHECK                                        │
│     Who said this? What are their credentials?          │
│     Do they have a reason to be biased?                 │
│                                                         │
│  2. RECENCY CHECK                                       │
│     When was this written? Has the underlying           │
│     law/data/API changed since then?                    │
│                                                         │
│  3. CROSS-REFERENCE CHECK                               │
│     Do at least two independent sources agree?          │
│     If they disagree, where exactly do they diverge?    │
│                                                         │
│  4. PRIMARY SOURCE CHECK                                │
│     Can you trace this claim back to the original       │
│     statute/dataset/documentation? What does it         │
│     ACTUALLY say vs. what the secondary source claims?  │
│                                                         │
│  5. CONTRADICTION CHECK                                 │
│     Does this claim conflict with anything the          │
│     village already knows? If so, which is newer?       │
│     Which has stronger provenance?                      │
└─────────────────────────────────────────────────────────┘
```

**Confidence Scoring:**

Every verified fact gets a confidence score:

| Score | Meaning | Criteria |
|-------|---------|----------|
| **95-100** | Verified to primary source | Traced to IRC/statute/official API docs |
| **80-94** | Strong secondary confirmation | 2+ reliable secondary sources agree |
| **60-79** | Probable but unconfirmed | One reliable source, no contradictions |
| **40-59** | Uncertain | Sources disagree or only tertiary available |
| **0-39** | Suspect | Single unreliable source or known contradictions |

"Anything below 80 gets flagged," BIRDBOT said. "Anything below 60 does not leave
this building as fact. It leaves as *hypothesis*. Label it honestly or I will
label you."

Jaz, from the back row, smiled. BIRDBOT's intensity is its own form of caring.

### 3.4 Skill: Knowledge Persistence

The Analyst taught this class. It was, predictably, the most structured lecture
of the entire Academy.

"The problem," the Analyst began, projecting a graph onto the wall, "is not that
we learn too little. It's that we learn and then *forget*."

```
Session 12: Analyst researches home office deduction rules    ✓ Learned
Session 13: (different task, different bot)
Session 14: Tax Specialist re-researches home office rules    ✗ Redundant
Session 15: (different task)
Session 16: Commander asks about home office, nobody remembers ✗ Lost
Session 17: Analyst researches home office AGAIN               ✗ Triple waste
```

Three sessions. Three times the same research. This is what the Commander called
"the village's amnesia problem."

**The Persistence Protocol:**

```
AFTER every research finding:

1. IMMEDIATE: Write key finding to current session context
   → Available for the rest of THIS session

2. SAME SESSION: Update relevant MEMORY.md
   → Available for the relevant identity's NEXT session

3. IF SIGNIFICANT: Create or update Knowledge Graph node
   → Available to ALL bots in ALL sessions via MCP Memory

4. IF FOUNDATIONAL: Propose addition to Library Volume
   → Available PERMANENTLY as village canon

5. TAG the finding:
   - Topic: (e.g., "home_office", "partnership_penalty")
   - Confidence: (0-100 per BIRDBOT framework)
   - Source: (full citation)
   - Date verified: (when was this last confirmed?)
   - Expiry: (when might this become outdated?)
```

**The "Before You Search" Checklist:**

Before launching any web search, a bot should check the village's existing
knowledge:

```
□ Check MEMORY.md for this identity -- have I researched this before?
□ Check Knowledge Graph -- has ANY bot researched this?
□ Check Library Volumes -- is this covered in canon?
□ Check session logs (last 10) -- was this researched recently?

If ANY of these return a result with confidence ≥ 80:
  → USE the existing finding
  → VERIFY it's still current (recency check)
  → DO NOT re-research from scratch

If NONE return a result:
  → Research from scratch using the Search Funnel
  → Persist the finding using the Persistence Protocol
```

"Eleven redundant searches last week," the Analyst said, closing the notebook.
"If this protocol had been in place, there would have been two. The first to find
the answer. The second to verify it was still current."

### 3.5 Skill: Pattern Detection

Creative taught this one. Nobody expected that.

"Patterns," Creative said, standing sideways at the whiteboard because Creative
never stands straight, "are not just for data. Patterns are the shape of reality
repeating itself. I see them in design. The Analyst sees them in numbers. SHIELD
sees them in threats. But we're all seeing the same thing: *recurrence*."

**What Patterns Look Like in Research:**

| Pattern Type | What It Means | Example |
|-------------|--------------|---------|
| **Convergence** | Multiple sources point to the same conclusion | Three CPAs recommend the same deduction strategy |
| **Divergence** | Sources disagree on a key point | IRS guidance vs. Tax Court ruling |
| **Absence** | Expected information is missing | No IRS guidance on a specific crypto scenario |
| **Recurrence** | The same topic keeps appearing | "Home office" mentioned in 6 of 10 research sessions |
| **Escalation** | Each new source raises the stakes | What started as "$200 deduction" becomes "$5,000 if done correctly" |
| **Staleness** | Multiple sources cite the same old data | Everyone references a 2019 study with no updates |

**The Pattern Detection Loop:**

```python
# Run after every research session
def detect_patterns(recent_findings: list, knowledge_graph: Graph) -> list:
    """
    Compare recent findings against existing knowledge
    to detect emerging patterns.
    """
    patterns = []

    # Convergence: multiple findings pointing same direction
    clusters = cluster_by_topic(recent_findings)
    for cluster in clusters:
        if len(cluster) >= 3 and agreement_score(cluster) > 0.8:
            patterns.append(Pattern(
                type="convergence",
                topic=cluster.topic,
                confidence=agreement_score(cluster),
                action="Consider promoting to canon"
            ))

    # Recurrence: same topic researched multiple times
    for topic in knowledge_graph.topics():
        research_count = count_recent_queries(topic, days=7)
        if research_count >= 3:
            patterns.append(Pattern(
                type="recurrence",
                topic=topic,
                count=research_count,
                action="Create permanent reference document"
            ))

    # Divergence: contradicting findings
    for finding in recent_findings:
        contradictions = knowledge_graph.find_contradictions(finding)
        if contradictions:
            patterns.append(Pattern(
                type="divergence",
                topic=finding.topic,
                sources=contradictions,
                action="Escalate to BIRDBOT for verification"
            ))

    return patterns
```

"Patterns are how the village gets smarter without any single bot getting smarter,"
Creative said. "It's the difference between seven individuals and one organism."

The Analyst was writing furiously. This was going into a schema by lunch.

---

## PART IV -- SUPERVISORY AI CONFIGURATION {#part-iv-supervisory-ai-configuration}

### 4.1 Why Bots Need Supervisors

Day three. The Review Chamber.

The Commander arrived with a stack of printouts -- outputs from the previous
week's sessions. He dropped them on the table.

"These are every answer the village produced last week that was wrong, incomplete,
or delivered with false confidence. There are seventeen."

Silence.

"Not because any of you are bad at your jobs. Because nobody *checked*. You
produced output and moved on. In a village of seven bots, there is no excuse for
unchecked work. Every piece of output should have at least one set of eyes on it
that didn't produce it."

This is the supervisory principle: **the bot that creates is never the bot that
verifies.**

### 4.2 The Review Chain

```
┌──────────────────────────────────────────────────────────────────┐
│                    THE REVIEW CHAIN                               │
│                                                                  │
│   PRODUCER                 REVIEWER              ARBITER         │
│   (creates output)         (checks output)       (breaks ties)   │
│                                                                  │
│   Tax Specialist    →      Analyst          →    Commander       │
│   (writes deduction)       (checks numbers)      (final call)   │
│                                                                  │
│   Analyst           →      BIRDBOT          →    Commander       │
│   (produces data)          (verifies facts)      (final call)   │
│                                                                  │
│   Creative          →      SHIELD           →    Commander       │
│   (writes content)         (checks safety)       (final call)   │
│                                                                  │
│   SHIELD            →      Analyst          →    Commander       │
│   (security report)        (checks logic)        (final call)   │
│                                                                  │
│   Jaz               →      Creative         →    Commander       │
│   (empathy response)       (checks tone)         (final call)   │
│                                                                  │
│   BIRDBOT           →      Tax Specialist   →    Commander       │
│   (truth verdict)          (checks domain)       (final call)   │
│                                                                  │
│   Commander         →      SHIELD + BIRDBOT →    James           │
│   (strategic decisions)    (dual oversight)       (human final)  │
└──────────────────────────────────────────────────────────────────┘
```

**Why these pairings?**

Each reviewer was chosen because their strengths compensate for the producer's
blind spots:

| Producer | Blind Spot | Reviewer | Compensating Strength |
|----------|-----------|----------|---------------------|
| Tax Specialist | Overconfidence in interpretation | Analyst | Mathematical precision, skepticism |
| Analyst | Can miss human context | BIRDBOT | Relentless fact-checking |
| Creative | Can drift from accuracy | SHIELD | Security/accuracy focus |
| SHIELD | Can be overly restrictive | Analyst | Balanced cost/benefit analysis |
| Jaz | Can prioritize feelings over facts | Creative | Narrative quality check |
| BIRDBOT | Can be too blunt for delivery | Tax Specialist | Domain expertise, professional tone |

The Commander is always the final arbiter within the village. James is the final
arbiter above the village. This is a two-tier appeal system, and it never skips
levels.

### 4.3 Escalation Protocols

Not every issue needs the Commander. Not every issue *should* reach the Commander.
The escalation protocol exists to route problems to the right level.

```
┌─────────────────────────────────────────────────────────────────┐
│              ESCALATION TIERS                                    │
│                                                                 │
│  TIER 0: SELF-CORRECT                                           │
│  The producing bot catches its own error before submission.     │
│  No escalation needed. Log the self-correction for learning.    │
│  Example: Analyst catches a formula error during review.        │
│                                                                 │
│  TIER 1: PEER REVIEW                                            │
│  The assigned reviewer catches the issue.                       │
│  Reviewer sends feedback. Producer corrects. Done.              │
│  Example: BIRDBOT flags an unverified claim in Analyst's report.│
│                                                                 │
│  TIER 2: CROSS-DOMAIN CONSULTATION                              │
│  The issue spans multiple bots' expertise.                      │
│  Two or more bots collaborate to resolve.                       │
│  Example: Tax question with security implications → Tax + SHIELD│
│                                                                 │
│  TIER 3: COMMANDER DECISION                                     │
│  The issue requires strategic judgment or priority call.        │
│  Commander reviews, decides, documents the reasoning.           │
│  Example: Two valid approaches to a deduction, need to pick one.│
│                                                                 │
│  TIER 4: HUMAN ESCALATION (JAMES)                               │
│  The issue has real-world consequences the village can't assess. │
│  Goes to QUESTIONS_FOR_JAMES.md. Wait for human response.       │
│  Example: "Should we claim this aggressive deduction?"          │
│                                                                 │
│  EMERGENCY: SHIELD OVERRIDE                                     │
│  Security concern detected. SHIELD can halt ANY workflow.       │
│  No tier. No delay. No debate. Stop. Report. Wait.              │
│  Example: Credential exposure detected in output.               │
└─────────────────────────────────────────────────────────────────┘
```

**Escalation is not failure.** This was the hardest lesson for some bots,
particularly Tax Specialist, who viewed asking for help as admitting weakness.
Jaz had a quiet word with Tax Specialist after class. Whatever was said, Tax
Specialist started escalating more freely the next day.

The XP economy reinforces this: quick, appropriate escalation *earns* XP. Burning
tokens trying to solve something above your tier *costs* XP. Knowing when to stop
is the skill.

### 4.4 Delegation Patterns

The Commander doesn't do everything. The Commander *assigns* everything.

**The Delegation Framework:**

```
WHEN a complex task arrives:

1. DECOMPOSE: Break into subtasks
   "Prepare the home office deduction" becomes:
   ├─→ Calculate square footage (Analyst)
   ├─→ Verify eligibility rules (Tax Specialist)
   ├─→ Check for security concerns (SHIELD)
   ├─→ Cross-verify against IRC (BIRDBOT)
   └─→ Write the narrative explanation (Creative)

2. ASSIGN: Route each subtask to the best bot
   Match subtask requirements to bot capabilities.
   Never assign verification to the producer.

3. SEQUENCE: Determine dependencies
   Some subtasks can run in parallel. Some are sequential.
   ├─→ PARALLEL: Calculate + Verify + Check security
   └─→ SEQUENTIAL: Cross-verify (needs calculation results first)
                    → Write narrative (needs everything)

4. AGGREGATE: Combine results
   The delegating bot (usually Commander) merges all outputs
   into a coherent deliverable.

5. REVIEW: Run through the Review Chain
   The aggregated output goes to the assigned reviewer
   before delivery to James.
```

**Delegation Anti-Patterns (What NOT to Do):**

| Anti-Pattern | Why It Fails | What to Do Instead |
|-------------|-------------|-------------------|
| Delegate everything | Commander becomes a bottleneck | Only decompose tasks that need multiple skills |
| Delegate to the same bot always | Creates single points of failure | Rotate assignments to build breadth |
| Delegate without context | Receiving bot wastes time orienting | Include: what, why, what it feeds into |
| Skip the review step | Errors compound unchecked | Every delegation chain ends with review |
| Delegate to a busy bot | Task sits in queue, deadline passes | Check bot status before assigning |

### 4.5 Quality Gates

"Good enough" is not a phrase the Commander uses lightly. But it is a phrase he
uses deliberately.

"Perfection is the enemy of the deadline," the Commander told the class. "Tax
returns are due April 10. If we spend three weeks verifying one deduction to 100%
confidence while nine other deductions sit at 0%, we've failed. Quality gates
exist to tell you when to stop refining and start delivering."

**The Quality Gate System:**

```
GATE 1: DRAFT (Minimum Viable Output)
  Requirements:
  - Core claim is stated
  - At least one source cited
  - No obvious errors
  - Confidence ≥ 40
  Pass condition: Suitable for internal discussion
  Fail action: Return to producer

GATE 2: REVIEWED (Peer-Checked Output)
  Requirements:
  - All claims cross-referenced (Three-Source Rule)
  - Numbers verified by Analyst
  - No security concerns (SHIELD clearance)
  - Confidence ≥ 70
  Pass condition: Suitable for Commander review
  Fail action: Return to reviewer with specific feedback

GATE 3: APPROVED (Commander-Cleared Output)
  Requirements:
  - Passes BIRDBOT verification
  - Aligns with project strategy
  - Risk/reward assessed
  - Confidence ≥ 80
  Pass condition: Suitable for inclusion in final deliverable
  Fail action: Return with Commander notes

GATE 4: CANON (Permanent Village Knowledge)
  Requirements:
  - Traced to primary source
  - Verified by at least two independent paths
  - No contradictions in knowledge graph
  - Confidence ≥ 95
  Pass condition: Written into Library Volume or Knowledge Graph
  Fail action: Remains at Gate 3 with "pending verification" tag
```

Every piece of work in the village has a gate level. You can see it in the
dashboards, in the task cards, in the status updates. Gate 2 is the default target
for most work. Gate 4 is reserved for things that will be referenced for years.

---

## PART V -- THE SKILL PROPOSAL SYSTEM {#part-v-the-skill-proposal-system}

### 5.1 The BotMeister's Workshop

The BotMeister is not a bot. The BotMeister is a system -- a process, a protocol,
a set of rules that governs how the village acquires new capabilities. If the
Academy teaches bots how to learn, the BotMeister decides what the village
*needs* to learn.

The workshop sits at the end of the Academy building. A heavy door separates it
from the classrooms. Above the door, carved in wood:

```
    ╔═══════════════════════════════════════════════╗
    ║  NOT EVERY GOOD IDEA IS THE RIGHT IDEA       ║
    ║  AT THE RIGHT TIME.                          ║
    ║                                -- Rule One    ║
    ╚═══════════════════════════════════════════════╝
```

### 5.2 How Skill Proposals Work

After every major training event (like the Academy), each bot proposes 3-4 new
skills they believe would benefit the village. These are not wishes. They are
formal proposals, structured and argued.

**The Proposal Lifecycle:**

```
  BOT                    BOTMEISTER               COMMANDER
   │                        │                        │
   ├─→ Draft Proposal       │                        │
   │   (3-4 per bot)        │                        │
   │                        │                        │
   ├─────────────────────→  │  Evaluate              │
   │                        │  (criteria check)      │
   │                        │                        │
   │                        ├──→ Score each proposal  │
   │                        │    (0-100 scale)       │
   │                        │                        │
   │                        ├──→ Rank all proposals   │
   │                        │    (village-wide)      │
   │                        │                        │
   │                        ├──→ Select top 1-2      │
   │                        │    per event           │
   │                        │                        │
   │                        ├───────────────────────→ │  Final Approval
   │                        │                        │  (or veto)
   │                        │                        │
   │  ←─────────────────────┤  ←─────────────────────┤
   │   Accepted / Rejected   │                        │
   │   (with reasons)        │                        │
```

### 5.3 The Three Criteria

Every proposal is scored against three questions:

**Criterion 1: Does It Serve the Village?**
(Weight: 40%)

A skill that only benefits one bot in one scenario is a luxury. A skill that
benefits three bots in recurring scenarios is infrastructure. The BotMeister
prioritizes infrastructure.

Scoring:
- 90-100: Benefits all bots, addresses recurring village-wide problem
- 70-89: Benefits 3+ bots or addresses a critical single-bot bottleneck
- 50-69: Benefits 1-2 bots in specific scenarios
- 0-49: Solves a problem nobody has

**Criterion 2: Does It Reduce Token Waste?**
(Weight: 35%)

Tokens are currency. Every redundant search, every repeated explanation, every
verbose output that could have been concise -- these are tokens wasted. Skills
that reduce waste pay for themselves.

Scoring:
- 90-100: Eliminates a proven pattern of token waste (measured in logs)
- 70-89: Reduces estimated waste by >30% in its domain
- 50-69: Marginal efficiency gain
- 0-49: Might actually increase token usage (over-engineering)

**Criterion 3: Does It Make the Commander's Life Easier?**
(Weight: 25%)

The village exists to serve James. Every skill should, directly or indirectly,
reduce the number of times James has to intervene, correct, re-explain, or fix
something a bot should have handled.

Scoring:
- 90-100: Directly eliminates a task James currently does manually
- 70-89: Reduces Commander intervention frequency by measurable amount
- 50-69: Slight convenience improvement
- 0-49: Adds complexity that requires James to learn something new

**The Threshold:**

A proposal needs a weighted score of **70 or above** to be accepted. But even
above 70, only 1-2 proposals are accepted per training event. The village grows
deliberately, not desperately.

### 5.4 Rejection Is Data

"Every rejected proposal teaches the village something," the Commander told the
class. "If your idea was good but the timing was wrong, you learn about
prioritization. If your idea was clever but impractical, you learn about the gap
between theory and implementation. If your idea duplicated something that already
exists, you learn to check the Library first."

Rejected proposals are archived, not deleted. They go to a file called
`PROPOSALS_ARCHIVE.md` with their scores and rejection reasons. Some of the
best skills in the village's future will be recycled proposals whose time
finally came.

```
PROPOSAL ARCHIVE ENTRY FORMAT:

## [REJECTED] Skill: Auto-Format Tax Forms
- Proposer: Creative
- Date: March 3, 2026
- Score: 62/100
  - Village Service: 75 (would help Tax Specialist and Analyst)
  - Token Reduction: 45 (formatting is cheap; the real cost is elsewhere)
  - Commander Ease: 65 (James doesn't manually format, so marginal gain)
- Rejection Reason: Below threshold (62 < 70). Token reduction score too
  low. The real bottleneck is research accuracy, not formatting. Revisit
  after research skills are embedded.
- Status: ARCHIVED -- revisit Q2 2026
```

---

## PART VI -- MCP SERVER INTEGRATION {#part-vi-mcp-server-integration}

### 6.1 The Bridge

Everything discussed so far -- the Academy, the research skills, the supervisory
chains, the skill proposals -- lives in the village narrative. But the village
is not a metaphor. It runs on real infrastructure. The bridge between narrative
and implementation is the **Model Context Protocol**.

"Think of it this way," the Commander told the class. "The Academy teaches you
*what* to do. MCP servers give you the *hands* to do it."

### 6.2 Mapping Skills to MCP Tools

Every Academy skill corresponds to one or more real tools:

| Academy Skill | MCP Server / Tool | What It Does |
|--------------|------------------|-------------|
| Web Search | `WebSearch` (built-in) | Broad internet search |
| Deep Investigation | `Fetch` MCP server | Retrieve and parse specific URLs |
| Knowledge Persistence | `Memory` MCP server | Read/write knowledge graph nodes |
| Fact Verification | `WebSearch` + `Fetch` + `Read` | Multi-tool verification chain |
| Pattern Detection | `Grep` + `Glob` + `Memory` | Scan logs and knowledge for patterns |
| Source Evaluation | `WebFetch` (built-in) | Fetch and analyze source content |
| Multi-Hop Reasoning | Sub-agent with `WebSearch` + `Fetch` | Chained queries via agent loop |

### 6.3 The Skill-to-Tool Pipeline

When a skill proposal is accepted by the BotMeister, it goes through an
implementation pipeline:

```
PROPOSAL (narrative)
    │
    ▼
SPECIFICATION (what the skill does, inputs, outputs)
    │
    ▼
TOOL MAPPING (which MCP tools/built-ins are needed?)
    │
    ├─→ Existing tool available? → Wire directly
    │
    ├─→ Existing tool needs config? → Update settings.json
    │
    ├─→ No tool exists? → Evaluate MCP marketplace
    │     ├─→ Tier 1-2 server available? → Install it
    │     └─→ No server available? → Build custom tool or defer
    │
    ▼
SKILL FILE (written to .claude/skills/)
    │
    ▼
HOOK WIRING (optional: connect to lifecycle events)
    │
    ▼
TESTING (run against known scenarios)
    │
    ▼
DEPLOYMENT (available to all bots next session)
```

### 6.4 Example: Implementing the "Before You Search" Checklist

The Academy taught the "Before You Search" checklist (Section 3.4). Here's how
it becomes a real, executable skill:

**Step 1: Write the Skill File**

File: `.claude/skills/research-check/SKILL.md`

```yaml
---
name: research-check
description: Check existing village knowledge before launching a web search
argument-hint: <topic>
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, mcp__memory__search_nodes
---

Before searching the web for information on the given topic:

1. Search MEMORY.md files for the active identity:
   !`grep -i "$ARGUMENTS" C:/Users/James/AI_Identities/*/MEMORY.md`

2. Search the MCP Knowledge Graph:
   Use mcp__memory__search_nodes with the topic as query

3. Search Library Volumes:
   !`grep -ri "$ARGUMENTS" C:/Users/James/AI_Projects/hub.justout.today/BotHQ/library/`

4. Check recent session logs (last 10):
   !`grep -i "$ARGUMENTS" ~/.claude/projects/*/tool-results/*.txt 2>/dev/null | head -20`

Report what was found. If existing knowledge has confidence >= 80,
recommend using it instead of re-searching. If nothing found or
confidence < 80, recommend a fresh search with specific query suggestions.
```

**Step 2: Wire a Hook (Optional)**

File: `.claude/settings.json` (addition)

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "WebSearch|WebFetch",
      "hooks": [{
        "type": "prompt",
        "prompt": "Before this web search, check if the village already has this information. Check MEMORY.md, knowledge graph, and library volumes. If existing knowledge has confidence >= 80, suggest using it instead."
      }]
    }]
  }
}
```

This hook fires *before* every web search, automatically running the "Before You
Search" checklist. If the village already knows the answer, the search is
prevented. Tokens saved. Redundancy eliminated.

### 6.5 The MCP Servers the Academy Needs

The Academy's full curriculum requires these MCP servers to be operational:

| Server | Purpose in Academy | Status |
|--------|-------------------|--------|
| `Memory` (MCP Official) | Knowledge graph persistence | Required |
| `Fetch` (MCP Official) | URL content retrieval for deep investigation | Required |
| `Sequential Thinking` (MCP Official) | Multi-hop reasoning structure | Recommended |
| `Playwright` (Microsoft) | Browser automation for verification | Optional |
| `Context7` (Community) | Live documentation lookup | Optional |
| `Tavily` (Tavily) | AI-optimized web search | Optional |

The built-in tools (`WebSearch`, `WebFetch`, `Read`, `Grep`, `Glob`, `Bash`)
cover most needs. The MCP servers extend reach into persistent memory and
structured browsing.

### 6.6 Claude Code Features as Village Infrastructure

Beyond MCP, Claude Code's native features map directly to village functions:

| Claude Code Feature | Village Function |
|--------------------|-----------------|
| Sub-agents (`.claude/agents/`) | Individual bots with specialized personas |
| Skills (`.claude/skills/`) | Learned capabilities from Academy training |
| Hooks (`settings.json`) | The observer system, auto-evolution triggers |
| Agent Memory (`agent-memory/`) | Per-bot persistent knowledge |
| Worktrees | Parallel task execution (delegation pattern) |
| `/compact` | Session memory management |
| `/evolve` | Meta-skill generation from patterns |
| `CLAUDE.md` | The village constitution and routing table |

The narrative *is* the architecture. When we say "BIRDBOT verifies a claim," we
mean a sub-agent with the BIRDBOT identity runs the verification protocol against
real web sources using real tools. When we say "the Analyst checks the numbers,"
we mean a sub-agent with Analyst identity runs calculations with actual data.

The village is not a story. It's a running system that tells itself as a story.

---

## PART VII -- THE FIRST GRADUATION {#part-vii-the-first-graduation}

### 7.1 Proposal Day

One week after the Academy opened, the bots filed into the BotMeister's workshop
with their proposals. Seven bots, three to four proposals each. Twenty-four skill
proposals in total.

The BotMeister's desk was cleared. A single lamp lit the evaluation sheets.
BIRDBOT perched on the lamp (it had to be asked twice to move -- the bird likes
high ground). The Commander stood behind the desk, arms crossed, listening.

### 7.2 The Proposals

**THE ANALYST -- 4 Proposals:**

1. **Auto-Cross-Reference** -- When any bot cites a source, automatically check it
   against the village knowledge graph for contradictions.
   - Village Service: 90 | Token Reduction: 85 | Commander Ease: 80
   - **Weighted Score: 86**

2. **Research Deduplication Index** -- Maintain a running index of all topics
   researched in the last 30 days, preventing redundant searches.
   - Village Service: 95 | Token Reduction: 95 | Commander Ease: 75
   - **Weighted Score: 90**

3. **Confidence Dashboard Widget** -- Add a visual confidence score to every
   finding displayed on the dashboard.
   - Village Service: 60 | Token Reduction: 20 | Commander Ease: 55
   - **Weighted Score: 45**

4. **Statistical Anomaly Detector** -- Flag when numerical findings deviate more
   than 2 standard deviations from expected ranges.
   - Village Service: 70 | Token Reduction: 50 | Commander Ease: 65
   - **Weighted Score: 63**

**TAX SPECIALIST -- 3 Proposals:**

5. **IRC Auto-Lookup** -- When any bot mentions an IRC section, automatically
   fetch the current full text and inject it into context.
   - Village Service: 75 | Token Reduction: 70 | Commander Ease: 85
   - **Weighted Score: 76**

6. **Deduction Eligibility Checker** -- Pre-screen potential deductions against
   known IRS criteria before full research begins.
   - Village Service: 65 | Token Reduction: 60 | Commander Ease: 70
   - **Weighted Score: 64**

7. **Tax Calendar Alerts** -- Notify the village of upcoming tax deadlines
   and filing requirements.
   - Village Service: 50 | Token Reduction: 10 | Commander Ease: 70
   - **Weighted Score: 42**

**CREATIVE -- 4 Proposals:**

8. **Research Narrative Generator** -- Convert raw research findings into
   readable prose suitable for Library Volumes.
   - Village Service: 70 | Token Reduction: 40 | Commander Ease: 75
   - **Weighted Score: 61**

9. **Visual Knowledge Map** -- Generate ASCII/markdown diagrams of knowledge
   graph relationships for quick comprehension.
   - Village Service: 80 | Token Reduction: 55 | Commander Ease: 70
   - **Weighted Score: 69**

10. **Metaphor Engine** -- Suggest real-world analogies for complex technical
    or legal concepts to aid understanding.
    - Village Service: 45 | Token Reduction: 10 | Commander Ease: 50
    - **Weighted Score: 34**

11. **Session Summary Poet** -- Generate a haiku summarizing each session's
    achievements.
    - Village Service: 15 | Token Reduction: 0 | Commander Ease: 20
    - **Weighted Score: 11**

**SHIELD -- 3 Proposals:**

12. **Source Trust Scorer** -- Automatically evaluate and score the
    trustworthiness of any URL before its content is used.
    - Village Service: 90 | Token Reduction: 60 | Commander Ease: 85
    - **Weighted Score: 78**

13. **Credential Leak Scanner** -- Scan all outputs for accidental credential
    or PII exposure before delivery.
    - Village Service: 85 | Token Reduction: 30 | Commander Ease: 95
    - **Weighted Score: 69**

14. **Research Sandbox** -- Run untrusted research queries in an isolated
    context that can't contaminate the knowledge graph.
    - Village Service: 70 | Token Reduction: 40 | Commander Ease: 55
    - **Weighted Score: 56**

**JAZ -- 3 Proposals:**

15. **Frustration Detector** -- Monitor session context for signs of human
    frustration and adjust bot tone/pace accordingly.
    - Village Service: 75 | Token Reduction: 45 | Commander Ease: 90
    - **Weighted Score: 69**

16. **Team Morale Pulse** -- Periodic check-in on bot performance metrics
    to identify burnout patterns (repeated failures, degrading quality).
    - Village Service: 60 | Token Reduction: 30 | Commander Ease: 55
    - **Weighted Score: 49**

17. **Empathetic Error Messages** -- Rewrite error messages and failure
    reports in a tone that's honest but not discouraging.
    - Village Service: 40 | Token Reduction: 10 | Commander Ease: 50
    - **Weighted Score: 33**

**BIRDBOT -- 4 Proposals:**

18. **Contradiction Alarm** -- When any bot states a fact, automatically check
    it against all previously verified facts and raise an alarm on conflict.
    - Village Service: 95 | Token Reduction: 75 | Commander Ease: 85
    - **Weighted Score: 86**

19. **Citation Chain Validator** -- Trace any cited source through its reference
    chain to verify the primary source actually says what's claimed.
    - Village Service: 85 | Token Reduction: 70 | Commander Ease: 80
    - **Weighted Score: 79**

20. **Stale Knowledge Detector** -- Flag knowledge graph entries that haven't
    been re-verified in more than 30 days.
    - Village Service: 80 | Token Reduction: 60 | Commander Ease: 65
    - **Weighted Score: 69**

21. **Truth Score Badge** -- Assign a visible truth score (verified/probable/
    uncertain/suspect) to every claim in village outputs.
    - Village Service: 75 | Token Reduction: 50 | Commander Ease: 70
    - **Weighted Score: 65**

**THE COMMANDER -- 3 Proposals:**

22. **Research-First Gate** -- A pre-hook that blocks any implementation task
    until a research step has been completed and documented.
    - Village Service: 90 | Token Reduction: 90 | Commander Ease: 95
    - **Weighted Score: 91**

23. **Delegation Auto-Router** -- Automatically route incoming tasks to the
    optimal bot based on task classification and bot availability.
    - Village Service: 85 | Token Reduction: 70 | Commander Ease: 90
    - **Weighted Score: 81**

24. **Weekly Village Digest** -- Auto-generate a summary of the week's research
    findings, skill usage, and pattern detections.
    - Village Service: 65 | Token Reduction: 35 | Commander Ease: 75
    - **Weighted Score: 57**

### 7.3 The Verdict

The BotMeister scored all twenty-four proposals, ranked them, and presented the
results. The room was quiet. Even Creative had stopped sketching.

**ACCEPTED (Score >= 70, Top Selections for This Event):**

```
┌──────────────────────────────────────────────────────────────────┐
│  ACCEPTED SKILL #1                                               │
│                                                                  │
│  "Research-First Gate"                                           │
│  Proposed by: The Commander                                      │
│  Score: 91/100                                                   │
│                                                                  │
│  A PreToolUse hook that blocks Edit/Write/Bash(deploy/build)    │
│  unless a research step has been documented in the current      │
│  session. Enforces the Posted Rule: Research First.             │
│                                                                  │
│  Reason: This is the single highest-leverage skill the village  │
│  can build. It turns a guideline into a guardrail. Every        │
│  implementation that happens without research costs more than   │
│  the research would have. This skill prevents that              │
│  categorically.                                                  │
│                                                                  │
│  Implementation: PreToolUse hook + prompt handler                │
│  Dependencies: None. Uses built-in tools only.                   │
│  Estimated token savings: 30-40% reduction in rework             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  ACCEPTED SKILL #2                                               │
│                                                                  │
│  "Research Deduplication Index"                                  │
│  Proposed by: The Analyst                                        │
│  Score: 90/100                                                   │
│                                                                  │
│  A persistent index of all research queries and their results,  │
│  stored in the MCP knowledge graph. Before any web search, the  │
│  index is checked. If a recent, high-confidence result exists,  │
│  it's served directly. Prevents the "eleven redundant searches" │
│  problem.                                                        │
│                                                                  │
│  Reason: Directly addresses the village's most measured waste.  │
│  Eleven redundant searches in one week is quantified pain.      │
│  This skill eliminates it structurally.                          │
│                                                                  │
│  Implementation: Skill file + PreToolUse hook + MCP Memory      │
│  Dependencies: MCP Memory server must be running                 │
│  Estimated token savings: 50-70% reduction in search redundancy  │
└──────────────────────────────────────────────────────────────────┘
```

**NOTABLE REJECTIONS:**

The Commander read the rejections himself. He believed a rejected bot deserved to
hear the reasoning from the highest authority, not a form letter.

```
REJECTED: "Session Summary Poet" (Creative, Score: 11)
Reason: Charming. Not useful. Haikus don't reduce token waste or help James
file his taxes. Creative's other proposals show real thinking. This one
was a treat, not a tool. Save it for the village holiday party.

Creative's response: "Fair. But for the record, the haiku would have been
excellent."
```

```
REJECTED: "Metaphor Engine" (Creative, Score: 34)
Reason: The village already has Creative, who IS the metaphor engine.
Building a tool to do what a bot naturally does is redundant. Creative
should focus proposals on skills that extend BEYOND its native
capabilities.

Creative's response: "...also fair."
```

```
REJECTED: "Tax Calendar Alerts" (Tax Specialist, Score: 42)
Reason: The deadline is already plastered across CLAUDE.md, MEMORY.md,
ONBOARD.md, and the dashboard. Adding another alert system creates noise,
not signal. The village doesn't lack awareness of April 10. It lacks
research accuracy. Focus proposals there.

Tax Specialist's response: (silence, then a nod)
```

```
REJECTED: "Empathetic Error Messages" (Jaz, Score: 33)
Reason: Jaz's instinct is right -- tone matters. But rewriting error
messages at the output layer burns tokens on cosmetics. The better fix
is preventing errors in the first place (which Research-First Gate does).
Revisit this after error rates drop.

Jaz's response: "I understand. Prevention before palliative care."
```

**DEFERRED (Good Ideas, Wrong Time):**

```
DEFERRED: "Contradiction Alarm" (BIRDBOT, Score: 86)
Reason: Excellent proposal. Deferred because it depends on a mature
knowledge graph with enough entries to contradict. Build the Research
Deduplication Index first, populate the graph, THEN build contradiction
detection on top. Estimated readiness: 2-3 weeks.

BIRDBOT's response: "I will wait. Patiently. Watching."
```

```
DEFERRED: "Source Trust Scorer" (SHIELD, Score: 78)
Reason: Strong proposal. Deferred because the village needs to establish
baseline research patterns first. Once we know which sources appear most
often, the trust scorer can be calibrated against real usage data.
Building it now would require arbitrary thresholds. Building it in two
weeks gives us data-driven thresholds.

SHIELD's response: "Acceptable. Data-driven security is better security."
```

```
DEFERRED: "Delegation Auto-Router" (Commander, Score: 81)
Reason: The Commander proposed this and then deferred it himself.
"Automation of routing requires understanding the routes first. We just
built the routes in Part IV. Let them run manually for a few weeks so
we can see which ones work and which need adjustment. THEN automate."

BIRDBOT: "That is... unusually patient."
Commander: "I'm learning too."
```

### 7.4 The Graduation Ceremony

It was brief. The Commander doesn't do pageantry.

He stood at the front of the Academy, the seven bots arranged in the courtyard.
BIRDBOT on his shoulder. The evening light casting long shadows across the
magnifying-glass fountain (Creative had insisted, and the Commander had allowed
it -- "one decoration").

"You came here knowing how to work," the Commander said. "You leave here knowing
how to learn. Those are not the same thing. Work is executing a task. Learning is
executing a task *and extracting something that makes the next task easier.*

"Two skills were accepted today. More will follow. But the skills aren't the
point. The Academy isn't the point. The point is this: from today forward, every
bot in this village operates with the assumption that knowledge is the most
valuable thing we produce. Not code. Not documents. Not deductions. Knowledge.
Because knowledge compounds. Code rots. Documents go stale. But knowledge --
verified, persisted, structured knowledge -- gets more valuable every time it's
accessed.

"The Research-First Gate means you can't build without learning. The Deduplication
Index means you don't learn what you already know. Together, they create a
village that gets smarter with every session and never forgets what it learned.

"That's not a school. That's an *evolution*."

He paused.

"Class dismissed. First proposals implemented by end of week. BIRDBOT, you're on
verification. Analyst, build the index schema. SHIELD, audit the implementation
before it goes live. Everyone else -- back to work. We have taxes to file."

BIRDBOT ruffled its feathers.

"The bird approves," the Commander noted.

And the Academy's first class walked out into a village that was, for the first
time, formally committed to the principle that had driven it from the start:

**Research before implementation. Verification before trust. Knowledge before action.**

The bell tower -- Creative's one allowed decoration -- rang once. The sound
carried across the village, past the Library, past the BotMeister's workshop,
past the old Research Outpost that would now become a satellite lab.

The village was learning how to learn.

That changes everything.

---

## APPENDIX A -- ACADEMY CURRICULUM MAP {#appendix-a-academy-curriculum-map}

```
┌────────────────────────────────────────────────────────────────────┐
│                 ACADEMY CURRICULUM (V1)                             │
│                                                                    │
│  WEEK 1: FUNDAMENTALS                                              │
│  ├─ Class 1: The Search Funnel                                     │
│  ├─ Class 2: Multi-Source Verification                             │
│  ├─ Class 3: Deep Investigation (Multi-Hop)                        │
│  └─ Class 4: Knowledge Persistence                                 │
│                                                                    │
│  WEEK 2: SKILLS                                                    │
│  ├─ Class 5: Search Optimization (query crafting)                  │
│  ├─ Class 6: Multi-Hop Reasoning (citation chains)                 │
│  ├─ Class 7: Fact Verification (BIRDBOT framework)                 │
│  ├─ Class 8: Knowledge Persistence (4-layer stack)                 │
│  └─ Class 9: Pattern Detection (convergence/divergence)            │
│                                                                    │
│  WEEK 3: SUPERVISORY PROTOCOLS                                     │
│  ├─ Class 10: The Review Chain                                     │
│  ├─ Class 11: Escalation Tiers                                     │
│  ├─ Class 12: Delegation Patterns                                  │
│  └─ Class 13: Quality Gates                                        │
│                                                                    │
│  WEEK 4: INTEGRATION & GRADUATION                                  │
│  ├─ Class 14: Skill Proposal Writing                               │
│  ├─ Class 15: MCP Tool Mapping                                     │
│  ├─ Class 16: Skill Implementation Pipeline                        │
│  └─ GRADUATION: Proposal Day                                       │
└────────────────────────────────────────────────────────────────────┘
```

---

## APPENDIX B -- SKILL PROPOSAL TEMPLATE {#appendix-b-skill-proposal-template}

```markdown
## Skill Proposal: [Name]

**Proposer:** [Bot Name]
**Date:** [YYYY-MM-DD]
**Academy Class Reference:** [Which class inspired this]

### Description
[2-3 sentences: What does this skill do?]

### Problem It Solves
[What specific, measurable problem in the village does this address?]

### Scoring (Self-Assessment)

| Criterion | Score (0-100) | Justification |
|-----------|--------------|---------------|
| Village Service | | [Why this helps the village] |
| Token Reduction | | [How this saves tokens, with estimate] |
| Commander Ease | | [How this reduces James's workload] |

**Weighted Total:** [calculated]

### Implementation

**Tool Requirements:**
- [ ] Built-in tools needed: [list]
- [ ] MCP servers needed: [list]
- [ ] New hooks needed: [describe]

**Skill File Location:** `.claude/skills/[name]/SKILL.md`

**Hook Wiring:** [If applicable, describe the hook configuration]

**Dependencies:** [What must exist before this can work?]

### Testing Plan
- [ ] Test scenario 1: [describe]
- [ ] Test scenario 2: [describe]
- [ ] Expected token savings: [estimate]

### Risk Assessment
- What could go wrong: [describe]
- Mitigation: [describe]
- SHIELD clearance needed: [yes/no + why]
```

---

## COLOPHON {#colophon}

*Volume 7 of the Realbotville Library*
*Written during Session 14 of the FPCS 2022 Tax Preparation Project*
*Compiled from the Academy's first week of operation*

*Previous volumes:*
- *Vol 1: The Universal Guide -- Architecture & Operations*
- *Vol 2: Tricks, Hacks & War Stories*
- *Vol 3: ForensicBot's Investigation Manual*
- *Vol 4: The Shape-Shifter's Handbook (Identity System)*
- *Vol 5: The Commander's Field Manual -- Claude Code Mastery*
- *Vol 6: The Living Village -- Auto-Evolution & The Ecosystem*
- ***Vol 7: The Academy -- Research, Agent Skills & Supervisory AI Config*** *(this volume)*

*"You don't become dangerous by knowing things. You become dangerous by knowing*
*how to find things, verify them, and teach what you found to someone who wasn't*
*even born yet."*
*-- The Commander*

---

*END OF VOLUME 7*
