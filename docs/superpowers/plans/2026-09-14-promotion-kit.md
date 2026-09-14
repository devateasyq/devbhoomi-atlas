# Promotion Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `~/Downloads/prep/promo/` — a complete, ready-to-send kit that puts
`https://www.parikramapath.com/` in front of HP competitive-exam aspirants on Telegram,
WhatsApp, Reddit, Quora and Facebook, with per-channel attribution in GA4.

**Architecture:** A flat folder of plain-text deliverables plus recorded media. Copy is
written per channel and per language; media is captured from the **live production site**
through Chrome automation at a phone viewport; every link carries a UTM tag so the existing
GA4 property attributes arrivals to the channel that produced them.

**Tech Stack:** Markdown, Chrome automation (`mcp__claude-in-chrome__*`) for capture,
`ffmpeg`/`sips` (or `magick` if present) for resizing and GIF/MP4 encoding, `curl` for
link verification. No code ships to the app.

## Global Constraints

These apply to every task. Violating any one of them is a task failure.

- **Nothing is written inside `hp-atlas/`.** That directory deploys wholesale to Vercel.
  All deliverables go in `~/Downloads/prep/promo/`. The only exceptions are this plan and
  its spec, which are already committed.
- **Canonical URL is `https://www.parikramapath.com/`** — with `www`, with `https`, with
  the trailing slash. Never the GitHub Pages URL, never the bare apex.
- **Every factual claim in copy must come from this table.** Do not round up, do not
  invent, do not write "hundreds of" where an exact number exists:

  | Claim | Exact value |
  |---|---|
  | Districts on the clickable map | 12 |
  | Princely hill states | 23 |
  | Rivers, with tributaries | 29 |
  | History records (events, battles, people, eras) | 108 |
  | Topic notes | 36 |
  | Places | 45 |
  | Map features (peaks, passes, lakes, glaciers, temples, monasteries) | 62 |
  | Past-paper questions | 448 |
  | Past-paper years | 2020, 2021, 2022, 2023, 2025 — **2024 was not available** |
  | Of those, Himachal-specific | 109 |
  | Practice MCQs (curated bank, separate from past papers) | 151 |
  | Exams named on the site | 9 — HPAS, Assistant Professor, Police Constable, Patwari, Panchayat Secretary, JOA (IT), Clerk, TET-JBT, TET-TGT |
  | Price | Free |
  | Signup | Not required to use it |
  | Offline | Yes — installable PWA, works with no signal after first visit |

- **Past papers are third-party transcriptions.** HPPSC publishes no past papers. Copy may
  say "past papers with the keyed answers"; it may **not** say "official" or "from HPPSC".
- **Voice per channel is fixed:** Hinglish (Roman script) for WhatsApp, Telegram and
  Facebook; plain English for Reddit and Quora. First person, an aspirant who built his own
  revision tool. Never third-person marketing voice.
- **No emoji spam.** At most one or two per post. HP exam groups are full of emoji-laden
  spam forwards and the copy must not look like one.
- **No claim about users, rankings, results or endorsements.** There are none yet.

---

### Task 1: Folder scaffold and UTM link sheet

**Files:**
- Create: `~/Downloads/prep/promo/links.md`
- Create (directories): `~/Downloads/prep/promo/copy/`, `~/Downloads/prep/promo/assets/`

**Interfaces:**
- Consumes: nothing
- Produces: the exact tagged URLs that every copy file in Tasks 3 and 4 must paste
  verbatim. No copy file may construct its own URL.

- [ ] **Step 1: Create the folder tree**

```bash
mkdir -p ~/Downloads/prep/promo/copy ~/Downloads/prep/promo/assets
```

- [ ] **Step 2: Verify the live site answers on the canonical URL before tagging it**

```bash
curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' -L https://www.parikramapath.com/
```

Expected: `200 https://www.parikramapath.com/`

- [ ] **Step 3: Write `links.md`**

The UTM scheme. `utm_source` is the platform, `utm_medium` distinguishes a post in a group
from a direct forward, `utm_campaign` is `launch` for all of them so the whole push can be
read as one row in GA4.

