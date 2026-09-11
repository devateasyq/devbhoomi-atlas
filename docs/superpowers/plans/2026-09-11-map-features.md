# Clickable Map Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every peak, pass, lake and glacier its own clickable map marker and detail record, at the depth `D.rivers` already has.

**Architecture:** Parikrama is plain static files; the map is its Atlas view. A new `data/features.js` holds ~62 records keyed to existing `MAP.places` markers by a `pid` field. A new `app/mapkit.js` holds the pure, DOM-free map logic — marker glyphs, greedy label de-collision, and the legend visibility reducer — so the tricky parts are unit-testable in Node without a DOM, and `app/app.js` (already 1085 lines) does not grow another 250. `app/app.js` wires them in: rendering, legend events, the detail panel, search and flashcards.

**Tech Stack:** Plain ES5-compatible browser JavaScript, no framework, no build step, no runtime dependencies. Tests run on Node's built-in `node --test` (Node 25 is installed) plus a committed in-browser harness for pointer interaction.

## Global Constraints

- **Run tests with `node --test` (no path argument).** `node --test test/` is broken on the installed Node 25.2.1 and reports a spurious failure. Note that plain `node --test` also picks up `test/load.js` as a vacuous test file; that is expected.
- **Zero runtime dependencies.** No npm packages ship to the browser. `test/` may not import anything outside Node's stdlib.
- **No build step.** `index.html` loads plain `<script src>` tags; every file defines globals. `app/mapkit.js` additionally ends with a `typeof module` guard so Node tests can require it.
- **Record ids are namespaced:** `pk-` peaks, `ps-` passes, `lk-` lakes, `gl-` glaciers. Existing prefixes `d- s- ev- b- p- t-` are unchanged. River ids are bare names (`"Sutlej"`) — do not "fix" them.
- **`rel` must be wired in both directions.** For the 62 new records the reverse direction is *generated*, never hand-typed (see Task 14).
- **Pointer capture is taken ONLY after the drag threshold is crossed.** Calling `svg.setPointerCapture()` on `pointerdown` retargets the subsequent `click` to the `<svg>`, so `e.target.closest(".mk")` never matches and every map click is silently swallowed. This bug has shipped once. Do not reintroduce it.
- **Map projection is fixed:** `x = 292.5745 * lng - 22112.4202`, `y = -344.3249 * lat + 11450.7708`. Max residual over the 123 existing markers is 0.068 units. Every new marker must use it.
- **Bump `CACHE` in `sw.js`** after any asset change, or returning visitors keep the stale version.
- Content is exam-prep material. Prose depth matches the existing Sutlej/Beas entries: 2–3 paragraphs plus one `["note","Exam hook",...]` block.

---

## File Structure

**Create:**
- `app/mapkit.js` — pure map logic: `LAYERS`, `mkGlyph()`, `placeLabels()`, `layerToggle()`, `layerIsolate()`. No DOM, no `D`.
- `data/features.js` — `D.features`, ~62 records.
- `test/load.js` — loads the browser data files into a plain object under Node.
- `test/data.test.js` — data-integrity assertions.
- `test/mapkit.test.js` — unit tests for `app/mapkit.js`.
- `test/harness.html` — in-browser pointer and legend interaction tests.

**Modify:**
- `data/geo.js:6` — add 12 glacier entries to `MAP.places`.
- `app/app.js` — `KINDS`/`KIND_ORDER`/`IDX` (lines 9–23), `locatorFor` (150–178), `openRec` (216–330), `placeTarget` (363–375), `viewMap` (376–437), `applyZoom` (439–448), `mountMap` (455–535), `buildCards` (684–711), `SEARCH` (910–930).
- `app/components.css` — glyph and legend-button rules.
- `index.html:92` — script tags.
- `sw.js:6-7` — cache name and precache list.
- `build-single.sh:11-14` — the module list, which must stay in step with `index.html`.

---

### Task 1: Test scaffolding

Establishes the Node test harness every later task extends. It asserts only things already true of the current data, so it must pass before any feature work.

**Files:**
- Create: `test/load.js`
- Create: `test/data.test.js`

**Interfaces:**
- Produces: `loadData()` returning `{D, MAP}` — `D` is the aggregated data object, `MAP` the map geometry. Used by every later data test.

- [ ] **Step 1: Write the loader**

`test/load.js`:

```js
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

/* The data files are plain browser scripts that assign onto a global `D`
   and declare `const MAP`. Evaluate them in this module's scope with those
   names pre-seeded, which is cheaper and more faithful than a DOM shim. */
function loadData(files){
  const D = {};
  let MAP = null;
  const list = files || ["geo.js","places.js","history.js","topics.js","rivers.js","quiz.js","pyq.js"];
  for(const f of list){
    const p = path.join(ROOT, "data", f);
    if(!fs.existsSync(p)) continue;
    /* geo.js declares `const MAP`, and places.js declares `const D` — the
       two files that establish the globals. Rewrite MAP's declaration into
       an assignment, and delete D's outright: D is pre-seeded as a const
       here and its identity must stay stable across files, so an eval'd
       `const D = {}` would shadow it and silently discard everything the
       later files hang off it. */
    const src = fs.readFileSync(p, "utf8")
      .replace(/^const MAP\s*=/m, "MAP =")
      .replace(/^const D\s*=\s*\{\s*\}\s*;?\s*$/m, "");
    // eslint-disable-next-line no-eval
    eval(src);
  }
  return {D, MAP};
}
module.exports = {loadData, ROOT};
```

- [ ] **Step 2: Write the failing test**

`test/data.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");

const {D, MAP} = loadData();

/* Every record id that any `rel` array points at must exist. This is the
   invariant the whole app rests on: a dangling id renders a dead chip. */
function allRecords(){
  const out = [];
  for(const key of ["districts","states","events","battles","people","topics","rivers","features"]){
    for(const r of (D[key] || [])) out.push(r);
  }
  return out;
}

test("record ids are unique", () => {
  const seen = new Set();
  for(const r of allRecords()){
    assert.ok(!seen.has(r.id), "duplicate id: " + r.id);
    seen.add(r.id);
  }
});

test("every rel id resolves to a real record", () => {
  const ids = new Set(allRecords().map(r => r.id));
  for(const r of allRecords()){
    for(const id of (r.rel || [])){
      assert.ok(ids.has(id), r.id + " points at missing record " + id);
    }
  }
});

test("every MAP.places entry has a position and a kind", () => {
  for(const [pid, p] of Object.entries(MAP.places)){
    assert.equal(typeof p.x, "number", pid + " has no x");
    assert.equal(typeof p.y, "number", pid + " has no y");
    assert.ok(p.k, pid + " has no kind");
  }
});
```

- [ ] **Step 3: Run the tests**

Run: `cd /Users/avinashnegi/Downloads/prep/hp-atlas && node --test`
Expected: 3 tests pass. If "every rel id resolves" fails, a dangling id already exists in the data — fix that dangling id before continuing; do not weaken the test.

- [ ] **Step 4: Commit**

```bash
git add test/load.js test/data.test.js
git commit -m "test: add Node data-integrity harness"
```

---

### Task 2: mapkit — layer table and glyphs

**Files:**
- Create: `app/mapkit.js`
- Create: `test/mapkit.test.js`

**Interfaces:**
- Produces:
  - `LAYERS` — array of `{k, lb, c, glyph, base}`. `k` is the layer key, `lb` the legend label, `c` a CSS colour expression, `glyph` a shape name, `base:true` for layers the legend may not hide.
  - `mkGlyph(shape)` → SVG markup string for a shape centred on the origin, fitting a ±7 unit box.
  - `LAYER_BY_KIND` — `{[k]: layer}` lookup.

- [ ] **Step 1: Write the failing test**

`test/mapkit.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const kit = require("../app/mapkit.js");

test("every marker kind has a distinct glyph", () => {
  const kinds = ["peak","pass","lake","glacier","state","temple","battle"];
  const seen = new Map();
  for(const k of kinds){
    const layer = kit.LAYER_BY_KIND[k];
    assert.ok(layer, "no layer for " + k);
    const g = kit.mkGlyph(layer.glyph);
    assert.ok(g.length > 0, k + " produced no markup");
    assert.ok(!seen.has(g), k + " shares a glyph with " + seen.get(g));
    seen.set(g, k);
  }
});

test("glyphs fit the 7-unit box so zoom counter-scaling stays correct", () => {
  for(const layer of kit.LAYERS){
    if(!layer.glyph || layer.glyph === "line") continue;
    const g = kit.mkGlyph(layer.glyph);
    const nums = (g.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    for(const n of nums) assert.ok(Math.abs(n) <= 7.01, layer.k + " glyph escapes the box: " + n);
  }
});

test("rivers are two independently addressable layers", () => {
  assert.ok(kit.LAYER_BY_KIND.river1);
  assert.ok(kit.LAYER_BY_KIND.river2);
  assert.notEqual(kit.LAYER_BY_KIND.river1.lb, kit.LAYER_BY_KIND.river2.lb);
});

test("the district layer is a base layer the legend cannot hide", () => {
  assert.equal(kit.LAYER_BY_KIND.district.base, true);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testmapkit.test.js`
Expected: FAIL — `Cannot find module '../app/mapkit.js'`

- [ ] **Step 3: Write the implementation**

`app/mapkit.js`:

```js
/* ============================================================
   mapkit — the pure part of the map.
   No DOM, no `D`, no globals beyond what it defines. Everything
   here is a function of its arguments, so it unit-tests in Node.
   ============================================================ */
"use strict";

var LAYERS = [
  {k:"district", lb:"District",                 c:"var(--e4)",         glyph:null,       base:true},
  {k:"river1",   lb:"Major river",              c:"var(--water)",      glyph:"line"},
  {k:"river2",   lb:"Tributary",                c:"var(--water-soft)", glyph:"line"},
  {k:"peak",     lb:"Peak",                     c:"var(--ink-2)",      glyph:"triangle"},
  {k:"pass",     lb:"Pass",                     c:"var(--e2)",         glyph:"bowtie"},
  {k:"lake",     lb:"Lake / reservoir",         c:"var(--indigo)",     glyph:"drop"},
  {k:"glacier",  lb:"Glacier",                  c:"var(--e3)",         glyph:"hex"},
  {k:"state",    lb:"Seat of a hill state",     c:"var(--e6)",         glyph:"circle"},
  {k:"temple",   lb:"Temple / monastery",       c:"var(--gold)",       glyph:"pentagon"},
  {k:"battle",   lb:"Battle or movement site",  c:"var(--vermilion)",  glyph:"diamond"}
];
var LAYER_BY_KIND = {};
LAYERS.forEach(function(l){ LAYER_BY_KIND[l.k] = l; });

/* Shapes are centred on the origin and fit a +/-7 unit box, because
   applyZoom() counter-scales each marker group about its own origin. */
var GLYPHS = {
  triangle: '<path d="M0 -6.4L5.8 4.2L-5.8 4.2Z"/>',
  bowtie:   '<path d="M-5.6 -5.2L5.6 -5.2L0 0L5.6 5.2L-5.6 5.2L0 0Z"/>',
  drop:     '<path d="M0 6.2C-3.6 3.6 -5.2 1.2 -5.2 -1.2A5.2 5.2 0 0 1 5.2 -1.2C5.2 1.2 3.6 3.6 0 6.2Z"/>',
  hex:      '<path d="M0 -6L5.2 -3L5.2 3L0 6L-5.2 3L-5.2 -3Z"/>',
  circle:   '<circle r="5.5"/>',
  pentagon: '<path d="M0 -6.2L5.9 -1.9L3.6 5L-3.6 5L-5.9 -1.9Z"/>',
  diamond:  '<path d="M0 -6.4L6.4 0L0 6.4L-6.4 0Z"/>'
};
function mkGlyph(shape){ return GLYPHS[shape] || GLYPHS.circle; }

if(typeof module !== "undefined" && module.exports){
  module.exports = {LAYERS: LAYERS, LAYER_BY_KIND: LAYER_BY_KIND, mkGlyph: mkGlyph};
}
```

