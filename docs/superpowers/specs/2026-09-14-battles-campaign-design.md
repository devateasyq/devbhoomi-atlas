# Campaign — an interactive way to learn the battles

**Date:** 2026-09-14
**Status:** Design approved, ready for planning

## The problem

`D.battles` holds sixteen well-written records — sides, cause, course, result,
significance, place, era, year. The Battles view renders them as read-only cards.
Reading a card teaches nothing that sticks; the four failure modes the reader
actually has are all recall failures:

1. **Sides and winners** — Bhangani and Nadaun have the same principals on
   opposite sides three years apart, and the pair is asked precisely because of it.
2. **Sequence and years** — 1620, 1688, 1691, 1806, 1809, 1814–16, 1846, 1848.
3. **Place** — Mahal Morian in Hamirpur, Jaithak in Sirmaur, Malaun in Solan.
4. **The cause → course → result chain** — the four-part shape a mains answer needs.

Campaign is a game over all sixteen that attacks all four.

## Where it lives

**Not a new nav entry.** The rail is full at nine and the phone dock is
deliberately four — the code comments in `app.js` are explicit that a fifth dock
tab is what clipped the labels to 9.5px. Campaign lives inside the existing
Battles view behind a segmented control:

```
Cards · March · Campaign
```

`Cards` is the current view, unchanged. `March` and `Campaign` are new.

## March — the read half

A scrubber across 1009 → 1948. Dragging it lights battles on the Atlas map one
by one in chronological order, each in its era colour, with a one-line caption
taken from the first sentence of `sig`.

No scoring and no pressure. Two jobs:

- **Study pass** before playing.
- **Replay** after a Campaign run — the same march, but green where the reader
  got a chip first try and amber where they did not. The mistakes become a film.

March is also the twenty-second demo: a stranger drags a slider and watches nine
centuries of hill history light up on a map.

## Campaign — the game half

Sixteen chips. Four passes over the board, then a per-chip chain round.

### Pass 1 — Band

Sixteen chips into the ten `D.eras` bands. All ten bands are shown even though
only five contain battles; the five empty bands are legitimate distractors and
teach that no syllabus battle falls in prehistory, the janapadas, the empires,
British paramountcy or the making of the state.

### Pass 2 — Year

The bands expand. Within each band the reader puts its chips into chronological
order. **Ordering, not typing.** This is deliberate:

- It trains sequence, which is a comparative skill — you learn 1806 by seeing it
  sit between 1691 and 1809.
- It dodges the `yr` string entirely. Those strings are not parseable as a single
  year: `"December 1814 – January 1815"`, `"Signed 2 Dec 1815 · ratified 4 March
  1816"`, `"1848–49"`. Asking a reader to type "the year" of the Treaty of
  Segauli has no single right answer; asking them to place it after Malaun does.

Grading is on the numeric `y` sort key, which already carries the fractional
ordering that separates Kalanga (1814.8) from Jaithak (1814.9) from Malaun
(1815.4).

The correct year label is revealed on each chip as it locks.

### Pass 3 — Where

The chip names a battle; the reader taps its location on the Atlas map.

All eight distinct `place` values already exist in `MAP.places` with SVG `x`/`y`
and `k:"battle"` — `kangrafort`, `mahalmorian`, `malaun`, `jaithak`, `bhangani`,
`shahpurkandi`, `dhami`, `tattapani`. No new coordinates are needed.

`kangrafort` is the answer six times out of sixteen. That repetition is the
lesson, not a flaw: Kangra fort is the hinge of hill history.

### Pass 4 — Who won

The chip shows its two `sides` and the reader taps the winner, graded against
`winSide` (see the data traps below — `winner` is prose and cannot be matched
against `sides`, and the two sides must be shown in a shuffled order). Bhangani
and Nadaun are served consecutively by design.

### Chain round — per chip, not a tail

The moment a chip clears pass 4 its chain round unlocks: the four paragraphs
(`cause`, `course`, `result`, `sig`) arrive shuffled and the reader puts them
back in order. All sixteen get one.

It unlocks **per chip** rather than running as a sixteen-item epilogue. A
sixteen-long tail after the board is already cleared is where a session dies. The
reader may take each chain as it unlocks, or sweep the remaining ones at the end
— but the game never demands sixteen in a row at the point they have stopped
caring.

A chip with its chain done is fully locked and flips open to show the whole
record.

## The two data traps, and how grading handles them

### Era spans overlap, so band grading cannot use `era` alone

`e6` (1752–1846) and `e7` (1790–1816) overlap. `e8` (1815–1947) and `e9`
(1848–1948) overlap. The consequences are real:

- Mahal Morian (1806) is authored `e7`; the Relief of Kangra (1809) is authored
  `e6`. Both years fall inside both spans. A reader who picks the other band is
  not wrong in any way they could have known.
- The Second Anglo-Sikh War is authored `e6` but its year is **1849**, which
  falls *outside* `e6`'s own 1752–1846 span.
- The Suket Satyagraha (1948.1) sits on the `e9`/`e10` boundary.

**Rule:** a band placement is correct if the band is the authored `era` **or**
any era whose numeric span contains the battle's `y`. The union, so both the
authored value and every defensible reading are accepted. The lock-in card shows
the authored `era` as the canonical one.

