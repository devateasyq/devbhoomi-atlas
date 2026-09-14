# Today's Stories — design

**Date:** 2026-09-14
**Branch:** `feat/daily-stories`

## The problem

The Overview is the hub, but it has no door to a *specific* record. It offers
eleven fixed syllabus rows, nine section tiles and a cover fact — and of the
270 records in the corpus, the only ways to reach one by name are search, the
map, or drilling into a section list. Nothing on the page changes from one
morning to the next except the cover photograph and the cover fact, and those
re-roll on *every render*, so they flicker as you navigate and nothing is ever
"today's".

## The feature

A strip of five **stories** on the Overview, directly beneath the cover. Each
is a card carrying a record's kind, name and opening line; tapping one opens
that record's panel — the same destination every other `[data-go]` in the app
leads to. The five are chosen at random but **fixed for the calendar day**: the
same five all day, on every device, changing at local midnight.

The daily fixing is the point, not a detail. A selection that re-rolls on every
render is wallpaper. A selection that holds for the day is something you can
finish.

## Why not the other two shapes

**Not a tap-through story player.** Rounds already is one: photo-backed cards,
one fact per screen, kind-coloured, scrolled one at a time, each with "Open the
note →" into the record (`roundCard`, app.js). A pane-sequence player would be
a second Rounds with a different gesture — new state, new tests, and no answer
to "when would I use this instead of Rounds".

**Not a new article corpus.** The 270 records already carry bodies, and
`rounds.js` is built on the rule that derived content can never drift from its
source note. A separate article corpus breaks that rule and makes authoring
time, not implementation time, the bottleneck.

We take the daily-rotation idea and *not* Instagram's visual idiom. Cards that
sit with the section tiles, not avatar rings — a ring promises tap-through
panes and 24-hour expiry, and we deliver neither.

## Selection

A pure function of the date and the corpus. No persisted state, no progress.

1. **Pool** — every record in `IDX`, all 270. Each is verified to yield a
   teaser line (see below), so there is nothing to filter out.
2. **Stable base order** — the pool is sorted by `id` before anything else.
   Without this the day's five would depend on the order the data files
   happened to load, which is not a property we want to depend on.
3. **Seed** — the local calendar date as `YYYY-MM-DD`, hashed to a 32-bit
   integer and fed to `mulberry32`. Local, not UTC: the day should turn over at
   the reader's midnight, not at 05:30 IST.
4. **Shuffle** — seeded Fisher-Yates over the sorted pool.
5. **Kind spread** — walk the shuffled list taking records, skipping any whose
   kind is already taken, until five are held. Eleven kinds and five slots, so
   this always fills; the second pass that would allow a repeated kind is
   unreachable in practice but present so the function is total for small
   corpora.

**Rejected: weighting toward what you have not read.** It sounds like the
better idea and is not. The strip would reshuffle as you read it — open a
story, come back, and the set has changed — which contradicts the one property
the feature is for. It would also make the day's five differ per device, and
turn a pure function into one that takes persisted progress.

## The teaser line

Records do not carry a summary field. `tools/build-pages.js` already derives one
for its `<meta name="description">` via `firstProse` (first `p` block, else the
first `ul` item) and `clamp` (cut on a word boundary). Those two move into
`app/stories.js` and `build-pages.js` requires them from there, so the line on a
story card and the line in a record's search-result snippet cannot disagree.

Battles carry no `blocks` at all, and 22 of 29 rivers carry none either, so
`firstProse` alone leaves 45 records blank. The fallback chain is
`firstProse(r) || r.sig || r.one || r.note || r.meaning || r.s`, which was
measured against the corpus: **270 of 270 records yield a line.**

## Architecture

New file `app/stories.js`, in the shape of `app/rounds.js`: pure, no DOM, no
globals beyond what it defines, dual-exported for `node:test`. It owns

- `dayKey(date)` — local `YYYY-MM-DD`
- `daySeed(key)` — string to 32-bit
- `mulberry32(seed)` — the PRNG
- `strip`, `firstProse`, `clamp`, `teaser(rec)`
- `pickStories(entries, seed, n)` — the selection above

`app.js` gains `storyStrip()`, which calls `pickStories` and emits the markup,
and one line in `viewHome` placing it under the cover. Each card is a
`<button data-go="<id>">`, so the existing delegated `[data-go]` handler routes
it to `goTo` → `openRec`. **No new click wiring and no new router state.**

Registration follows every other module: a `<script>` tag in `index.html` and an
entry in `build-single.sh`'s ordered list, which must stay in the same order as
the tags.

## The card

Kind label in the kind's legend colour (`KINDS[k].c`, as Rounds does), name,
clamped teaser. A photograph where `PIC_REC` has one for that exact record;
otherwise the HP outline with the record's own geometry highlighted, via
`factGeom` — which `rounds.js` already exports and which is record-specific,
unlike the per-kind fallback photos, where five cards would show four copies of
the same generic hillside.

Horizontal scroll on a phone, wrapping grid above the breakpoint. Styles go in
`app/components.css` beside `.sect`.

## Testing

`test/stories.test.js`, in the style of `test/rounds.test.js`:

- `dayKey` is local, not UTC, and is stable across times within one day
- the same date yields the identical five ids; adjacent dates differ
- all five are real `IDX` ids, and the five kinds are distinct
- every record in the corpus yields a non-empty teaser, and no teaser carries
  markup or exceeds the clamp
- the shuffle is unbiased — over many seeds, selection frequency across the pool
  is flat (the same property `a34e96c` had to fix in the campaign shuffle)
- `pickStories` does not mutate the array it is handed

`test/nav.test.js` and the harness cover that the Overview renders and that a
card's `data-go` opens a panel.

## Out of scope

The cover photograph and cover fact keep re-rolling per render. Making those
daily too is the obvious follow-on and is deliberately not in this change.