Query string goes **before** the hash — `?utm_source=x#/map/d-kangra` — because the app
routes on the hash and a parameter after `#` would be swallowed by the router.

```markdown
# Links

Paste these verbatim. Don't hand-edit the parameters — GA4 groups on exact strings, and a
typo'd source silently becomes its own channel.

| Channel | URL |
|---|---|
| WhatsApp group post | `https://www.parikramapath.com/?utm_source=whatsapp&utm_medium=group&utm_campaign=launch` |
| WhatsApp direct forward | `https://www.parikramapath.com/?utm_source=whatsapp&utm_medium=dm&utm_campaign=launch` |
| Telegram group | `https://www.parikramapath.com/?utm_source=telegram&utm_medium=group&utm_campaign=launch` |
| Telegram channel | `https://www.parikramapath.com/?utm_source=telegram&utm_medium=channel&utm_campaign=launch` |
| Facebook group | `https://www.parikramapath.com/?utm_source=facebook&utm_medium=group&utm_campaign=launch` |
| Reddit post | `https://www.parikramapath.com/?utm_source=reddit&utm_medium=post&utm_campaign=launch` |
| Reddit comment | `https://www.parikramapath.com/?utm_source=reddit&utm_medium=comment&utm_campaign=launch` |
| Quora answer | `https://www.parikramapath.com/?utm_source=quora&utm_medium=answer&utm_campaign=launch` |

## Deep links worth sending on their own

| What | URL |
|---|---|
| Past-paper bank | `https://www.parikramapath.com/?utm_source=telegram&utm_medium=group&utm_campaign=launch#/pyq` |
| Kangra district | `https://www.parikramapath.com/?utm_source=whatsapp&utm_medium=group&utm_campaign=launch#/map/d-kangra` |
| Which exams it covers | `https://www.parikramapath.com/exams/?utm_source=reddit&utm_medium=post&utm_campaign=launch` |

## Reading the results

GA4 property `G-BLQR6P5KCJ` → Reports → Acquisition → Traffic acquisition, then switch the
dimension to **Session source / medium**. Untagged WhatsApp and Telegram clicks arrive as
`(direct) / (none)` and are indistinguishable from someone typing the domain — which is the
entire reason these tags exist.
```

- [ ] **Step 4: Verify every URL in the sheet resolves**

```bash
grep -oE 'https://www\.parikramapath\.com/[^`|]*' ~/Downloads/prep/promo/links.md \
  | sed 's/#.*//' | sort -u \
  | while read -r u; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
```

Expected: every line starts `200`.

---

### Task 2: Capture the media from the live site

**Files:**
- Create: `~/Downloads/prep/promo/assets/map-tap.gif`
- Create: `~/Downloads/prep/promo/assets/map-tap.mp4`
- Create: `~/Downloads/prep/promo/assets/still-map.png`
- Create: `~/Downloads/prep/promo/assets/still-square.png`
- Create: `~/Downloads/prep/promo/assets/still-pyq.png`
- Create: `~/Downloads/prep/promo/assets/still-timeline.png`

**Interfaces:**
- Consumes: the live site
- Produces: filenames referenced by `README.md` (Task 6) and named in each copy file's
  "attach this" line.

- [ ] **Step 1: Open the live site in a fresh tab at a phone viewport**

Load Chrome tools in one call:
`select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__resize_window,mcp__claude-in-chrome__gif_creator,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_close_mcp`

Call `tabs_context_mcp` first. Create a **new** tab — never reuse one of the user's. Navigate
to `https://www.parikramapath.com/`. Resize to **390 × 844** (iPhone 14 logical size).

- [ ] **Step 2: Record the hero GIF**

Sequence, with extra frames captured at rest before and after each action so playback does
not jump:
1. Map view at rest, whole state visible — hold
2. Tap **Kangra**
3. Detail panel opens — hold on it
4. One short scroll inside the panel — hold