This is the first of two changes to authored data: `D.eras` records gain numeric `y0`/`y1`
fields alongside the existing display `span` string. Structural, not content — no
new facts are introduced and nothing can drift from the cards.

### `winner` is prose, and `outcome` is not a side index

The winner pass cannot be built by comparing `winner` against `sides`:

- `winner` is free prose written for a reader — `"Gorkhas (tactically)"`,
  `"The state, momentarily"`, `"The people's movement"`, `"Hill rajas and the
  Guru"`. None of these equals either `sides` string.
- `outcome` looks like it should resolve this and does not. Bhangani is
  `outcome:"loss"` while `sides[0]` — Guru Gobind Singh — won it. `outcome`
  reads from the hill states' point of view, which is a different question.

**Rule:** each battle record gains `winSide: 0 | 1`, the index into its own
`sides` array. Eleven of the sixteen are side 0, so the winner pass **must
shuffle which side is shown first, per chip, per run** — otherwise a reader who
always taps the left-hand option scores eleven out of sixteen without knowing
anything.

The lock-in card still shows the full `winner` prose, so the nuance that Kalanga
and Jaithak were Gorkha *tactical* wins inside a British campaign victory is not
flattened by the game.

This is the second and last change to authored data. Like `y0`/`y1` it adds no
new facts — `winSide` only records, machine-readably, which of the two named
sides the existing `winner` sentence is about.

### Everything else is read as authored

No other new content. Chips, prompts, answers and chain paragraphs are all
projections of `D.battles` exactly as it stands, so the game cannot fall out of
step with the Cards view.

## Interaction model

**Tap-to-select, then tap-to-place. Never HTML5 drag-and-drop.**

Two reasons, both load-bearing:

- It is the only model that works on touch without pain, and the app is
  phone-first.
- It stays clear of the `setPointerCapture` trap already documented in this
  codebase: capturing the pointer on `pointerdown` retargets the subsequent
  `click` to the `<svg>` element, so `e.target.closest(".dist")` never matches and
  every map click is silently swallowed. Campaign's map pass must not reintroduce
  it.

## Scoring and persistence

**Score is first-try correctness out of 80.** Each of the sixteen chips carries
five marks — band, year-order, place, winner, chain — and a mark is earned only
when the reader gets it right on the first attempt. A wrong placement is
returned to the pool and must be re-placed to proceed, but it can no longer earn
its mark. This keeps the score honest without ever blocking progress.

A chain counts as correct only if all four paragraphs land in order.

`hpatlas:campaign` in localStorage holds:

- best score and best time
- per-battle **first-try miss counts**
- **in-progress run state**

### Resume is mandatory, not a nicety

Four passes plus sixteen chains is a fifteen-minute session. A fifteen-minute
board that loses its state when the tab closes is worse than no board. Run state
persists on every placement. Reopening Battles → Campaign offers **Resume** or
**Start over**.

### The loop that makes it Parikrama

Miss counts feed the next run: the chip pool seeds miss-first, so the battles the
reader keeps dropping are the ones served first.

A **Weak set** option runs the full four passes over only the chips that have
been missed before. Full board for the whole sweep; weak set on a Tuesday night.
Each round genuinely goes higher, and the game gets shorter as the reader gets
better.

## Architecture

Follows the `rounds.js` split already established in this codebase.

| Unit | Responsibility | Depends on |
|---|---|---|
| `app/campaign.js` | Pure logic. Builds the chip set, seeds the pool miss-first, grades each pass, computes score. No DOM, no globals beyond what it defines. | `D.battles`, `D.eras` |
| `viewCampaign()` in `app.js` | Renders board, passes and chain; owns tap-to-select state. | `campaign.js`, `mapkit.js` |
| `viewMarch()` in `app.js` | Scrubber and map ignition; replays a finished run. | `mapkit.js` |
| persistence | Read/write `hpatlas:campaign`. | existing localStorage helpers |

Grading lives entirely in `campaign.js` and is testable without a browser: given
a battle and a placement, is it correct? That is where the era-span union rule
and the `y`-ordering rule live.

## Testing

- **Grading unit tests** against `campaign.js` — every battle, every pass. The
  era-span union rule gets explicit cases for Mahal Morian, the Relief of Kangra,
  the Second Anglo-Sikh War and the Suket Satyagraha.
- **Ordering tests** — chips within a band sort by `y`, with Kalanga before
  Jaithak before Malaun before Segauli.
- **Map interaction harness**, following the existing pattern: dispatch synthetic
  `PointerEvent`s, assert a tap selects the intended place *and* that a drag does
  **not** register a placement.
- **Resume test** — write partial run state, reload, assert the board restores to
  the same pass and the same placed chips.

## Out of scope

- No new battle records. Sixteen is what the syllabus names.
- No multiplayer, leaderboard or server state. Everything is local.
- No changes to the Cards view.

## Follow-up

- `build-single.sh` must pick up `app/campaign.js`; its module list has silently
  fallen behind `index.html` before.
- Bump `CACHE` in `sw.js` or returning visitors keep the stale version.
