# Campaign (battles game) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the sixteen read-only battle cards into a scored game — four passes over a board (band, year order, place, winner) plus a per-chip chain round — living inside the existing Battles view.

**Architecture:** A pure-logic module `app/campaign.js` (no DOM, no globals beyond what it defines, exactly like the existing `app/rounds.js`) holds every grading rule and the run state machine, and is unit-tested under `node --test` with no browser. Rendering lives in `app/app.js` as `viewCampaign()` / `viewMarch()` beside the existing `viewBattles()`, reached by a segmented control rather than a new nav entry. All content is a projection of `D.battles`; only two machine-readable fields are added to authored data.

**Tech Stack:** Plain ES5-flavoured browser JavaScript, no framework, no build step, no bundler. Tests are `node:test` + `node:assert`. Browser-interaction tests are the existing `test/harness.html` iframe harness driven by synthetic `PointerEvent`s.

**Spec:** `docs/superpowers/specs/2026-09-14-battles-campaign-design.md`

## Global Constraints

- **No framework, no build step, no backend.** Plain static files. Every new file is a `<script src>` in `index.html`.
- **`app/campaign.js` must be pure:** no DOM access, no `window`, no `localStorage`. It takes `D` and plain objects and returns plain objects, so `node --test` can load it directly. Follow the export shape at the bottom of `app/rounds.js`.
- **Tap-to-select, then tap-to-place. Never HTML5 drag-and-drop.** Never call `setPointerCapture` on `pointerdown`: it retargets the subsequent `click` to the `<svg>` element, so `e.target.closest(".dist")` never matches and every map click is silently swallowed. Take capture only after movement crosses the drag threshold, and act on `pointerup` using the element recorded at `pointerdown`.
- **Run tests with:** `node --test test/<file>.test.js` from the repo root. There is no `package.json` and no npm script.
- **localStorage goes through the existing `store` helper** in `app/app.js:66-70`, which already prefixes `hpatlas:`. Call `store.get("campaign", fallback)` — *not* `store.get("hpatlas:campaign", …)`.
- **Any new `app/*.js` file must be added in four places** or it will silently not ship: `index.html` `<script>` tags, the `ASSETS` array in `sw.js`, the `app` tuple in `build-single.sh`, and the module list in `README.md`. The single-file build has silently fallen behind `index.html` before.
- **Bump `CACHE` in `sw.js`** (currently `"parikrama-v68"`) on the final task or returning visitors keep the stale version.
- **Record ids are namespaced** `d- s- ev- b- p- t-` and linked by `rel`, which must be wired in both directions. This feature adds no new records, so no new `rel` wiring.

---

### Task 1: Numeric era spans

The band pass grades against era date ranges, but `D.eras` only carries a human display string (`span:"1752 – 1846"`). Parsing that string at runtime would be fragile — `"c. 40,000 BCE – 1000 BCE"` and `"1948 – present"` are not one format. Add numeric fields instead.

**Files:**
- Modify: `data/places.js:9-20` (the `D.eras` array)
- Test: `test/data.test.js` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: every `D.eras` entry gains `y0` (number, inclusive start) and `y1` (number, inclusive end). `e10` uses `y1: 9999` for "present". The existing `span` string is unchanged and remains the display value.

- [ ] **Step 1: Write the failing test**

Append to `test/data.test.js`:

```js
/* The Campaign band pass grades a placement against era date ranges. The
   display `span` strings are not one parseable format ("c. 40,000 BCE – 1000
   BCE", "1948 – present"), so the numeric range is authored alongside them. */
test("every era carries a numeric span that brackets its display span", () => {
  for(const e of D.eras){
    assert.equal(typeof e.y0, "number", e.id + " has no numeric y0");
    assert.equal(typeof e.y1, "number", e.id + " has no numeric y1");
    assert.ok(e.y1 > e.y0, e.id + " has an inverted span: " + e.y0 + "–" + e.y1);
  }
});

test("every battle year falls inside some era span, or its own authored era", () => {
  const spans = Object.fromEntries(D.eras.map(e => [e.id, e]));
  for(const b of D.battles){
    const own = spans[b.era];
    assert.ok(own, b.id + " points at missing era " + b.era);
    const inSome = D.eras.some(e => b.y >= e.y0 && b.y <= e.y1);
    assert.ok(inSome, b.id + " (y=" + b.y + ") falls in no era span at all");
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/data.test.js`
Expected: FAIL — `e1 has no numeric y0`

- [ ] **Step 3: Add the numeric spans**

Replace `data/places.js:9-20` with:

```js
/* y0/y1 are the numeric form of `span`, used by the Campaign band pass to
   grade a placement. They are authored rather than parsed because `span` is
   not one format: "c. 40,000 BCE – 1000 BCE" and "1948 – present" share no
   grammar. y1:9999 stands for "present". Note that the spans deliberately
   OVERLAP (e6/e7, e8/e9) — that is real history, not an error, and the band
   grading rule accounts for it. */
D.eras = [
 {id:"e1", name:"Prehistory & the Vedic Hills", span:"c. 40,000 BCE – 1000 BCE", v:"--e1", y0:-40000, y1:-1000},
 {id:"e2", name:"Janapadas & Hill Republics",   span:"c. 1000 BCE – 300 CE",     v:"--e2", y0:-1000,  y1:300},
 {id:"e3", name:"Empires: Maurya to Harsha",    span:"326 BCE – 647 CE",         v:"--e3", y0:-326,   y1:647},
 {id:"e4", name:"Rise of the Hill States",      span:"c. 550 – 1526",            v:"--e4", y0:550,    y1:1526},
 {id:"e5", name:"Hill States & the Mughals",    span:"1526 – 1752",              v:"--e5", y0:1526,   y1:1752},
 {id:"e6", name:"Sansar Chand & the Sikhs",     span:"1752 – 1846",              v:"--e6", y0:1752,   y1:1846},
 {id:"e7", name:"The Gorkha Invasion",          span:"1790 – 1816",              v:"--e7", y0:1790,   y1:1816},
 {id:"e8", name:"British Paramountcy",          span:"1815 – 1947",              v:"--e8", y0:1815,   y1:1947},
 {id:"e9", name:"Praja Mandal & Freedom",       span:"1848 – 1948",              v:"--e9", y0:1848,   y1:1948},
 {id:"e10",name:"Making Himachal Pradesh",      span:"1948 – present",           v:"--e10",y0:1948,   y1:9999}
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/data.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add data/places.js test/data.test.js
git commit -m "data: numeric y0/y1 spans on D.eras for Campaign band grading"
```

---

### Task 2: `winSide` on every battle record

`winner` is prose written for a reader and cannot be matched against `sides`; `outcome` is not a side index. Record which side won, machine-readably.

**Files:**
- Modify: `data/history.js:347-477` (the sixteen `D.battles` records)
- Test: `test/data.test.js` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: every `D.battles` entry gains `winSide` — the integer `0` or `1`, an index into that record's own `sides` array.

- [ ] **Step 1: Write the failing test**

Append to `test/data.test.js`:

```js
/* `winner` is prose ("Gorkhas (tactically)", "The state, momentarily") and
   `outcome` reads from the hill states' point of view, not as a side index —
   Bhangani is outcome:"loss" while sides[0] won it. winSide is the only
   machine-readable answer to "which of these two won?". */
test("every battle names which of its two sides won", () => {
  for(const b of D.battles){
    assert.ok(b.winSide === 0 || b.winSide === 1,
      b.id + " has winSide " + JSON.stringify(b.winSide) + ", expected 0 or 1");
    assert.equal(b.sides.length, 2, b.id + " does not have exactly two sides");
  }
});

/* Guards the shuffle requirement: twelve of sixteen are side 0, so a reader
   who always taps the left-hand option would score 12/16 on an unshuffled
   winner pass. This test documents the imbalance so the UI cannot forget it. */
test("winSide is lopsided enough that the winner pass must shuffle", () => {
  const zero = D.battles.filter(b => b.winSide === 0).length;
  assert.ok(zero > D.battles.length / 2,
    "expected a side-0 majority (the reason the pass shuffles), got " + zero);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/data.test.js`
Expected: FAIL — `b-kangra1620 has winSide undefined, expected 0 or 1`

- [ ] **Step 3: Add `winSide` to all sixteen records**

In `data/history.js`, add `winSide` to each battle's `outcome`/`winner` line. The correct value for each, derived by reading each `winner` sentence against that record's own `sides` array:

| id | `sides[0]` | `sides[1]` | `winner` | `winSide` |
|---|---|---|---|---|
| `b-kangra1620` | Mughal Empire (Jahangir) | Kangra (Katoch) | Mughals | `0` |
| `b-bhangani` | Guru Gobind Singh | Confederacy of hill rajas | Guru Gobind Singh | `0` |
| `b-nadaun` | Hill rajas + Guru Gobind Singh | Mughal force under Alif Khan | Hill rajas and the Guru | `0` |
| `b-mahalmorian` | Gorkhas under Amar Singh Thapa | Kangra under Sansar Chand II | Gorkhas | `0` |
| `b-kangra1809` | Sikhs under Ranjit Singh + Kangra | Gorkhas under Amar Singh Thapa | Sikhs | `0` |
| `b-jaithak` | British East India Company | Gorkhas under Ranjor Singh Thapa | Gorkhas (tactically) | `1` |
| `b-malaun` | British EIC under David Ochterlony | Gorkhas under Amar Singh Thapa | British | `0` |
| `b-segauli` | British East India Company | Kingdom of Nepal | British | `0` |
| `b-lahore` | British East India Company | Sikh Empire | British | `0` |
| `b-shahpur` | Nurpur rebels under Ram Singh Pathania | British East India Company | British | `1` |
| `b-dhami` | Dhami Praja Mandal | Rana Dalip Singh of Dhami | The state, momentarily | `1` |
| `b-ghazni1009` | Mahmud of Ghazni | Kangra (Katoch) | Mahmud of Ghazni | `0` |
| `b-tughlaq1360` | Delhi Sultanate (Firoz Shah Tughlaq) | Kangra (Katoch) | Delhi Sultanate | `0` |
| `b-kalanga` | British EIC under Rollo Gillespie | Gorkhas under Balbhadra Kunwar | Gorkhas (tactically) | `1` |
| `b-anglosikh2` | British East India Company | Sikh Empire | British | `0` |
| `b-suket1948` | Suket Praja Mandal under Padam Dev | Raja Lakshman Sen of Suket | The people's movement | `0` |

