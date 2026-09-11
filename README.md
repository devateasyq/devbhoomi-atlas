# Parikrama Path

An interactive revision atlas for the **Himachal Pradesh** portion of the **HPPSC HPAS** syllabus —
a clickable map of the 12 districts and the princely hill states, a timeline from prehistory to
statehood, battles and treaties, topic notes, generated flashcards and a question bank.

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
- **A toggleable legend.** The map legend controls layer visibility, Plotly-style: single click a
  row to hide that layer, double click to isolate it (hide every other layer), and double click the
  isolated row again to restore the lot. "Show all" resets everything in one click. The hidden set
  persists across visits in `localStorage` under `hpatlas:mapoff`.
- **Question trends.** A Trends view computes, from the past-paper bank itself, how many Himachal
  questions each paper carries, which subjects they come from, how each subject moves year to year,
  and which topic notes are examined most — every bar links back into the atlas.
- **Past papers.** 448 questions from the HPAS prelims papers of 2020, 2021, 2022, 2023 and 2025,
  filterable by year, with a *Himachal only* toggle that narrows them to the 109 state-specific ones.
  Where a question maps to a note in the atlas, the explanation links straight to it.
- **Progress is local.** Quiz and past-paper results live in `localStorage` under the `hpatlas:`
  prefix, in separate buckets. Nothing is uploaded, and there is no analytics or tracking.

## Structure

```
index.html                  markup shell and asset links
app/tokens.css              colour, type and spacing tokens, both themes
app/layout.css              app shell and responsive rules
app/components.css          map, timeline, cards, panel, revise, search
app/app.js                  the application
app/logo.js                 the brand mark, drawn from theme tokens
app/mapkit.js               map glyphs, label placement and the legend's toggle/isolate reducers
app/trends.js               the Trends view — all figures computed from D.pyq at run time
data/geo.js                 map geometry: district paths, centroids, 107 place markers, 29 rivers
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
flashcard deck and in the "Connected to" panel of anything that links to it. **Wire `rel` in both
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

## Licence

Content is compiled from public sources for personal exam preparation. Reuse freely; verify before
you rely on any single figure in an examination.
