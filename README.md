# Parikrama Path

An interactive revision atlas for the **Himachal Pradesh** portion of the **HPPSC HPAS** syllabus —
a clickable map of the 12 districts and the princely hill states, a timeline from prehistory to
statehood, battles and treaties, topic notes, generated a question bank.

Plain static files. No build step, no framework, no backend.

**Live:** <https://devateasyq.github.io/devbhoomi-atlas/>

**Domain:** parikramapath.com *(not yet purchased or pointed here)*

---

## Run it locally

Any static server will do:

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening `index.html` straight from the filesystem also works, except for the service worker
(offline caching), which browsers only enable over `http(s)` or `localhost`.

## Host it

The whole directory is static, so it deploys as-is to any static host:

| Host | How |
|---|---|
| **Vercel** | `npx vercel --prod` in this directory |
| **Netlify** | drag this folder onto app.netlify.com, or `npx netlify deploy --prod --dir=.` |
| **GitHub Pages** | push this directory to a repo, then Settings → Pages → deploy from branch |
| **Cloudflare Pages** | connect the repo, leave the build command empty, output directory `/` |
| **Any web server** | copy the directory into the document root |

Nothing is origin-specific — relative paths throughout, so it works from a subdirectory
(`example.com/atlas/`) as well as from a domain root.

## What it does

- **Deep links.** The URL tracks what you are reading: `#/map/d-kangra`, `#/topics/t-gorkha`.
  The link button in the detail panel copies a direct URL to that record, so a single fact
  can be sent to a study group.
- **Installable and offline.** A web app manifest plus `sw.js` cache every asset on first visit,
  so it works on a phone with no signal. "Add to Home Screen" gives it an icon and no browser chrome.
- **Rivers on the map.** 29 named rivers — the five major systems plus the Chandra and Bhaga
  headwaters and 22 tributaries — drawn from OpenStreetMap centrelines, projected through the same
  transform as the districts and clipped to the state outline. Each is labelled on the map and
  clicking one opens its own record: Sanskrit, Vedic and Greek names, source, entry and exit points,
  length in the state, tributaries with their junctions, and the projects on it.
- **The legend is the map's only control.** Every kind of marker — hill-state seats, peaks,
  passes, lakes, glaciers, temples and monasteries, battle and movement sites — plus the two
  river tiers is a permanent legend layer, all visible by default. (The district boundaries are
  the map itself, not an overlay, so they are not in the legend and cannot be hidden.) The legend
  controls layer visibility, Plotly-style: single click a row to hide that layer, double click to
  isolate it (hide every other layer), and double click the isolated row again to restore the lot.
  "Show all" resets everything in one click. The hidden set persists across visits in
  `localStorage` under `hpatlas:mapoff`.
- **Question trends.** A Trends view computes, from the past-paper bank itself, how many Himachal
  questions each paper carries, which subjects they come from, how each subject moves year to year,
  and which topic notes are examined most — every bar links back into the atlas.
- **Past papers.** 448 questions from the HPAS prelims papers of 2020, 2021, 2022, 2023 and 2025,
  filterable by year, with a *Himachal only* toggle that narrows them to the 109 state-specific ones.
  Where a question maps to a note in the atlas, the explanation links straight to it.