Edit each record's existing line so that, for example, `b-kangra1620` reads:

```js
 sides:["Mughal Empire (Jahangir)","Kangra (Katoch)"], outcome:"win", winner:"Mughals", winSide:0,
```

and `b-jaithak` reads:

```js
 sides:["British East India Company","Gorkhas under Ranjor Singh Thapa"], outcome:"loss", winner:"Gorkhas (tactically)", winSide:1,
```

Add this comment immediately above `D.battles = [` at `data/history.js:346`:

```js
/* winSide is the index into this record's own `sides` of the side that won.
   It exists because `winner` is prose for a reader and `outcome` reads from
   the hill states' point of view — Bhangani is outcome:"loss" while sides[0],
   Guru Gobind Singh, won it. Do not try to derive one from the other. */
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/data.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add data/history.js test/data.test.js
git commit -m "data: winSide on every battle, the machine-readable winner"
```

---

### Task 3: `app/campaign.js` — chips and band grading

The first slice of the pure module: build the chip set, and grade a band placement under the union rule.

**Files:**
- Create: `app/campaign.js`
- Create: `test/campaign.test.js`
- Modify: `index.html:193` (add `<script src="app/campaign.js"></script>` after `rounds.js`)
- Modify: `sw.js:6` (add `"app/campaign.js"` to `ASSETS`)
- Modify: `build-single.sh:16` (add `"campaign.js"` to the `app` tuple, after `"rounds.js"`)

**Interfaces:**
- Consumes: `D.battles` (with `winSide` from Task 2), `D.eras` (with `y0`/`y1` from Task 1).
- Produces:
  - `buildChips(D) -> Array<Chip>` where `Chip = {id, name, kind, era, y, yr, place, sides:[string,string], winSide, winner}` — one per battle, sorted by `y` ascending.
  - `acceptedBands(D, chip) -> Array<string>` — era ids, sorted, that grade as correct for this chip.
  - `gradeBand(D, chip, eraId) -> boolean`.

- [ ] **Step 1: Write the failing test**

Create `test/campaign.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");
const c = require("../app/campaign.js");

const {D} = loadData();
const CHIPS = c.buildChips(D);
const chip = id => CHIPS.find(x => x.id === id);

test("one chip per battle, in chronological order", () => {
  assert.equal(CHIPS.length, D.battles.length);
  for(let i = 1; i < CHIPS.length; i++){
    assert.ok(CHIPS[i].y >= CHIPS[i-1].y,
      CHIPS[i].id + " (y=" + CHIPS[i].y + ") sorts before " + CHIPS[i-1].id);
  }
});

test("every chip carries what the four passes need", () => {
  for(const ch of CHIPS){
    assert.ok(ch.name && ch.name.trim(), ch.id + " has no name");
    assert.ok(ch.place, ch.id + " has no place");
    assert.equal(ch.sides.length, 2, ch.id + " has not got two sides");
    assert.ok(ch.winSide === 0 || ch.winSide === 1, ch.id + " has no winSide");
  }
});

/* The union rule. e6 (1752-1846) and e7 (1790-1816) overlap, so a reader who
   puts the 1806 and 1809 battles in the other band is not wrong in any way
   they could have known. */
test("overlapping era spans both grade as correct", () => {
  for(const id of ["b-mahalmorian", "b-kangra1809"]){
    const bands = c.acceptedBands(D, chip(id));
    assert.ok(bands.includes("e6"), id + " should accept e6, got " + bands.join(","));
    assert.ok(bands.includes("e7"), id + " should accept e7, got " + bands.join(","));
  }
});

/* The Second Anglo-Sikh War is authored e6 but dated 1849, which falls
   OUTSIDE e6's own 1752-1846 span. The authored era must still be accepted,
   which is why the rule is a union and not a span lookup. */
test("the authored era is accepted even when the year falls outside its span", () => {
  const bands = c.acceptedBands(D, chip("b-anglosikh2"));
  assert.ok(bands.includes("e6"), "authored era e6 must be accepted, got " + bands.join(","));
  assert.ok(bands.includes("e9"), "1849 falls in e9, which must also be accepted");
});

/* The Suket Satyagraha is y=1948.1 — past the end of its own authored e9
   (1848-1948) and inside e10. Both must pass. */
test("a boundary year accepts both its authored era and the next", () => {
  const bands = c.acceptedBands(D, chip("b-suket1948"));
  assert.ok(bands.includes("e9"), "authored e9 must be accepted");
  assert.ok(bands.includes("e10"), "1948.1 falls in e10, which must be accepted");
});

test("an unrelated band is graded wrong", () => {
  assert.equal(c.gradeBand(D, chip("b-bhangani"), "e5"), true);
  assert.equal(c.gradeBand(D, chip("b-bhangani"), "e1"), false);
  assert.equal(c.gradeBand(D, chip("b-bhangani"), "e10"), false);
});

test("every chip has at least one accepted band", () => {
  for(const ch of CHIPS){
    assert.ok(c.acceptedBands(D, ch).length > 0, ch.id + " can never be placed correctly");
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/campaign.test.js`
Expected: FAIL — `Cannot find module '../app/campaign.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `app/campaign.js`:

```js
/* ============================================================
   campaign — the battles game's pure half.
   No DOM, no globals beyond what it defines. Every chip is a
   projection of a D.battles record, so the game cannot drift
   from the Cards view, and every grading rule is testable
   under `node --test` with no browser.
   ============================================================ */
"use strict";

var PASSES = ["band", "year", "place", "winner", "chain"];

/* One chip per battle, chronological. The whole game reads this and
   nothing else, so a field missing here is a field the game cannot use. */
function buildChips(D){
  return (D.battles || []).slice()
    .sort(function(a, b){ return a.y - b.y; })
    .map(function(b){
      return {id: b.id, name: b.name, kind: b.kind, era: b.era,
              y: b.y, yr: b.yr, place: b.place,
              sides: b.sides.slice(), winSide: b.winSide, winner: b.winner};
    });
}

/* The union rule. A band is correct if it is the authored era OR if its
   numeric span contains the battle's year.

   Both halves are load-bearing. The spans overlap (e6 1752-1846 with e7
   1790-1816; e8 1815-1947 with e9 1848-1948), so span-containment alone
   would mark a defensible answer wrong — Mahal Morian 1806 is authored e7
   and the Relief of Kangra 1809 is authored e6, and a reader cannot tell
   those apart. And the authored era alone is not enough either: the Second
   Anglo-Sikh War is authored e6 but dated 1849, outside e6's own span. */
function acceptedBands(D, chip){
  var out = [chip.era];
  var eras = D.eras || [];
  for(var i = 0; i < eras.length; i++){
    var e = eras[i];
    if(chip.y >= e.y0 && chip.y <= e.y1 && out.indexOf(e.id) < 0) out.push(e.id);
  }
  return out.sort();
}