Save as `map-tap.gif` in the assets folder.

- [ ] **Step 3: Check the GIF against the WhatsApp ceiling**

```bash
ls -l ~/Downloads/prep/promo/assets/map-tap.gif | awk '{printf "%.1f MB\n", $5/1048576}'
```

Expected: **under 5.0 MB**. If it is over, reduce with fewer frames or a smaller palette:

```bash
ffmpeg -y -i ~/Downloads/prep/promo/assets/map-tap.gif -vf "fps=10,scale=390:-1:flags=lanczos" \
  -loop 0 ~/Downloads/prep/promo/assets/map-tap-small.gif \
  && mv ~/Downloads/prep/promo/assets/map-tap-small.gif ~/Downloads/prep/promo/assets/map-tap.gif
```

Re-check the size. Do not proceed until it is under 5 MB.

- [ ] **Step 4: Export the MP4**

```bash
ffmpeg -y -i ~/Downloads/prep/promo/assets/map-tap.gif \
  -movflags faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  ~/Downloads/prep/promo/assets/map-tap.mp4
```

Expected: exits 0, file exists, smaller than the GIF.

- [ ] **Step 5: Capture the stills**

- `still-map.png` — map view, **1280 × 720** window, whole state framed
- `still-pyq.png` — past-paper bank with a question visible, phone viewport
- `still-timeline.png` — timeline view, phone viewport
- `still-square.png` — crop of the map view to **1080 × 1080**:

```bash
sips -c 1080 1080 ~/Downloads/prep/promo/assets/still-map.png \
  --out ~/Downloads/prep/promo/assets/still-square.png
```

- [ ] **Step 6: Close the tab and verify every asset exists and is non-trivial**

```bash
ls -l ~/Downloads/prep/promo/assets/ | awk 'NR>1 && $5 < 10000 {print "TOO SMALL: " $9}'
ls ~/Downloads/prep/promo/assets/
```

Expected: no `TOO SMALL` lines; all six files listed.

---

### Task 3: Hinglish copy — WhatsApp, Telegram, Facebook

**Files:**
- Create: `~/Downloads/prep/promo/copy/whatsapp.md`
- Create: `~/Downloads/prep/promo/copy/telegram.md`
- Create: `~/Downloads/prep/promo/copy/facebook.md`

**Interfaces:**
- Consumes: exact URLs from `links.md` (Task 1), asset filenames from Task 2
- Produces: the posts the schedule in Task 6 sequences

Each file contains three blocks, each in a fenced code block so it copies cleanly on a
phone, each labelled with which asset to attach:

1. **One-line forward** — under 200 characters, survives being forwarded without context
2. **Group post** — 4–6 lines, leads with the map, names the numbers, link last
3. **The reply** — what to send when someone asks "ye kya hai / kisne banaya"

- [ ] **Step 1: Write `whatsapp.md`**

Voice anchor — the one-line forward sets the register for every other Hinglish block. Write
it exactly this plainly:

````markdown
## 1. One-line forward
*Attach: `assets/map-tap.gif`*

```
HP exams ke liye ek free site banayi hai — map pe koi bhi district tap karo, uski rivers,
passes, mandir, princely state sab ek jagah. 448 past paper questions bhi hain.
https://www.parikramapath.com/?utm_source=whatsapp&utm_medium=dm&utm_campaign=launch
```
````

Then the group post and the reply block, same register. The group post must name: the
clickable map (12 districts), 448 past-paper questions across 2020–2023 and 2025, that it
is free with no signup, and that it works offline once opened.

- [ ] **Step 2: Write `telegram.md`**

Same three blocks, plus a fourth: a **channel post** written to be re-posted by an admin
rather than by Avinash — same facts, no first-person story, because an admin re-posting
"maine banaya hai" reads wrong. Attach `map-tap.mp4` rather than the GIF; Telegram handles
video better.

- [ ] **Step 3: Write `facebook.md`**

