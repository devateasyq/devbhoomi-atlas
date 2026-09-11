# Rounds Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A vertically-scrolling feed of single HPAS prelims facts, one per screen, moved by a flick — the app's first passive, ninety-second mode.

**Architecture:** A new pure module `app/rounds.js` extracts ~299 atomic facts from the exam-hook notes already in the records and orders them unseen-first, both DOM-free and unit-testable under Node. `app/app.js` gains a seventh top-level view that renders those facts as full-height cards in a native CSS scroll-snap container — no gesture library — with an `IntersectionObserver` marking a fact seen only once it settles on screen.

**Tech Stack:** Plain ES5-compatible browser JavaScript, no framework, no build step, no runtime dependencies. Tests on Node's built-in `node --test`, plus the committed in-browser harness.

## Global Constraints

- **Zero runtime dependencies.** No npm packages reach the browser. `test/` may import nothing outside Node's stdlib. There is no `package.json` and none may be created.
- **No build step.** `index.html` loads plain `<script src>` tags. `app/rounds.js` uses `var`/`function` declarations, no ES module syntax, and ends with a `typeof module` guard so Node can `require()` it — exactly like `app/mapkit.js`.
- **Run tests with `node --test`** (no path argument) from the repo root, or `node --test test/<file>.test.js` for one file. A *directory* argument is broken on the installed Node 25.2.1. `test/load.js` appears as a vacuous passing suite; expected.
- **43 tests pass today.** All must still pass.
- **Facts are generated from records at runtime**, never authored separately — the same rule the flashcards follow, so a fact cannot drift from the note it came from.
- **Quality thresholds, exact:** drop atoms shorter than **8** characters; sentence-split atoms longer than **120** characters; drop atoms that merely restate their record's own name.
- **Fact id format:** `<recordId>#<atomIndex>`, e.g. `ps-shipkila#3`.
- **`localStorage` key:** `hpatlas:seen`.
- **Bump `CACHE` in `sw.js`** after any asset change, or returning visitors keep the stale version.
- Do not alter the map's pointer-capture logic: `svg.setPointerCapture()` is called only after the drag threshold inside `pointermove`, never on `pointerdown`.

---

## File Structure

**Create:**
- `app/rounds.js` — `buildFacts(D)`, `orderFacts(facts, seen)`. Pure, DOM-free.
- `test/rounds.test.js` — unit tests for both.

**Modify:**
- `app/app.js` — `NAV`, `COUNTS`, `SUB`, `TITLE`, the `render()` dispatcher, `S` initialiser, plus `viewRounds()` and `mountRounds()`.
- `app/components.css` — feed and card rules.
- `index.html` — script tag.
- `sw.js` — precache list and `CACHE`.
- `test/harness.html` — feed assertions.
- `build-single.sh`, `README.md` — ship step.

---

### Task 1: Extract the facts

**Files:**
- Create: `app/rounds.js`
- Create: `test/rounds.test.js`

**Interfaces:**
- Produces: `buildFacts(D)` → array of `{id, srcId, kind, name, text}`. `kind` is a key of `KINDS` in `app/app.js` (`district`, `state`, `event`, `battle`, `person`, `topic`, `river`, and for feature records their own `peak`/`pass`/`lake`/`glacier`). Task 2 and Task 4 depend on these exact field names.

- [ ] **Step 1: Write the failing test**