- **Progress is yours.** Quiz and past-paper results, the facts you have seen, how well you said
  you know each one, your notes and your streak live in `localStorage` under the `hpatlas:`
  prefix, in separate buckets. Signed out, they stay on the device. Signed in, they also sync to
  a Firestore document that `firestore.rules` makes readable and writable by that account alone,
  so the same progress follows you between devices. Cards you write in Rounds sync too, but
  through their own collection rather than that document — see [Rounds](#rounds) and
  [Accounts and sync](#accounts-and-sync-optional). Theme, hidden map layers and the legend's
  state are device preferences and never sync. Everything can be exported, and the account and
  its data deleted, from the profile. The page does load Vercel Analytics
  (`cdn.vercel-insights.com`), which counts page views.

## Structure

```
index.html                  markup shell and asset links
app/tokens.css              colour, type and spacing tokens, both themes
app/layout.css              app shell and responsive rules
app/components.css          map, timeline, cards, panel, revise, search
app/app.js                  the application
app/logo.js                 the brand mark, drawn from theme tokens
app/mapkit.js               map glyphs, label placement and the legend's toggle/isolate reducers
app/rounds.js               Rounds — fact extraction from the exam hooks, and the feed's ordering
app/trends.js               the Trends view — all figures computed from D.pyq at run time
data/geo.js                 map geometry: district paths, centroids, 135 place markers, 29 rivers
data/places.js              D.eras, D.districts, D.states
data/history.js             D.events, D.battles, D.people
data/topics.js              D.topics
data/rivers.js              D.rivers
data/features.js            D.features — peaks, passes, lakes and glaciers
data/quiz.js                D.quiz
data/pyq.js                 D.pyq — the past-paper bank
sw.js                       offline cache
manifest.webmanifest        PWA manifest
```

Load order matters: `data/places.js` creates the `D` object, so it must come before the
other data files. `app/app.js` must come last.

## Rounds

A vertical feed of single prelims facts, one per screen, moved by a flick — the app's
one passive mode, for the ninety seconds that do not justify opening a topic note.

The facts are **not authored**. They are extracted at run time from the `Exam hook` note
that most records already carry, split on the `·` separator, then filtered: atoms shorter
than 8 characters are dropped (`Kol Dam — "NTPC"` is not a fact), atoms that merely
restate their own record's name are dropped (`Dharmsura (White Sail) — "also called White
Sail"` says nothing the card's own headline does not), and atoms over 120 characters are
sentence-split, because a few hooks use no separator at all and would otherwise arrive as
one 185-character card covering two districts. That yields about 265 facts today, and the
pool grows on its own as records gain hooks.

Ordering is unseen-first, shuffled; facts already seen sink to the back, oldest-seen
first, so exhausting the pool turns the feed into spaced repetition rather than a wall.
There is no completion state and no counter, by design. The seen set persists at
`hpatlas:seen`.

Each fact's id is a hash of its own text (`recordId#<hash>`), not its position in the
hook — reordering a hook's atoms, or fixing a typo in one, used to shift every id after
it onto a different fact, which could silently misattribute a `seen` mark or, now, a
confidence rating to the wrong card. **Switching to a text hash was a one-time, paid
cost, stated plainly: every existing id changed, so `hpatlas:seen` was pruned of
everything it no longer recognised the moment this shipped, and the facts-seen count
reset to zero for whoever had one.** It rebuilds itself from here exactly as it always
has; nothing about how facts are seen or ordered changed, only how they are named.

Tapping a card opens the record it came from — the feed is a way into the atlas, not a
dead end.

**Two taps, and neither is required.** Every card carries *Got it* and *Again*.
*Got it* sends the card behind every other card in the feed — you have said you know
it, so it waits. *Again* re-queues it within the next five cards, then, once you have
seen it again, it drops back into the ordinary seen rotation like any other fact.
Pressing the button a card already holds clears it — that is the only undo, and it
means there is no separate "clear" control. Scrolling past a card without tapping
either leaves it exactly where the unseen/seen ordering above has always put it: the
two taps add a leading and a trailing tier to that order, they do not replace it.
Ratings persist at `hpatlas:conf` and, signed in, sync the same way the rest of your
progress does.

**Add your own card.** The **+** above the feed opens a plain textarea, capped at 400
characters with a live counter, and an optional tag to one record. Save it and it is a
card, not a note: it joins the Rounds feed exactly like an extracted fact, takes the
same *Got it* / *Again* taps, and — when tagged — also shows up under "Your cards" on
that record's own panel. Up to 500 can exist at once; past that the composer refuses
new ones rather than quietly dropping old ones. A post is always private — there is no
sharing or public posting in this build. Cards live in their own `posts/{postId}`
Firestore collection rather than as a field in the per-account document the rest of
your progress shares, because that document has a hard 1 MB limit already shared by
notes and everything else described in
[Accounts and sync](#accounts-and-sync-optional) — 500 cards of up to 400 characters
is exactly the kind of unbounded field that limit exists to keep out. **The `posts`
collection's rules must be published before any card can sync at all** — see
[Accounts and sync](#accounts-and-sync-optional); until then, cards you write stay
local to the device that wrote them. Deleting a card also drops a local tombstone
(`hpatlas:postgone`), so a card removed on one device cannot be brought back by a
sync that still has an older server copy of it.

**Known gap:** all 16 battle records and all 24 people records carry no exam hook, so
Sansar Chand, the Gurkha wars and the Praja Mandal leaders never surface in the feed.
Adding hooks to those records is the highest-value content work available; it needs no
code change.

## Notes, streak and your profile

- **One note per record.** Every record's panel carries a plain-text note at the foot,
  capped at 1,000 characters with a live counter that stops accepting input at the cap
  rather than silently truncating on save. The cap exists because notes share the same
  Firestore document as the rest of your synced progress, and that document has a hard
  1 MB limit — an unbounded note is the one field a person could grow large enough to
  hit it, and doing so would reject the *whole* write, silently breaking quiz and
  past-paper sync along with the note. There is no public/private toggle: a note is
  always just yours.
- **A daily streak, counted generously.** A day qualifies the moment you clear *any one*
  of four thresholds — 20 facts scrolled in Rounds, 5 quiz answers, 5 past-paper answers,
  or notes written on 3 distinct records — so a bus-ride Rounds session and a sit-down past paper
  both count as revision. Days are your device's local calendar days, not a rolling
  24 hours and not UTC. You start with one grace day, which absorbs a
  one-day gap without breaking the run and then has to be earned back — it recharges on
  every 7th consecutive qualifying day. Miss two days in a row with no grace in hand and
  the run restarts at 1 — but your best-ever run is never reduced. Across two signed-in
  devices the streak merges generously: every field takes whichever side is ahead rather
  than whichever synced most recently. The profile draws three of the four routes as
  concentric rings — facts read outermost at 20, quiz next at 5, notes written innermost
  at 3 — so the ring with the most ground to cover has the most distance to travel. Past
  papers still qualify a day but have no ring; the count sits beside them in words.
  Beneath today sits a strip of the last seven days, the same three rings drawn small,
  so a run reads as a shape rather than as a number you have to take on trust. A day
  with no work still draws, empty, rather than shortening the row. Merely *opening* a
  record no longer counts towards a day — writing something down does.
- **Your profile, at `#/profile`.** Two ways in: the account button in the header, and
  a *Profile* tab in the phone bar (which is five tabs now, not four). It is in neither
  the rail nor the Overview hub — the hub lists the syllabus, and the profile is yours
  rather than part of it. The
  profile shows who you are signed in as (or that you are not) with a sign-out button,
  today's three rings, the current and best streak, quiz accuracy, past papers
  attempted, and an index of every note you have written, each linking back to its
  record.
- **Export and delete.** The profile can export everything the app holds about you —
  notes, streak and all synced progress — as one JSON file, and, for a signed-in account,
  delete the account and its stored data outright. Both are described in
  [Accounts and sync](#accounts-and-sync-optional) below.

## Editing the content

Everything is one object. A record looks like this:

```js
{
  id: "s-chamba",            // unique; prefix by type: d- s- ev- b- p- t-
  name: "Chamba",
  founded: "c. 550 CE",
  blocks: [                  // rendered in order
    ["p", "Paragraph with <b>markup</b>."],
    ["h", "A sub-heading"],
    ["ul", ["List item", "Another"]],
    ["note", "Exam hook", "The line worth memorising."],
    ["note", "Disputed", "Sources disagree; here is why."]
  ],
  rel: ["d-chamba", "t-temples", "ev-chamba-founded"]
}
```

Add a record to the right array and it appears automatically in its view, in search, in the
Rounds feed and in the "Connected to" panel of anything that links to it. **Wire `rel` in both
directions** — the link is not inferred.

A `["note", ...]` whose label contains *disputed*, *correction* or *check* renders in the
vermilion "disputed" style rather than the gold "exam hook" style.

### After editing

- Bump `CACHE` in `sw.js` (e.g. `-v2`), or returning visitors keep the cached old version.
- Check for broken links — every `rel` entry must name a real `id`:

```sh
node -e '
  const fs=require("fs"),vm=require("vm"),ctx={};
  ["geo","places","history","topics","quiz"].forEach(f=>
    vm.runInNewContext(fs.readFileSync("data/"+f+".js","utf8"),ctx));
  const ids=new Set();
  ["districts","states","events","battles","people","topics"].forEach(k=>ctx.D[k].forEach(r=>ids.add(r.id)));
  let bad=0;
  ["districts","states","events","battles","people","topics"].forEach(k=>ctx.D[k].forEach(r=>
    (r.rel||[]).forEach(x=>{ if(!ids.has(x)){ console.log("dangling:",r.id,"->",x); bad++; } })));
  console.log(ids.size,"records,",bad,"dangling links");
'
```

## A note on the river labels

Labels ride a **straight chord** through the flattest stretch of each river, not the river's own
polyline. Following the real curve looked better in principle but broke in practice: an SVG
`textPath` places glyphs by advance along the path, so wherever the line doubles back the letters
collide and drop — "Parvati" rendered as "P avti". The chord is chosen by scoring candidate windows
on tilt and on how far the river strays from the chord, so the label still sits along its river.

## On the Trends view

Nothing there is hardcoded: `trendStats()` recomputes every figure from `D.pyq` on each render, so
adding or correcting questions updates the charts. The series palette (`--s1`..`--s6` in
`tokens.css`) was validated for colourblind separation and contrast against both the light and dark
chart surfaces; if you change those hues, re-validate rather than eyeball them, and keep the slot
order — the ordering is what keeps adjacent pairs distinguishable.

Counts are shown rather than percentages, deliberately: question recovery was incomplete for 2021,
and the losses fell mostly on non-Himachal sections, so a percentage would overstate the Himachal
share. Papers under 90% recovery are marked with an asterisk.

## On the previous-year questions

HPPSC does not publish past papers on its own website, so `data/pyq.js` is transcribed from
published solved papers. The correct option is the one the published answer key marks, taken from
the source markup rather than inferred. A sample was checked against independent sources, but these
are third-party transcriptions: **if an answer looks wrong, verify it before memorising it.**

2024 was not available from the source used, so that paper is absent rather than skipped. Questions
are tagged `hp: 1` when they are Himachal-specific, and carry a `t` field linking to the relevant
topic note where one exists.

## On accuracy

Compiled from the HPPSC syllabus, Himachal government portals, Census 2011 and the HP Economic
Survey. High-frequency exam facts were cross-checked against more than one source.

Where sources genuinely disagree — the number of princely states merged in 1948, the count of
wildlife sanctuaries, several Praja Mandal founding years — the record says so instead of quietly
picking a value. Economy figures change every year, so those pages teach the structure and tell you
to take current numbers from the latest Economic Survey.

Map geometry is real: GADM district boundaries for Himachal Pradesh, equirectangular-projected at
the state's mid-latitude and Douglas–Peucker simplified. Place markers are lat/long run through the
same transform.

## Accounts and sync (optional)

Signing in is entirely optional. **The app is fully usable, with every view and every
feature, from the moment you open it — nothing is gated behind an account.** Sign-in
exists for one reason: to carry your progress between devices.

- **Sign-in itself needs the Firebase project configured; the app does not.**
  `app/firebase-config.js` ships with four empty strings (`apiKey`, `authDomain`,
  `projectId`, `appId`). Left empty, `FB_READY` evaluates to `false` and the actual
  sign-in affordances — the Google and email-link buttons, and the profile's "Sign in
  to sync" — never render, so nothing offers a sign-in that cannot work. The header
  account button itself is always visible regardless: it opens your profile (see
  [Notes, streak and your profile](#notes-streak-and-your-profile)) whether or not
  Firebase is configured, since the streak and notes it shows are local and useful
  either way. To turn sign-in on, create a Firebase project, enable the Google and
  Email link providers, and paste the four web-app keys from Project settings → Your
  apps → Web app into that file.
- **`firestore.rules` must be published before any account is created — and
  republished now.** Firebase Database → Rules → paste the contents of
  `firestore.rules` → Publish. Firebase's own default rules let any signed-in user
  read every document in the project, including other people's progress — publishing
  the rules in this repo, which restrict each document at `users/{uid}` to that same
  `uid` and each document at `posts/{postId}` to the `uid` its own `author` field
  names, is not optional. **This sub-project added the `posts` collection and its
  rule; until the repo owner re-publishes the updated file, cards written in Rounds
  do not sync at all** — they still work, but stay local to the device that wrote
  them, the same as being signed out. Nothing else in the database is reachable from
  a client at all.
- **What syncs.** Six keys in the per-account document, all progress, none of it
  identifying beyond the account itself: `seen` (the Rounds spaced-repetition set),
  `quiz` and `pyq` (per-question answers with a timestamp, so the merge on sign-in
  can take the most recent answer), `conf` (Got it / Again per fact, the same
  timestamped shape and most-recent-wins merge as quiz and pyq), `notes` (your
  per-record notes, most-recent-wins per note), and `streak` (the daily streak,
  merged so every field takes whichever device is ahead). Merging is generous
  throughout — signing in on a second device adds that device's progress to the
  account rather than replacing either side, and no field is ever reduced by a sync.
  **Cards you write in Rounds are not part of this document** — see the next bullet.
- **Posts are a separate collection, not a seventh key.** Cards you write in Rounds
  are capped at 400 characters and 500 total, and the per-account document already
  carries notes and streak history against its hard 1 MB ceiling — 500 cards would be
  the easiest way yet to blow past it, and doing so silently breaks every other kind
  of sync at once, the same reasoning the note cap rests on. Each card is instead its
  own document at `posts/{postId}`, keyed to its author, and merges the same way
  progress does: newest write wins per card. A card deleted on one device leaves a
  local tombstone (`hpatlas:postgone`) so a slower sync from another device cannot
  bring it back. Every post is created `visibility: "private"` and stays that way;
  nothing in this build ever reads, or offers to read, someone else's card.
- **What never syncs.** Theme, the map legend's hidden-layer set, and any other device
  preference stay in `localStorage` on that device only. They are not sent anywhere and
  are not part of the merge.
- **Export and delete.** The profile can export everything above as one JSON file at
  any time, signed in or not. A signed-in account can also be deleted outright from the
  profile, behind a typed confirmation — this removes the Firestore document and the
  Firebase Auth user, so the account and everything synced to it are gone for good. It
  recovers on its own from Firebase's `auth/requires-recent-login` by asking you to
  sign in again before retrying, rather than failing with a cryptic error.
- **The offline, single-file build (`hp-revision.html`) is guest-only.** It runs from
  `file://`, where Firebase's popup and redirect sign-in flows do not work, so the build
  forces `FB_READY` to `false`, meaning none of the sign-in affordances — including the
  profile's sign-in card — ever appear in it, regardless of whether
  `app/firebase-config.js` has been filled in. The profile itself, the streak, notes and
  the Rounds composer all still work there, entirely locally — a card written in this
  build stays on that device and never syncs, same as every other kind of progress here.
  Use the hosted copy (or a local static server) to sign in; the downloaded file is for
  offline guest revision.

### Privacy

If you sign in, Firebase Auth holds your **email address** and **display name** (from
Google, or from the email link you used) separately, to know it's you. The Firestore
document scoped to your account stores only the six progress keys above — `seen`,
`quiz`, `pyq`, `conf`, `notes` and `streak` — and nothing else. Cards you write in
Rounds are stored separately, one document per card in the `posts` collection,
readable only by the account that wrote it. No analytics, no tracking, no
third-party sharing.

**You can leave at any time.** The profile's export gives you everything the app holds
about you as one file, and its delete control removes your account, its Firestore
document and its Firebase Auth user outright. There is no need to ask anyone to do it
by hand.

## Licence

Content is compiled from public sources for personal exam preparation. Reuse freely; verify before
you rely on any single figure in an examination.

## Image credits

Photographs behind the Rounds cards, all freely licensed. Subject-specific
images are used where Commons has one; the rest fall back to a per-kind image.

- **Rohtang La** — Timothy A. Gonsa, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Snow_Rohtang_Range_Manali_May24_A7CR_00128.jpg>
- **Baralacha La** — Tagooty, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Baralacha_La_Lahaul_D32_13255.jpg>
- **Jalori Pass** — Manish57335, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Camping_at_Jalori_pass.jpg>
- **Sach Pass** — Sunilbanger, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Close_view_of_pir_panjal_from_sach_pass_chamba.jpg>
- **Hamta Pass** — Dakshchadha1, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Hamta_pass,_Himalayas.jpg>
- **Shipki La** — Rakeshk9548, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Shipki_la.jpg>
- **Renuka Lake** — Pushkar Prashar, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Renuka_Lake_Sirmaur.jpg>
- **Rewalsar (Tso Pema)** — Gannu03, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Rewalsar_lake_01.jpg>
- **Prashar Lake** — Navneet Sharma, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Parashar_Lake_September_2020.jpg>
- **Khajjiar Lake** — Wittystef, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Khajjiar_lake.jpg>
- **Gobind Sagar** — Gurlal Maan, CC BY-SA 3.0 — <https://commons.wikimedia.org/wiki/File:Boats_in_Gobind_Sagar,_Himachal_Pardesh.jpg>
- **Suraj Tal** — Timothy Gonsalves, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Suraj_Tal_Lahaul_Himachal_Jul16_D32_13220.jpg>
- **Nako Lake** — Timothy A. Gonsa, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Nako_Lake_Kinnaur_Himachal_Jun18_D72_6798.jpg>
- **Manimahesh Lake** — NaturenHuman, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Mt._Kailash_Manimahesh_Lake.jpg>
- **Reo Purgyil** — Arashdeep, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Peaks_of_Mt_Leo_Purgyil_and_Reo_Purgyil.jpg>
- **Hanuman Tibba** — Biswarup Ganguly, CC BY 3.0 — <https://commons.wikimedia.org/wiki/File:Mount_Hanuman_Tibba_-_Solang_Valley_-_Kullu_2014-05-10_2594.JPG>
- **Churdhar** — UnpetitproleX, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Churdhar_WS,_view_towards_Tons_valley,_Himachal_Pradesh,_India.jpg>
- **Manimahesh Kailash** — Ramkrish1in31, CC BY-SA 3.0 — <https://commons.wikimedia.org/wiki/File:ManiMahesh_Kailash.JPG>
- **Sutlej** — Darshan Simha, CC BY 2.0 — <https://commons.wikimedia.org/wiki/File:A_view_of_Sutlej_river_Himachal_Pradesh_India_2014.jpg>
- **Ravi** — Ms Sarah Welch, CC0 — <https://commons.wikimedia.org/wiki/File:Chamba_city_and_river_Ravi,_Himachal_Pradesh_India.jpg>
- **Chenab** — Timothy A. Gonsa, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Villages_Chenab_Udaipur_Lahaul_Himachal_Jul19_D72_10963.jpg>
- **Yamuna** — Abhi713, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Yamuna_river_beside_paonta_sahib_gurudwara_in_himachal_pradesh.jpg>
- **Lahaul and Spiti** — Adarsh Patel, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Lord_Vishnu_Taal_(Lake),_Lahaul_and_Spiti_Dist.,_HP,_India,_D35_7480nx-01_01.jpg>
- **Buddhist Monasteries** — Timothy A. Gonsalves, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:TaboMonastery-Tabo-Spiti-Himachal-D72_6827.jpg>
- **Sirmaur** — Ramantharki, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Village_Dada_khelu,Mahipur,Nahan,district_Sirmour,_himachal_pradesh.jpg>

Per-kind fallbacks:

- **Kunzum La** (pass) — Gerd Eichmann, CC BY 4.0 — <https://commons.wikimedia.org/wiki/File:Kunzum_La-19a-pass_height-Berge-2016-gje.jpg>
- **Chandra Taal** (lake) — Adarsh Patel, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Chandra_Taal_(Lake),_HP,_India,_D35_7333_nx01.jpg>
- **Bara Shigri, 1863** (glacier) — Philip Henry Egerton, CC0 — <https://commons.wikimedia.org/wiki/File:Ice_Cave_at_the_Bara_Shigri_Terminus,_1863.jpg>
- **Kinner Kailash** (peak) — Anubhav Agarwal, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Kinner_Kailash_Mountain_Range_(edited).jpg>
- **The Beas at Kullu** (river) — Vyacheslav Argenberg, CC BY 4.0 — <https://commons.wikimedia.org/wiki/File:Kullu_Valley,_Beas_River_near_Manali,_India.jpg>
- **Kangra Fort** (state) — Monika rana, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Ruined_fort_of_kangra,_kangra,_H.P.jpg>
- **The Dhauladhar** (district) — Metanish, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Dhauladhar_layers.JPG>
- **Bhimakali, Sarahan** (topic) — Gerd Eichmann, CC BY-SA 4.0 — <https://commons.wikimedia.org/wiki/File:Sarahan-Bhimakali-06-gje.jpg>
- **Viceregal Lodge, Shimla** (event) — Aloofmanish, CC0 — <https://commons.wikimedia.org/wiki/File:Viceregal_Lodge_Shimla.jpg>