function gradeBand(D, chip, eraId){
  return acceptedBands(D, chip).indexOf(eraId) >= 0;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {PASSES: PASSES, buildChips: buildChips,
                    acceptedBands: acceptedBands, gradeBand: gradeBand};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/campaign.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 5: Wire the module into the three places that ship it**

In `index.html`, after the `rounds.js` line:

```html
<script src="app/rounds.js"></script>
<script src="app/campaign.js"></script>
```

In `sw.js`, add `"app/campaign.js"` to the `ASSETS` array, after `"app/rounds.js"`.

In `build-single.sh:16`, add `"campaign.js"` to the `app` tuple after `"rounds.js"`:

```python
                        for f in ("logo.js","trends.js","mapkit.js","credits.js","rounds.js","campaign.js","sync.js",
                                  "firebase-config.js","auth.js","app.js"))
```

- [ ] **Step 6: Verify the single-file build still builds**

Run: `./build-single.sh /tmp/campaign-check.html && grep -c "buildChips" /tmp/campaign-check.html`
Expected: the script prints the written path, and grep prints a count of at least `1`

- [ ] **Step 7: Commit**

```bash
git add app/campaign.js test/campaign.test.js index.html sw.js build-single.sh
git commit -m "feat: campaign.js chips and band grading under the union rule"
```

---

### Task 4: Year ordering, place and winner grading

The remaining three board passes. Year is ordering within a band, graded on the numeric `y` key.

**Files:**
- Modify: `app/campaign.js`
- Modify: `test/campaign.test.js`

**Interfaces:**
- Consumes: `buildChips`, `acceptedBands` from Task 3.
- Produces:
  - `canonicalOrder(D, eraId) -> Array<string>` — chip ids whose **authored** `era` is `eraId`, ascending by `y`. Pass 2 uses the authored era, not the reader's accepted-but-different band choice, so the ordering is deterministic.
  - `gradeYear(D, eraId, index, chipId) -> boolean` — is `chipId` the right chip for slot `index` of that band?
  - `gradePlace(chip, placeId) -> boolean`.
  - `gradeWinner(chip, sideIndex) -> boolean` — `sideIndex` is an index into `chip.sides`.
  - `sideOrder(chipId, salt) -> [number, number]` — a stable per-chip, per-run shuffle of `[0, 1]` for display.

- [ ] **Step 1: Write the failing test**

Append to `test/campaign.test.js`:

```js
test("canonical order within a band is by year", () => {
  /* e7 is the band that matters: it holds the Gorkha war sequence, where
     the fractional y keys are the only thing separating Kalanga (1814.8)
     from Jaithak (1814.9) from Malaun (1815.4). */
  assert.deepEqual(c.canonicalOrder(D, "e7"),
    ["b-mahalmorian", "b-kalanga", "b-jaithak", "b-malaun", "b-segauli"]);
  assert.deepEqual(c.canonicalOrder(D, "e5"),
    ["b-kangra1620", "b-bhangani", "b-nadaun"]);
  assert.deepEqual(c.canonicalOrder(D, "e9"),
    ["b-shahpur", "b-dhami", "b-suket1948"]);
});

test("empty bands order to nothing", () => {
  assert.deepEqual(c.canonicalOrder(D, "e1"), []);
  assert.deepEqual(c.canonicalOrder(D, "e10"), []);
});

test("no band holds a single chip, so no slot is a free mark", () => {
  for(const e of D.eras){
    const n = c.canonicalOrder(D, e.id).length;
    assert.ok(n !== 1, e.id + " holds exactly one chip — its year slot is unearnable");
  }
});

test("year grading checks the chip against its slot", () => {
  assert.equal(c.gradeYear(D, "e7", 0, "b-mahalmorian"), true);
  assert.equal(c.gradeYear(D, "e7", 1, "b-kalanga"), true);
  assert.equal(c.gradeYear(D, "e7", 1, "b-jaithak"), false);
  assert.equal(c.gradeYear(D, "e7", 9, "b-segauli"), false);
});

test("place grading is exact", () => {
  assert.equal(c.gradePlace(chip("b-mahalmorian"), "mahalmorian"), true);
  assert.equal(c.gradePlace(chip("b-mahalmorian"), "kangrafort"), false);
});

test("six battles share kangrafort and all grade correct there", () => {
  const atFort = CHIPS.filter(ch => ch.place === "kangrafort");
  assert.equal(atFort.length, 6);
  for(const ch of atFort) assert.equal(c.gradePlace(ch, "kangrafort"), true);
});

test("winner grading is by side index, not by prose", () => {
  /* Bhangani is the trap: outcome:"loss" but sides[0] won it. */
  assert.equal(c.gradeWinner(chip("b-bhangani"), 0), true);
  assert.equal(c.gradeWinner(chip("b-bhangani"), 1), false);
  /* Jaithak is the other direction: sides[1] won. */
  assert.equal(c.gradeWinner(chip("b-jaithak"), 1), true);
  assert.equal(c.gradeWinner(chip("b-jaithak"), 0), false);
});

test("side display order is a stable shuffle, and does shuffle", () => {
  const a = c.sideOrder("b-bhangani", 7);
  assert.deepEqual(c.sideOrder("b-bhangani", 7), a, "must be stable for one salt");
  for(const ch of CHIPS){
    const o = c.sideOrder(ch.id, 3);
    assert.equal(o.length, 2);
    assert.ok(o.includes(0) && o.includes(1), ch.id + " lost a side: " + o.join(","));
  }
  /* Across the sixteen chips at some salt, the winner must not sit on the
     same side every time, or always-tap-left beats the pass. */
  const salts = [0, 1, 2, 3, 4];
  const anyMixed = salts.some(s => {
    const left = CHIPS.map(ch => c.sideOrder(ch.id, s)[0] === ch.winSide);
    return left.some(Boolean) && left.some(v => !v);
  });
  assert.ok(anyMixed, "the shuffle never mixes which side holds the winner");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/campaign.test.js`
Expected: FAIL — `c.canonicalOrder is not a function`

- [ ] **Step 3: Write the implementation**

Add to `app/campaign.js`, above the `module.exports` block:

```js
/* Pass 2 orders chips WITHIN a band, and it uses the authored era rather
   than wherever the reader put the chip in pass 1. Pass 1 grades leniently
   (see acceptedBands), so a chip can be correct in a band that is not its
   canonical one; letting that follow through into pass 2 would make the
   ordering non-deterministic. The board snaps every chip to its authored
   band before pass 2 begins, and the lock-in card shows the authored era. */
function canonicalOrder(D, eraId){
  return (D.battles || [])
    .filter(function(b){ return b.era === eraId; })
    .sort(function(a, b){ return a.y - b.y; })
    .map(function(b){ return b.id; });
}

function gradeYear(D, eraId, index, chipId){
  return canonicalOrder(D, eraId)[index] === chipId;
}

function gradePlace(chip, placeId){
  return chip.place === placeId;
}

/* sideIndex is an index into chip.sides, never a string. `winner` is prose
   for a reader ("Gorkhas (tactically)") and matches neither side. */
function gradeWinner(chip, sideIndex){
  return sideIndex === chip.winSide;
}

/* Which side to show first. Twelve of the sixteen battles have winSide 0,
   so an unshuffled pass hands 12/16 to a reader who always taps left. The
   shuffle is derived from the chip id and a per-run salt so it is stable
   within a run (a re-render must not move the buttons under a thumb) and
   different between runs. */
function sideOrder(chipId, salt){
  var h = salt | 0;
  for(var i = 0; i < chipId.length; i++) h = (h * 31 + chipId.charCodeAt(i)) | 0;
  return (h & 1) ? [1, 0] : [0, 1];
}
```

Extend the export block to:

```js
if(typeof module !== "undefined" && module.exports){
  module.exports = {PASSES: PASSES, buildChips: buildChips,
                    acceptedBands: acceptedBands, gradeBand: gradeBand,
                    canonicalOrder: canonicalOrder, gradeYear: gradeYear,
                    gradePlace: gradePlace, gradeWinner: gradeWinner,
                    sideOrder: sideOrder};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/campaign.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add app/campaign.js test/campaign.test.js
git commit -m "feat: campaign year-order, place and winner grading"
```

---

### Task 5: The chain round

Four paragraphs per battle, shuffled, put back in order.

**Files:**
- Modify: `app/campaign.js`
- Modify: `test/campaign.test.js`

**Interfaces:**
- Consumes: `buildChips` from Task 3, `sideOrder`'s hash approach from Task 4.
- Produces:
  - `CHAIN_KEYS` — the frozen array `["cause", "course", "result", "sig"]`.
  - `chainParts(D, chipId) -> Array<{key, label, text}>` in canonical order. Labels are `"Cause"`, `"Course"`, `"Result"`, `"Why it matters"`.
  - `shuffleChain(D, chipId, salt) -> Array<{key, label, text}>` — the same parts, deterministically reordered, never in canonical order.
  - `gradeChain(keys) -> boolean` — `keys` is an array of the four key strings in the reader's order.

- [ ] **Step 1: Write the failing test**

Append to `test/campaign.test.js`:

```js
test("every battle has all four chain paragraphs with text", () => {
  for(const ch of CHIPS){
    const parts = c.chainParts(D, ch.id);
    assert.equal(parts.length, 4, ch.id + " has " + parts.length + " chain parts");
    assert.deepEqual(parts.map(p => p.key), ["cause", "course", "result", "sig"]);
    for(const p of parts){
      assert.ok(p.text && p.text.trim().length > 20,
        ch.id + " chain part " + p.key + " is empty or too short");
      assert.ok(p.label && p.label.trim(), ch.id + " chain part " + p.key + " has no label");
    }
  }
});

test("the shuffle keeps all four parts and never hands back the answer", () => {
  for(const ch of CHIPS){
    for(const salt of [0, 1, 2, 3]){
      const keys = c.shuffleChain(D, ch.id, salt).map(p => p.key);
      assert.equal(keys.length, 4, ch.id + " lost a part at salt " + salt);
      assert.deepEqual(keys.slice().sort(), ["cause", "course", "result", "sig"],
        ch.id + " duplicated or dropped a part at salt " + salt);
      assert.notDeepEqual(keys, c.CHAIN_KEYS,
        ch.id + " was served already-solved at salt " + salt);
    }
  }
});

test("the shuffle is stable for one salt", () => {
  const a = c.shuffleChain(D, "b-nadaun", 5).map(p => p.key);
  const b = c.shuffleChain(D, "b-nadaun", 5).map(p => p.key);
  assert.deepEqual(a, b);
});

test("a chain is correct only in full order", () => {
  assert.equal(c.gradeChain(["cause", "course", "result", "sig"]), true);
  assert.equal(c.gradeChain(["cause", "result", "course", "sig"]), false);
  assert.equal(c.gradeChain(["cause", "course", "result"]), false);
  assert.equal(c.gradeChain([]), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/campaign.test.js`
Expected: FAIL — `c.chainParts is not a function`

- [ ] **Step 3: Write the implementation**

Add to `app/campaign.js`, above the `module.exports` block:

```js
/* The four-part shape a mains answer needs. `sig` is last because it is the
   "why it matters" close, not because it is least important. */
var CHAIN_KEYS = ["cause", "course", "result", "sig"];
var CHAIN_LABELS = {cause: "Cause", course: "Course",
                    result: "Result", sig: "Why it matters"};

function chainParts(D, chipId){
  var b = (D.battles || []).find(function(x){ return x.id === chipId; });
  if(!b) return [];
  return CHAIN_KEYS.map(function(k){
    return {key: k, label: CHAIN_LABELS[k], text: b[k]};
  });
}

/* A deterministic rotate-and-swap. Salt 0 would leave the parts in canonical
   order, which hands the reader the answer, so the rotation is always at
   least one and the result is checked against canonical before returning. */
function shuffleChain(D, chipId, salt){
  var parts = chainParts(D, chipId);
  if(parts.length !== 4) return parts;
  var h = (salt | 0);
  for(var i = 0; i < chipId.length; i++) h = (h * 31 + chipId.charCodeAt(i)) | 0;
  h = Math.abs(h);
  var rot = 1 + (h % 3);                       /* 1..3, never 0 */
  var out = parts.slice(rot).concat(parts.slice(0, rot));
  if(h & 4){ var t = out[1]; out[1] = out[2]; out[2] = t; }
  /* The swap can undo the rotation for some values; rotate once more rather
     than return the solved order. */
  if(out[0].key === CHAIN_KEYS[0] && out[1].key === CHAIN_KEYS[1] &&
     out[2].key === CHAIN_KEYS[2] && out[3].key === CHAIN_KEYS[3]){
    out = out.slice(1).concat(out.slice(0, 1));
  }
  return out;
}

function gradeChain(keys){
  if(!keys || keys.length !== CHAIN_KEYS.length) return false;
  for(var i = 0; i < CHAIN_KEYS.length; i++) if(keys[i] !== CHAIN_KEYS[i]) return false;
  return true;
}
```

Extend the export block to add `CHAIN_KEYS: CHAIN_KEYS, CHAIN_LABELS: CHAIN_LABELS, chainParts: chainParts, shuffleChain: shuffleChain, gradeChain: gradeChain`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/campaign.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add app/campaign.js test/campaign.test.js
git commit -m "feat: campaign chain round — four paragraphs, shuffled and graded"
```

---

### Task 6: Run state, scoring, miss-first seeding and the weak set

The state machine. Still pure — persistence is the caller's job.

**Files:**
- Modify: `app/campaign.js`
- Modify: `test/campaign.test.js`

**Interfaces:**
- Consumes: everything from Tasks 3–5.
- Produces:
  - `newRun(D, opts) -> Run` where `opts = {misses?: {chipId: number}, weak?: boolean, salt?: number}`. `Run = {v:1, weak, salt, pool:Array<string>, pass:string, done:{}, miss:{}, marks:{}, startedAt:number}`.
  - `seedPool(D, misses, weakOnly) -> Array<string>` — chip ids, most-missed first, ties in chronological order. `weakOnly` keeps only chips with a miss count above zero; if that would be empty it falls back to the full set.
  - `recordAttempt(run, chipId, pass, correct) -> Run` — mutates and returns `run`.
  - `scoreRun(run) -> {score:number, max:number}` — `max` is `pool.length * PASSES.length`.
  - `runMisses(run) -> {chipId: number}` — first-try misses this run, to merge into the stored counts.
  - `isRunComplete(run) -> boolean`.

- [ ] **Step 1: Write the failing test**

Append to `test/campaign.test.js`:

```js
test("a new run pools every chip and starts on the band pass", () => {
  const run = c.newRun(D, {});
  assert.equal(run.pool.length, D.battles.length);
  assert.equal(run.pass, "band");
  assert.equal(run.v, 1);
  assert.deepEqual(run.pool.slice().sort(), CHIPS.map(ch => ch.id).sort());
});

test("the pool seeds most-missed first", () => {
  const run = c.newRun(D, {misses: {"b-segauli": 5, "b-dhami": 2}});
  assert.equal(run.pool[0], "b-segauli");
  assert.equal(run.pool[1], "b-dhami");
  assert.equal(run.pool.length, D.battles.length, "seeding must not drop chips");
});

test("the weak set keeps only previously missed chips", () => {
  const run = c.newRun(D, {weak: true, misses: {"b-segauli": 5, "b-dhami": 2}});
  assert.deepEqual(run.pool, ["b-segauli", "b-dhami"]);
});

test("a weak set with nothing missed falls back to the full board", () => {
  const run = c.newRun(D, {weak: true, misses: {}});
  assert.equal(run.pool.length, D.battles.length);
});

test("a first-try correct answer earns its mark", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-bhangani", "band", true);
  assert.equal(c.scoreRun(run).score, 1);
});