`test/rounds.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");
const rounds = require("../app/rounds.js");

const {D} = loadData();
const FACTS = rounds.buildFacts(D);

test("facts are extracted from the exam hooks", () => {
  assert.ok(FACTS.length > 200, "expected a usable pool, got " + FACTS.length);
});

test("every fact carries its source record and a display name", () => {
  const ids = new Set();
  for(const k of ["districts","states","events","battles","people","topics","rivers","features"]){
    for(const r of (D[k] || [])) ids.add(r.id);
  }
  for(const f of FACTS){
    assert.ok(ids.has(f.srcId), f.id + " points at missing record " + f.srcId);
    assert.ok(f.name && f.name.trim(), f.id + " has no display name");
    assert.ok(f.kind && f.kind.trim(), f.id + " has no kind");
  }
});

test("fact ids are unique and follow recordId#index", () => {
  const seen = new Set();
  for(const f of FACTS){
    assert.match(f.id, /^.+#\d+$/, "bad id shape: " + f.id);
    assert.ok(!seen.has(f.id), "duplicate id: " + f.id);
    seen.add(f.id);
    assert.equal(f.id.split("#")[0], f.srcId, f.id + " id does not match srcId");
  }
});

/* The three filters are the whole point of the extraction: the raw split
   yields circular, too-short and multi-subject atoms. */
test("no fact is shorter than the 8-character floor", () => {
  for(const f of FACTS) assert.ok(f.text.length >= 8, "too short: " + f.id + " = " + f.text);
});

test("no fact exceeds the 120-character ceiling", () => {
  for(const f of FACTS) assert.ok(f.text.length <= 120, "too long: " + f.id + " = " + f.text);
});

/* Asserted against the real offenders rather than by re-running the
   implementation's own rule, which would pass for any rule at all. */
test("circular atoms that only restate the record name are dropped", () => {
  const dharmsura = FACTS.filter(f => f.srcId === "pk-dharmsura");
  for(const f of dharmsura){
    assert.notMatch(f.text.toLowerCase(), /^also called white sail$/,
      "kept a circular atom: " + f.name + " — " + f.text);
  }
});

test("thin atoms that are bare attributes are dropped", () => {
  /* "Pong / Maharana Pratap Sagar — Beas" and "Indrasan — Kullu" are not
     facts on their own; the 8-character floor is what removes them. */
  for(const f of FACTS){
    assert.ok(!/^(Beas|Ravi|Kullu|NTPC|Sutlej|Chenab)$/i.test(f.text),
      "kept a bare attribute: " + f.name + " — " + f.text);
  }
});

test("a genuinely useful alternate name survives the circularity filter", () => {
  /* The filter must not be so greedy it eats real content: Reo Purgyil's
     alternate spelling is a fact, unlike "also called White Sail". */
  const reo = FACTS.filter(f => f.srcId === "pk-reopurgyil").map(f => f.text.toLowerCase());
  assert.ok(reo.some(t => /leo pargial/.test(t)),
    "the Leo Pargial alternate name was filtered out: " + JSON.stringify(reo));
});

test("no fact still carries HTML markup", () => {
  for(const f of FACTS) assert.ok(!/[<>]/.test(f.text), "markup left in: " + f.text);
});

test("the Hamirpur hook is split rather than left as one multi-district run", () => {
  const h = FACTS.filter(f => f.srcId === "d-hamirpur");
  assert.ok(h.length >= 2, "expected the long Hamirpur hook to be sentence-split");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/rounds.test.js`
Expected: FAIL — `Cannot find module '../app/rounds.js'`

- [ ] **Step 3: Write the implementation**

`app/rounds.js`:

```js
/* ============================================================
   rounds — the fact feed's pure half.
   No DOM, no globals beyond what it defines. Facts are derived
   from the records' exam-hook notes at runtime, never authored
   separately, so a fact cannot drift from its source note.
   ============================================================ */
"use strict";

var MIN_FACT = 8;    /* "NTPC" is not a fact */
var MAX_FACT = 120;  /* above this a hook is a run of several facts */

/* Hooks are pipe-separated runs of facts carrying <b> emphasis, e.g.
   "3,930 m · Zanskar range · the <b>Sutlej enters India here</b>". */
function splitHook(raw){
  var txt = String(raw).replace(/<[^>]+>/g, "");
  var parts = txt.split("·");
  var out = [];
  for(var i = 0; i < parts.length; i++){
    var t = parts[i].replace(/\s+/g, " ").trim().replace(/\.$/, "");
    if(!t) continue;
    if(t.length > MAX_FACT){
      /* some hooks use no separator at all, so the whole hook arrives as
         one atom — the Hamirpur hook runs to 187 characters and covers
         two different districts */
      var pieces = t.split(/\.\s+/);
      for(var j = 0; j < pieces.length; j++){
        var p = pieces[j].replace(/\s+/g, " ").trim().replace(/\.$/, "");
        if(p) out.push(p);
      }
    } else out.push(t);
  }
  return out;
}

function keepFact(text, name){
  if(text.length < MIN_FACT || text.length > MAX_FACT) return false;
  /* An atom that only restates the record's own name says nothing: the
     name is already the headline on the card. "Dharmsura (White Sail) —
     also called White Sail" is the case this removes. */
  var core = text.toLowerCase().replace(/^(also (called|known as|spelt|spelled)|aka)\s+/, "");
  var ck = core.replace(/[^a-z0-9]+/g, "");
  var nk = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "");
  if(!ck) return false;
  if(nk && nk.indexOf(ck) >= 0) return false;
  return true;
}

function buildFacts(D){
  var groups = [["district", D.districts], ["state", D.states], ["event", D.events],
                ["battle", D.battles], ["person", D.people], ["topic", D.topics],
                ["river", D.rivers], ["feature", D.features]];
  var out = [];
  for(var g = 0; g < groups.length; g++){
    var kind = groups[g][0], list = groups[g][1] || [];
    for(var i = 0; i < list.length; i++){
      var r = list[i];
      var name = r.name || r.t || r.title || r.id;
      /* feature records carry their own kind, so a pass shows as PASS */
      var k = (kind === "feature" && r.k) ? r.k : kind;
      var blocks = r.blocks || [], atoms = [];
      for(var b = 0; b < blocks.length; b++){
        if(blocks[b][0] !== "note") continue;
        if(!/exam hook/i.test(String(blocks[b][1]))) continue;
        atoms = atoms.concat(splitHook(blocks[b][2]));
      }
      var n = 0;
      for(var a = 0; a < atoms.length; a++){
        if(!keepFact(atoms[a], name)) continue;
        out.push({id: r.id + "#" + n, srcId: r.id, kind: k, name: name, text: atoms[a]});
        n++;
      }
    }
  }
  return out;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {buildFacts: buildFacts, splitHook: splitHook,
                    keepFact: keepFact, MIN_FACT: MIN_FACT, MAX_FACT: MAX_FACT};
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/rounds.test.js`
Expected: 10 tests pass.

Then run the whole suite: `node --test` — expected 53 pass, 0 fail.

- [ ] **Step 5: Report the pool**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const {loadData}=require("./test/load"); const {D}=loadData();
const F=require("./app/rounds.js").buildFacts(D);
const by={}; F.forEach(f=>by[f.kind]=(by[f.kind]||0)+1);
console.log("facts:",F.length, JSON.stringify(by));
const L=F.map(f=>f.text.length).sort((a,b)=>a-b);
console.log("len min",L[0],"median",L[L.length>>1],"max",L[L.length-1]);
F.slice(0,5).forEach(f=>console.log("  ["+f.kind+"] "+f.name+" — "+f.text));
'
```

Paste the output in your report. The pool should be roughly 280–300 facts.

- [ ] **Step 6: Commit**

```bash
git add app/rounds.js test/rounds.test.js
git commit -m "feat: extract prelims facts from the exam-hook notes"
```

---

### Task 2: Order the feed

**Files:**
- Modify: `app/rounds.js`
- Modify: `test/rounds.test.js`

**Interfaces:**
- Consumes: `buildFacts(D)` from Task 1.
- Produces: `orderFacts(facts, seen)` → a new array holding **every** fact exactly once, all unseen facts (shuffled) before any seen fact, seen facts ordered oldest-seen first. `seen` is an array of fact ids in the order they were first seen; it is never mutated.

- [ ] **Step 1: Write the failing test**

Append to `test/rounds.test.js`:

```js
test("orderFacts returns every fact exactly once", () => {
  const out = rounds.orderFacts(FACTS, []);
  assert.equal(out.length, FACTS.length);
  assert.equal(new Set(out.map(f => f.id)).size, FACTS.length);
});

test("no seen fact comes before an unseen one", () => {
  const seen = FACTS.slice(0, 40).map(f => f.id);
  const out = rounds.orderFacts(FACTS, seen);
  const seenSet = new Set(seen);
  let hitSeen = false;
  for(const f of out){
    if(seenSet.has(f.id)) hitSeen = true;
    else assert.ok(!hitSeen, "unseen fact " + f.id + " came after a seen one");
  }
});