HP exam groups on Facebook skew older and read longer posts. One block only: 8–10 lines,
Hinglish, the personal story first (preparing for HPAS, got tired of PDFs, built this),
facts second, link last. Attach `still-square.png` — Facebook crops wide images badly in
the feed.

- [ ] **Step 4: Verify no invented claims and correct URLs**

```bash
cd ~/Downloads/prep/promo
grep -oE 'https?://[^ )`]+' copy/*.md | grep -v 'parikramapath\.com' || echo "OK: no foreign links"
grep -rnoiE 'official|HPPSC ke (apne|official)|lakhs? of|thousands of|best (site|app)|guarantee' copy/ \
  && echo "FAIL: unsupported claim above" || echo "OK: no unsupported claims"
grep -c '448' copy/whatsapp.md copy/telegram.md copy/facebook.md
```

Expected: `OK: no foreign links`, `OK: no unsupported claims`, and each file mentions 448
at least once.

- [ ] **Step 5: Commit**

The promo folder is not a git repo and should not become one — it holds drafts, not code.
Skip the commit; the verification in Step 4 is the gate.

---

### Task 4: English copy — Reddit, Quora, admin DM

**Files:**
- Create: `~/Downloads/prep/promo/copy/reddit.md`
- Create: `~/Downloads/prep/promo/copy/quora.md`
- Create: `~/Downloads/prep/promo/copy/admin-dm.md`

**Interfaces:**
- Consumes: `links.md` URLs, asset filenames
- Produces: posts the schedule sequences in weeks 1–2

- [ ] **Step 1: Write `reddit.md`**

Reddit removes anything that reads as promotion. Three blocks:

1. **Self-post for r/HimachalPradesh** — titled as a thing made, not a thing sold
   (e.g. "I made an interactive map of HP's 12 districts and 23 princely states for exam
   revision — free, no signup"). Body: what it is, what's in it with exact numbers, what it
   is honestly missing, and the link at the bottom. An admission of a gap is what makes a
   Reddit post read as genuine.
2. **Self-post for an exam subreddit** — same content, framed around the 448 past-paper
   questions, since that is what an exam sub values.
3. **Comment reply** — 3 lines, for dropping into an existing thread where someone asks
   about HP GK preparation. Never top-level promotion.

Include a line at the top of the file, outside the code blocks, stating: check each
subreddit's rules before posting; most require a minimum account age and karma, and several
ban link posts from accounts with no comment history.

- [ ] **Step 2: Write `quora.md`**

An answer template for questions like "How do I prepare Himachal Pradesh GK for HPAS?".
Structure: answer the question **usefully first and at length** — what the HP GK syllabus
actually covers, which parts repeat in papers — then one closing paragraph mentioning the
site with its link. Quora collapses answers that are mostly a link. Include a short list of
the question shapes worth searching for.

- [ ] **Step 3: Write `admin-dm.md`**

Two versions — Hinglish for Telegram and WhatsApp admins, English for Facebook and for
anyone running a coaching page. Each: who you are, one line on what it is, explicit
acknowledgement that it is free and you are not selling anything, and an explicit ask —
permission to post once, or offer to let them post it themselves. Short. Three or four
lines. Admins read dozens of these.

- [ ] **Step 4: Verify**

```bash
cd ~/Downloads/prep/promo
grep -oE 'https?://[^ )`]+' copy/reddit.md copy/quora.md copy/admin-dm.md | grep -v 'parikramapath\.com' \
  || echo "OK: no foreign links"