test("a mark is lost after a wrong attempt but the pass still completes", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-bhangani", "band", false);
  assert.equal(c.scoreRun(run).score, 0, "a wrong attempt must not earn");
  c.recordAttempt(run, "b-bhangani", "band", true);
  assert.equal(c.scoreRun(run).score, 0, "the mark stays lost");
  assert.equal(run.done["b-bhangani"].band, true, "but the pass is done");
});

test("a completed pass ignores further attempts", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-bhangani", "band", true);
  c.recordAttempt(run, "b-bhangani", "band", false);
  assert.equal(c.scoreRun(run).score, 1, "a done pass cannot be un-earned");
});

test("max score is five marks per chip in the pool", () => {
  assert.equal(c.scoreRun(c.newRun(D, {})).max, D.battles.length * 5);
  const weak = c.newRun(D, {weak: true, misses: {"b-segauli": 1}});
  assert.equal(c.scoreRun(weak).max, 5);
});

test("a perfect run scores full marks and reports complete", () => {
  const run = c.newRun(D, {});
  assert.equal(c.isRunComplete(run), false);
  for(const id of run.pool) for(const p of c.PASSES) c.recordAttempt(run, id, p, true);
  const s = c.scoreRun(run);
  assert.equal(s.score, s.max);
  assert.equal(c.isRunComplete(run), true);
});

