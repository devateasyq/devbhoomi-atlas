# Rounds — a scrollable feed of prelims facts

**Date:** 2026-09-11
**Status:** approved, ready for planning

## Problem

Parikrama Path rewards a study session: open the map, open a record, read it, work a
flashcard deck. It offers nothing for ninety idle seconds. The 114 exam-hook notes
already scattered through the records are the densest revision material in the app and
are only reachable by first navigating to the record that owns them.

**Rounds** is a vertically-scrolling feed of single facts, one per screen, moved by a
flick. No decision on any card. Passive by design — the opposite of the Flashcards tab,
which is effortful recall and already exists.

## Content pipeline

Facts are **generated at runtime from the records**, like the flashcards, so they cannot
drift from the notes they came from.

Source: every `["note","Exam hook", …]` block. There are 114, holding 299 atoms once
split on the `·` separator. Median atom length is 24 characters.

### The quality pass

The raw split is not usable as-is. Three filters:

1. **Drop atoms shorter than 8 characters.** `Kol Dam — "NTPC"` is not a fact.
2. **Drop atoms that merely restate the record's own name.** `Dharmsura (White Sail) —
   "also called White Sail"` is circular, because the name is already on the card.
3. **Sentence-split atoms longer than 120 characters**, on `. ` boundaries, keeping each resulting sentence as its own atom (and re-applying the length floor to the pieces). Some hooks use no `·` at all, so the
   whole hook becomes one atom — the Hamirpur hook is 187 characters and covers *two
   different districts*.

Each surviving atom carries its source record's `id`, `kind` and `name`.

### Known limits, accepted

- **~299 facts is roughly 15 minutes of scrolling.** The pool grows on its own as
  records gain exam hooks.
- **Battles and people contribute nothing.** All 16 battle records and all 24 people
  records have zero exam hooks, so Sansar Chand, the Gurkha wars and the Praja Mandal
  leaders never surface. This is a content gap, not a code one. Filling it would add
  roughly 200 facts and is the highest-value follow-up.

## The card

Full-height, one fact, three levels of hierarchy:

```
PASS                          ← kind label, in that kind's legend colour
Shipki La                     ← record name, display serif, large
the Sutlej enters India here  ← the fact
                    Open the note →
```

The kind label reuses the map legend's colours, so a glance says whether this is a pass,
a lake, a district or a treaty. Tapping anywhere on the card opens that record in the
detail panel — the feed is a way *into* the atlas, not a dead end.

## Movement

Native CSS scroll-snap (`scroll-snap-type: y mandatory`), **not** a gesture library.
One card fills the viewport; one flick moves exactly one card. This costs no dependency,
behaves identically on a phone, a trackpad and a mouse wheel, and gives keyboard paging
for free because the container is a real scroll area.

**Windowed rendering.** The feed renders 30 cards and appends 15 more once the viewer is within 5 cards of the end, so an endless feed never builds an unbounded DOM.

**Seen-marking** uses an `IntersectionObserver` and fires only once a card has settled on
screen, not merely rendered — blasting a thumb down the feed must not burn facts that
were never read.

**Desktop:** a centred 420px column at full stage height. A full-width fact card would
look absurd; the narrow column is what makes one-fact-per-screen read as a feed rather
than a slide deck. Arrow keys and space page through it.

## Ordering

Shuffled, weighted so that facts already seen sink to the back. Never runs out, never
blocks. With ~299 facts a pure random draw would show the well-known facts repeatedly
and rarely reach the tail — which is exactly the material worth reaching, the obscure
passes and the tributaries.

**No completion state.** When everything has been seen it simply cycles, oldest-seen
first. That is spaced repetition by accident, and it costs nothing.

## Deliberately excluded

No counters, no progress bar, no "you're done", no shuffle button, no per-fact
bookmarking, no section filter. Each turns an idle scroll into a task with a score
attached, which is the opposite of the point. All are easy to add later if the feature
earns them.

## Placement

A new top-level view in the rail, named **Rounds**, alongside Map, Timeline, Battles,
Topics, People, Trends and Revise. Its value is being one tap away when there are ninety
seconds spare; buried inside Revise it would never be opened. Revise is also framed as
the effortful tab, and this is the opposite.

## Structure

**`app/rounds.js`** — new, pure, DOM-free:
- `buildFacts(D)` → `[{id, srcId, kind, name, text}]`, applying the quality pass.
- `orderFacts(facts, seen)` → ordered array, unseen first.

Both unit-testable under Node, which is where extraction and filtering bugs actually
live. Ends with the same `typeof module` guard as `app/mapkit.js` so it loads as a plain
browser script and as a Node require.

**`app/app.js`** — `viewRounds()` and `mountRounds()` (render, scroll-snap wiring,
`IntersectionObserver`, click-to-open), a rail entry, and `S.view = "rounds"`.

**`app/components.css`** — card and feed rules, working in both themes.

### Fact ids

`<recordId>#<atomIndex>` — e.g. `ps-shipkila#3`. Stable across sessions, which the seen
set depends on. If an exam hook is edited the index shifts and that fact resurfaces once;
that is the right trade. Hashing the text instead would break on every typo fix.

### State

`S.seen`, persisted at `hpatlas:seen`. Naturally capped at the size of the fact pool.

## Verification

**Node — carries the weight:**
- `buildFacts` over the real data: the filters actually bite (no surviving atom under the
  length floor, none restating its record's name, none exceeding the sentence-split
  ceiling), every `srcId` resolves in the record index, every id is unique.
- `orderFacts` gets **property** tests, not exact-order ones: every fact appears exactly
  once, and no seen fact precedes an unseen one.

**Browser harness — what Node cannot reach:**
- Cards render and the container is a scroll-snap area.
- A flick lands on exactly one card.
- Tapping a card opens the record named on it.
- A card marked seen is one that settled on screen, not merely one that was rendered.