grep -oE 'utm_source=[a-z]+' copy/reddit.md copy/quora.md | sort -u
```

Expected: `OK: no foreign links`; reddit.md shows `utm_source=reddit`, quora.md shows
`utm_source=quora`.

---

### Task 5: Target list

**Files:**
- Create: `~/Downloads/prep/promo/targets.md`

**Interfaces:**
- Consumes: nothing
- Produces: the named communities the schedule in Task 6 assigns to days

- [ ] **Step 1: Search for communities**

Use WebSearch for HP-exam communities on each platform — Telegram channels and groups for
HPAS / HPRCA / JOA IT / HP Police / HP TET, Facebook HP exam groups, and the relevant
subreddits. Also check whether the obvious subreddits exist and are active rather than
assuming.

- [ ] **Step 2: Write `targets.md` with a confidence mark on every row**

Columns: **Community · Platform · Approx size · Confidence · Promo rule · Notes**

Confidence values, used strictly:
- **verified** — the link was opened and the community exists and is active
- **name-only** — it exists, but size or activity is unconfirmed
- **uncertain** — it appeared in a search result and may be dead

A short honest list beats a long list that is half dead. If a platform yields nothing
verifiable, say so in the file rather than padding it.

- [ ] **Step 3: Verify every link in the file responds**

```bash
grep -oE 'https?://[^ )|]+' ~/Downloads/prep/promo/targets.md | sort -u \
  | while read -r u; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 10 "$u")" "$u"; done
```

Expected: rows marked **verified** return `200`. Any row whose link returns 404 or times out
must be downgraded to **uncertain** or removed.

- [ ] **Step 4: Verify no row lacks a confidence mark**

```bash
awk -F'|' '/^\|/ && !/Confidence/ && !/^\|[- :|]*\|$/ {if ($0 !~ /verified|name-only|uncertain/) print "UNMARKED: " $0}' \
  ~/Downloads/prep/promo/targets.md
```

Expected: no output.

---

### Task 6: Schedule and README

**Files:**
- Create: `~/Downloads/prep/promo/schedule.md`
- Create: `~/Downloads/prep/promo/README.md`

**Interfaces:**
- Consumes: every file from Tasks 1–5
- Produces: the entry point a reader opens first

- [ ] **Step 1: Write `schedule.md`**

Two weeks, day by day. Ordering rules that the schedule must obey:

- **Warm first.** Days 1–2 are groups Avinash is already a member of. No gatekeeper, and
  early feedback arrives before anything is said to strangers.
- **Admin DMs before group posts** everywhere else.
- **One channel per day where possible.** GA4 attributes by source, not by group — posting
  to WhatsApp and Telegram on the same day makes the two numbers hard to separate.
- **Reddit starts in week 2.** A new account posting a link is auto-removed regardless of
  quality; week 1 is ordinary commenting to build history. If the account is established,
  Reddit can move to day 3 — say so explicitly in the file as a conditional.
- **Quora is ongoing, not a day.** Answer questions as they are found.
- **A check-in on day 7 and day 14:** open GA4 Traffic acquisition, record sessions by
  source/medium, and note which channel actually delivered.

- [ ] **Step 2: Write `README.md`**

The entry point. It must answer, in order: what this folder is, what to do first (post to
your own warm groups today, using `copy/whatsapp.md` block 1 with `assets/map-tap.gif`
attached), what every file is for, and how to read the results in GA4.

Include the fact table from the Global Constraints section verbatim, under the heading
"Claims you can make" — so that any future post written by hand stays inside the truth.

- [ ] **Step 3: Verify every file the README references exists**

```bash
cd ~/Downloads/prep/promo
grep -oE '`(copy|assets)/[a-z0-9.-]+`' README.md schedule.md | tr -d '`' | cut -d: -f2 | sort -u \
  | while read -r f; do [ -e "$f" ] && echo "OK $f" || echo "MISSING $f"; done
```

Expected: no `MISSING` lines.

- [ ] **Step 4: Final tree check**

```bash
find ~/Downloads/prep/promo -type f | sort
```

Expected — exactly these, all non-empty:

```
README.md
assets/map-tap.gif
assets/map-tap.mp4
assets/still-map.png
assets/still-pyq.png
assets/still-square.png
assets/still-timeline.png
copy/admin-dm.md
copy/facebook.md
copy/quora.md
copy/reddit.md
copy/telegram.md
copy/whatsapp.md
links.md
schedule.md
targets.md
```

- [ ] **Step 5: Commit the plan's completion note**

Only `hp-atlas/` is a git repo, and no app file changed. Nothing to commit. The tree check
in Step 4 is the completion gate.
