# Clickable peaks, passes, lakes and glaciers on the map

**Date:** 2026-09-11
**Status:** approved, ready for planning

## Problem

`D.rivers` gives each watercourse a full record: a facts table, prose blocks, a locator
minimap, and a click target on the map. The other physical features do not have this.
Peaks (12), passes (18) and lakes (20) exist only as `MAP.places` markers; clicking one
opens the shared topic note (`t-peaks` / `t-passes` / `t-lakes`), so eighteen different
passes all lead to the same page. Glaciers have no marker at all — they are a bullet
list inside `t-peaks`.

Make all four clickable to their own record, at the depth rivers already have.

## Scope

- ~62 new records: 12 peaks, 18 passes, 20 lakes, 12 glaciers.
- 12 new glacier markers (new geometry).
- Distinct marker glyph per kind, replacing the uniform dot.
- Legend becomes the visibility control (click toggles, double click isolates).
- ~160 generated flashcards (124 from features, ~35 from the 7 rivers), closing the existing rivers gap.

Out of scope: changing district geometry, the river centrelines, or the map mode tabs.

## Data model

New file `data/features.js`, one array `D.features`. Each record carries `k`
(`peak` | `pass` | `lake` | `glacier`) and `pid`, the key into `MAP.places` — geometry
and record are the same entity seen two ways, as rivers already are.

```js
{id:"ps-shipkila", k:"pass", pid:"shipkila", name:"Shipki La", alt:"3,930 m",
 range:"Zanskar range", connects:"Kinnaur (HP) ⇄ Tibet (China)",
 districts:["d-kinnaur"], status:"Motorable; designated border-trade point",
 blocks:[["p","..."],["p","..."],["note","Exam hook","..."]],
 rel:["t-passes","Sutlej","d-kinnaur"]}
```

Ids follow the existing namespacing: `pk-` peaks, `ps-` passes, `lk-` lakes, `gl-`
glaciers. They register in `IDX` as **four distinct kinds**, not one lumped kind, so
each gets its own legend colour, its own row in the "Connected to" grouping, and its
own label in search results. `KINDS` and `KIND_ORDER` in `app/app.js` extend
accordingly; suggested order is district, river, peak, pass, lake, glacier, state,
person, event, battle, topic.

### Fact rows per kind

| Kind | Rows |
|---|---|
| Peak | height, range, district, also called, first ascent, claim to fame |
| Pass | height, range, connects, district, status, on the route to |
| Lake | type (natural/reservoir), altitude, district, on river, area, sacred to, Ramsar year |
| Glacier | length/area, valley and basin, district, feeds, retreat status |

Driven by a `FEATURE_FACTS[kind]` table of `[label, field]` pairs so each kind renders
only its own rows.

### Content depth

Every record gets 2–3 prose paragraphs plus an exam-hook note, at the depth of the
existing Sutlej and Beas entries. Not fact-cards — the prose is where the mnemonic
hooks live (Shipki La is both a trade route and the Sutlej's gate; Kugti is the Gaddi
migration route).

### New geometry

12 glaciers join `MAP.places` with `k:"glacier"`: Bara Shigri, Chandra Nahan, Beas
Kund, Parvati, Sonapani, Gangstang, Perad, Dudhon, Bhadal, Lady of Keylong, Miyar, Pin.

Positions come from real coordinates through the map's own projection, recovered by
least-squares fit over the 123 existing placed markers:

```
x = 292.5745 * lng - 22112.4202
y = -344.3249 * lat + 11450.7708
```

Max residual is 0.068 units on a 1000-unit-wide map, i.e. the projection is exact.
Each glacier entry stores `lat`/`lng` alongside `x`/`y`, matching every existing place.

## Map rendering

### Glyphs

One `mkGlyph(kind)` helper returns the shape markup. All glyphs fit an ~11-unit box
centred on the origin, so the existing counter-scaling in `applyZoom()`
(`translate(x,y) scale(1/k)`) keeps working untouched.

| Kind | Glyph |
|---|---|
| Peak | filled triangle, apex up |
| Pass | bowtie / hourglass — a saddle between two summits |
| Lake | teardrop |
| Glacier | hexagon |
| Hill state seat | circle (unchanged) |
| Temple | pentagon |
| Battle site | diamond |

Each glyph carries a thin paper-coloured stroke so overlapping markers stay separable.

### Label de-collision

Every marker is always drawn and always clickable. Labels are not: 62 text labels at
zoom 1 overprint into mush.