test("misses are reported for merging into the stored counts", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-segauli", "year", false);
  c.recordAttempt(run, "b-segauli", "year", true);
  c.recordAttempt(run, "b-segauli", "place", false);
  c.recordAttempt(run, "b-bhangani", "band", true);
  assert.deepEqual(c.runMisses(run), {"b-segauli": 2});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/campaign.test.js`
Expected: FAIL — `c.newRun is not a function`

- [ ] **Step 3: Write the implementation**

Add to `app/campaign.js`, above the `module.exports` block:

```js
/* Most-missed first, ties chronological. This is the revision loop: the
   battles the reader keeps dropping are the ones served first, so each
   round genuinely goes higher rather than repeating the same sweep. */
function seedPool(D, misses, weakOnly){
  misses = misses || {};
  var ids = buildChips(D).map(function(ch){ return ch.id; });
  if(weakOnly){
    var weak = ids.filter(function(id){ return (misses[id] || 0) > 0; });
    /* A weak set with nothing weak in it is an empty board, not a feature. */
    if(weak.length) ids = weak;
  }
  return ids.map(function(id, i){ return {id: id, m: misses[id] || 0, i: i}; })
            .sort(function(a, b){ return (b.m - a.m) || (a.i - b.i); })
            .map(function(x){ return x.id; });
}

function newRun(D, opts){
  opts = opts || {};
  return {v: 1,
          weak: !!opts.weak,
          salt: opts.salt == null ? (Date.now() & 0xffff) : opts.salt,
          pool: seedPool(D, opts.misses, !!opts.weak),
          pass: PASSES[0],
          done: {}, miss: {}, marks: {},
          startedAt: Date.now()};
}

/* A wrong attempt costs the mark but never blocks progress: the reader
   re-places and moves on, and the score stays honest without the game
   turning into a wall. */
function recordAttempt(run, chipId, pass, correct){
  run.done[chipId]  = run.done[chipId]  || {};
  run.miss[chipId]  = run.miss[chipId]  || {};
  run.marks[chipId] = run.marks[chipId] || {};
  if(run.done[chipId][pass]) return run;
  if(!correct){ run.miss[chipId][pass] = true; return run; }
  run.done[chipId][pass]  = true;
  run.marks[chipId][pass] = run.miss[chipId][pass] ? 0 : 1;
  return run;
}

function scoreRun(run){
  var score = 0;
  for(var i = 0; i < run.pool.length; i++){
    var m = run.marks[run.pool[i]] || {};
    for(var j = 0; j < PASSES.length; j++) score += (m[PASSES[j]] || 0);
  }
  return {score: score, max: run.pool.length * PASSES.length};
}

function isRunComplete(run){
  for(var i = 0; i < run.pool.length; i++){
    var d = run.done[run.pool[i]] || {};
    for(var j = 0; j < PASSES.length; j++) if(!d[PASSES[j]]) return false;
  }
  return true;
}

/* First-try misses only, keyed by chip, for merging into the stored counts
   that seed the next run's pool. */
function runMisses(run){
  var out = {};
  for(var id in run.miss){
    if(!Object.prototype.hasOwnProperty.call(run.miss, id)) continue;
    var n = 0;
    for(var j = 0; j < PASSES.length; j++) if(run.miss[id][PASSES[j]]) n++;
    if(n) out[id] = n;
  }
  return out;
}
```

Extend the export block to add `seedPool: seedPool, newRun: newRun, recordAttempt: recordAttempt, scoreRun: scoreRun, isRunComplete: isRunComplete, runMisses: runMisses`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/campaign.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 5: Run the whole suite to check nothing regressed**

Run: `for f in test/*.test.js; do node --test "$f" || exit 1; done`
Expected: every file reports `fail 0`

- [ ] **Step 6: Commit**

```bash
git add app/campaign.js test/campaign.test.js
git commit -m "feat: campaign run state, scoring and miss-first seeding"
```

---

### Task 7: The segmented control and the Campaign shell

Three modes inside the Battles view, and the start screen: Resume, Start over, Weak set.

**Files:**
- Modify: `app/app.js:346-352` (the `S` state object — add `battleMode` and `campaignRun`)
- Modify: `app/app.js:1758-1780` (`viewBattles`)
- Modify: `app/app.js:2609` (the render dispatcher's `battles` branch)
- Modify: `app/app.js:2648` (the click delegation, beside the existing `[data-bf]` handler)
- Modify: `app/components.css` (append)

**Interfaces:**
- Consumes: `newRun`, `seedPool`, `scoreRun`, `isRunComplete` from `campaign.js`.
- Produces:
  - `S.battleMode` — `"cards" | "march" | "campaign"`, default `"cards"`.
  - `S.campaignRun` — the live `Run` object or `null`.
  - `campaignState()` reads and `campaignSave(patch)` merges-and-writes to `store` key `"campaign"`, shape `{run, best:{score,max,at}, misses:{}}`.
  - `viewCampaign() -> string` — renders the start screen when `S.campaignRun` is null, otherwise delegates to the pass renderers added in Tasks 8–10.
  - `viewMarch() -> string` — a stub returning an empty `<div id="marchview">` until Task 11.

- [ ] **Step 1: Write the failing test**

Append to `test/nav.test.js`:

```js
/* The Battles view gains two sibling modes. These must NOT become nav
   entries: the rail is full at nine and the phone dock is deliberately
   four — a fifth dock tab is what clipped the labels to 9.5px. */
test("campaign and march are modes of Battles, not nav entries", () => {
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  const nav = src.slice(src.indexOf("const NAV = ["), src.indexOf("const COUNTS"));
  assert.ok(!/id:"campaign"/.test(nav), "campaign must not be a nav entry");
  assert.ok(!/id:"march"/.test(nav), "march must not be a nav entry");
  assert.ok(/function viewCampaign\(/.test(src), "viewCampaign is missing");
  assert.ok(/function viewMarch\(/.test(src), "viewMarch is missing");
});

test("the campaign run persists through the shared store helper", () => {
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  assert.ok(/store\.(get|set)\("campaign"/.test(src),
    "campaign state must go through store, which already prefixes hpatlas:");
  assert.ok(!/localStorage\.[gs]etItem\("hpatlas:campaign/.test(src),
    "do not bypass the store helper");
});
```

If `test/nav.test.js` does not already define `fs`, `path` and `ROOT`, add at the top of the file:

```js
const fs = require("fs");
const path = require("path");
const {ROOT} = require("./load");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/nav.test.js`
Expected: FAIL — `viewCampaign is missing`

- [ ] **Step 3: Add the state fields**

In the `S` object at `app/app.js:346-352`, add two fields beside `battleFilter`:

```js
  battleMode:"cards", campaignRun:null,
```

- [ ] **Step 4: Add persistence and the shell**

Add above `function viewBattles(){` in `app/app.js`:

```js
/* ---------- campaign persistence ----------
   One store key holds the in-progress run, the best result and the
   per-battle first-try miss counts that seed the next run's pool. Four
   passes plus sixteen chain rounds is a fifteen-minute session, so losing
   the run on a closed tab is worse than having no board at all: every
   placement writes through. */
function campaignState(){
  return store.get("campaign", {run:null, best:null, misses:{}});
}
function campaignSave(patch){
  const st = campaignState();
  store.set("campaign", Object.assign(st, patch));
}
function campaignStart(weak){
  const st = campaignState();
  S.campaignRun = newRun(D, {misses: st.misses, weak: !!weak});
  campaignSave({run: S.campaignRun});
}
/* Called after every graded placement. */
function campaignTouch(){
  const st = campaignState();
  const patch = {run: S.campaignRun};
  if(isRunComplete(S.campaignRun)){
    const s = scoreRun(S.campaignRun);
    const misses = Object.assign({}, st.misses);
    const got = runMisses(S.campaignRun);
    for(const id in got) misses[id] = (misses[id] || 0) + got[id];
    patch.misses = misses;
    patch.run = null;
    if(!st.best || s.score > st.best.score) patch.best = {score:s.score, max:s.max, at:Date.now()};
  }
  campaignSave(patch);
}

function viewCampaignStart(){
  const st = campaignState();
  const weakN = seedPool(D, st.misses, true).length;
  const hasWeak = weakN > 0 && weakN < D.battles.length;
  return '<div class="pagewrap campaign-start">'+
    '<p class="lede">Sixteen battles, four passes over the board — when, where, '+
    'who won — and the cause-to-consequence chain for each. Nothing here is new '+
    'material: every chip is one of the cards.</p>'+
    (st.best ? '<p class="best">Best so far: <b>'+st.best.score+' / '+st.best.max+'</b></p>' : '')+
    '<div class="chipset">'+
      (st.run ? '<button class="tog primary" type="button" data-cg="resume">Resume</button>' : '')+
      '<button class="tog" type="button" data-cg="new">'+(st.run ? 'Start over' : 'Start the campaign')+'</button>'+
      (hasWeak ? '<button class="tog" type="button" data-cg="weak">Weak set ('+weakN+')</button>' : '')+
    '</div></div>';
}

function viewCampaign(){
  if(!S.campaignRun) return viewCampaignStart();
  if(S.campaignRun.pass === "band")   return viewCampaignBand();
  if(S.campaignRun.pass === "year")   return viewCampaignYear();
  if(S.campaignRun.pass === "place")  return viewCampaignPlace();
  if(S.campaignRun.pass === "winner") return viewCampaignWinner();
  return viewCampaignChain();
}

/* Filled in by the March task; the shell renders the mode switch now. */
function viewMarch(){ return '<div class="pagewrap"><div id="marchview"></div></div>'; }
```

- [ ] **Step 5: Add the segmented control to `viewBattles`**

Replace the body of `viewBattles()` at `app/app.js:1758` so it opens with a mode switch and returns early for the two new modes. Insert immediately after `function viewBattles(){`:

```js
  const MODES = [["cards","Cards"],["march","March"],["campaign","Campaign"]];
  const modebar = '<div class="chipset modebar">'+MODES.map(m =>
    '<button class="tog" type="button" data-bm="'+m[0]+'" aria-pressed="'+
    (S.battleMode===m[0])+'">'+m[1]+'</button>').join('')+'</div>';
  if(S.battleMode === "march")    return modebar + viewMarch();
  if(S.battleMode === "campaign") return modebar + viewCampaign();
```

and prefix the existing `return '<div class="pagewrap">'+` with `modebar`, so the Cards branch reads:

```js
  return modebar + '<div class="pagewrap">'+
```

- [ ] **Step 6: Wire the clicks**

In the click delegation at `app/app.js:2648`, add beside the existing `[data-bf]` line:

```js
  const bm  = hit("[data-bm]");     if(bm){ S.battleMode = bm.dataset.bm; render(); return; }
  const cg  = hit("[data-cg]");     if(cg){
    const a = cg.dataset.cg;
    if(a === "resume") S.campaignRun = campaignState().run;
    else campaignStart(a === "weak");
    render(); return;
  }
```

- [ ] **Step 7: Confirm the calling convention — no import, no namespace**

There is nothing to wire. `campaign.js` loads as a plain `<script>` before `app.js`, so its top-level `function` and `var` declarations are already globals, and `app.js` calls them **bare**. This matches how `app.js` already uses `rounds.js` — `app/app.js:33` reads `const FACTS = buildFacts(D);`, not `rounds.buildFacts(D)`.

Do **not** introduce a namespace object or a `require` shim in `app.js`. The `module.exports` block at the foot of `campaign.js` exists only so `node --test` can load the module, and the guard makes it inert in the browser.

Verify no name collides before relying on this (all nineteen exported names were checked clean against `app.js`, `rounds.js`, `mapkit.js`, `sync.js` and `trends.js` when this plan was written):

Run: `grep -nE '\b(PASSES|buildChips|newRun|scoreRun|gradeBand|recordAttempt)\b' app/app.js app/rounds.js app/mapkit.js app/sync.js app/trends.js`
Expected: no output

- [ ] **Step 8: Add the mode bar styles**

Append to `app/components.css`:

```css
/* Battles mode switch — Cards / March / Campaign. Sits above the pagewrap
   so it does not scroll away from a long board. */
.modebar{margin:0 0 14px;padding:0 var(--pad,18px)}
.modebar .tog[aria-pressed="true"]{background:var(--accent);color:var(--bg)}
.campaign-start .best{margin:14px 0;color:var(--ink-2)}
.campaign-start .tog.primary{background:var(--accent);color:var(--bg);font-weight:600}
```

- [ ] **Step 9: Run tests**

Run: `node --test test/nav.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 10: Check it in the browser**

Open `index.html`, go to Battles, and confirm: three mode buttons appear; Cards is unchanged; Campaign shows the start screen with "Start the campaign"; clicking it does not throw (the pass renderers land in the next tasks, so a `ReferenceError` for `viewCampaignBand` here is expected and is what Task 8 fixes).

- [ ] **Step 11: Commit**

```bash
git add app/app.js app/components.css test/nav.test.js
git commit -m "feat: Cards/March/Campaign mode switch and the campaign shell"
```

---

### Task 8: Passes 1 and 2 — band and year

The board itself. Tap a chip to select it, tap a band to place it; then order each band.

**Files:**
- Modify: `app/app.js` (add `viewCampaignBand`, `viewCampaignYear`, `campaignPlaceChip`)
- Modify: `app/app.js` click delegation
- Modify: `app/components.css` (append)

**Interfaces:**
- Consumes: `buildChips`, `gradeBand`, `canonicalOrder`, `gradeYear`, `recordAttempt`, `campaignTouch` from Task 7.
- Produces:
  - `S.campaignSel` — the id of the currently selected chip, or `null`.
  - `campaignAdvance()` — moves `run.pass` to the next pass once every pooled chip has finished the current one.

- [ ] **Step 1: Add the selection state and the chip index**

In the `S` object, beside `campaignRun`, add:

```js
  campaignSel:null,
```

The chip set is derived from `D` and never changes, so build it once at load rather than per lookup. Add beside `const FACTS = buildFacts(D);` at `app/app.js:33`, matching that existing pattern:

```js
const CHIPS = buildChips(D);
const CHIPS_BY_ID = Object.fromEntries(CHIPS.map(ch => [ch.id, ch]));
```

- [ ] **Step 2: Write the band pass renderer**

Add to `app/app.js` after `viewCampaignStart`:

```js
/* Tap-to-select, then tap-to-place. Never HTML5 drag: it is unusable on
   touch, and this app is phone-first. */
function campaignPool(){
  const run = S.campaignRun, pass = run.pass;
  return run.pool.filter(id => !(run.done[id] || {})[pass]);
}
function campaignChip(id){
  return CHIPS_BY_ID[id];
}
function campaignAdvance(){
  const run = S.campaignRun;
  const pass = run.pass;
  const left = run.pool.some(id => !(run.done[id] || {})[pass]);
  if(left) return;
  const i = PASSES.indexOf(pass);
  if(i < PASSES.length - 1) run.pass = PASSES[i + 1];
  S.campaignSel = null;
}

function campaignHeader(label, hint){
  const run = S.campaignRun;
  const s = scoreRun(run);
  const left = campaignPool().length;
  return '<div class="cg-head"><div><h3>'+label+'</h3><p>'+hint+'</p></div>'+
    '<span class="cg-score">'+s.score+' / '+s.max+'</span></div>'+
    '<div class="cg-prog"><i style="width:'+
      Math.round(100 * (run.pool.length - left) / run.pool.length)+'%"></i></div>';
}

function campaignChipRow(ids){
  return '<div class="cg-pool">'+ids.map(id => {
    const ch = campaignChip(id);
    return '<button class="cg-chip'+(S.campaignSel===id?" sel":"")+'" type="button" '+
      'data-cgchip="'+id+'" aria-pressed="'+(S.campaignSel===id)+'">'+ch.name+'</button>';
  }).join('')+'</div>';
}

function viewCampaignBand(){
  const pool = campaignPool();
  const bands = D.eras.map(e => {
    const run = S.campaignRun;
    const inBand = run.pool.filter(id =>
      (run.done[id] || {}).band && (run.band || {})[id] === e.id);
    return '<button class="cg-band" type="button" data-cgband="'+e.id+'" '+
      'style="--ec:var('+e.v+')"><span class="nm">'+e.name+'</span>'+
      '<span class="sp">'+e.span+'</span>'+
      '<span class="got">'+inBand.map(id => campaignChip(id).name).join(' · ')+'</span></button>';
  }).join('');
  return '<div class="pagewrap cg">'+
    campaignHeader("Pass 1 — When", "Tap a battle, then tap the era it belongs to.")+
    campaignChipRow(pool)+
    '<div class="cg-bands">'+bands+'</div></div>';
}

function viewCampaignYear(){
  const run = S.campaignRun;
  /* Ordering runs over the AUTHORED band, not wherever the reader put the
     chip in pass 1 — pass 1 grades leniently, so following the reader's
     choice through would make the slots non-deterministic. */
  const bands = D.eras.filter(e => canonicalOrder(D, e.id).length)
    .map(e => {
      const order  = canonicalOrder(D, e.id).filter(id => run.pool.indexOf(id) >= 0);
      const placed = (run.year || {})[e.id] || [];
      const left   = order.filter(id => placed.indexOf(id) < 0);
      const slots  = order.map((_, i) => {
        const id = placed[i];
        return '<span class="cg-slot'+(id?" full":"")+'">'+
          (id ? campaignChip(id).name+' <i>'+campaignChip(id).yr+'</i>' : (i+1))+'</span>';
      }).join('');
      return '<div class="cg-yband" style="--ec:var('+e.v+')">'+
        '<h4>'+e.name+' <span>'+e.span+'</span></h4>'+
        '<div class="cg-slots">'+slots+'</div>'+
        '<div class="cg-pool">'+left.map(id =>
          '<button class="cg-chip" type="button" data-cgyear="'+e.id+'|'+id+'">'+
          campaignChip(id).name+'</button>').join('')+'</div></div>';
    }).join('');
  return '<div class="pagewrap cg">'+
    campaignHeader("Pass 2 — Order", "Earliest first. Tap the battle that comes next in each era.")+
    bands+'</div>';
}
```

- [ ] **Step 3: Wire the clicks**

Add to the click delegation, after the `[data-cg]` handler:

```js
  const cc = hit("[data-cgchip]");  if(cc){
    S.campaignSel = (S.campaignSel === cc.dataset.cgchip) ? null : cc.dataset.cgchip;
    render(); return;
  }
  const cb = hit("[data-cgband]");  if(cb){
    if(!S.campaignSel){ toast("Pick a battle first"); return; }
    const run = S.campaignRun, id = S.campaignSel, band = cb.dataset.cgband;
    const ok = gradeBand(D, campaignChip(id), band);
    recordAttempt(run, id, "band", ok);
    if(ok){
      run.band = run.band || {};
      /* The board snaps the chip to its AUTHORED era even when the reader
         picked a different, equally defensible overlapping band — pass 2
         needs one deterministic home per chip. */
      run.band[id] = campaignChip(id).era;
      S.campaignSel = null;
      campaignAdvance();
    } else toast("Not that era — try again");
    campaignTouch(); render(); return;
  }
  const cy = hit("[data-cgyear]");  if(cy){
    const parts = cy.dataset.cgyear.split("|"), era = parts[0], id = parts[1];
    const run = S.campaignRun;
    run.year = run.year || {};
    run.year[era] = run.year[era] || [];
    const ok = gradeYear(D, era, run.year[era].length, id);
    recordAttempt(run, id, "year", ok);
    if(ok){ run.year[era].push(id); campaignAdvance(); }
    else toast("Something came before that one");
    campaignTouch(); render(); return;
  }
```

- [ ] **Step 4: Add the board styles**

Append to `app/components.css`:

```css
/* ---------- Campaign board ---------- */
.cg{padding-bottom:40px}
.cg-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px}
.cg-head h3{margin:0;font-size:1.05rem}
.cg-head p{margin:2px 0 0;color:var(--ink-2);font-size:.85rem}
.cg-score{font-variant-numeric:tabular-nums;font-weight:700;color:var(--gold)}
.cg-prog{height:3px;background:var(--line);border-radius:2px;overflow:hidden;margin-bottom:16px}
.cg-prog i{display:block;height:100%;background:var(--accent);transition:width .25s}
.cg-pool{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}
.cg-chip{border:1px solid var(--line);background:var(--card);color:var(--ink);
  border-radius:999px;padding:7px 13px;font:inherit;font-size:.85rem;cursor:pointer;
  min-height:38px}
.cg-chip.sel{background:var(--accent);color:var(--bg);border-color:var(--accent)}
.cg-bands{display:grid;gap:8px}
.cg-band{display:grid;gap:2px;text-align:left;border:1px solid var(--line);
  border-left:3px solid var(--ec);background:var(--card);color:var(--ink);
  border-radius:10px;padding:11px 13px;font:inherit;cursor:pointer;min-height:56px}
.cg-band .nm{font-weight:600}
.cg-band .sp,.cg-band .got{font-size:.8rem;color:var(--ink-2)}
.cg-band .got:empty{display:none}
.cg-yband{border-left:3px solid var(--ec);padding-left:12px;margin-bottom:20px}
.cg-yband h4{margin:0 0 8px;font-size:.95rem}
.cg-yband h4 span{font-weight:400;color:var(--ink-2);font-size:.82rem}
.cg-slots{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:9px}
.cg-slot{border:1px dashed var(--line);border-radius:8px;padding:6px 11px;
  font-size:.82rem;color:var(--ink-2);min-width:34px;text-align:center}
.cg-slot.full{border-style:solid;color:var(--ink)}
.cg-slot i{color:var(--ink-2);font-style:normal}
@media(max-width:560px){.cg-chip{font-size:.8rem;padding:7px 11px}}
```

- [ ] **Step 5: Verify in the browser**

Open `index.html` → Battles → Campaign → Start. Confirm: tapping a chip highlights it; tapping the right era clears it from the pool and shows it under that band; tapping a wrong era toasts and the chip stays; the score only rises on first-try successes; when the pool empties the view becomes "Pass 2 — Order"; ordering a band out of sequence toasts and does not fill the slot.

- [ ] **Step 6: Commit**

```bash
git add app/app.js app/components.css
git commit -m "feat: campaign passes 1 and 2 — era bands and year ordering"
```

---

### Task 9: Passes 3 and 4 — place and winner

The map pass and the winner pass. This is where the pointer-capture trap lives.

**Files:**
- Modify: `app/app.js` (add `viewCampaignPlace`, `viewCampaignWinner`, `mountCampaignMap`)
- Modify: `app/app.js` render dispatcher (call `mountCampaignMap()` for the place pass)
- Modify: `app/components.css` (append)
- Modify: `test/harness.html` (append checks)

**Interfaces:**
- Consumes: `gradePlace`, `gradeWinner`, `sideOrder`, `mapkit` as already used by `viewMap`/`mountMap`.
- Produces: `mountCampaignMap()` — attaches pointer handlers to the campaign map, matching the existing `mountMap()` drag-threshold pattern.

- [ ] **Step 1: Read the existing map mounting code**

Read `mountMap()` in `app/app.js` end to end before writing anything. The campaign map must reuse its pointer pattern exactly: record the element at `pointerdown`, take capture **only after** movement crosses the drag threshold, and act on `pointerup` against the recorded element. Calling `setPointerCapture` on `pointerdown` retargets the subsequent `click` to the `<svg>`, so `closest()` never matches and every tap is silently swallowed — this has broken this app before.

- [ ] **Step 2: Write the place and winner renderers**

Add to `app/app.js`:

```js
function viewCampaignPlace(){
  const pool = campaignPool();
  const id = pool[0];
  const ch = campaignChip(id);
  const pts = Object.entries(MAP.places)
    .filter(([, p]) => p.k === "battle")
    .map(([pid, p]) => '<circle class="cg-pt" data-cgplace="'+pid+'" cx="'+p.x+'" cy="'+p.y+'" r="13"/>'+
      '<text class="cg-ptl" x="'+p.x+'" y="'+(p.y - 17)+'">'+p.n+'</text>').join('');
  const paths = Object.entries(MAP.paths).map(([n, d]) =>
    '<path class="dist" d="'+d+'" data-name="'+n+'"/>').join('');
  return '<div class="pagewrap cg">'+
    campaignHeader("Pass 3 — Where", "Tap the place this was fought.")+
    '<p class="cg-ask">'+ch.name+'</p>'+
    '<svg id="cgmap" viewBox="0 0 1000 1000" role="img" aria-label="Map of Himachal Pradesh">'+
      paths+pts+'</svg></div>';
}

function viewCampaignWinner(){
  const pool = campaignPool();
  const id = pool[0];
  const ch = campaignChip(id);
  /* Twelve of sixteen have winSide 0. Without this shuffle, always-tap-left
     scores 12/16 while knowing nothing. */
  const order = sideOrder(id, S.campaignRun.salt);
  return '<div class="pagewrap cg">'+
    campaignHeader("Pass 4 — Who won", "Tap the side that came out on top.")+
    '<p class="cg-ask">'+ch.name+' <span>'+ch.yr+'</span></p>'+
    '<div class="cg-sides">'+order.map(i =>
      '<button class="cg-side" type="button" data-cgwin="'+i+'">'+ch.sides[i]+'</button>'
    ).join('<span class="vs">vs</span>')+'</div></div>';
}
```

- [ ] **Step 3: Mount the map with the safe pointer pattern**

Add to `app/app.js`:

```js
/* Mirrors mountMap()'s drag discipline: capture is taken only once movement
   passes the threshold, and the action fires on pointerup against the element
   recorded at pointerdown. Do not simplify this to a click handler with
   pointer capture on pointerdown — that is the bug that silently swallowed
   every map tap. */
function mountCampaignMap(){
  const svg = $("#cgmap"); if(!svg) return;
  const DRAG = 8;
  let down = null, moved = false;
  svg.addEventListener("pointerdown", e => {
    down = e.target.closest("[data-cgplace]");
    moved = false;
  });
  svg.addEventListener("pointermove", e => {
    if(!down || moved) return;
    if(Math.abs(e.movementX) + Math.abs(e.movementY) > DRAG){
      moved = true;
      svg.setPointerCapture(e.pointerId);
    }
  });
  svg.addEventListener("pointerup", () => {
    const el = down; down = null;
    if(!el || moved) return;
    const run = S.campaignRun;
    const id = campaignPool()[0];
    const ok = gradePlace(campaignChip(id), el.dataset.cgplace);
    recordAttempt(run, id, "place", ok);
    if(ok) campaignAdvance(); else toast("Not there — look again");
    campaignTouch(); render();
  });
}
```

In the render dispatcher, change the `battles` branch to mount the map when the campaign is on the place pass:

```js
  else if(S.view === "battles") {
    s.innerHTML = viewBattles();
    if(S.battleMode === "campaign" && S.campaignRun && S.campaignRun.pass === "place") mountCampaignMap();
    else paintSelection();
  }
```

- [ ] **Step 4: Wire the winner click**

Add to the click delegation:

```js
  const cw = hit("[data-cgwin]");   if(cw){
    const run = S.campaignRun, id = campaignPool()[0];
    const ok = gradeWinner(campaignChip(id), +cw.dataset.cgwin);
    recordAttempt(run, id, "winner", ok);
    if(ok) campaignAdvance(); else toast("The other side");
    campaignTouch(); render(); return;
  }
```

- [ ] **Step 5: Add the styles**

Append to `app/components.css`:

```css
.cg-ask{font-size:1.15rem;font-weight:600;margin:0 0 14px}
.cg-ask span{font-weight:400;color:var(--ink-2);font-size:.9rem}
#cgmap{width:100%;height:auto;max-height:62vh;touch-action:manipulation}
#cgmap .dist{fill:var(--card);stroke:var(--line);stroke-width:1.5}
.cg-pt{fill:var(--accent);opacity:.55;cursor:pointer}
.cg-pt:hover{opacity:1}
.cg-ptl{fill:var(--ink-2);font-size:15px;text-anchor:middle;pointer-events:none}
.cg-sides{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cg-side{flex:1 1 220px;min-height:64px;border:1px solid var(--line);background:var(--card);
  color:var(--ink);border-radius:12px;padding:14px;font:inherit;font-size:.95rem;
  text-align:left;cursor:pointer}
.cg-side:hover{border-color:var(--accent)}
.cg-sides .vs{color:var(--ink-2);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em}
@media(max-width:560px){.cg-side{flex:1 1 100%}}
```

- [ ] **Step 6: Add the interaction harness checks**

Append inside the async test body of `test/harness.html`, following the existing map checks:

```js
/* The campaign map must answer a tap and ignore a drag. This is the same
   discipline the Atlas map needs and the same bug it once had. */
{
  const doc = document.getElementById("app").contentDocument;
  const win = document.getElementById("app").contentWindow;
  win.location.hash = "#/battles";
  await wait(120);
  win.S.battleMode = "campaign";
  win.campaignStart(false);
  /* Fast-forward to the place pass without playing passes 1 and 2. */
  for(const id of win.S.campaignRun.pool){
    win.recordAttempt(win.S.campaignRun, id, "band", true);
    win.recordAttempt(win.S.campaignRun, id, "year", true);
  }
  win.S.campaignRun.pass = "place";
  win.render();
  await wait(120);

  const target = doc.querySelector('[data-cgplace]');
  check("campaign map renders its place targets", !!target);

  const before = win.scoreRun(win.S.campaignRun).score;
  pointerAt(target, "pointerdown", 10, 10);
  pointerAt(target, "pointermove", 200, 200);
  pointerAt(target, "pointerup", 200, 200);
  await wait(60);
  check("a drag across the campaign map places nothing",
    win.scoreRun(win.S.campaignRun).score === before);

  const first = win.S.campaignRun.pool[0];
  const right = doc.querySelector('[data-cgplace="' +
    win.D.battles.find(b => b.id === first).place + '"]');
  pointerAt(right, "pointerdown", 10, 10);
  pointerAt(right, "pointerup", 10, 10);
  await wait(60);
  check("a tap on the right place scores",
    win.scoreRun(win.S.campaignRun).score === before + 1);
}
```

- [ ] **Step 7: Run the harness**

Open `test/harness.html` in a browser and read the output.
Expected: every campaign line reports PASS and the count of FAIL lines is zero.

- [ ] **Step 8: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: campaign passes 3 and 4 — the map and the winner, drag-safe"
```

---

### Task 10: The chain round and the lock-in card

**Files:**
- Modify: `app/app.js` (add `viewCampaignChain`, `viewCampaignDone`)
- Modify: `app/app.js` click delegation
- Modify: `app/components.css` (append)

**Interfaces:**
- Consumes: `shuffleChain`, `CHAIN_KEYS`, `gradeChain`, `isRunComplete`, `scoreRun`.
- Produces: `S.campaignRun.chain` — `{chipId: Array<string>}`, the keys the reader has placed so far for each chip.

- [ ] **Step 1: Write the chain renderer**

Add to `app/app.js`:

```js
function viewCampaignChain(){
  const run = S.campaignRun;
  if(isRunComplete(run)) return viewCampaignDone();
  const id = campaignPool()[0];
  const ch = campaignChip(id);
  run.chain = run.chain || {};
  const placed = run.chain[id] || [];
  const parts  = shuffleChain(D, id, run.salt);
  const left   = parts.filter(p => placed.indexOf(p.key) < 0);
  const byKey  = k => parts.find(p => p.key === k);
  return '<div class="pagewrap cg">'+
    campaignHeader("Chain", "Cause, then course, then result, then why it matters.")+
    '<p class="cg-ask">'+ch.name+' <span>'+ch.yr+'</span></p>'+
    '<ol class="cg-chain">'+CHAIN_KEYS.map((k, i) => {
      const got = placed[i];
      return '<li class="'+(got?"full":"")+'">'+
        (got ? '<b>'+byKey(got).label+'</b><p>'+byKey(got).text+'</p>'
             : '<span class="slot">Slot '+(i+1)+'</span>')+'</li>';
    }).join('')+'</ol>'+
    '<div class="cg-parts">'+left.map(p =>
      '<button class="cg-part" type="button" data-cgchain="'+p.key+'"><p>'+p.text+'</p></button>'
    ).join('')+'</div></div>';
}

function viewCampaignDone(){
  const run = S.campaignRun;
  const s = scoreRun(run);
  const missed = runMisses(run);
  const ids = Object.keys(missed).sort((a, b) => missed[b] - missed[a]);
  return '<div class="pagewrap cg cg-done">'+
    '<h3>Campaign complete</h3>'+
    '<p class="cg-final">'+s.score+' <span>/ '+s.max+'</span></p>'+
    (ids.length
      ? '<p class="lede">These are the ones that cost you. They come first next time.</p>'+
        '<div class="cg-pool">'+ids.map(id =>
          '<button class="cg-chip" type="button" data-c="'+id+'">'+campaignChip(id).name+
          ' <i>'+missed[id]+'</i></button>').join('')+'</div>'
      : '<p class="lede">Clean sweep — every chip first try.</p>')+
    '<div class="chipset">'+
      '<button class="tog" type="button" data-bm="march">Watch the march</button>'+
      '<button class="tog" type="button" data-cg="new">Play again</button>'+
    '</div></div>';
}
```

- [ ] **Step 2: Wire the click**

Add to the click delegation:

```js
  const cn = hit("[data-cgchain]"); if(cn){
    const run = S.campaignRun, id = campaignPool()[0];
    run.chain = run.chain || {};
    run.chain[id] = run.chain[id] || [];
    const want = CHAIN_KEYS[run.chain[id].length];
    const ok = cn.dataset.cgchain === want;
    if(ok){
      run.chain[id].push(cn.dataset.cgchain);
      if(run.chain[id].length === CHAIN_KEYS.length){
        /* Always `true` here: the pass IS complete. recordAttempt zeroes the
           mark by itself if a wrong part was tapped earlier. Passing `false`
           would leave run.done[id].chain unset and the chip could never
           leave the pool — an infinite chain round. */
        recordAttempt(run, id, "chain", true);
        campaignAdvance();
      }
    } else {
      recordAttempt(run, id, "chain", false);
      toast("Something comes before that");
    }
    campaignTouch(); render(); return;
  }
```

Note the asymmetry, and keep it: a wrong part records the miss immediately so the mark is lost, but the chain only records *correct* once all four are in, because a chain is right only in full.

- [ ] **Step 3: Add the styles**

Append to `app/components.css`:

```css
.cg-chain{list-style:none;counter-reset:ch;margin:0 0 18px;padding:0;display:grid;gap:8px}
.cg-chain li{border:1px dashed var(--line);border-radius:10px;padding:11px 13px;min-height:46px}
.cg-chain li.full{border-style:solid;background:var(--card)}
.cg-chain li b{display:block;font-size:.78rem;text-transform:uppercase;
  letter-spacing:.07em;color:var(--gold);margin-bottom:4px}
.cg-chain li p{margin:0;font-size:.88rem;line-height:1.5}
.cg-chain .slot{color:var(--ink-2);font-size:.85rem}
.cg-parts{display:grid;gap:8px}
.cg-part{border:1px solid var(--line);background:var(--card);color:var(--ink);
  border-radius:10px;padding:12px 13px;font:inherit;text-align:left;cursor:pointer}
.cg-part:hover{border-color:var(--accent)}
.cg-part p{margin:0;font-size:.88rem;line-height:1.5}
.cg-done .cg-final{font-size:2.6rem;font-weight:700;color:var(--gold);margin:6px 0 14px;
  font-variant-numeric:tabular-nums}
.cg-done .cg-final span{font-size:1.1rem;color:var(--ink-2);font-weight:400}
.cg-done .cg-chip i{font-style:normal;color:var(--ink-2)}
```

- [ ] **Step 4: Play a full run in the browser**

Open `index.html` → Battles → Campaign → Start, and play all the way through: sixteen bands, the year ordering, sixteen map taps, sixteen winners, sixteen chains. Confirm the completion screen shows a score out of 80, lists the missed chips, and that reopening Campaign afterwards offers a fresh start rather than a stale resume.

- [ ] **Step 5: Add the resume check to the harness**

A fifteen-minute board that loses its run on a closed tab is worse than no board, so resume gets a test rather than a manual look. Append inside the async test body of `test/harness.html`:

```js
/* Resume. Play part of a board, reload the frame, and assert the run comes
   back on the same pass with the same chips placed and the same score. */
{
  const frame = document.getElementById("app");
  const win0 = frame.contentWindow;
  win0.location.hash = "#/battles";
  await wait(120);
  win0.S.battleMode = "campaign";
  win0.campaignStart(false);
  const first = win0.S.campaignRun.pool[0];
  const second = win0.S.campaignRun.pool[1];
  win0.recordAttempt(win0.S.campaignRun, first, "band", true);
  win0.recordAttempt(win0.S.campaignRun, second, "band", false);
  win0.recordAttempt(win0.S.campaignRun, second, "band", true);
  win0.campaignTouch();
  const wantScore = win0.scoreRun(win0.S.campaignRun).score;
  check("a partial run scores one of two first-try", wantScore === 1);

  await new Promise(r => { frame.onload = r; frame.contentWindow.location.reload(); });
  await wait(250);
  const win1 = frame.contentWindow;
  win1.location.hash = "#/battles";
  await wait(120);
  win1.S.battleMode = "campaign";
  win1.S.campaignRun = win1.campaignState().run;
  check("the run survives a reload", !!win1.S.campaignRun);
  check("resume restores the same pass",
    win1.S.campaignRun && win1.S.campaignRun.pass === "band");
  check("resume restores the placed chips",
    win1.S.campaignRun && win1.S.campaignRun.done[first] &&
    win1.S.campaignRun.done[first].band === true);
  check("resume restores the score",
    win1.S.campaignRun && win1.scoreRun(win1.S.campaignRun).score === wantScore);
  /* Leave no run behind for the checks that follow. */
  win1.campaignSave({run: null});
}
```

- [ ] **Step 6: Run the harness**

Open `test/harness.html` in a browser.
Expected: every resume line reports PASS, zero FAIL lines overall.

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: campaign chain round, completion screen and a resume test"
```

---

### Task 11: March — the scrubber and the replay

**Files:**
- Modify: `app/app.js` (replace the `viewMarch` stub, add `mountMarch`)
- Modify: `app/app.js` render dispatcher
- Modify: `app/components.css` (append)

**Interfaces:**
- Consumes: `buildChips`, `MAP.places`, `MAP.paths`, `campaignState`.
- Produces:
  - `S.marchAt` — integer index into the chronological chip list, default `0`.
  - `mountMarch()` — wires the range input.

- [ ] **Step 1: Add the state field**

In the `S` object, beside `campaignSel`, add:

```js
  marchAt:0,
```

- [ ] **Step 2: Replace the stub**

Replace the `viewMarch` stub from Task 7 with:

```js
/* The read half: no scoring, no pressure. It doubles as the replay — after
   a run, each chip is tinted by whether the reader got it first try. */
function viewMarch(){
  const st = campaignState();
  const marks = (st.run && st.run.marks) || {};
  /* CHIPS is built once at load (app.js:33) and is already chronological. */
  const at = Math.min(S.marchAt, CHIPS.length - 1);
  const shown = CHIPS.slice(0, at + 1);
  const cur = CHIPS[at];
  const paths = Object.entries(MAP.paths).map(([n, d]) =>
    '<path class="dist" d="'+d+'" data-name="'+n+'"/>').join('');
  const pins = shown.map((ch, i) => {
    const p = MAP.places[ch.place]; if(!p) return "";
    const m = marks[ch.id];
    const cls = !m ? "" : (Object.keys(m).every(k => m[k] === 1) ? " ok" : " off");
    return '<circle class="mc-pin'+cls+(i === at ? " now" : "")+'" cx="'+p.x+'" cy="'+p.y+
      '" r="'+(i === at ? 16 : 9)+'" style="--ec:var('+ERA[ch.era].v+')"/>';
  }).join('');
  return '<div class="pagewrap mc">'+
    '<svg id="mcmap" viewBox="0 0 1000 1000" role="img" '+
      'aria-label="Battles of Himachal Pradesh in chronological order">'+paths+pins+'</svg>'+
    '<input id="mcscrub" type="range" min="0" max="'+(CHIPS.length - 1)+'" value="'+at+'" '+
      'aria-label="Scrub through the battles in order">'+
    '<div class="mc-cap" style="--ec:var('+ERA[cur.era].v+')">'+
      '<span class="yr">'+cur.yr+'</span>'+
      '<button class="nm" type="button" data-c="'+cur.id+'">'+cur.name+'</button>'+
      '<p>'+D.battles.find(b => b.id === cur.id).sig.split(". ")[0]+'.</p>'+
    '</div></div>';
}

function mountMarch(){
  const r = $("#mcscrub"); if(!r) return;
  r.addEventListener("input", e => { S.marchAt = +e.target.value; render(); });
}
```

- [ ] **Step 3: Mount it from the dispatcher**

Extend the `battles` branch of the render dispatcher:

```js
  else if(S.view === "battles") {
    s.innerHTML = viewBattles();
    if(S.battleMode === "march") mountMarch();
    else if(S.battleMode === "campaign" && S.campaignRun && S.campaignRun.pass === "place") mountCampaignMap();
    else paintSelection();
  }
```

- [ ] **Step 4: Add the styles**

Append to `app/components.css`:

```css
.mc #mcmap{width:100%;height:auto;max-height:56vh}
.mc #mcmap .dist{fill:var(--card);stroke:var(--line);stroke-width:1.5}
.mc-pin{fill:var(--ec);opacity:.7;transition:r .2s}
.mc-pin.now{opacity:1;stroke:var(--bg);stroke-width:3}
.mc-pin.ok{fill:var(--ok,#69B487)}
.mc-pin.off{fill:var(--warn,#D9A441)}
#mcscrub{width:100%;margin:14px 0 12px;accent-color:var(--accent);min-height:34px}
.mc-cap{border-left:3px solid var(--ec);padding:2px 0 2px 13px}
.mc-cap .yr{font-size:.8rem;color:var(--ink-2);font-variant-numeric:tabular-nums}
.mc-cap .nm{display:block;background:none;border:0;padding:0;color:var(--ink);
  font:inherit;font-size:1.1rem;font-weight:600;text-align:left;cursor:pointer}
.mc-cap p{margin:5px 0 0;font-size:.88rem;line-height:1.5;color:var(--ink-2)}
```

- [ ] **Step 5: Verify in the browser**

Open Battles → March. Dragging the slider should light battles cumulatively from 1009 to 1948 with the caption updating; tapping the battle name in the caption should open its record. After finishing a Campaign run, March should tint the pins green and amber.

- [ ] **Step 6: Commit**

```bash
git add app/app.js app/components.css
git commit -m "feat: March — the scrubber, and the replay of a finished run"
```

---

### Task 12: Ship it

**Files:**
- Modify: `sw.js:3` (bump `CACHE`)
- Modify: `README.md` (module list and a Campaign section)
- Regenerate: `../hp-revision.html` via `build-single.sh`
- Regenerate: `r/` and `sitemap.xml` via `tools/build-pages.js` (the battle records changed)

- [ ] **Step 1: Run every test**

Run: `for f in test/*.test.js; do echo "== $f"; node --test "$f" || exit 1; done`
Expected: every file reports `fail 0`

- [ ] **Step 2: Run the interaction harness**

Open `test/harness.html` in a browser.
Expected: zero FAIL lines.

- [ ] **Step 3: Bump the service worker cache**

In `sw.js:3`, change `const CACHE = "parikrama-v68";` to `const CACHE = "parikrama-v69";` and confirm `"app/campaign.js"` is in `ASSETS` from Task 3.

- [ ] **Step 4: Rebuild the pre-rendered record pages**

The battle records gained `winSide`, so re-run the generator.

Run: `node tools/build-pages.js`
Then: `node --test test/pages.test.js`
Expected: PASS, `fail 0`

- [ ] **Step 5: Rebuild the single-file copy**

Run: `./build-single.sh`
Then verify the module actually made it in: `grep -c "function buildChips" ../hp-revision.html`
Expected: at least `1`

- [ ] **Step 6: Document it**

In `README.md`, add `app/campaign.js` to the structure block after the `app/rounds.js` line:

```
app/campaign.js             the battles game: chips, grading, run state
```

and add a section after the existing Rounds documentation:

```markdown
## Campaign

The sixteen battle records are read-only cards, which teaches nothing that
sticks. Campaign turns them into a board reached from Battles → Campaign:
four passes (era band, year order, place on the map, who won) and a
cause → course → result → why-it-matters chain per battle, scored five marks
a chip out of eighty, marks earned on the first try only.

Two rules exist because the data has two traps. Era spans **overlap** —
e6 is 1752–1846 and e7 is 1790–1816 — so Mahal Morian (1806, authored e7) and
the Relief of Kangra (1809, authored e6) are indistinguishable to a reader; the
band pass therefore accepts the authored era *or* any era whose numeric span
contains the year. And `winner` is prose for a reader ("Gorkhas (tactically)")
while `outcome` reads from the hill states' point of view — Bhangani is
`outcome:"loss"` though `sides[0]` won it — so each record carries
`winSide: 0|1`. Twelve of sixteen are side 0, so the winner pass shuffles which
side it shows first; remove the shuffle and always-tap-left scores 12/16.

All grading lives in `app/campaign.js`, which touches no DOM and is tested by
`test/campaign.test.js` under `node --test`. Misses are counted per battle and
seed the next run's pool most-missed-first, which is what makes it a revision
loop rather than a quiz. The map pass follows `mountMap()`'s drag discipline:
pointer capture only after the drag threshold, action on `pointerup`.

**March** is the same sixteen without the scoring — a scrubber from 1009 to
1948 that lights each battle on the map in turn. After a run it replays it,
green for first-try, amber for the rest.
```

- [ ] **Step 7: Commit**

`../hp-revision.html` is **outside this repository** (it lives beside it in `~/Downloads/prep/`) — do not try to `git add` it, the command fails with "outside repository at …". It is regenerated, not committed.

```bash
git add sw.js README.md r sitemap.xml
git commit -m "chore: ship Campaign — cache bump and rebuilt record pages"
```

- [ ] **Step 8: Final verification**

Run: `git status --short`
Expected: clean tree.

Then hard-reload the app in a browser (the service worker must fetch `v69`), play a full campaign, close the tab mid-run, reopen, and confirm Resume restores the same pass with the same chips placed.

---

## Notes for the implementer

- **`D` and `MAP` are globals.** Data files assign onto them; there is no import. `test/load.js` evaluates the data files with those names pre-seeded.
- **Match the surrounding style.** `app/rounds.js` and `app/campaign.js` are ES5-flavoured (`var`, `function`, no arrow functions) because they are the pure modules; `app/app.js` uses `const`/arrow functions freely. Follow whichever file you are in.
- **`toast()` already exists** at `app/app.js:73` and queues messages. Use it for wrong answers; do not add a second notification mechanism.
- **Do not add a nav entry.** If a task seems to want one, re-read the constraint — the rail is nine deep and the dock is four by design.