- [ ] **Step 4: Run the tests**

Run: `node --testmapkit.test.js`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/mapkit.js test/mapkit.test.js
git commit -m "feat: add mapkit layer table and per-kind marker glyphs"
```

---

### Task 3: mapkit — label de-collision

Every marker is always drawn. Labels are not: 62 labels at zoom 1 overprint into mush. Walk markers in priority order and draw a label only where its box is clear.

**Files:**
- Modify: `app/mapkit.js`
- Modify: `test/mapkit.test.js`

**Interfaces:**
- Consumes: nothing from Task 2 beyond living in the same file.
- Produces: `placeLabels(items)` where `items` is `[{id, x, y, w, h, pri}]` — `x`,`y` the marker origin in SVG units, `w`,`h` the label box in SVG units, `pri` a number (higher wins). Returns a `Set` of ids whose labels should be drawn.

- [ ] **Step 1: Write the failing test**

Append to `test/mapkit.test.js`:

```js
test("placeLabels drops labels whose boxes collide", () => {
  const items = [
    {id:"a", x:100, y:100, w:40, h:12, pri:10},
    {id:"b", x:104, y:100, w:40, h:12, pri:5}   // overlaps a
  ];
  const keep = kit.placeLabels(items);
  assert.ok(keep.has("a"), "highest priority must survive");
  assert.ok(!keep.has("b"), "colliding lower-priority label must be dropped");
});

test("placeLabels keeps labels that do not collide", () => {
  const items = [
    {id:"a", x:100, y:100, w:40, h:12, pri:10},
    {id:"b", x:400, y:400, w:40, h:12, pri:5}
  ];
  const keep = kit.placeLabels(items);
  assert.equal(keep.size, 2);
});

test("placeLabels respects priority, not input order", () => {
  const items = [
    {id:"low",  x:100, y:100, w:40, h:12, pri:1},
    {id:"high", x:104, y:100, w:40, h:12, pri:99}
  ];
  const keep = kit.placeLabels(items);
  assert.ok(keep.has("high"));
  assert.ok(!keep.has("low"));
});

test("zooming in fits more labels, because boxes shrink in SVG units", () => {
  const at = z => kit.placeLabels([
    {id:"a", x:100, y:100, w:40/z, h:12/z, pri:3},
    {id:"b", x:130, y:100, w:40/z, h:12/z, pri:2},
    {id:"c", x:160, y:100, w:40/z, h:12/z, pri:1}
  ]).size;
  assert.ok(at(4) > at(1), "more labels must fit at 4x than at 1x");
});