Walk markers in priority order (Reo Purgyil before Mulkila), measure each label's box,
and draw it only if it does not overlap a box already placed. Recompute on every zoom
change and after any legend toggle — hiding 20 lakes frees room for peak labels.

Nothing is lost: the marker is still there, hover still shows the tooltip, and
suppressed labels progressively appear as you zoom in.

## Legend as the visibility control

Legend rows become buttons. The separate `#rivtog` button is removed and folds in as
two rows.

- **Single click** a row → hide that category. Click again → restore.
- **Double click** a row → hide everything else. Double click the same row again →
  restore all.
- Hidden rows dim, show a hollow swatch, and carry `aria-pressed="false"`.
- A **Show all** reset appears whenever anything is hidden. This is required, not
  optional: the hidden set persists to `localStorage` (`hpatlas:mapoff`) and would
  otherwise be a mystery on the next visit.
- Keyboard: <kbd>Enter</kbd> toggles, <kbd>Shift</kbd>+<kbd>Enter</kbd> isolates —
  a double click is not keyboard-reachable.

**Click vs. double click.** A double click fires two `click` events first, so the
single-click action defers ~250 ms and cancels if the second click lands. Same approach
Plotly uses; the cost is a barely perceptible lag on single click.

**Rivers split into two rows.** "Major river" and "Tributary" become independently
togglable, which yields a useful revision view: hide tributaries, keep the five systems.
The existing `hpatlas:rivers` boolean migrates into the new hidden set.

Districts stay unfiltered — they are the base map, not an overlay.

Toggling sets a CSS class on the marker group rather than re-rendering, so it is
instant. Label de-collision reruns afterwards.

## Panel, links, search, cards

**Marker to record.** `placeTarget()` gains a reverse index built from `D.features`
(pid → record id). The 62 markers open their own record; any place without one still
falls back to its topic note, so nothing regresses.

**Locator.** `locatorFor()` already handles `r.seat || r.place` for the marker
position; it needs `|| r.pid`. The district highlight already derives from `rel`.

**Navigation.** `goTo()` sets `S.mapMode = "geo"` for the four new kinds, as it already
does for states and districts.

**Bidirectional links, generated not hand-typed.** The project rule is that `rel` must
be wired in both directions, but pasting 62 ids into `t-passes` / `t-peaks` / `t-lakes`
by hand is exactly the drift risk the app exists to avoid. The reverse direction is
therefore generated: `t-passes` grows an "All 18 passes" chip block derived from
`D.features`, and every district record grows a "Features in this district" block.
Each feature's own `rel` still names its topic, district and river explicitly.

**Search.** Height, range, connects, feeds and alternate names join the indexed `txt`.
The result row's grey `extra` column shows the height, so typing `5578` finds Parang La.

**Flashcards.** `buildCards()` generates ~160 new cards, all `sec:"Geography"` — roughly 124 from the 62 features and 35 from the 7 rivers:

- per peak — height and range; district
- per pass — height; what it connects
- per lake — type and altitude; Ramsar year where it applies
- per glacier — valley; river fed
- per river — source; length in HP; classical names; junctions; projects

The river cards close a pre-existing gap: `buildCards()` covers districts, states,
events, battles, people and topics, but never rivers.

## Housekeeping in touched files

- `sw.js` — bump `CACHE`, or returning visitors keep the stale version. Add
  `data/features.js` to the precache list.
- `index.html` — add the `data/features.js` script tag before `app/app.js`.
- `build-single.sh` line 12 is missing `rivers.js` and `pyq.js`, so the offline
  `hp-revision.html` has been shipping without rivers or past papers. Add those two
  plus `features.js`.

## Verification

Per the project's standing rule, map interaction is verified with the in-page synthetic
`PointerEvent` harness, not by eye:

1. A click on a peak, a pass, a lake and a glacier marker each opens that feature's own
   record — not the topic note.
2. A drag across a marker does **not** open the panel.
3. Pointer capture is still taken only after the drag threshold is crossed. Capturing on
   `pointerdown` retargets the `click` to the `<svg>` and silently swallows every map
   click; this regression must not return.
4. Single click on a legend row hides exactly that category; double click isolates it;
   double click again restores all.
5. Label de-collision leaves no two label boxes overlapping at zoom 1.
6. Every `pid` in `D.features` resolves to a real `MAP.places` key, and every id in a
   `rel` array resolves in `IDX`.