test("seen facts come back oldest-seen first, so a full cycle spaces repetition", () => {
  const seen = FACTS.slice(0, 5).map(f => f.id);          // index 0 seen longest ago
  const out = rounds.orderFacts(FACTS, seen).filter(f => seen.includes(f.id));
  assert.deepEqual(out.map(f => f.id), seen);
});

test("orderFacts never mutates the seen array it is given", () => {
  const seen = FACTS.slice(0, 3).map(f => f.id);
  const copy = seen.slice();
  rounds.orderFacts(FACTS, seen);
  assert.deepEqual(seen, copy);
});

test("orderFacts copes with a seen id that no longer exists", () => {
  /* exam hooks get edited, which shifts atom indices and orphans an id */
  const out = rounds.orderFacts(FACTS, ["ps-shipkila#99", "no-such-record#0"]);
  assert.equal(out.length, FACTS.length);
});

test("orderFacts shuffles rather than returning source order", () => {
  /* 299 facts: identical order twice running is effectively impossible
     unless nothing is shuffling at all */
  const a = rounds.orderFacts(FACTS, []).map(f => f.id).join();
  const b = rounds.orderFacts(FACTS, []).map(f => f.id).join();
  assert.notEqual(a, b);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/rounds.test.js`
Expected: FAIL — `rounds.orderFacts is not a function`

- [ ] **Step 3: Write the implementation**

Insert into `app/rounds.js` before the `module.exports` guard:

```js
function shuffle(a){
  for(var i = a.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* Unseen facts first, shuffled. Seen facts follow oldest-first, so when
   the pool is exhausted the feed cycles into what you saw longest ago —
   spaced repetition for free, and no "you're done" wall. */
function orderFacts(facts, seen){
  var at = {}, list = seen || [];
  for(var i = 0; i < list.length; i++) if(!(list[i] in at)) at[list[i]] = i;
  var fresh = [], stale = [];
  for(var j = 0; j < facts.length; j++){
    if(facts[j].id in at) stale.push(facts[j]); else fresh.push(facts[j]);
  }
  shuffle(fresh);
  stale.sort(function(x, y){ return at[x.id] - at[y.id]; });
  return fresh.concat(stale);
}
```

Add `orderFacts: orderFacts` to the `module.exports` object.

- [ ] **Step 4: Run the tests**

Run: `node --test`
Expected: 59 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add app/rounds.js test/rounds.test.js
git commit -m "feat: order the fact feed unseen-first"
```

---

### Task 3: Register the view

Wires Rounds into the rail, the router and the render dispatcher. After this task the tab exists and is reachable but renders an empty container — Task 4 fills it.

**Files:**
- Modify: `app/app.js` — `NAV`, `COUNTS`, `SUB`, `TITLE`, `S`, `render()`, state init
- Modify: `index.html`, `sw.js`

**Interfaces:**
- Consumes: `buildFacts`, `orderFacts` from `app/rounds.js`.
- Produces: `FACTS` (module-level array, built once), `S.seen` (array of fact ids, persisted at `hpatlas:seen`), and `viewRounds()` returning the feed container's markup. Task 4 and Task 5 depend on these names.

- [ ] **Step 1: Load the module**

In `index.html`, add immediately **before** the `app/app.js` tag (alongside `app/mapkit.js`):

```html
<script src="app/rounds.js"></script>
```

In `sw.js`, add `"app/rounds.js"` to the `ASSETS` array next to `"app/mapkit.js"`, and bump the `CACHE` constant.

- [ ] **Step 2: Add the nav entry**

In `app/app.js`, add to the `NAV` array immediately **before** the `revise` entry:

```js
  {id:"rounds",   lb:"Rounds",   ic:'<path d="M12 3a9 9 0 109 9"/><path d="M12 7a5 5 0 105 5"/><circle cx="12" cy="12" r="1.6"/>'},
```

The icon is a spiral echoing the brand mark — a loop that closes inward.

Then add to `COUNTS`, `SUB` and `TITLE`:

```js
/* COUNTS */   rounds: FACTS.length,
/* SUB */      rounds:"One fact at a time",
/* TITLE */    rounds:"Rounds",
```

`TITLE` is what the hash router validates against, so adding the key there is what makes `#/rounds` a legal URL.

- [ ] **Step 3: Build the fact pool once, and restore the seen set**

Immediately after the `IDX`/`PLACE_REC` block near the top of `app/app.js`:

```js
/* Facts are a projection of the records, built once at load like SEARCH. */
const FACTS = buildFacts(D);
```

Add `seen:[]` to the `S` initialiser, and next to the other `store.get` restores at the bottom of the file:

```js
S.seen = store.get("seen", []);
```

- [ ] **Step 4: Add the view function and the dispatcher branch**

Add near the other view functions:

```js
function viewRounds(){
  return '<div id="roundsfeed" class="rounds" tabindex="0" role="region" '+
    'aria-label="Prelims facts, one per screen"></div>';
}
```

In `render()`, add before the `revise` line:

```js
  else if(S.view === "rounds") { s.innerHTML = viewRounds(); mountRounds(); }
```

`#stage` is itself a scrolling element, and nesting a scroll-snap container inside it produces two scrollbars. Suppress the outer one only for this view — at the top of `render()`:

```js
  s.classList.toggle("noscroll", S.view === "rounds");
```

Add the matching rule to `app/components.css`:

```css
#stage.noscroll{overflow:hidden}
```

- [ ] **Step 5: Add a stub so the branch runs**

Add next to `viewRounds()`, to be replaced in Task 5:

```js
function mountRounds(){ /* filled in by the feed task */ }
```

- [ ] **Step 6: Verify**

Run: `node --check app/app.js && node --test`
Expected: 59 pass, 0 fail.

Then confirm the wiring is consistent:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && grep -n "rounds" app/app.js index.html sw.js | cut -c1-100
```

Every one of `NAV`, `COUNTS`, `SUB`, `TITLE`, `render`, the script tag and the precache list must appear.

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/components.css index.html sw.js
git commit -m "feat: register the Rounds view"
```

---

### Task 4: The card and the scroll-snap feed

**Files:**
- Modify: `app/app.js` — add `roundCard()`
- Modify: `app/components.css`

**Interfaces:**
- Consumes: `FACTS`, `KINDS` from `app/app.js`.
- Produces: `roundCard(f)` → HTML string for one card. Task 5 appends these.

- [ ] **Step 1: Add the card builder**

Next to `viewRounds()` in `app/app.js`:

```js
/* One fact per card. The kind label reuses the map legend's colour, so a
   glance says whether this is a pass, a lake, a district or a treaty. */
function roundCard(f){
  const k = KINDS[f.kind];
  return '<button class="short" type="button" data-fid="'+f.id+'" data-src="'+f.srcId+'">'+
    '<span class="k" style="color:'+(k ? k.c : "var(--accent)")+'">'+(k ? k.lb : "Fact")+'</span>'+
    '<span class="nm">'+f.name+'</span>'+
    '<span class="ft">'+f.text+'</span>'+
    '<span class="go">Open the note &rarr;</span></button>';
}
```

- [ ] **Step 2: Add the CSS**

Append to `app/components.css`:

```css
/* ---------- Rounds: one fact per screen, native scroll-snap ---------- */
.rounds{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;
  overscroll-behavior:contain;scrollbar-width:none;outline:none}
.rounds::-webkit-scrollbar{display:none}
.short{scroll-snap-align:start;scroll-snap-stop:always;
  height:100%;width:100%;max-width:420px;margin:0 auto;
  display:flex;flex-direction:column;justify-content:center;gap:13px;
  padding:32px 26px;border:0;border-bottom:1px solid var(--line-soft);
  background:none;text-align:left;cursor:pointer;font:inherit}
.short .k{font-family:var(--f-mono);font-size:10.5px;letter-spacing:.16em;
  text-transform:uppercase}
.short .nm{font-family:var(--f-display);font-size:clamp(26px,6vw,38px);font-weight:600;
  line-height:1.1;letter-spacing:-.02em;color:var(--ink);text-wrap:balance}
.short .ft{font-size:19px;line-height:1.5;color:var(--ink-2);text-wrap:pretty}
.short .go{margin-top:6px;font-size:12.5px;color:var(--accent);
  opacity:0;transition:opacity .15s}
.short:hover .go,.short:focus-visible .go{opacity:1}
.short:focus-visible{outline:2px solid var(--accent);outline-offset:-4px}
```

Every colour is an existing token, so both themes work without a second block.

- [ ] **Step 3: Verify the markup renders**

The card builder is a pure string function, so check it under Node without a DOM:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const {loadData}=require("./test/load"); const {D}=loadData();
const f=require("./app/rounds.js").buildFacts(D)[0];
console.log(JSON.stringify(f,null,1));
' && node --check app/app.js && node --test 2>&1 | tail -4
```

Expected: the fact prints, syntax is clean, 59 tests pass.

Confirm the CSS braces balance:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const s=require("fs").readFileSync("app/components.css","utf8");
const o=(s.match(/{/g)||[]).length, c=(s.match(/}/g)||[]).length;
console.log("braces", o, c, o===c ? "balanced" : "UNBALANCED");
'
```

- [ ] **Step 4: Commit**

```bash
git add app/app.js app/components.css
git commit -m "feat: add the Rounds card and feed styling"
```

---

### Task 5: Mount the feed

The interactive half: windowed rendering, seen-marking, click-to-open.

**Files:**
- Modify: `app/app.js` — replace the `mountRounds()` stub
- Modify: `test/harness.html`

**Interfaces:**
- Consumes: `FACTS`, `orderFacts`, `roundCard`, `S.seen`, `openRec`, `IDX`, `store`.
- Produces: a working `mountRounds()`. No exports.

- [ ] **Step 1: Replace the stub**

```js
let RQ = [], RI = 0, RIO = null;
/* The feed is endless, so it renders a window and extends it rather than
   building a node per fact. RQ is the current ordering, RI the cursor. */
function appendRounds(feed, n){
  const tmp = document.createElement("div");
  let html = "";
  for(let i = 0; i < n; i++){
    if(RI >= RQ.length){ RQ = orderFacts(FACTS, S.seen); RI = 0; }
    html += roundCard(RQ[RI++]);
  }
  tmp.innerHTML = html;
  while(tmp.firstChild){
    const el = tmp.firstChild;
    feed.appendChild(el);
    if(RIO) RIO.observe(el);
  }
}
function mountRounds(){
  const feed = document.getElementById("roundsfeed");
  if(!feed || !FACTS.length) return;
  RQ = orderFacts(FACTS, S.seen); RI = 0;
  feed.innerHTML = "";
  if(RIO) RIO.disconnect();
  /* A fact counts as seen only once it has settled on screen — blasting a
     thumb down the feed must not burn facts that were never read. */
  RIO = new IntersectionObserver(entries => {
    let extend = false;
    for(const en of entries){
      if(en.intersectionRatio < 0.6) continue;
      const id = en.target.dataset.fid;
      if(S.seen.indexOf(id) < 0){ S.seen.push(id); store.set("seen", S.seen); }
      const cards = feed.children;
      if([].indexOf.call(cards, en.target) >= cards.length - 5) extend = true;
    }
    if(extend) appendRounds(feed, 15);
  }, {root: feed, threshold: 0.6});
  appendRounds(feed, 30);
  feed.addEventListener("click", e => {
    const b = e.target.closest(".short");
    if(b && IDX.has(b.dataset.src)) openRec(b.dataset.src);
  });
}
```

`RIO` is created *before* the first `appendRounds` so the initial cards are observed.

- [ ] **Step 2: Add harness assertions**

Append inside the harness's load handler, before the summary line:

```js
  ev('S.view="rounds"; render();');
  await wait(400);
  const feed = doc.getElementById("roundsfeed");
  check("the feed renders", !!feed);
  if(feed){
    const cards = feed.querySelectorAll(".short");
    check("a window of cards is rendered, not one per fact",
      cards.length >= 20 && cards.length <= 40, cards.length + " cards");
    check("the feed is a scroll-snap container",
      win.getComputedStyle(feed).scrollSnapType.indexOf("mandatory") >= 0,
      win.getComputedStyle(feed).scrollSnapType);
    check("each card fills the feed",
      cards.length > 0 && Math.abs(cards[0].getBoundingClientRect().height -
        feed.getBoundingClientRect().height) < 2);

    const first = cards[0];
    const want = first.dataset.src;
    doc.getElementById("panel").hidden = true;
    first.click();
    await wait(150);
    check("tapping a card opens the record it names", ev("S.sel") === want,
      "got " + ev("S.sel") + ", wanted " + want);
    check("the card names a real record", !!want && want.length > 1);
  }
```

- [ ] **Step 3: Verify**

Run: `node --check app/app.js && node --test`
Expected: 59 pass, 0 fail.

Extract the harness's inline script and `node --check` it.

You have no browser, so you cannot execute the harness. Say so in your report and list the checks above as outstanding.

- [ ] **Step 4: Commit**

```bash
git add app/app.js test/harness.html
git commit -m "feat: mount the Rounds feed with windowed rendering and seen-marking"
```

---

### Task 6: Ship it

**Files:**
- Modify: `build-single.sh`, `sw.js`, `README.md`

- [ ] **Step 1: Add the module to the offline build**

`build-single.sh` keeps its own module list and must stay in step with the `<script>` tags in `index.html`. Add `rounds.js` to the app tuple, in the same position it occupies there:

```python
js  += "\n" + "\n".join(pathlib.Path("app", f).read_text()
                        for f in ("logo.js","mapkit.js","rounds.js","trends.js","app.js"))
```

`rounds.js` must precede `app.js`, which calls `buildFacts()` at load time.

- [ ] **Step 2: Run the build and check it**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && ./build-single.sh ../hp-revision.html && \
  grep -c "buildFacts" ../hp-revision.html && grep -c "orderFacts" ../hp-revision.html && \
  grep -c "D.features" ../hp-revision.html
```

Expected: every grep at least 1. The build writes **outside** the git repo, so it cannot be staged — that is expected.

- [ ] **Step 3: Bump the service worker**

Increment `CACHE` in `sw.js`, and confirm `app/rounds.js` is in the `ASSETS` array.

- [ ] **Step 4: Update the README**

Add `app/rounds.js` to the file map and describe Rounds in the app's existing voice: a vertical feed of single prelims facts generated from the records' exam hooks, ordered unseen-first, with the seen set persisted at `hpatlas:seen`. Note that battle and people records carry no exam hooks and so contribute no facts.

- [ ] **Step 5: Full verification**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node --test
```
Expected: 59 pass, 0 fail.

Then the repo owner opens `http://localhost:8765/test/harness.html` and confirms `PASS`, and walks the app by hand:

1. Rounds appears in the rail with a fact count.
2. It opens straight into a full-height card; one flick moves exactly one card.
3. Tapping a card opens that record in the detail panel.
4. Arrow keys and space page the feed.
5. Scrolling a few cards, leaving, and returning shows different facts first.
6. The feed never ends.

- [ ] **Step 6: Commit**

```bash
git add build-single.sh sw.js README.md
git commit -m "chore: bundle rounds into the offline build, bump cache"
```

---

## Verification summary

| Spec requirement | Task |
|---|---|
| Atoms split from exam hooks | 1 |
| 8-character floor, name-restating filter, 120-character sentence split | 1 |
| Fact id `recordId#index`, source record carried | 1 |
| Unseen-first ordering, oldest-seen cycling, no completion state | 2 |
| `S.seen` persisted at `hpatlas:seen` | 3, 5 |
| Top-level Rounds tab, hash-routable | 3 |
| Card: kind label in legend colour, name, fact, open-the-note | 4 |
| Native scroll-snap, 420px column, both themes | 4 |
| Windowed rendering, extend near the end | 5 |
| Seen only once settled on screen | 5 |
| Tap opens the source record | 5 |
| Offline build, service worker, README | 6 |