test("no two surviving label boxes overlap", () => {
  const items = [];
  for(let i = 0; i < 60; i++){
    items.push({id:"m"+i, x:(i*37)%900+50, y:(i*53)%900+50, w:50, h:12, pri:60-i});
  }
  const keep = kit.placeLabels(items);
  const boxes = items.filter(it => keep.has(it.id))
    .map(it => ({x1:it.x-it.w/2, x2:it.x+it.w/2, y1:it.y-it.h-9, y2:it.y-9}));
  for(let i = 0; i < boxes.length; i++){
    for(let j = i+1; j < boxes.length; j++){
      const a = boxes[i], b = boxes[j];
      const hit = !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
      assert.ok(!hit, "boxes " + i + " and " + j + " overlap");
    }
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testmapkit.test.js`
Expected: FAIL — `kit.placeLabels is not a function`

- [ ] **Step 3: Write the implementation**

Insert into `app/mapkit.js` before the `module.exports` guard:

```js
/* Greedy de-collision. Labels sit above the marker, offset by LABEL_DY,
   matching the `y="-9"` the marker <text> uses (Task 11). Highest
   priority wins the space; everything else that collides is simply not
   drawn — the marker itself stays visible and still shows a tooltip. */
var LABEL_DY = 9;
function placeLabels(items){
  var placed = [], keep = new Set();
  var sorted = items.slice().sort(function(a, b){ return b.pri - a.pri; });
  for(var i = 0; i < sorted.length; i++){
    var it = sorted[i];
    var box = {x1: it.x - it.w/2, x2: it.x + it.w/2,
               y1: it.y - LABEL_DY - it.h, y2: it.y - LABEL_DY};
    var clash = false;
    for(var j = 0; j < placed.length; j++){
      var p = placed[j];
      if(!(box.x2 <= p.x1 || box.x1 >= p.x2 || box.y2 <= p.y1 || box.y1 >= p.y2)){
        clash = true; break;
      }
    }
    if(clash) continue;
    placed.push(box); keep.add(it.id);
  }
  return keep;
}
```

Add `placeLabels: placeLabels` and `LABEL_DY: LABEL_DY` to the `module.exports` object.

- [ ] **Step 4: Run the tests**

Run: `node --testmapkit.test.js`
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/mapkit.js test/mapkit.test.js
git commit -m "feat: add greedy label de-collision to mapkit"
```

---

### Task 4: mapkit — legend visibility reducer

**Files:**
- Modify: `app/mapkit.js`
- Modify: `test/mapkit.test.js`

**Interfaces:**
- Produces:
  - `layerToggle(hidden, k)` → new array of hidden keys, with `k` flipped.
  - `layerIsolate(hidden, k, visibleKinds)` → new array. If `k` is already the only visible kind, returns `[]` (restore all); otherwise hides every kind in `visibleKinds` except `k`.
  - Both are pure: they never mutate `hidden`.

- [ ] **Step 1: Write the failing test**

Append to `test/mapkit.test.js`:

```js
const KINDS4 = ["peak","pass","lake","glacier"];

test("layerToggle hides then restores one kind", () => {
  let hidden = [];
  hidden = kit.layerToggle(hidden, "peak");
  assert.deepEqual(hidden, ["peak"]);
  hidden = kit.layerToggle(hidden, "peak");
  assert.deepEqual(hidden, []);
});

test("layerToggle never mutates its input", () => {
  const before = [];
  const after = kit.layerToggle(before, "lake");
  assert.deepEqual(before, [], "input array was mutated");
  assert.deepEqual(after, ["lake"]);
});

test("layerIsolate hides everything except the clicked kind", () => {
  const hidden = kit.layerIsolate([], "pass", KINDS4);
  assert.ok(!hidden.includes("pass"));
  assert.ok(hidden.includes("peak") && hidden.includes("lake") && hidden.includes("glacier"));
});

test("isolating the already-isolated kind restores everything", () => {
  let hidden = kit.layerIsolate([], "pass", KINDS4);
  hidden = kit.layerIsolate(hidden, "pass", KINDS4);
  assert.deepEqual(hidden, [], "second isolate must restore all layers");
});

test("a layer hidden in another map mode survives isolate and restore", () => {
  /* `visibleKinds` is only what the current legend shows. A layer hidden
     in a different mode is not in it, and must not be silently dropped. */
  let hidden = ["river1"];
  hidden = kit.layerIsolate(hidden, "pass", KINDS4);
  assert.ok(hidden.includes("river1"), "isolate dropped an out-of-scope hidden layer");
  hidden = kit.layerIsolate(hidden, "pass", KINDS4);
  assert.deepEqual(hidden, ["river1"], "restore must keep it and clear only this legend");
});

test("isolating a different kind switches the isolation", () => {
  let hidden = kit.layerIsolate([], "pass", KINDS4);
  hidden = kit.layerIsolate(hidden, "lake", KINDS4);
  assert.ok(!hidden.includes("lake"));
  assert.ok(hidden.includes("pass"));
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testmapkit.test.js`
Expected: FAIL — `kit.layerToggle is not a function`

- [ ] **Step 3: Write the implementation**

Insert into `app/mapkit.js` before the `module.exports` guard:

```js
/* Legend behaviour, Plotly-style: click toggles one layer, double click
   isolates it, and double-clicking the already-isolated layer restores
   the lot. Pure functions over the hidden-key array so the reducer is
   testable without a DOM and the caller owns persistence. */
function layerToggle(hidden, k){
  return hidden.indexOf(k) >= 0
    ? hidden.filter(function(x){ return x !== k; })
    : hidden.concat([k]);
}
function layerIsolate(hidden, k, visibleKinds){
  var others = visibleKinds.filter(function(x){ return x !== k; });
  /* Anything hidden that this legend does not show belongs to another map
     mode — hide peaks in geo mode, switch to Heritage, and "peak" is still
     in `hidden` but absent from `visibleKinds`. It must survive BOTH
     isolating and restoring, so restoring returns `keep`, not []. */
  var keep = hidden.filter(function(x){ return visibleKinds.indexOf(x) < 0 && x !== k; });
  var isolated = others.every(function(x){ return hidden.indexOf(x) >= 0; })
              && hidden.indexOf(k) < 0;
  return isolated ? keep : keep.concat(others);
}
```

Add `layerToggle: layerToggle` and `layerIsolate: layerIsolate` to `module.exports`.

- [ ] **Step 4: Run the tests**

Run: `node --testmapkit.test.js`
Expected: 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/mapkit.js test/mapkit.test.js
git commit -m "feat: add legend visibility reducer to mapkit"
```

---

### Task 5: Glacier geometry

**Files:**
- Modify: `data/geo.js:6` (the `places:{...}` object)
- Modify: `test/data.test.js`

**Interfaces:**
- Produces: 12 entries in `MAP.places` with `k:"glacier"` and pids `barashigri`, `chandranahan`, `beaskund`, `parvatigl`, `sonapani`, `gangstang`, `perad`, `dudhon`, `bhadal`, `ladyofkeylong`, `miyar`, `pingl`. Task 9 consumes these pids.

Note the two disambiguated pids: `parvatigl` and `pingl` — bare `parvati` and `pin` would read as the rivers, and `beaskund` is a glacier here even though the Beas record calls the same spot a source.

- [ ] **Step 1: Write the failing test**

Append to `test/data.test.js`:

```js
/* The map is an equirectangular projection fitted over the 123 existing
   markers; residual is 0.068 units on a 1000-unit map, i.e. exact. Any
   new marker must land on the same transform or it will sit in the wrong
   valley. */
const PROJ = {a: 292.5745, b: -22112.4202, c: -344.3249, d: 11450.7708};

test("twelve glaciers are on the map", () => {
  const g = Object.entries(MAP.places).filter(([, p]) => p.k === "glacier");
  assert.equal(g.length, 12);
});

test("every marker's x/y matches the projection of its lat/lng", () => {
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.lat == null) continue;
    const x = PROJ.a * p.lng + PROJ.b;
    const y = PROJ.c * p.lat + PROJ.d;
    assert.ok(Math.abs(x - p.x) < 0.5, pid + " x is off by " + (x - p.x).toFixed(2));
    assert.ok(Math.abs(y - p.y) < 0.5, pid + " y is off by " + (y - p.y).toFixed(2));
  }
});

test("glacier markers sit inside the map viewbox", () => {
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k !== "glacier") continue;
    assert.ok(p.x > 0 && p.x < MAP.w, pid + " x outside viewbox");
    assert.ok(p.y > 0 && p.y < MAP.h, pid + " y outside viewbox");
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testdata.test.js`
Expected: FAIL on "twelve glaciers are on the map" — `Expected 0 to equal 12`.

- [ ] **Step 3: Generate the entries**

These coordinates are **approximate glacier centroids** and should be sanity-checked against a map before the content task quotes them as fact. What the exam asks is the valley and the river fed, not the decimal degrees.

Run this to produce correctly projected entries:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const G = [
  ["barashigri","Bara Shigri Glacier",32.20,77.62],
  ["chandranahan","Chandra Nahan Glacier",31.20,77.98],
  ["beaskund","Beas Kund Glacier",32.36,77.08],
  ["parvatigl","Parvati Glacier",31.85,77.63],
  ["sonapani","Sonapani Glacier",32.33,77.28],
  ["gangstang","Gangstang Glacier",32.72,77.15],
  ["perad","Perad Glacier",32.60,76.92],
  ["dudhon","Dudhon Glacier",31.80,77.55],
  ["bhadal","Bhadal Glacier",32.42,76.70],
  ["ladyofkeylong","Lady of Keylong Glacier",32.62,77.02],
  ["miyar","Miyar Glacier",32.95,76.85],
  ["pingl","Pin Glacier",31.95,78.05]
];
const out = G.map(([id,n,lat,lng]) => {
  const x = +(292.5745*lng - 22112.4202).toFixed(1);
  const y = +(-344.3249*lat + 11450.7708).toFixed(1);
  return JSON.stringify(id)+":{"+JSON.stringify("n")+":"+JSON.stringify(n)+
    ",\"x\":"+x+",\"y\":"+y+",\"k\":\"glacier\",\"lat\":"+lat+",\"lng\":"+lng+"}";
});
console.log(out.join(",\n"));
'
```

Paste the output into the `places:{...}` object in `data/geo.js`, immediately before its closing `}`, with a leading comma. Keep the file on its existing one-entry-per-line style.

- [ ] **Step 4: Run the tests**

Run: `node --test`
Expected: all pass, including the three new glacier tests.

- [ ] **Step 5: Commit**

```bash
git add data/geo.js test/data.test.js
git commit -m "feat: add twelve glacier markers to the map geometry"
```

---

### Task 6: features.js schema and the 18 passes

**Files:**
- Create: `data/features.js`
- Modify: `test/load.js` (add `features.js` to the default file list)
- Modify: `test/data.test.js`
- Modify: `index.html`, `sw.js` (so the file actually loads in the browser)

**Interfaces:**
- Produces: `D.features`, an array. Each record:
  - `id` — namespaced `pk-` / `ps-` / `lk-` / `gl-`
  - `k` — `"peak" | "pass" | "lake" | "glacier"`
  - `pid` — key into `MAP.places`
  - `name` — display name
  - `blocks` — same shape `renderBlocks()` already consumes
  - `rel` — array of record ids
  - `districts` — array of `d-` ids
  - plus per-kind fact fields (Task 13 renders them): pass uses `alt`, `range`, `connects`, `status`, `route`.

- [ ] **Step 1: Write the failing schema test**

Append to `test/data.test.js`:

```js
const PREFIX = {peak:"pk-", pass:"ps-", lake:"lk-", glacier:"gl-"};

test("every feature has the required fields", () => {
  for(const f of (D.features || [])){
    assert.ok(f.id && f.k && f.pid && f.name, "incomplete feature: " + JSON.stringify(f.id));
    assert.ok(PREFIX[f.k], f.id + " has unknown kind " + f.k);
    assert.ok(f.id.startsWith(PREFIX[f.k]), f.id + " should start with " + PREFIX[f.k]);
    assert.ok(Array.isArray(f.blocks) && f.blocks.length, f.id + " has no blocks");
    assert.ok(Array.isArray(f.rel) && f.rel.length, f.id + " has no rel");
  }
});

test("every feature pid resolves to a real map marker of the same kind", () => {
  for(const f of (D.features || [])){
    const p = MAP.places[f.pid];
    assert.ok(p, f.id + " points at missing place " + f.pid);
    assert.equal(p.k, f.k, f.id + " kind " + f.k + " but marker is " + p.k);
  }
});

test("no two features share a pid", () => {
  const seen = new Map();
  for(const f of (D.features || [])){
    assert.ok(!seen.has(f.pid), f.pid + " claimed by both " + seen.get(f.pid) + " and " + f.id);
    seen.set(f.pid, f.id);
  }
});

test("every feature carries an exam hook", () => {
  for(const f of (D.features || [])){
    const hook = f.blocks.some(b => b[0] === "note" && /exam hook/i.test(b[1]));
    assert.ok(hook, f.id + " has no exam-hook note");
  }
});

test("all 18 passes are recorded", () => {
  const passes = (D.features || []).filter(f => f.k === "pass");
  assert.equal(passes.length, 18);
});

test("every pass marker on the map has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "pass").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "pass") assert.ok(have.has(pid), "pass marker " + pid + " has no record");
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testdata.test.js`
Expected: FAIL on "all 18 passes are recorded" — `Expected 0 to equal 18`.

- [ ] **Step 3: Create the file with one fully worked record**

`data/features.js`:

```js
/* ============================================================
   FEATURES — one record per peak, pass, lake and glacier drawn
   on the map. `pid` matches the key in MAP.places, so geometry
   and record are the same entity seen two ways, exactly as
   rivers are. Prose depth matches D.rivers: two or three
   paragraphs and one exam hook.
   ============================================================ */
D.features = [

/* ---------- PASSES ---------- */
{id:"ps-shipkila", k:"pass", pid:"shipkila", name:"Shipki La",
 alt:"3,930 m", range:"Zanskar range",
 connects:"Kinnaur (Himachal Pradesh) ⇄ Tibet (China)",
 status:"Motorable; a designated India–China border-trade point",
 route:"Namgia — Khab — the Sutlej gorge",
 districts:["d-kinnaur"],
 blocks:[
  ["p","The pass that answers two questions at once. It is a <b>trade route</b> — one of the three designated India–China border-trade points, alongside Nathu La in Sikkim and Lipulekh in Uttarakhand — and it is a <b>river gate</b>: the <b>Sutlej enters India here</b>, having risen at Rakas Tal in Tibet."],
  ["p","The first Indian village below the pass is <b>Namgia</b>, and a few kilometres downstream at <b>Khab</b> the Spiti river joins the Sutlej. Candidates who remember only the height miss the point of the pass; what is asked is the combination — Kinnaur, Tibet, the Sutlej, and trade."],
  ["note","Exam hook","3,930 m · Zanskar range · Kinnaur to Tibet · the <b>Sutlej enters India here</b> · a designated border-trade point · first village Namgia · Spiti joins the Sutlej just below, at Khab."]],
 rel:["t-passes","Sutlej","d-kinnaur","t-trade"]}

];
```

Note `rel` names `"Sutlej"` with no prefix — river ids are bare names. Drop `"t-trade"` from the array if no such topic exists; Task 1's rel test will catch it.

- [ ] **Step 4: Wire the file into the page**

In `index.html`, after line 92 (`<script src="data/rivers.js"></script>`):

```html
<script src="data/features.js"></script>
```

In `app/mapkit.js`'s slot — add before `app/app.js` in `index.html`:

```html
<script src="app/mapkit.js"></script>
```

In `sw.js` line 7, add `"data/features.js"` to the array; in line 6 add `"app/mapkit.js"`. Bump the `CACHE` constant on the line above.

In `test/load.js`, add `"features.js"` to the default file list, after `"rivers.js"`.

- [ ] **Step 5: Write the remaining 17 passes**

Same shape as `ps-shipkila`. Each gets 2–3 paragraphs and an exam hook. The roster, with the facts the exam asks:

| id | pid | Name | Height | Range | Connects | Hook |
|---|---|---|---|---|---|---|
| ps-rohtang | rohtang | Rohtang La | 3,978 m | Pir Panjal | Kullu ⇄ Lahaul | Bypassed by the **Atal Tunnel**, 9.02 km, opened 3 Oct 2020 |
| ps-kunzum | kunzum | Kunzum La | 4,551 m | Kunzum (Great Himalaya) | Lahaul (Chandra valley) ⇄ Spiti | Gateway to Spiti; Chandra Tal lies off it |
| ps-baralacha | baralacha | Baralacha La | 4,890 m | Zanskar | Lahaul ⇄ Ladakh | **Chandra and Bhaga both rise near it**; Suraj Tal sits below |
| ps-sach | sach | Sach Pass | 4,420 m | Pir Panjal | Chamba ⇄ Pangi | The Pangi valley's lifeline, snowbound most of the year |
| ps-jalori | jalori | Jalori Pass | 3,120 m | Outer Seraj | Kullu ⇄ Shimla | Lowest of the named passes; Sareolsar lake and Raghupur fort |
| ps-hamta | hamta | Hamta Pass | 4,270 m | Pir Panjal | Kullu ⇄ Lahaul | The classic trekking crossing beside Rohtang |
| ps-chanshal | chanshal | Chanshal Pass | 4,520 m | Great Himalaya | Rohru ⇄ Dodra Kwar, Shimla | **Highest motorable pass in Shimla district** |
| ps-kugti | kugti | Kugti Pass | 5,040 m | Pir Panjal | Bharmour (Chamba) ⇄ Lahaul | The traditional **Gaddi migration route** |
| ps-pinparvati | pinparvati | Pin Parvati Pass | 5,319 m | Great Himalaya | Kullu (Parvati) ⇄ Spiti (Pin) | Links the Parvati and Pin valleys — two river basins |
| ps-parangla | parangla | Parang La | 5,578 m | — | Spiti ⇄ Ladakh (Tso Moriri) | **Highest pass in the standard list** |
| ps-shinkula | darcha | Shinku La (Shingo La) | 5,090 m | Great Himalaya | Lahaul ⇄ Zanskar | The Darcha–Padum route |
| ps-bhubujot | bhubujot | Bhubu Jot | 2,900 m | Dhauladhar | Mandi ⇄ Kullu | An internal pass, the old Mandi–Kullu foot route |
| ps-indrahar | indrahar | Indrahar Pass | 4,342 m | Dhauladhar | Kangra (McLeodganj) ⇄ Chamba (Bharmour) | The Dhauladhar crossing above Dharamshala |
| ps-padri | padri | Padri Pass | 3,300 m | — | Chamba ⇄ Bhaderwah (Jammu) | The Chamba–Jammu link |
| ps-chobia | chobia | Chobia Pass | 4,966 m | Pir Panjal | Chamba ⇄ Lahaul | One of the Drati–Kalicho–Chobia group |
| ps-thamsar | thamsar | Thamsar Pass | 4,572 m | Dhauladhar | Bara Bhangal ⇄ Bara Bangahal, Kangra | The route into the Ravi's headwaters |
| ps-bashleo | bashleo | Bashleo Pass | 3,300 m | — | Mandi/Kullu ⇄ Shimla (Seraj) | An internal Seraj crossing |

Note the id/pid mismatch on Shinku La: the existing marker key is `darcha`. Do **not** rename the marker — `pid:"darcha"` is correct and the test in Step 1 verifies the link.

Each record's `rel` must name `"t-passes"`, its district id(s), and any river or event it touches (`ps-baralacha` → `"Chandra"`, `"Bhaga"`; `ps-shipkila` → `"Sutlej"`).

- [ ] **Step 6: Run the tests**

Run: `node --test`
Expected: all pass. "every pass marker on the map has a record" catches any pid typo.

- [ ] **Step 7: Commit**

```bash
git add data/features.js test/ index.html sw.js
git commit -m "feat: add pass records with full detail"
```

---

### Task 7: The 12 peaks

**Files:**
- Modify: `data/features.js`
- Modify: `test/data.test.js`

**Interfaces:**
- Consumes: the record shape from Task 6.
- Produces: peak records using fact fields `alt`, `range`, `alias`, `ascent`, `fame`.

- [ ] **Step 1: Write the failing test**

Append to `test/data.test.js`:

```js
test("all 12 peaks are recorded, with heights", () => {
  const peaks = (D.features || []).filter(f => f.k === "peak");
  assert.equal(peaks.length, 12);
  for(const p of peaks) assert.match(p.alt, /\d[\d,]*\s*m/, p.id + " has no height");
});

test("every peak marker on the map has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "peak").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "peak") assert.ok(have.has(pid), "peak marker " + pid + " has no record");
  }
});

test("Reo Purgyil is recorded as the highest point in the state", () => {
  const r = (D.features || []).find(f => f.id === "pk-reopurgyil");
  assert.ok(r, "pk-reopurgyil missing");
  assert.match(JSON.stringify(r), /highest/i);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testdata.test.js`
Expected: FAIL — `Expected 0 to equal 12`.

- [ ] **Step 3: Write the records**

Worked example to match:

```js
{id:"pk-reopurgyil", k:"peak", pid:"reopurgyil", name:"Reo Purgyil",
 alt:"6,816 m", range:"Zanskar range", alias:"Leo Pargial, Reo Purgyal",
 fame:"The highest point in Himachal Pradesh",
 districts:["d-kinnaur"],
 blocks:[
  ["p","The <b>highest mountain in Himachal Pradesh</b> at <b>6,816 m</b>, standing on the <b>Kinnaur border with Tibet</b> at the southern end of the Zanskar range. It rises directly above the Sutlej where the river has just entered India, so the state's highest point and its principal river gate are within sight of each other."],
  ["p","The massif has twin summits and is the culminating point of the ridge dividing the Spiti and Sutlej drainages. It was first climbed by an Indo-Tibetan Border Police team, and remains an inner-line area requiring a permit."],
  ["note","Exam hook","<b>6,816 m — the highest peak in Himachal Pradesh</b> · Kinnaur · Zanskar range · on the Tibet border · also spelt Leo Pargial."]],
 rel:["t-peaks","d-kinnaur","Sutlej","ps-shipkila"]}
```

The remaining eleven, in descending height:

| id | pid | Name | Height | Where | Hook |
|---|---|---|---|---|---|
| pk-shigriparbat | shigriparbat | Shigri Parbat | 6,526 m | Lahaul | Above the Bara Shigri glacier |
| pk-mulkila | mulkila | Mulkila | 6,517 m | Lahaul | Mulkila massif, above the Miyar/Chandra divide |
| pk-dharmsura | dharmsura | Dharmsura (White Sail) | 6,446 m | Lahaul / Kullu | Climbed from the Tos glacier |
| pk-indrasan | indrasan | Indrasan | 6,221 m | Kullu | Highest of the Pir Panjal's eastern group |
| pk-shilla | shilla | Shilla | 6,132 m | Kinnaur / Spiti | Long, wrongly, claimed as the highest surveyed peak in India |
| pk-kinnerkailash | kinnerkailash | Kinner Kailash | 6,050 m | Kinnaur | The **79-foot rock Shivling**; the Kinner Kailash parikrama |
| pk-deotibba | deotibba | Deo Tibba | 6,001 m | Kullu | The dome above Manali, beside Indrasan |
| pk-hanumantibba | hanumantibba | Hanuman Tibba | 5,928 m | Dhauladhar, Kullu/Kangra | The highest peak of the Dhauladhar |
| pk-gepanggoh | gepanggoh | Gepang Goh | 5,870 m | Lahaul | The guardian deity peak of Lahaul; Gepang Gath lake below |
| pk-manimaheshkailash | manimaheshkailash | Manimahesh Kailash | 5,653 m | Chamba | Above Manimahesh lake; the yatra peak, never climbed |
| pk-chaudhar | chaudhar | Churdhar | 3,647 m | Sirmaur | **Highest peak of the outer Himalaya in HP**; Shirgul Devta temple |

Each `rel` names `"t-peaks"`, the district, and any linked lake, glacier or pass record.

- [ ] **Step 4: Run the tests**

Run: `node --test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add data/features.js test/data.test.js
git commit -m "feat: add peak records with full detail"
```

---

### Task 8: The 20 lakes

**Files:**
- Modify: `data/features.js`
- Modify: `test/data.test.js`

**Interfaces:**
- Consumes: the record shape from Task 6.
- Produces: lake records using fact fields `type` (`"Natural"` / `"Reservoir"`), `alt`, `river`, `area`, `sacred`, `ramsar`.

- [ ] **Step 1: Write the failing test**

Append to `test/data.test.js`:

```js
test("all 20 lakes are recorded and typed", () => {
  const lakes = (D.features || []).filter(f => f.k === "lake");
  assert.equal(lakes.length, 20);
  for(const l of lakes){
    assert.match(l.type, /^(Natural|Reservoir)$/, l.id + " has bad type: " + l.type);
  }
});

test("every lake marker on the map has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "lake").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "lake") assert.ok(have.has(pid), "lake marker " + pid + " has no record");
  }
});

test("exactly three lakes are Ramsar sites, with the right years", () => {
  const r = (D.features || []).filter(f => f.k === "lake" && f.ramsar);
  assert.equal(r.length, 3, "HP has exactly three Ramsar sites");
  const byId = Object.fromEntries(r.map(f => [f.id, String(f.ramsar)]));
  assert.match(byId["lk-pong"] || "", /2002/);
  assert.match(byId["lk-renuka"] || "", /2005/);
  assert.match(byId["lk-chandratal"] || "", /2005/);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testdata.test.js`
Expected: FAIL — `Expected 0 to equal 20`.

- [ ] **Step 3: Write the records**

| id | pid | Name | Type | Hook |
|---|---|---|---|---|
| lk-renuka | renuka | Renuka Lake | Natural | **Largest natural lake in HP**; shaped like a reclining woman; Renukaji fair; **Ramsar 2005** |
| lk-rewalsar | rewalsar | Rewalsar (Tso Pema) | Natural | Sacred to Hindus, Buddhists and Sikhs; **Padmasambhava**; floating islands |
| lk-prashar | prashar | Prashar Lake | Natural | 2,730 m; three-tiered pagoda temple; floating island |
| lk-kamrunag | kamrunag | Kamrunag Lake | Natural | Mandi; devotees cast offerings of gold into the water |
| lk-sareolsar | sareolsar | Sareolsar Lake | Natural | Kullu, above Jalori; Budhi Nagin temple |
| lk-chandratal | chandratal | Chandra Tal | Natural | ~4,300 m; source of the Chandra; **Ramsar 2005** |
| lk-surajtal | surajtal | Suraj Tal | Natural | Below Baralacha; source of the Bhaga; among the highest lakes in India |
| lk-bhrigu | bhrigu | Bhrigu Lake | Natural | Kullu, above Gulaba; sage Bhrigu's meditation lake |
| lk-dashair | dashair | Dashair Lake | Natural | Kullu, near Rohtang |
| lk-manimahesh | manimahesh | Manimahesh Lake | Natural | Chamba; the **Manimahesh yatra**, below Manimahesh Kailash |
| lk-lamadal | lamadal | Lama Dal | Natural | Chamba; the largest of the Dhauladhar's high lakes |
| lk-ghadasaru | ghadasaru | Ghadasaru Lake | Natural | Chamba |
| lk-khajjiar | khajjiar | Khajjiar Lake | Natural | Chamba; the saucer meadow called the "mini Switzerland" |
| lk-nako | nako | Nako Lake | Natural | Kinnaur, Hangrang valley, beside Nako monastery |
| lk-dallake | dallake | Dal Lake, Dharamshala | Natural | Kangra, above McLeodganj |
| lk-gobindsagar | gobindsagar | Gobind Sagar | Reservoir | Bhakra on the Sutlej, Bilaspur — **largest man-made lake in the state** |
| lk-pong | pong | Pong / Maharana Pratap Sagar | Reservoir | Beas, Kangra; **Ramsar 2002**; major bird sanctuary |
| lk-chamera | chamera | Chamera Lake | Reservoir | Ravi, Chamba |
| lk-pandoh | pandoh | Pandoh Dam | Reservoir | Beas, Mandi; feeds the Beas–Sutlej Link |
| lk-koldam | koldam | Kol Dam | Reservoir | Sutlej, Bilaspur/Mandi; 800 MW |

Reservoir records must `rel` their river (`"Sutlej"`, `"Beas"`, `"Ravi"`) and `"t-hydel"`; natural lakes `rel` `"t-lakes"`, their district, and any linked peak (`lk-manimahesh` → `"pk-manimaheshkailash"`) or pass (`lk-surajtal` → `"ps-baralacha"`).

- [ ] **Step 4: Run the tests**

Run: `node --test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add data/features.js test/data.test.js
git commit -m "feat: add lake and reservoir records with full detail"
```

---

### Task 9: The 12 glaciers

**Files:**
- Modify: `data/features.js`
- Modify: `test/data.test.js`

**Interfaces:**
- Consumes: the glacier pids from Task 5.
- Produces: glacier records using fact fields `size`, `valley`, `feeds`, `retreat`.

- [ ] **Step 1: Write the failing test**

Append to `test/data.test.js`:

```js
test("all 12 glaciers are recorded and say what they feed", () => {
  const gl = (D.features || []).filter(f => f.k === "glacier");
  assert.equal(gl.length, 12);
  for(const g of gl){
    assert.ok(g.feeds, g.id + " does not say which river it feeds");
    assert.ok(g.valley, g.id + " does not name its valley");
  }
});

test("every glacier marker has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "glacier").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "glacier") assert.ok(have.has(pid), "glacier marker " + pid + " has no record");
  }
});

test("Bara Shigri is recorded as the largest glacier in the state", () => {
  const g = (D.features || []).find(f => f.id === "gl-barashigri");
  assert.ok(g, "gl-barashigri missing");
  assert.match(JSON.stringify(g), /largest/i);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testdata.test.js`
Expected: FAIL — `Expected 0 to equal 12`.

- [ ] **Step 3: Write the records**

| id | pid | Name | Valley / basin | Feeds | Hook |
|---|---|---|---|---|---|
| gl-barashigri | barashigri | Bara Shigri | Chandra valley, Lahaul | Chandra → Chenab | **Largest glacier in Himachal Pradesh**, ~28 km |
| gl-chandranahan | chandranahan | Chandra Nahan | Shimla, above Rohru | **Pabbar** | The Pabbar's source; the Chandra Nahan lake below it |
| gl-beaskund | beaskund | Beas Kund | Solang/Kullu, below Rohtang | **Beas** | The Beas's source |
| gl-parvatigl | parvatigl | Parvati Glacier | Parvati valley, Kullu | Parvati → Beas | Feeds the Parvati, which joins the Beas at Bhuntar |
| gl-sonapani | sonapani | Sonapani | Lahaul, Chandra basin | Chandra → Chenab | Heavily studied for retreat rates |
| gl-gangstang | gangstang | Gangstang | Lahaul, Bhaga basin | Bhaga → Chenab | Below Gangstang peak |
| gl-perad | perad | Perad | Lahaul / Chamba divide | Chenab | — |
| gl-dudhon | dudhon | Dudhon | Parvati basin, Kullu | Parvati → Beas | Among the largest in the Beas basin |
| gl-bhadal | bhadal | Bhadal | Bara Bangahal, Kangra | **Ravi** | The Bhadal stream is one of the Ravi's two parent streams |
| gl-ladyofkeylong | ladyofkeylong | Lady of Keylong | Lahaul, above Keylong | Bhaga → Chenab | Named for the figure its snow shape traces above the town |
| gl-miyar | miyar | Miyar | Miyar nala, Lahaul | Miyar → Chenab | The long Miyar valley approach |
| gl-pingl | pingl | Pin Glacier | Pin valley, Spiti | **Pin → Spiti → Sutlej** | In the Pin Valley National Park |

Every glacier record's prose must carry the retreat theme — glacier recession in the Chandra and Spiti basins is a standing environment-paper question, tied to hydel generation and glacial-lake outburst risk. `rel` names `"t-peaks"` (which is titled "Peaks and Glaciers"), the district, the river fed, and `"t-disaster"` where retreat is discussed.

- [ ] **Step 4: Run the tests**

Run: `node --test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add data/features.js test/data.test.js
git commit -m "feat: add glacier records with full detail"
```

---

### Task 10: Index the records and route markers to them

Until this task, the 62 records exist but nothing reaches them.

**Files:**
- Modify: `app/app.js:9-23` (`KINDS`, `KIND_ORDER`, `IDX`), `app/app.js:363-375` (`placeTarget`), `app/app.js:~525` (`goTo`)
- Create: `test/harness.html`

**Interfaces:**
- Consumes: `D.features` from Tasks 6–9.
- Produces: `PLACE_REC` — a `Map` of pid → record id, consumed by `placeTarget()` and Task 11.

- [ ] **Step 1: Extend KINDS and KIND_ORDER**

In `app/app.js`, add to the `KINDS` object after the `river` line:

```js
  peak:    {lb:"Peak",            pl:"Peaks",            c:"var(--ink-2)", view:"map"},
  pass:    {lb:"Pass",            pl:"Passes",           c:"var(--e2)",    view:"map"},
  lake:    {lb:"Lake",            pl:"Lakes & reservoirs",c:"var(--indigo)",view:"map"},
  glacier: {lb:"Glacier",         pl:"Glaciers",         c:"var(--e3)",    view:"map"}
```

Replace `KIND_ORDER` with:

```js
const KIND_ORDER = ["district","river","peak","pass","lake","glacier",
                    "state","person","event","battle","topic"];
```

- [ ] **Step 2: Register the features in IDX**

Immediately after the existing `.forEach(...)` that fills `IDX`, add:

```js
/* Features carry their own kind on the record, so they cannot use the
   fixed array-to-kind mapping above. */
(D.features || []).forEach(r => IDX.set(r.id, {r, kind:r.k}));
const PLACE_REC = new Map((D.features || []).map(r => [r.pid, r.id]));
```

- [ ] **Step 3: Route markers to their own record**

In `placeTarget()` (line ~363), insert as the **first** lines of the function body, after the `const p = MAP.places[pid]; if(!p) return null;` line:

```js
  if(PLACE_REC.has(pid)) return PLACE_REC.get(pid);
```

Leave the existing `t-peaks` / `t-passes` / `t-lakes` fallbacks in place — they now only fire for a marker with no record, which is the correct behaviour.

- [ ] **Step 4: Make goTo land on the right map mode**

In `goTo()`, alongside the existing `if(o.kind === "state")` lines:

```js
    if(["peak","pass","lake","glacier"].includes(o.kind)) S.mapMode = "geo";
```

- [ ] **Step 5: Create the browser harness**

`test/harness.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>Devbhoomi Atlas — interaction harness</title>
<style>
 body{font:13px/1.5 system-ui;margin:0;padding:16px;background:#111614;color:#E9ECE5}
 #out{font-family:ui-monospace,monospace;white-space:pre-wrap}
 .pass{color:#69B487} .fail{color:#E08872;font-weight:700}
 iframe{width:1000px;height:760px;border:1px solid #333;background:#fff}
</style>
<h1>Interaction harness</h1>
<div id="out">running…</div>
<iframe id="app" src="../index.html"></iframe>
<script>
const out = document.getElementById("out");
let pass = 0, fail = 0;
function check(name, cond, detail){
  const ok = !!cond;
  ok ? pass++ : fail++;
  out.innerHTML += '<div class="' + (ok ? "pass" : "fail") + '">' +
    (ok ? "PASS  " : "FAIL  ") + name + (ok || !detail ? "" : "  — " + detail) + "</div>";
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* Synthetic pointer sequences. The real bug this guards against: taking
   pointer capture on pointerdown retargets the click to the <svg>, so
   every marker click is silently swallowed. */
function pointerAt(el, type, x, y){
  el.dispatchEvent(new PointerEvent(type, {
    clientX:x, clientY:y, pointerId:1, button:0, bubbles:true, cancelable:true
  }));
}
function clickEl(win, el){
  const r = el.getBoundingClientRect();
  const x = r.left + r.width/2, y = r.top + r.height/2;
  pointerAt(el, "pointerdown", x, y);
  pointerAt(el, "pointerup", x, y);
}
function dragEl(win, el){
  const r = el.getBoundingClientRect();
  const x = r.left + r.width/2, y = r.top + r.height/2;
  pointerAt(el, "pointerdown", x, y);
  pointerAt(el, "pointermove", x + 40, y + 40);
  pointerAt(el, "pointerup", x + 40, y + 40);
}

window.addEventListener("load", async () => {
  out.innerHTML = "";
  const f = document.getElementById("app");
  const win = f.contentWindow, doc = f.contentDocument;
  await wait(700);

  /* app.js declares `const S`, which is script-scoped and therefore NOT a
     property of window — `win.S` is undefined and every assertion against
     it would silently pass. Indirect eval runs in the frame's global scope,
     where top-level const IS visible. Function declarations (render,
     openRec, runSearch) do land on window, so those are called directly. */
  const ev = src => win.eval(src);

  ev('S.view="map"; S.mapMode="geo"; render();');
  await wait(300);

  for(const kind of ["peak","pass","lake","glacier"]){
    const mk = doc.querySelector('.mk[data-k="' + kind + '"]');
    check(kind + " marker exists", mk);
    if(!mk) continue;
    const expect = mk.dataset.rec;
    check(kind + " marker is wired to its own record",
      expect && /^(pk|ps|lk|gl)-/.test(expect), "data-rec=" + expect);
    doc.getElementById("panel").hidden = true;
    clickEl(win, mk);
    await wait(120);
    check(kind + " click opens the panel", !doc.getElementById("panel").hidden);
    check(kind + " click opens the right record", ev("S.sel") === expect,
      "got " + ev("S.sel") + ", wanted " + expect);
  }

  const mk = doc.querySelector(".mk");
  doc.getElementById("panel").hidden = true;
  ev("S.sel = null");
  dragEl(win, mk);
  await wait(120);
  check("a drag across a marker does NOT open the panel",
    doc.getElementById("panel").hidden);

  out.innerHTML += "\n" + pass + " passed, " + fail + " failed";
  document.title = fail ? "FAIL (" + fail + ")" : "PASS";
});
</script>
```

- [ ] **Step 6: Emit the kind on each marker so the harness can find one**

In `viewMap()`, the marker `<g>` currently reads `'<g class="mk" data-p="..." data-rec="..."'`. Add `data-k="'+p.k+'" `. Task 11 relies on this attribute too.

- [ ] **Step 7: Run both test layers**

Run: `node --test`
Expected: all pass.

Then serve and open the harness — `file://` will not work, the iframe needs a same-origin HTTP context:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && python3 -m http.server 8765
```

Open `http://localhost:8765/test/harness.html`. Expected: every line green, title reads `PASS`. The four "click opens the right record" lines are the point of this task.

- [ ] **Step 8: Commit**

```bash
git add app/app.js test/harness.html
git commit -m "feat: index features and route map markers to their own records"
```

---

### Task 11: Render glyphs and de-collided labels

**Files:**
- Modify: `app/app.js:376-437` (`viewMap`), `app/app.js:439-448` (`applyZoom`)
- Modify: `app/components.css:24-28`

**Interfaces:**
- Consumes: `mkGlyph()`, `LAYER_BY_KIND`, `placeLabels()` from mapkit; `data-k` from Task 10.
- Produces: markers rendered as `<g class="mk" data-k data-p data-rec><path …/><text …>`; a `relabel()` function called from `applyZoom()`.

- [ ] **Step 1: Widen the geo mode to include glaciers**

In `MAP_MODES`, replace the `geo` entry:

```js
  {id:"geo", lb:"Peaks · Passes · Lakes", kinds:["peak","pass","lake","glacier"]},
```

Delete the now-unused `MK_COLOR` and `MK_LABEL` consts and replace every use with `LAYER_BY_KIND[k].c` and `LAYER_BY_KIND[k].lb`.

- [ ] **Step 2: Render glyphs instead of circles**

In `viewMap()`, replace the `marks` expression:

```js
  const marks = Object.entries(MAP.places)
    .filter(([,p]) => mode.kinds.includes(p.k))
    .map(([id,p]) => '<g class="mk" data-k="'+p.k+'" data-p="'+id+'" '+
      'data-rec="'+(placeTarget(id)||"")+'" data-n="'+p.n+'" '+
      'transform="translate('+p.x+','+p.y+')">'+
      '<g class="gly" style="fill:'+LAYER_BY_KIND[p.k].c+'">'+mkGlyph(LAYER_BY_KIND[p.k].glyph)+'</g>'+
      '<text y="-9">'+p.n+'</text></g>').join('');
```

- [ ] **Step 3: Add the de-collision pass**

Add after `applyZoom()`:

```js
/* Labels are laid out after every zoom: their boxes are constant in
   screen pixels, so in SVG units they shrink as you zoom in and more of
   them fit. Markers are never hidden — only their labels. */
const LABEL_PRI = {peak:4, pass:3, glacier:2, lake:1, state:3, temple:2, battle:2};
function relabel(){
  const g = document.getElementById("mapg"); if(!g) return;
  const marks = [...g.querySelectorAll(".mk:not(.hid)")];
  if(!marks.length) return;
  const inv = 1/ZT.k;
  const items = marks.map((m,i) => {
    const t = (m.dataset.at || m.getAttribute("transform")).match(/translate\(([-\d.]+)[, ]+([-\d.]+)\)/);
    const n = m.dataset.n || "";
    return {id:i, x:+t[1], y:+t[2],
            w:(n.length*5.6+6)*inv, h:13*inv,
            pri:(LABEL_PRI[m.dataset.k] || 1)*1000 - n.length};
  });
  const keep = placeLabels(items);
  marks.forEach((m,i) => m.classList.toggle("nolabel", !keep.has(i)));
}
```

Call `relabel();` as the last line of `applyZoom()`, and once at the end of `mountMap()`.

The width estimate `n.length*5.6+6` approximates the 10.5px label font. It does not need to be exact — it needs to be consistent, and slightly generous so labels never touch.

- [ ] **Step 4: Add the CSS**

Replace `app/components.css:24-28` with:

```css
.mk{cursor:pointer}
.mk .gly{stroke:var(--surface);stroke-width:1.4;transition:transform .12s}
.mk:hover .gly{transform:scale(1.35)}
.mk.sel .gly{stroke:var(--accent);stroke-width:2.2;transform:scale(1.35)}
.mk text{font-family:var(--f-body);font-size:10.5px;font-weight:600;fill:var(--ink-2);
  text-anchor:middle;paint-order:stroke;stroke:var(--surface);stroke-width:3px;
  stroke-linejoin:round;pointer-events:none}
.mk.nolabel text{display:none}
.mk.hid{display:none}
```

The `paint-order:stroke` halo is what keeps a surviving label readable where it crosses a river line.

- [ ] **Step 5: Add a de-collision assertion to the harness**

Append inside the harness's load handler, before the summary line:

```js
  const boxes = [...doc.querySelectorAll(".mk:not(.nolabel):not(.hid) text")]
    .map(t => t.getBoundingClientRect());
  let overlaps = 0;
  for(let i = 0; i < boxes.length; i++)
    for(let j = i+1; j < boxes.length; j++){
      const a = boxes[i], b = boxes[j];
      if(!(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)) overlaps++;
    }
  check("no two visible labels overlap at zoom 1", overlaps === 0, overlaps + " overlapping pairs");
  check("some labels are drawn", boxes.length > 3, boxes.length + " labels");
```

- [ ] **Step 6: Verify**

Run: `node --test` — all pass.
Open `http://localhost:8765/test/harness.html` — title `PASS`, including the two new label checks.

Then look at the map itself at `http://localhost:8765/` with geo mode selected: four distinguishable glyph shapes, no label mush, and labels appearing as you zoom.

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: draw per-kind marker glyphs with de-collided labels"
```

---

### Task 12: The legend as the visibility control

**Files:**
- Modify: `app/app.js` — `viewMap()` legend markup, `mountMap()` handlers, the `#rivtog` click handler at line ~977, state init at line ~1076
- Modify: `app/components.css:40-46`

**Interfaces:**
- Consumes: `layerToggle()`, `layerIsolate()`, `LAYERS` from mapkit.
- Produces: `S.mapOff` — an array of hidden layer keys, persisted to `hpatlas:mapoff`; `applyLayers()` which reflects it into the DOM.

- [ ] **Step 1: Replace the legend markup**

In `viewMap()`, delete the `riverKey` and `legend` consts and the `#rivtog` button from the `maptools` block, and build the legend from the layers actually on screen:

```js
  const shownKinds = mode.kinds.concat(["river1","river2"]);
  const legend = '<div class="maplegend"><div class="lt">'+
    (mode.id === "states" ? "Seats of the hill states, c. 1815" : "Layers")+'</div><ul>'+
    shownKinds.map(k => {
      const l = LAYER_BY_KIND[k], off = S.mapOff.includes(k);
      return '<li><button type="button" class="lgi'+(off ? " off" : "")+'" data-lk="'+k+'" '+
        'aria-pressed="'+(!off)+'" title="Click to hide · double click to show only this">'+
        '<i style="background:'+l.c+'"></i>'+l.lb+'</button></li>';
    }).join('')+
    '</ul>'+
    (S.mapOff.length ? '<button type="button" class="lgall" id="lgall">Show all</button>' : '')+
    (mode.kinds.length ? '' : '<div class="lghint">Click a district to open its record</div>')+
    '</div>';
```

- [ ] **Step 2: Reflect the hidden set into the DOM**

Add next to `relabel()`:

```js
/* Hiding sets a class rather than re-rendering, so a toggle is instant.
   Labels must be laid out again afterwards: hiding twenty lakes frees
   room that peak labels can now use. */
function applyLayers(){
  document.querySelectorAll(".mk").forEach(m =>
    m.classList.toggle("hid", S.mapOff.includes(m.dataset.k)));
  const rv = document.querySelector(".rivers");
  if(rv){
    rv.classList.toggle("off1", S.mapOff.includes("river1"));
    rv.classList.toggle("off2", S.mapOff.includes("river2"));
  }
  relabel();
}
```

Call `applyLayers();` at the end of `mountMap()`, after the initial `relabel()`.

- [ ] **Step 3: Wire the legend events**

Add inside `mountMap()`:

```js
  /* A double click fires two clicks first, so the single-click action is
     deferred and cancelled if the second click lands. Same approach
     Plotly's legend uses; the cost is a barely perceptible lag. */
  const legendEl = document.querySelector(".maplegend");
  if(legendEl){
    let clickTimer = null;
    const kindsHere = () => [...legendEl.querySelectorAll(".lgi")].map(b => b.dataset.lk);
    const commit = () => {
      store.set("mapoff", S.mapOff);
      legendEl.querySelectorAll(".lgi").forEach(b => {
        const off = S.mapOff.includes(b.dataset.lk);
        b.classList.toggle("off", off);
        b.setAttribute("aria-pressed", String(!off));
      });
      let all = document.getElementById("lgall");
      if(S.mapOff.length && !all){
        all = document.createElement("button");
        all.type = "button"; all.className = "lgall"; all.id = "lgall";
        all.textContent = "Show all";
        legendEl.appendChild(all);
      } else if(!S.mapOff.length && all) all.remove();
      applyLayers();
    };
    legendEl.addEventListener("click", e => {
      if(e.target.closest("#lgall")){ S.mapOff = []; commit(); return; }
      const b = e.target.closest(".lgi"); if(!b) return;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { S.mapOff = layerToggle(S.mapOff, b.dataset.lk); commit(); }, 250);
    });
    legendEl.addEventListener("dblclick", e => {
      const b = e.target.closest(".lgi"); if(!b) return;
      clearTimeout(clickTimer);
      S.mapOff = layerIsolate(S.mapOff, b.dataset.lk, kindsHere());
      commit();
    });
    legendEl.addEventListener("keydown", e => {
      const b = e.target.closest(".lgi"); if(!b || e.key !== "Enter") return;
      e.preventDefault(); clearTimeout(clickTimer);
      S.mapOff = e.shiftKey
        ? layerIsolate(S.mapOff, b.dataset.lk, kindsHere())
        : layerToggle(S.mapOff, b.dataset.lk);
      commit();
    });
  }
```

- [ ] **Step 4: Migrate the old rivers flag**

At line ~1076, replace `S.rivers = store.get("rivers", true);` with:

```js
/* The old boolean rivers toggle is now two legend layers. Migrate it so
   a returning visitor who had rivers off does not see them reappear. */
S.mapOff = store.get("mapoff", null) ||
  (store.get("rivers", true) ? [] : ["river1","river2"]);
store.del("rivers");
```

Remove `rivers:true` from the `S` initialiser and delete the `#rivtog` handler at line ~977. Search for any remaining `S.rivers` reference and remove it — `viewMap()` used it in the old `rivers` group class, which becomes:

```js
  const rivers = '<g class="rivers" clip-path="url(#'+clipId+')">'+
    rPaths+'<g class="rlabels">'+rLabels+'</g></g>';
```

- [ ] **Step 5: Add the CSS**

Replace `app/components.css:40-46` with:

```css
.maplegend{position:absolute;left:12px;bottom:12px;background:var(--surface);border:1px solid var(--line);
  border-radius:10px;padding:9px 11px;box-shadow:var(--shadow);max-width:220px}
.maplegend .lt{font-family:var(--f-mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-3);margin-bottom:5px}
.maplegend ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:1px}
.maplegend li{display:block}
.lgi{display:flex;align-items:center;gap:6px;width:100%;padding:2px 4px;border:0;border-radius:5px;
  background:none;font:inherit;font-size:11.5px;color:var(--ink-2);cursor:pointer;text-align:left;
  user-select:none}
.lgi:hover{background:var(--surface-2)}
.lgi:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.lgi i{width:9px;height:9px;border-radius:50%;flex:0 0 9px}
.lgi.off{color:var(--ink-3);text-decoration:line-through}
.lgi.off i{background:none!important;box-shadow:inset 0 0 0 1.5px var(--ink-3)}
.lgall{margin-top:6px;padding:3px 8px;border:1px solid var(--line);border-radius:20px;background:none;
  font:inherit;font-size:10.5px;color:var(--accent);cursor:pointer}
.lgall:hover{background:var(--accent-soft)}
.lghint{margin-top:6px;font-size:10.5px;color:var(--ink-3);line-height:1.35}
```

And replace the old `.rivers.off` rule at line 345 with the two-layer version:

```css
.rivers.off1 .river.t1,.rivers.off1 .rlab.t1{display:none}
.rivers.off2 .river.t2,.rivers.off2 .rlab.t2{display:none}
```

- [ ] **Step 5b: Make the legend keyboard-reachable in reading order**

No extra work — `.lgi` is a `<button>`, so it is already in the tab order. Confirm by tabbing to it in Step 6.

- [ ] **Step 6: Add legend assertions to the harness**

Append inside the harness load handler, before the summary:

```js
  const legendBtn = k => doc.querySelector('.lgi[data-lk="' + k + '"]');
  const visible = k => doc.querySelectorAll('.mk[data-k="' + k + '"]:not(.hid)').length;

  ev("S.mapOff = []; render();"); await wait(200);
  const basePeaks = visible("peak"), baseLakes = visible("lake");
  check("all peaks visible by default", basePeaks > 0);

  legendBtn("peak").dispatchEvent(new MouseEvent("click", {bubbles:true}));
  await wait(400);
  check("single click hides that layer", visible("peak") === 0);
  check("single click leaves other layers alone", visible("lake") === baseLakes);

  legendBtn("peak").dispatchEvent(new MouseEvent("click", {bubbles:true}));
  await wait(400);
  check("clicking again restores the layer", visible("peak") === basePeaks);

  legendBtn("pass").dispatchEvent(new MouseEvent("dblclick", {bubbles:true}));
  await wait(200);
  check("double click isolates that layer",
    visible("pass") > 0 && visible("peak") === 0 && visible("lake") === 0);

  legendBtn("pass").dispatchEvent(new MouseEvent("dblclick", {bubbles:true}));
  await wait(200);
  check("double click again restores everything",
    visible("peak") === basePeaks && visible("lake") === baseLakes);

  check("Show all button is absent when nothing is hidden", !doc.getElementById("lgall"));
```

- [ ] **Step 7: Verify**

Run: `node --test` — all pass.
Open `http://localhost:8765/test/harness.html` — title `PASS`.

Then exercise it by hand at `http://localhost:8765/`: click "Peak" (peaks vanish, row goes struck-through, "Show all" appears), double click "Lake" (only lakes remain), double click "Lake" again (everything back), reload the page (the hidden set persists), press "Show all".

- [ ] **Step 8: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: make the map legend the visibility control"
```

---

### Task 13: The detail panel

**Files:**
- Modify: `app/app.js:150-178` (`locatorFor`), `app/app.js:216-330` (`openRec`)

**Interfaces:**
- Consumes: the fact fields defined in Tasks 6–9.
- Produces: `FEATURE_FACTS` — `{[kind]: [[label, field], …]}`.

- [ ] **Step 1: Teach the locator about `pid`**

In `locatorFor()`, change:

```js
    const pid = r.seat || r.place;
```

to:

```js
    const pid = r.seat || r.place || r.pid;
```

That is the whole change — the district highlight already derives from `rel`, and features name their district there.

- [ ] **Step 2: Add the fact table**

Above `openRec()`:

```js
/* Each kind shows only its own rows; factsList() already drops empties,
   so a record that omits an optional field simply loses that row. */
const FEATURE_FACTS = {
  peak:    [["Height","alt"],["Range","range"],["Also called","alias"],
            ["First ascent","ascent"],["Known for","fame"]],
  pass:    [["Height","alt"],["Range","range"],["Connects","connects"],
            ["Status","status"],["On the route to","route"]],
  lake:    [["Type","type"],["Altitude","alt"],["On river","river"],
            ["Area","area"],["Sacred to","sacred"],["Ramsar site","ramsar"]],
  glacier: [["Size","size"],["Valley / basin","valley"],["Feeds","feeds"],
            ["Retreat","retreat"]]
};
```

- [ ] **Step 3: Add the panel branch**

In `openRec()`, after the `else if(k === "river"){…}` block and before `else if(k === "topic")`:

```js
  else if(FEATURE_FACTS[k]){
    body += factsList(FEATURE_FACTS[k].map(([lb,f]) => [lb, r[f]]));
    body += locatorFor(id);
    body += renderBlocks(r.blocks);
    if(r.districts && r.districts.length){
      const v = r.districts.filter(x => IDX.has(x));
      if(v.length) body += '<div class="blk"><h5>'+
        (k === "pass" ? "Connects these districts" : "In these districts")+'</h5><div class="rel">'+
        v.map(x => '<button class="relchip" type="button" data-go="'+x+'">'+
        '<i class="k" style="background:'+KINDS.district.c+'"></i>'+IDX.get(x).r.name+
        '</button>').join('')+'</div></div>';
    }
  }
```

- [ ] **Step 4: Add panel assertions to the harness**

Append before the summary:

```js
  win.openRec("ps-shipkila"); await wait(150);
  const pb = doc.getElementById("pbody").textContent;
  check("pass panel shows the height", /3,930 m/.test(pb));
  check("pass panel shows what it connects", /Tibet/.test(pb));
  check("pass panel shows a locator map", !!doc.querySelector("#pbody .locator"));
  check("pass panel shows district chips", /Kinnaur/.test(pb));
  check("pass panel kind label reads Pass",
    doc.getElementById("pkind").textContent.includes("Pass"));

  win.openRec("lk-pong"); await wait(150);
  check("lake panel shows the Ramsar year", /2002/.test(doc.getElementById("pbody").textContent));

  win.openRec("gl-barashigri"); await wait(150);
  check("glacier panel names the river it feeds",
    /Chenab|Chandra/.test(doc.getElementById("pbody").textContent));
```

- [ ] **Step 5: Verify**

Open `http://localhost:8765/test/harness.html` — title `PASS`.
By hand: click a pass on the map and confirm the panel shows facts, minimap, prose, exam hook and district chips.

- [ ] **Step 6: Commit**

```bash
git add app/app.js test/harness.html
git commit -m "feat: render feature detail panels"
```

---

### Task 14: Generated reverse links

Pasting 62 ids into three topic records by hand is the drift risk the app exists to avoid. Generate the reverse direction instead.

**Files:**
- Modify: `app/app.js` — `openRec()` topic and district branches

**Interfaces:**
- Consumes: `D.features`.
- Produces: `featureChips(kinds)` — takes an **array** of kind strings, returns an HTML string with one block per kind; `featuresIn(districtId)` → array of feature records.

- [ ] **Step 1: Add the helpers**

Next to `FEATURE_FACTS`:

```js
/* The forward direction lives in each feature's own `rel`; the reverse
   direction is generated here so the two can never disagree. */
const TOPIC_FEATURES = {"t-peaks":["peak","glacier"], "t-passes":["pass"], "t-lakes":["lake"]};
function featureChips(kinds){
  return kinds.map(k => {
    const list = (D.features || []).filter(f => f.k === k);
    if(!list.length) return "";
    return '<div class="blk"><h5>All '+list.length+' '+KINDS[k].pl.toLowerCase()+'</h5><div class="rel">'+
      list.map(f => '<button class="relchip" type="button" data-go="'+f.id+'">'+
        '<i class="k" style="background:'+KINDS[k].c+'"></i>'+f.name+'</button>').join('')+
      '</div></div>';
  }).join('');
}
function featuresIn(did){
  return (D.features || []).filter(f => (f.districts || []).includes(did));
}
```

- [ ] **Step 2: Use them in the topic branch**

In `openRec()`, replace the topic branch body with:

```js
  else if(k === "topic"){
    body += factsList([["Section", r.sec], ["Covers", r.kw]]);
    body += renderBlocks(r.blocks);
    if(TOPIC_FEATURES[id]) body += featureChips(TOPIC_FEATURES[id]);
  }
```

- [ ] **Step 3: Use them in the district branch**

In the district branch, after `body += renderBlocks(r.blocks);`:

```js
    const fs = featuresIn(id);
    if(fs.length) body += '<div class="blk"><h5>Features in this district — '+fs.length+'</h5><div class="rel">'+
      fs.map(f => '<button class="relchip" type="button" data-go="'+f.id+'">'+
        '<i class="k" style="background:'+KINDS[f.k].c+'"></i>'+f.name+'</button>').join('')+
      '</div></div>';
```

- [ ] **Step 4: Add harness assertions**

```js
  win.openRec("t-passes"); await wait(150);
  check("t-passes lists all 18 passes",
    doc.querySelectorAll('#pbody .relchip[data-go^="ps-"]').length === 18);

  win.openRec("t-peaks"); await wait(150);
  check("t-peaks lists peaks and glaciers",
    doc.querySelectorAll('#pbody .relchip[data-go^="pk-"]').length === 12 &&
    doc.querySelectorAll('#pbody .relchip[data-go^="gl-"]').length === 12);

  win.openRec("d-kinnaur"); await wait(150);
  check("a district lists its own features",
    doc.querySelectorAll('#pbody .relchip[data-go^="pk-"], #pbody .relchip[data-go^="ps-"]').length > 0);
```

- [ ] **Step 5: Verify**

Open the harness — title `PASS`.

- [ ] **Step 6: Commit**

```bash
git add app/app.js test/harness.html
git commit -m "feat: generate reverse links from topics and districts to features"
```

---

### Task 15: Search

**Files:**
- Modify: `app/app.js:910-930` (the `SEARCH` builder)

- [ ] **Step 1: Index the new fields**

In the `IDX.forEach` that builds `SEARCH`, extend `extra` and `txt`:

```js
    extra:(r.kw || r.role || r.yr || r.hq || r.capital || r.sans || r.joins || r.alt || r.type || ""),
```

and add to the `txt` array, after the river fields:

```js
         // features are looked up by height and by what they connect
         r.alt||"", r.range||"", r.connects||"", r.status||"", r.route||"",
         r.valley||"", r.feeds||"", r.sacred||"", r.ramsar||"", r.fame||"",
         r.type||"", r.river||"", r.size||"",
```

- [ ] **Step 2: Add harness assertions**

```js
  const hits = q => { win.runSearch(q);
    return [...doc.querySelectorAll("#results .res")].map(b => b.dataset.go); };
  check("searching a height finds the pass", hits("5,578").includes("ps-parangla") ||
                                             hits("5578").includes("ps-parangla"));
  check("searching a name finds the peak", hits("reo purgyil").includes("pk-reopurgyil"));
  check("searching 'shipki' finds the pass", hits("shipki").includes("ps-shipkila"));
  check("searching 'ramsar' finds the three sites",
    ["lk-pong","lk-renuka","lk-chandratal"].every(id => hits("ramsar").includes(id)));
```

Note: heights are stored with a thousands comma (`"5,578 m"`), so the bare-digits query only matches if you also store an unpunctuated copy. If `hits("5578")` fails, strip commas when building `txt`:

```js
         (r.alt||"").replace(/,/g, ""),
```

Add that line rather than changing how `alt` displays.

- [ ] **Step 3: Verify**

Open the harness — title `PASS`. Then type `5578` into the app's own search box and confirm Parang La appears with its height in the grey column.

- [ ] **Step 4: Commit**

```bash
git add app/app.js test/harness.html
git commit -m "feat: index feature heights and attributes for search"
```

---

### Task 16: Flashcards

**Files:**
- Modify: `app/app.js:684-711` (`buildCards`)
- Create: `test/cards.test.js`

**Interfaces:**
- Consumes: `D.features`, `D.rivers`.
- Produces: additional `{sec:"Geography", q, a, id}` cards — 124 from the 62 features, plus cards for each of the 29 river records (a record missing an optional field simply yields fewer cards).

- [ ] **Step 1: Write the failing test**

`test/cards.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {loadData, ROOT} = require("./load");

const {D} = loadData();

/* buildCards() lives inside app.js, which expects a DOM. Extract just the
   function and run it against the real data — the cards must be generated
   from records, never authored separately, so they cannot drift. */
function buildCardsFn(){
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  const start = src.indexOf("function buildCards()");
  const end = src.indexOf("\nconst cardPool", start);
  assert.ok(start > 0 && end > start, "could not locate buildCards in app.js");
  const num = n => n == null ? "" : n.toLocaleString("en-IN");
  // eslint-disable-next-line no-new-func
  return new Function("D", "num", src.slice(start, end) + "\nreturn buildCards();");
}

test("cards are generated for every feature", () => {
  const cards = buildCardsFn()(D, n => n == null ? "" : n.toLocaleString("en-IN"));
  for(const f of D.features){
    assert.ok(cards.some(c => c.id === f.id), "no card for " + f.id);
  }
});

test("cards are generated for every river", () => {
  const cards = buildCardsFn()(D, n => n == null ? "" : n.toLocaleString("en-IN"));
  for(const r of D.rivers){
    assert.ok(cards.some(c => c.id === r.id), "no card for river " + r.id);
  }
});

test("feature and river cards land in the Geography section", () => {
  const cards = buildCardsFn()(D, n => n == null ? "" : n.toLocaleString("en-IN"));
  const ids = new Set(D.features.map(f => f.id).concat(D.rivers.map(r => r.id)));
  for(const c of cards){
    if(ids.has(c.id)) assert.equal(c.sec, "Geography", c.id + " filed under " + c.sec);
  }
});

test("no card has an empty question or answer", () => {
  const cards = buildCardsFn()(D, n => n == null ? "" : n.toLocaleString("en-IN"));
  for(const c of cards){
    assert.ok(c.q && c.q.trim(), "empty question on " + c.id);
    assert.ok(c.a && String(c.a).trim(), "empty answer on " + c.id);
    assert.ok(!/undefined|\[object/.test(c.q + c.a), "broken interpolation on " + c.id);
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --testcards.test.js`
Expected: FAIL — `no card for ps-shipkila`.

- [ ] **Step 3: Extend buildCards**

Insert before `return c;` in `buildCards()`:

```js
  /* Features and rivers: the facts a prelims paper actually asks. Every
     card is derived from a record field, so editing the record edits the
     card and the two cannot drift apart. */
  (D.features || []).forEach(f => {
    if(f.k === "peak"){
      push("Geography", f.name+" — height and range?",
        "<b>"+f.alt+"</b>"+(f.range ? " · "+f.range : ""), f.id);
      push("Geography", "Which district is "+f.name+" in?",
        "<b>"+(f.districts || []).map(d => IDX.has(d) ? IDX.get(d).r.name : d).join(", ")+"</b>", f.id);
    } else if(f.k === "pass"){
      push("Geography", f.name+" — height?", "<b>"+f.alt+"</b>", f.id);
      push("Geography", f.name+" — what does it connect?",
        "<b>"+f.connects+"</b>"+(f.range ? "<br>"+f.range : ""), f.id);
    } else if(f.k === "lake"){
      push("Geography", f.name+" — natural or man-made, and where?",
        "<b>"+f.type+"</b>"+(f.alt ? " · "+f.alt : "")+
        " · "+(f.districts || []).map(d => IDX.has(d) ? IDX.get(d).r.name : d).join(", "), f.id);
      if(f.ramsar) push("Geography", "When was "+f.name+" designated a Ramsar site?",
        "<b>"+f.ramsar+"</b>", f.id);
      else push("Geography", f.name+" — what is it known for?",
        f.sacred || f.river || f.area || f.type, f.id);
    } else if(f.k === "glacier"){
      push("Geography", f.name+" — which valley, and which river does it feed?",
        "<b>"+f.valley+"</b><br>Feeds the <b>"+f.feeds+"</b>", f.id);
    }
  });
  (D.rivers || []).forEach(r => {
    push("Geography", r.name+" — where does it rise?", "<b>"+r.source+"</b>", r.id);
    if(r.lenHP) push("Geography", r.name+" — length in Himachal?", "<b>"+r.lenHP+"</b>", r.id);
    if(r.sans) push("Geography", r.name+" — Sanskrit, Vedic and Greek names?",
      [r.sans, r.vedic, r.greek].filter(Boolean).join(" · "), r.id);
    if(r.tribs) push("Geography", r.name+" — tributaries and where they join?", r.tribs, r.id);
    if(r.projects) push("Geography", r.name+" — the projects on it?", r.projects, r.id);
  });
```

The `IDX` lookup means `buildCards()` now depends on `IDX`, which is defined above it in the same file — no ordering change needed. The test passes `D` and `num` explicitly and `IDX` is captured from the extracted source, so if the test reports `IDX is not defined`, add `IDX` to the `new Function` parameter list and pass a `Map` built from `D` in the test.

- [ ] **Step 4: Run the tests**

Run: `node --test`
Expected: all pass.

- [ ] **Step 5: Sanity-check the count**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const {loadData} = require("./test/load");
const {D} = loadData();
console.log("features:", D.features.length, " rivers:", D.rivers.length);
'
```

Expected: `features: 62  rivers: 29`. Then open the app, go to Revise → Flashcards → Geography, and confirm the deck now runs well past its old length and that pass and glacier cards appear.

- [ ] **Step 6: Commit**

```bash
git add app/app.js test/cards.test.js
git commit -m "feat: generate flashcards from features and rivers"
```

---

### Task 17: Ship it

**Files:**
- Modify: `sw.js:5-7`
- Modify: `build-single.sh:12-13`
- Modify: `README.md`

- [ ] **Step 1: Add the two new files to the single-file build**

`build-single.sh` keeps its own module list, and it must stay in step with the `<script>` tags in `index.html` — it has silently fallen behind once already. Add `features.js` to the data tuple and `mapkit.js` to the app tuple, each in the same position it occupies in `index.html`:

```python
js   = "\n".join(pathlib.Path("data", f).read_text()
                 for f in ("geo.js","places.js","history.js","topics.js",
                           "rivers.js","features.js","quiz.js","pyq.js"))
js  += "\n" + "\n".join(pathlib.Path("app", f).read_text()
                        for f in ("logo.js","mapkit.js","trends.js","app.js"))
```

`mapkit.js` must come before `app.js` — `app.js` calls `mkGlyph()` and `placeLabels()` at render time. Its `typeof module` guard is inert in the browser, so concatenating it is safe.

- [ ] **Step 2: Verify the single-file build**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && ./build-single.sh && \
  grep -c "D.features" ../hp-revision.html && grep -c "D.pyq" ../hp-revision.html
```

Expected: both greps report at least 1 — `D.pyq` confirms the rest of the module list is still in step. Open `../hp-revision.html` directly in a browser, go to the map, and click a pass — the panel must open with full detail and no network access.

- [ ] **Step 3: Bump the service worker**

In `sw.js`, increment the `CACHE` version string, and confirm the precache array on lines 6–7 lists `app/mapkit.js` and `data/features.js` (added in Task 6 Step 4).

- [ ] **Step 4: Update the README**

Add `data/features.js` and `app/mapkit.js` to the file map, and document the legend interaction — single click hides a layer, double click isolates it, `Show all` resets, and the hidden set persists in `hpatlas:mapoff`.

- [ ] **Step 5: Full verification**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node --test
```
Expected: every test passes.

Open `http://localhost:8765/test/harness.html`. Expected: title `PASS`, zero failures.

Then walk the app by hand:
1. Map → geo mode: four distinguishable glyph shapes, legible labels.
2. Click one peak, one pass, one lake, one glacier — each opens its own record with facts, minimap, prose and exam hook.
3. Drag across a marker — the panel must **not** open.
4. Legend: single click hides, double click isolates, `Show all` resets, reload persists.
5. Search `5578` → Parang La.
6. Revise → Flashcards → Geography: pass and glacier cards appear.
7. Open `t-passes` → all 18 chips; open `d-kinnaur` → its features listed.

- [ ] **Step 6: Commit**

```bash
git add sw.js build-single.sh README.md ../hp-revision.html
git commit -m "chore: bundle features and mapkit into the offline build, bump cache"
```

---

## Verification summary

| Spec requirement | Task |
|---|---|
| `data/features.js`, `pid` link, four `IDX` kinds | 6, 10 |
| Per-kind fact rows | 13 |
| River-depth prose + exam hook on every record | 6, 7, 8, 9 (enforced by the exam-hook test in Task 6) |
| 12 glaciers placed through the fixed projection | 5 |
| Distinct glyph per kind | 2, 11 |
| Label de-collision, recomputed on zoom and toggle | 3, 11, 12 |
| Legend click / double click / Show all / persistence / keyboard | 4, 12 |
| `#rivtog` removed, rivers split into two layers | 12 |
| Markers open their own record, topic fallback retained | 10 |
| Locator handles `pid` | 13 |
| `goTo` selects geo mode | 10 |
| Generated reverse links | 14 |
| Height indexed for search | 15 |
| Generated cards for all features and all 29 rivers | 16 |
| `sw.js` cache bump, `build-single.sh` module list | 17 |
| Pointer-capture regression guard | 10 (harness drag test), 11, 12 |
