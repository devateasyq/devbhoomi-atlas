# Posts and Confidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two taps on every Rounds card that tell the app how well you know a fact and change what it shows you next, plus cards you write yourself.

**Architecture:** The decisions stay pure and Node-testable — fact identity and feed ordering in `app/rounds.js`, confidence and post validation in `app/sync.js`. `app/app.js` keeps only DOM plumbing. Posts live in their own Firestore collection rather than the shared user document, mirrored in `localStorage` so the app still works offline and signed out.

**Tech Stack:** Plain ES5-compatible browser JavaScript. No framework, no build step, no npm. Firebase Auth + Firestore via the vendored compat SDK.

## Global Constraints

- **Zero npm dependencies**; no `package.json`; `test/` imports nothing outside Node's stdlib.
- **No build step.** `app/sync.js` and `app/rounds.js` use `var`/`function`, no ES module syntax, one trailing `typeof module` guard each. `app/app.js` is browser-only and uses `const`/arrow freely.
- **Run tests with `node --test`** (no path argument) from the repo root, or `node --test test/<file>.test.js`. A *directory* argument is broken on this Node build. `assert.notMatch` is unavailable; `assert.match` is.
- **149 tests pass today.** All must still pass.
- **Confidence values are exactly `"got"` and `"again"`.** Anything else is dropped, never stored.
- **A post is capped at 400 characters**, enforced with a visible counter, never silently at save.
- **At most 500 posts.**
- **`conf` joins `SYNC_KEYS`. `posts` does NOT** — putting posts in the user document reintroduces the 1 MB ceiling this design exists to avoid.
- **A post's confidence key is `post:<postId>`**, which cannot collide with a fact's `recordId#hash`.
- **Posts are always `visibility: "private"`.** No sharing, no public feed, no moderation in this sub-project.
- **Bump `CACHE` in `sw.js`** after any asset change.
- Device preferences (`theme`, `mapoff`, `legendopen`) still never sync.

---

## What the implementer must know before starting

**Every Rounds card is currently a `<button class="short">`.** The whole card is one button that opens the record. HTML forbids nesting a button inside a button, so the two confidence controls cannot simply be added — the card has to stop being a button first. Task 4 does that, and Tasks 5 and 7 depend on it.

**`mergeAnswers` in `app/sync.js` tests presence with `!out[k]`.** That reads inherited `Object.prototype` members for keys like `constructor`, and it was a real data-loss bug in the notes map. It is pre-existing and out of scope here, but **the new confidence merge must use `Object.prototype.hasOwnProperty.call` from the start** rather than copying that pattern.

## File Structure

**Modify:**
- `app/rounds.js` — `factId`, stable ids in `buildFacts`, four-tier `orderFacts`, `pruneSeen`. Pure.
- `app/sync.js` — `CONF_VALUES`, `normaliseConf`, `mergeConf`, `setConf`, `POST_MAX`, `POST_LIMIT`, `normalisePost`, `validPosts`. Pure.
- `app/app.js` — card restructure, the two buttons, the composer, post sync.
- `app/components.css`, `test/harness.html`, `test/sync.test.js`, `test/rounds.test.js`, `firestore.rules`, `sw.js`, `README.md`, `index.html`.

No new JS files: `rounds.js` owns the feed's logic and `sync.js` owns what syncs. A third file would split one idea across two places.

---

### Task 1: Stable fact ids

**Files:** Modify `app/rounds.js`, `test/rounds.test.js`

**Interfaces:**
- Produces: `factId(recordId, text)` → `"<recordId>#<base36 hash>"`; `buildFacts` uses it; `pruneSeen(seen, facts)` → seen filtered to ids that still exist.

- [ ] **Step 1: Write the failing test**

Append to `test/rounds.test.js`:

```js
test("a fact's id comes from its text, not its position", () => {
  const a = rounds.factId("d-kangra", "Kangra fort fell in 1620");
  const b = rounds.factId("d-kangra", "Kangra fort fell in 1620");
  assert.equal(a, b, "the same text must always give the same id");
  assert.ok(a.startsWith("d-kangra#"), a);
});

test("editing a fact's text changes its id", () => {
  const a = rounds.factId("d-kangra", "Kangra fort fell in 1620");
  const b = rounds.factId("d-kangra", "Kangra fort fell in 1621");
  assert.notEqual(a, b);
});

test("the same text under two records keeps two ids", () => {
  assert.notEqual(rounds.factId("d-kangra", "same words"),
                  rounds.factId("d-shimla", "same words"));
});

test("reordering a record's atoms leaves every id unchanged", () => {
  const texts = ["first fact here", "second fact here", "third fact here"];
  const before = texts.map(t => rounds.factId("r1", t));
  const after = [texts[2], texts[0], texts[1]].map(t => rounds.factId("r1", t));
  for(const t of texts){
    const i = texts.indexOf(t);
    assert.ok(after.includes(before[i]), "id for " + JSON.stringify(t) + " survived reordering");
  }
});

test("pruneSeen drops ids no current fact claims", () => {
  const facts = [{id: "a#1"}, {id: "b#2"}];
  assert.deepEqual(rounds.pruneSeen(["a#1", "gone#9", "b#2"], facts), ["a#1", "b#2"]);
  assert.deepEqual(rounds.pruneSeen(null, facts), []);
  assert.deepEqual(rounds.pruneSeen(["a#1"], []), []);
});

test("pruneSeen keeps the order it was given", () => {
  const facts = [{id: "x"}, {id: "y"}, {id: "z"}];
  assert.deepEqual(rounds.pruneSeen(["z", "x", "y"], facts), ["z", "x", "y"]);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/rounds.test.js`
Expected: FAIL — `rounds.factId is not a function`.

- [ ] **Step 3: Implement**

In `app/rounds.js`, above `buildFacts`:

```js
/* Ids were recordId + "#" + the atom's index, so adding, removing or
   reordering a line in a record's exam hook shifted every id after it onto
   a different fact. That only mis-attributed `seen`, which is cosmetic —
   but a confidence rating landing on the wrong fact would bury something
   the student does not know, which is the opposite of the job. Hash the
   fact's own text instead: reordering moves nothing, and genuinely editing
   a fact's wording correctly makes it a new card, because it is one. */
function hash32(s){
  var h = 2166136261, i;                 /* FNV-1a, 32-bit */
  for(i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}
function factId(recordId, text){
  return recordId + "#" + hash32(String(text == null ? "" : text));
}

/* Ids that no current fact claims — a fact whose wording was edited, or
   anything left over from the old positional scheme. Dropped on load so
   they neither inflate the seen count nor sit in the synced document
   forever. */
function pruneSeen(seen, facts){
  var have = {}, out = [], i;
  for(i = 0; i < (facts || []).length; i++) have[facts[i].id] = 1;
  for(i = 0; i < (seen || []).length; i++)
    if(have[(seen || [])[i]]) out.push(seen[i]);
  return out;
}
```

Replace the id line inside `buildFacts`:

```js
        out.push({id: factId(r.id, atoms[a]), srcId: r.id, kind: k, name: name, text: atoms[a]});
```

The `var n = 0;` counter and its `n++` are now unused — remove both.

Add `factId: factId, pruneSeen: pruneSeen` to `module.exports`.

- [ ] **Step 4: Verify**

Run: `node --test`
Expected: **155 pass, 0 fail** (149 plus six new).

Confirm every generated id is unique — a hash collision would silently merge two facts:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const {D} = require("./test/load.js").loadData();
const r = require("./app/rounds.js");
const f = r.buildFacts(D);
const ids = new Set(f.map(x => x.id));
console.log("facts", f.length, "unique ids", ids.size, f.length === ids.size ? "OK" : "*** COLLISION ***");'
```

Expected: counts equal. If they are not, stop and report — do not proceed.

- [ ] **Step 5: Commit**

```bash
git add app/rounds.js test/rounds.test.js
git commit -m "fix: a fact's id comes from its text, not its position"
```

---

### Task 2: The confidence store

**Files:** Modify `app/sync.js`, `test/sync.test.js`

**Interfaces:**
- Produces: `CONF_VALUES` (`["got","again"]`), `normaliseConf(obj)`, `mergeConf(a,b)`, `setConf(conf, id, v)` — writing the value a card already holds clears it.

- [ ] **Step 1: Write the failing test**

Append to `test/sync.test.js`:

```js
test("only got and again are storable confidence values", () => {
  assert.deepEqual(sync.CONF_VALUES, ["got", "again"]);
  const out = sync.normaliseConf({a: {v: "got", t: 1}, b: {v: "again", t: 2},
                                  c: {v: "maybe", t: 3}, d: {v: 1, t: 4}, e: null});
  assert.deepEqual(Object.keys(out).sort(), ["a", "b"]);
});

test("normaliseConf defaults a missing timestamp to zero", () => {
  assert.equal(sync.normaliseConf({a: {v: "got"}}).a.t, 0);
});

test("mergeConf keeps the most recent decision per fact", () => {
  const a = {f1: {v: "got", t: 100}, f2: {v: "again", t: 5}};
  const b = {f1: {v: "again", t: 900}, f3: {v: "got", t: 5}};
  const m = sync.mergeConf(a, b);
  assert.equal(m.f1.v, "again", "the later decision wins");
  assert.equal(m.f2.v, "again");
  assert.equal(m.f3.v, "got");
});

test("mergeConf never mutates its inputs", () => {
  const a = {x: {v: "got", t: 1}}, b = {x: {v: "again", t: 2}};
  sync.mergeConf(a, b);
  assert.equal(a.x.v, "got");
  assert.equal(b.x.v, "again");
});

test("mergeConf survives a hostile key", () => {
  const m = sync.mergeConf({constructor: {v: "got", t: 1}}, {toString: {v: "again", t: 1}});
  assert.equal(m.constructor && m.constructor.v, "got", "an inherited builtin must not swallow it");
  assert.equal(m.toString && m.toString.v, "again");
  /* NOT `"__proto__" in x` — that is true for every plain object via the
     inherited accessor, so the assertion could never fail whatever the
     code did. Own-property is the question worth asking. */
  const pp = sync.mergeConf({"__proto__": {v: "got", t: 1}}, {});
  assert.ok(!Object.prototype.hasOwnProperty.call(pp, "__proto__"));
  assert.equal(Object.getPrototypeOf(pp), Object.prototype, "the prototype must be untouched");
});

test("setConf records a decision", () => {
  const before = Date.now();
  const out = sync.setConf({}, "f1", "got");
  assert.equal(out.f1.v, "got");
  assert.ok(out.f1.t >= before);
});

test("setConf with the value already held clears it", () => {
  const held = sync.setConf({}, "f1", "again");
  const out = sync.setConf(held, "f1", "again");
  assert.ok(!("f1" in out), "tapping the same button again returns to normal rotation");
});

test("setConf switching between the two replaces rather than clears", () => {
  const held = sync.setConf({}, "f1", "again");
  assert.equal(sync.setConf(held, "f1", "got").f1.v, "got");
});

test("setConf ignores a value that is not got or again", () => {
  assert.deepEqual(sync.setConf({}, "f1", "maybe"), {});
});

test("setConf does not mutate the map it is given", () => {
  const c = {};
  sync.setConf(c, "f1", "got");
  assert.deepEqual(c, {});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/sync.test.js`
Expected: FAIL — `sync.CONF_VALUES` is undefined.

- [ ] **Step 3: Implement**

In `app/sync.js`, directly above the `SYNC_KEYS` registry:

```js
/* How well the student says they know a fact. Same {value, timestamp}
   shape the quiz and past-paper answers use, so it merges by the same
   most-recent-wins rule — one idea, not two.

   hasOwnProperty throughout, never `!out[k]`: mergeAnswers above still uses
   truthiness, which reads the inherited Object.prototype member for a key
   like "constructor" and silently drops the entry. That was a real bug in
   the notes map. Not repeated here. */
var CONF_VALUES = ["got", "again"];

function confOk(v){ return v === "got" || v === "again"; }

function normaliseConf(obj){
  var out = {}, k, e;
  if(!obj || typeof obj !== "object") return out;
  for(k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if(k === "__proto__") continue;
    e = obj[k];
    if(!e || typeof e !== "object" || !confOk(e.v)) continue;
    out[k] = {v: e.v, t: typeof e.t === "number" ? e.t : 0};
  }
  return out;
}

function mergeConf(a, b){
  var A = normaliseConf(a), B = normaliseConf(b), out = {}, k;
  for(k in A) if(Object.prototype.hasOwnProperty.call(A, k)) out[k] = A[k];
  for(k in B){
    if(!Object.prototype.hasOwnProperty.call(B, k)) continue;
    if(!Object.prototype.hasOwnProperty.call(out, k) || B[k].t > out[k].t) out[k] = B[k];
  }
  return out;
}

/* Pressing the state a card already holds clears it. One button that
   undoes itself is easier to reach, on a card you are scrolling past,
   than a third button for "I was wrong about that". */
function setConf(conf, id, v){
  var out = normaliseConf(conf);
  if(!confOk(v) || id === "__proto__") return out;
  if(Object.prototype.hasOwnProperty.call(out, id) && out[id].v === v){ delete out[id]; return out; }
  out[id] = {v: v, t: Date.now()};
  return out;
}
```

Add a registry entry, after `pyq` and before `notes`:

```js
  {k: "conf",   empty: function(){ return {}; }, merge: mergeConf},
```

Add `CONF_VALUES: CONF_VALUES, normaliseConf: normaliseConf, mergeConf: mergeConf, setConf: setConf` to `module.exports`.

- [ ] **Step 4: Verify**

Run: `node --test`
Expected: **165 pass, 0 fail**.

The registry test from an earlier sub-project asserts the exact key list. Update it to `["seen", "quiz", "pyq", "conf", "notes", "streak"]` — that assertion exists to catch an accidental change, and this one is deliberate. Say so in your report.

- [ ] **Step 5: Commit**

```bash
git add app/sync.js test/sync.test.js
git commit -m "feat: store how well you know each fact"
```

---

### Task 3: The feed listens to it

**Files:** Modify `app/rounds.js`, `test/rounds.test.js`

**Interfaces:**
- Produces: `orderFacts(facts, seen, conf)` → again-first, then unseen shuffled, then seen oldest-first, then got-last. The third argument is optional; omitting it must reproduce today's behaviour exactly.

- [ ] **Step 1: Write the failing test**

Append to `test/rounds.test.js`:

```js
const F = n => Array.from({length: n}, (_, i) => ({id: "f" + i, text: "t" + i}));

test("orderFacts without confidence behaves exactly as before", () => {
  const facts = F(5), seen = ["f1", "f3"];
  const out = rounds.orderFacts(facts, seen, {});
  assert.equal(out.length, 5);
  assert.deepEqual(out.slice(3).map(f => f.id), ["f1", "f3"], "seen still trail, oldest first");
});

test("again comes first and got comes last", () => {
  const facts = F(6);
  const conf = {f4: {v: "again", t: 1}, f0: {v: "got", t: 1}};
  const out = rounds.orderFacts(facts, ["f0", "f2"], conf).map(f => f.id);
  assert.equal(out[0], "f4", "a card marked again leads");
  assert.equal(out[out.length - 1], "f0", "a card marked got trails everything");
});

test("every fact appears exactly once whatever its state", () => {
  const facts = F(8);
  const conf = {f1: {v: "again", t: 1}, f2: {v: "got", t: 1}, f5: {v: "again", t: 2}};
  const out = rounds.orderFacts(facts, ["f2", "f3", "f5"], conf);
  assert.equal(out.length, 8);
  assert.equal(new Set(out.map(f => f.id)).size, 8);
});

test("a got fact that was never seen still trails", () => {
  const facts = F(4);
  const out = rounds.orderFacts(facts, [], {f3: {v: "got", t: 1}}).map(f => f.id);
  assert.equal(out[out.length - 1], "f3");
});

test("orderFacts does not mutate what it is given", () => {
  const facts = F(4), seen = ["f1"], conf = {f2: {v: "got", t: 1}};
  rounds.orderFacts(facts, seen, conf);
  assert.deepEqual(seen, ["f1"]);
  assert.deepEqual(facts.map(f => f.id), ["f0", "f1", "f2", "f3"]);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/rounds.test.js`
Expected: FAIL — `again` is not ordered first, because `orderFacts` ignores its third argument.

- [ ] **Step 3: Implement**

Replace `orderFacts` in `app/rounds.js`:

```js
/* Four tiers. Unseen-first-then-oldest was the whole ordering; confidence
   wraps it rather than replacing it, so a feed with nothing marked comes
   out exactly as it always did.
     again  — you asked to see it again, so it leads
     unseen — shuffled, as before
     seen   — oldest first, as before
     got    — you said you know it, so it waits behind everything */
function orderFacts(facts, seen, conf){
  var at = {}, list = seen || [], c = conf || {}, i, id;
  for(i = 0; i < list.length; i++) if(!(list[i] in at)) at[list[i]] = i;
  var again = [], fresh = [], stale = [], got = [];
  for(i = 0; i < facts.length; i++){
    id = facts[i].id;
    var st = Object.prototype.hasOwnProperty.call(c, id) && c[id] ? c[id].v : null;
    if(st === "again")      again.push(facts[i]);
    else if(st === "got")   got.push(facts[i]);
    else if(id in at)       stale.push(facts[i]);
    else                    fresh.push(facts[i]);
  }
  shuffle(fresh);
  stale.sort(function(x, y){ return at[x.id] - at[y.id]; });
  return again.concat(fresh, stale, got);
}
```

- [ ] **Step 4: Verify**

Run: `node --test`
Expected: **170 pass, 0 fail**.

- [ ] **Step 5: Commit**

```bash
git add app/rounds.js test/rounds.test.js
git commit -m "feat: the feed orders by what you said you know"
```

---

### Task 4: A card stops being a button

**Files:** Modify `app/app.js`, `app/components.css`, `test/harness.html`

This task adds no feature. It exists because HTML forbids a button inside a button, and Tasks 5 and 7 both need controls inside a card.

**Interfaces:**
- Produces: a card is `<article class="short" data-fid data-src>` containing `<button class="shopen">` for the existing open-the-record action.

- [ ] **Step 1: Restructure the card**

In `roundCard`, replace the wrapper. The outer element becomes an `<article>`, and everything that used to be the button's own click target moves inside a nested button:

```js
function roundCard(f){
  const k = KINDS[f.kind];
  const c = k ? k.c : "var(--accent)";
  const p = PIC_REC[f.srcId] || PICS[f.kind];
  /* An <article>, not a <button>: the confidence controls live inside a
     card, and HTML forbids a button inside a button. The card's own
     open-the-record action is the nested .shopen button. */
  return '<article class="short" data-fid="'+esc(f.id)+'" data-src="'+esc(f.srcId)+'" '+
      'style="--kc:'+c+'">'+
    (p ? '<img class="rpic" src="'+p.s+'" alt="" loading="lazy" decoding="async">' : '')+
    roundArt(f)+
    '<button class="shopen" type="button" data-src="'+esc(f.srcId)+'">'+
      '<span class="k">'+(k ? k.lb : "Fact")+'</span>'+
      '<span class="nm">'+esc(f.name)+'</span>'+
      '<span class="ft">'+esc(f.text)+'</span>'+
      '<span class="go">Open the note &rarr;</span>'+
    '</button>'+
    (p ? '<span class="cred">'+esc(p.t)+' &middot; '+esc(p.a)+' / '+esc(p.l)+'</span>' : '')+
    '</article>';
}
```

- [ ] **Step 2: Keep the click working**

`mountRounds`'s feed listener closes on `.short`, which is no longer the button. Change it to the new inner button:

```js
  feed.addEventListener("click", e => {
    const b = e.target.closest(".shopen");
    if(b && IDX.has(b.dataset.src)) openRec(b.dataset.src);
  });
```

- [ ] **Step 3: Move the button styling inwards**

Three existing rules break when the spans move inside a nested button, and
each one is silent — nothing errors, the card just degrades:

- `.short > span{position:relative;z-index:2}` is a **direct-child**
  selector. The spans are no longer direct children, so they lose their
  stacking and can fall behind the colour wash.
- `.short:focus-visible{outline:...}` targets an element that is no longer
  focusable. The focus ring must follow the focus, onto `.shopen`.
- `.short:hover .go,.short:focus-visible .go` — same; the focus half has to
  move.

**Do not use `display:contents` on `.shopen`.** An element with
`display:contents` generates no box at all, so its focus outline never
renders — a keyboard user would lose the focus ring entirely. Make it a
flex container that fills the card instead.

In `app/components.css`, change `.short`'s declaration list: drop
`cursor:pointer`, `border:0`, `background:none`, `text-align:left` and
`font:inherit` — those belong to a control — and keep everything else
(`position`, `overflow`, the scroll-snap pair, sizing, the flex column,
`padding`, `border-bottom`, `isolation`) exactly as it is.

Then:

```css
/* The card's own action. It fills the card and inherits the column layout
   the card used to lay out directly, so nothing moves. NOT display:contents
   — that generates no box, and a focus ring on no box is no focus ring. */
.shopen{flex:1;width:100%;display:flex;flex-direction:column;justify-content:center;
  gap:12px;padding:0;border:0;background:none;font:inherit;text-align:left;
  color:inherit;cursor:pointer;position:relative;z-index:2}
.shopen:focus-visible{outline:2px solid var(--accent);outline-offset:-4px}
```

and repoint the two broken selectors:

```css
.short span{position:relative;z-index:2}
.short:hover .go,.shopen:focus-visible .go{opacity:1}
```

removing the old `.short > span`, `.short:focus-visible` and
`.short:hover .go,.short:focus-visible .go` rules as you go. This step must
not change how a card looks.

- [ ] **Step 4: Verify**

Run: `node --check app/app.js && node --test`
Expected: **170 pass, 0 fail** — this task adds no Node tests.

Confirm no nested buttons remain:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && grep -n 'class="short"' app/app.js
```

Expected: one hit, an `<article>`.

Add to `test/harness.html`, inside the Rounds section:

```js
  check("a card is not a button", !!doc.querySelector("article.short"),
    doc.querySelector(".short") ? doc.querySelector(".short").tagName : "none");
  check("no button is nested inside another button",
    !doc.querySelector("#roundsfeed button button"));
  check("the card still opens its record",
    !!doc.querySelector(".short .shopen[data-src]"));
```

You have no browser; report these as outstanding.

- [ ] **Step 5: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "refactor: a Rounds card is an article, not a button"
```

---

### Task 5: The two taps

**Files:** Modify `app/app.js`, `app/components.css`, `test/harness.html`

**Interfaces:**
- Consumes: `setConf`, `orderFacts(facts, seen, conf)`.
- Produces: `confBar(id)` markup inside every card; `markConf(id, v)` persists and re-queues.

- [ ] **Step 1: Render the controls**

In `roundCard`, immediately before the closing `'</article>'`:

```js
    confBar(f.id)+
```

And add beside it:

```js
/* Neither button is required — scrolling past without deciding leaves the
   card in normal rotation, which is how the feed has always worked. */
function confBar(id){
  const c = store.get("conf", {});
  const held = Object.prototype.hasOwnProperty.call(c, id) && c[id] ? c[id].v : "";
  const btn = (v, lb, sym) =>
    '<button class="cfb'+(held === v ? " on" : "")+'" type="button" '+
      'data-conf="'+v+'" data-cfid="'+esc(id)+'" '+
      'aria-pressed="'+(held === v ? "true" : "false")+'">'+
      '<span aria-hidden="true">'+sym+'</span>'+lb+'</button>';
  return '<div class="cfbar">'+btn("got", "Got it", "&check;")+
         btn("again", "Again", "&#8634;")+'</div>';
}
```

- [ ] **Step 2: Wire them**

In `mountRounds`'s feed click listener, before the `.shopen` branch:

```js
  feed.addEventListener("click", e => {
    const cf = e.target.closest(".cfb");
    if(cf){ markConf(cf.dataset.cfid, cf.dataset.conf, cf.closest(".short")); return; }
    const b = e.target.closest(".shopen");
    if(b && IDX.has(b.dataset.src)) openRec(b.dataset.src);
  });
```

Add:

```js
/* "Again" has to mean again. Ordering alone would only take effect the next
   time the feed is built, so the card is also re-queued a few places ahead
   of where you are now — near enough to come back, far enough not to be the
   very next thing you see. */
const REQUEUE_AHEAD = 5;
function markConf(id, v, card){
  const next = setConf(store.get("conf", {}), id, v);
  store.set("conf", next);
  if(authUser()) pushStateSoon();
  const held = Object.prototype.hasOwnProperty.call(next, id) && next[id] ? next[id].v : "";
  if(card) card.querySelectorAll(".cfb").forEach(b => {
    const on = b.dataset.conf === held;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  if(held === "again" && card) requeueCard(card);
  toast(held === "got" ? "Got it" : held === "again" ? "Coming back shortly" : "Cleared");
}
/* Clone rather than move: moving the card the reader is looking at would
   yank the feed out from under their thumb. */
function requeueCard(card){
  const feed = card.parentNode; if(!feed) return;
  const kids = [].slice.call(feed.children);
  const at = kids.indexOf(card);
  if(at < 0) return;
  const copy = card.cloneNode(true);
  copy.classList.add("on");
  const before = kids[at + REQUEUE_AHEAD] || null;
  /* Fewer than REQUEUE_AHEAD cards below: go to the end, never nowhere. */
  feed.insertBefore(copy, before);
  if(RIO) RIO.observe(copy);
}
```

- [ ] **Step 3: Pass confidence to the ordering**

Both `orderFacts` call sites in `app/app.js` gain the third argument. In `mountRounds`:

```js
  RQ = orderFacts(FACTS, S.seen, store.get("conf", {})); RI = 0;
```

and in `appendRounds`, where the queue is rebuilt once it runs out:

```js
    if(RI >= RQ.length){ RQ = orderFacts(FACTS, S.seen, store.get("conf", {})); RI = 0; }
```

Task 7 changes `FACTS` to `allFacts()` at both of these; leave that alone for now.

- [ ] **Step 4: Prune stale seen ids on load**

Near the other startup migrations at the foot of `app/app.js`, after `S.seen` is read:

```js
/* Fact ids are a hash of the fact's text now, so ids saved under the old
   positional scheme — and any left by a since-edited fact — match nothing.
   Drop them rather than let them sit in the synced document forever. */
S.seen = pruneSeen(S.seen, FACTS);
store.set("seen", S.seen);
```

- [ ] **Step 5: Style the controls**

Append to `app/components.css`:

```css
.cfbar{display:flex;gap:8px;margin-top:12px}
.cfb{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;
  border:1px solid var(--line);background:var(--surface);color:var(--ink-2);
  font:inherit;font-size:13px;cursor:pointer;min-height:40px}
.cfb span{font-size:14px;line-height:1}
.cfb:hover{border-color:var(--accent-line);color:var(--ink)}
.cfb.on[data-conf="got"]{border-color:var(--good);color:var(--good);background:var(--accent-soft)}
.cfb.on[data-conf="again"]{border-color:var(--gold);color:var(--gold)}
```

- [ ] **Step 6: Verify**

Run: `node --check app/app.js && node --test`
Expected: **170 pass, 0 fail**.

Add to `test/harness.html`:

```js
  check("a card offers both confidence buttons",
    doc.querySelectorAll(".short .cfb").length >= 2);
  (function(){
    const card = doc.querySelector(".short");
    const got = card.querySelector('.cfb[data-conf="got"]');
    got.click();
    const stored = JSON.parse(win.localStorage.getItem("hpatlas:conf") || "{}");
    check("pressing Got it records it", (stored[card.dataset.fid]||{}).v === "got",
      JSON.stringify(stored[card.dataset.fid]));
    check("the button reads as pressed", got.getAttribute("aria-pressed") === "true");
    got.click();
    const after = JSON.parse(win.localStorage.getItem("hpatlas:conf") || "{}");
    check("pressing it again clears it",
      !Object.prototype.hasOwnProperty.call(after, card.dataset.fid), JSON.stringify(after));
  })();
  (function(){
    const feed = doc.getElementById("roundsfeed");
    const before = feed.children.length;
    const card = feed.children[0];
    card.querySelector('.cfb[data-conf="again"]').click();
    check("Again re-queues the card into the feed",
      feed.children.length === before + 1, before + " -> " + feed.children.length);
  })();
```

Report the harness checks as outstanding — you have no browser.

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: tell the feed what you know and what to bring back"
```

---

### Task 6: What a post is

**Files:** Modify `app/sync.js`, `test/sync.test.js`

**Interfaces:**
- Produces: `POST_MAX` (400), `POST_LIMIT` (500), `normalisePost(p)` → a clean post or `null`, `validPosts(list, knownIds)` → capped, cleaned array.

- [ ] **Step 1: Write the failing test**

Append to `test/sync.test.js`:

```js
test("a post is capped at 400 characters", () => {
  assert.equal(sync.POST_MAX, 400);
  assert.equal(sync.POST_LIMIT, 500);
  const p = sync.normalisePost({id: "p1", author: "u1", text: "x".repeat(900), tags: [], t: 5});
  assert.equal(p.text.length, 400);
});

test("normalisePost rejects what is not a post", () => {
  assert.equal(sync.normalisePost(null), null);
  assert.equal(sync.normalisePost({id: "p1", text: "   "}), null, "whitespace only");
  assert.equal(sync.normalisePost({text: "no id"}), null);
});

test("a post is always private in this sub-project", () => {
  const p = sync.normalisePost({id: "p1", author: "u1", text: "real", visibility: "public", t: 1});
  assert.equal(p.visibility, "private", "nothing here may publish anything");
});

test("tags are filtered to ids that actually exist", () => {
  const p = sync.normalisePost({id: "p1", author: "u1", text: "real",
                                tags: ["d-kangra", "ghost", "t-rivers"], t: 1},
                               new Set(["d-kangra", "t-rivers"]));
  assert.deepEqual(p.tags, ["d-kangra", "t-rivers"]);
});

test("validPosts drops junk and enforces the ceiling", () => {
  const many = Array.from({length: 640}, (_, i) => ({id: "p" + i, author: "u", text: "fact " + i, t: i}));
  const out = sync.validPosts(many.concat([null, {text: "no id"}]), null);
  assert.equal(out.length, 500);
  assert.equal(out[0].id, "p639", "the newest are the ones kept");
});

test("validPosts is stable and does not mutate its input", () => {
  const list = [{id: "p1", author: "u", text: "one", t: 1}];
  const out = sync.validPosts(list, null);
  assert.equal(out.length, 1);
  assert.equal(list[0].text, "one");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/sync.test.js`
Expected: FAIL — `sync.POST_MAX` is undefined.

- [ ] **Step 3: Implement**

In `app/sync.js`, after the note helpers:

```js
/* A post is a card in a feed you scroll, not an essay — shorter than a
   note's 1,000 on purpose, because a card you cannot read at a glance is
   not a card. The ceiling keeps the feed and the sync bounded; it is well
   past a year of daily use. */
var POST_MAX = 400, POST_LIMIT = 500;

function normalisePost(p, knownIds){
  if(!p || typeof p !== "object") return null;
  if(typeof p.id !== "string" || !p.id || p.id === "__proto__") return null;
  if(typeof p.text !== "string") return null;
  var text = p.text.slice(0, POST_MAX);
  if(!text.trim()) return null;
  var tags = [], i;
  if(Array.isArray(p.tags))
    for(i = 0; i < p.tags.length; i++)
      if(typeof p.tags[i] === "string" && (!knownIds || knownIds.has(p.tags[i])))
        tags.push(p.tags[i]);
  return {id: p.id,
          author: typeof p.author === "string" ? p.author : "",
          /* Never read from the input. Sharing is a later sub-project and
             nothing here may publish anything, whatever arrives. */
          visibility: "private",
          text: text, tags: tags,
          t: typeof p.t === "number" ? p.t : 0};
}

/* Newest first, junk dropped, capped. */
function validPosts(list, knownIds){
  var out = [], i, p;
  for(i = 0; i < (list || []).length; i++){
    p = normalisePost(list[i], knownIds);
    if(p) out.push(p);
  }
  out.sort(function(a, b){ return b.t - a.t; });
  return out.slice(0, POST_LIMIT);
}
```

Add `POST_MAX: POST_MAX, POST_LIMIT: POST_LIMIT, normalisePost: normalisePost, validPosts: validPosts` to `module.exports`.

- [ ] **Step 4: Verify**

Run: `node --test`
Expected: **176 pass, 0 fail**.

- [ ] **Step 5: Commit**

```bash
git add app/sync.js test/sync.test.js
git commit -m "feat: define what a post is and what it may not be"
```

---

### Task 7: Writing a post, and reading it in the feed

**Files:** Modify `app/app.js`, `app/components.css`, `test/harness.html`

**Interfaces:**
- Consumes: `validPosts`, `normalisePost`, `POST_MAX`, `factId`.
- Produces: `localPosts()`, `savePost(text, tags)`, `postsAsFacts()`, a composer opened from the Rounds view.

- [ ] **Step 1: Posts become cards**

```js
/* A post is a card, so it becomes a fact-shaped object and joins the same
   feed, the same ordering and the same two taps. The id is prefixed so a
   post's confidence entry can never collide with a fact's recordId#hash. */
function localPosts(){ return validPosts(store.get("posts", []), null); }
function postsAsFacts(){
  return localPosts().map(p => ({
    id: "post:" + p.id,
    srcId: (p.tags && p.tags[0]) || "",
    kind: "post", name: "Your card", text: p.text, post: p
  }));
}
function allFacts(){ return postsAsFacts().concat(FACTS); }

function savePost(text, tags){
  const clean = String(text == null ? "" : text).slice(0, POST_MAX);
  if(!clean.trim()){ toast("Nothing to save"); return null; }
  const list = localPosts();
  if(list.length >= POST_LIMIT){ toast("That is as many cards as this holds"); return null; }
  const u = authUser();
  const post = {id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
                author: u ? u.uid : "", visibility: "private",
                text: clean, tags: tags || [], t: Date.now()};
  store.set("posts", [post].concat(list));
  pushPost(post);
  toast("Card added");
  return post;
}
function deletePost(id){
  store.set("posts", localPosts().filter(p => p.id !== id));
  removePost(id);
  toast("Card removed");
}
```

`pushPost` and `removePost` arrive in Task 8. For this task only, define them as no-ops directly above `savePost` so it runs standalone; Task 8 replaces them:

```js
/* replaced in Task 8 */
function pushPost(){}
function removePost(){}
```

- [ ] **Step 2: Feed the composer**

Replace `FACTS` with `allFacts()` at the three places the feed builds — `mountRounds`'s `orderFacts`, `appendRounds`'s re-shuffle, and `mountRounds`'s `if(!FACTS.length) return;` guard. Leave `COUNTS.rounds` on `FACTS.length`: it counts the syllabus, not your own cards.

Add the composer to `viewRounds`, before the feed div:

```js
    '<div class="rcompose"><button class="btn sm" type="button" id="addcard">'+
      '&#43; Add a card</button></div>'+
```

And in `mountRounds`:

```js
  const add = document.getElementById("addcard");
  if(add) add.addEventListener("click", openComposer);
```

- [ ] **Step 3: The composer**

```js
/* Deliberately plain: a textarea, a counter and two buttons. A card you
   write while revising should cost one sentence, not a form. */
function openComposer(){
  const dlg = document.getElementById("cardlg");
  const ta = document.getElementById("cardtext");
  const cnt = document.getElementById("cardcount");
  ta.value = ""; cnt.textContent = "0 / " + POST_MAX;
  dlg.hidden = false;
  ta.focus();
}
function mountComposer(){
  const dlg = document.getElementById("cardlg");
  if(!dlg) return;
  const ta = document.getElementById("cardtext");
  const cnt = document.getElementById("cardcount");
  const shut = () => { dlg.hidden = true; };
  ta.addEventListener("input", () => { cnt.textContent = ta.value.length + " / " + POST_MAX; });
  document.getElementById("cardcancel").addEventListener("click", shut);
  dlg.addEventListener("click", e => { if(e.target === dlg) shut(); });
  document.getElementById("cardsave").addEventListener("click", () => {
    const sel = document.getElementById("cardtag");
    const tags = sel && sel.value ? [sel.value] : [];
    if(savePost(ta.value, tags)){ shut(); if(S.view === "rounds") render(); }
  });
}
```

Add to `index.html`, beside `#acctdlg`:

```html
<div id="cardlg" hidden role="dialog" aria-modal="true" aria-label="Add a card">
  <div class="acctcard">
    <h3>Add a card</h3>
    <p>It joins your Rounds feed beside the built-in facts, and takes the same two taps.</p>
    <label class="vh" for="cardtext">The fact</label>
    <textarea id="cardtext" maxlength="400" rows="3"
      placeholder="One fact, in your own words&hellip;"></textarea>
    <div class="noterow"><span class="notecount" id="cardcount">0 / 400</span></div>
    <label class="vh" for="cardtag">Attach to</label>
    <select id="cardtag"><option value="">Not attached to a record</option></select>
    <button class="btn" id="cardsave" type="button">Add the card</button>
    <button class="btn sm" id="cardcancel" type="button">Cancel</button>
  </div>
</div>
```

Fill the select once, in `mountComposer`, from records that already exist:

```js
  const sel = document.getElementById("cardtag");
  if(sel && sel.options.length < 2)
    sel.insertAdjacentHTML("beforeend",
      [...IDX.keys()].map(id => '<option value="'+esc(id)+'">'+esc(nameOf(IDX.get(id)))+'</option>').join(''));
```

Call `mountComposer();` once at startup, beside `mountSheet();`.

- [ ] **Step 4: Mark a post's card as yours**

In `roundCard`, the kind label must not claim a post is a syllabus record:

```js
  const k = KINDS[f.kind];
```

becomes

```js
  const isPost = !!f.post;
  const k = isPost ? null : KINDS[f.kind];
```

and the label span:

```js
      '<span class="k">'+(isPost ? "Your card" : (k ? k.lb : "Fact"))+'</span>'+
```

and after the credit line, for posts only, a way to remove it:

```js
    (isPost ? '<button class="cfb rm" type="button" data-del="'+esc(f.post.id)+'">Remove</button>' : '')+
```

Handle it in the feed click listener, before the `.cfb` branch:

```js
    const rm = e.target.closest("[data-del]");
    if(rm){ deletePost(rm.dataset.del); render(); return; }
```

- [ ] **Step 5: A tagged post shows on its record**

The spec says a post tagged to a record surfaces there. Without this the
tag is a label that does nothing. In `openRec`, immediately before the
`noteBlock(id)` line added by the previous sub-project:

```js
  body += postBlock(id);
```

and beside `noteBlock`:

```js
/* A card you wrote about this record, shown where the record is read. The
   tag is how a post belongs somewhere; without this it would be a label
   that changed nothing. */
function postBlock(id){
  const mine = localPosts().filter(p => (p.tags || []).indexOf(id) >= 0);
  if(!mine.length) return "";
  return '<div class="blk"><h5>Your cards &mdash; '+mine.length+'</h5>'+
    mine.map(p => '<p class="pcard-s">'+esc(p.text)+'</p>').join('')+'</div>';
}
```

```css
.pcard-s{font-size:13.5px;line-height:1.5;color:var(--ink-2);padding:9px 11px;
  border-left:2px solid var(--accent-line);background:var(--surface);
  border-radius:0 8px 8px 0;margin-bottom:8px}
```

- [ ] **Step 6: Style it**

```css
.rcompose{position:absolute;right:14px;top:14px;z-index:5}
.cfb.rm{margin-top:10px;border-color:var(--line);color:var(--ink-3)}
.cfb.rm:hover{border-color:var(--crit);color:var(--crit)}
#cardlg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;
  align-items:center;justify-content:center;z-index:80;padding:18px}
#cardlg textarea{width:100%;font:inherit;font-size:14px;line-height:1.5;padding:9px 11px;
  border-radius:8px;border:1px solid var(--line);background:var(--ground);color:var(--ink);resize:vertical}
#cardlg select{width:100%;font:inherit;font-size:13px;padding:8px 10px;border-radius:8px;
  border:1px solid var(--line);background:var(--ground);color:var(--ink);margin-bottom:10px}
```

- [ ] **Step 7: Verify**

Run: `node --check app/app.js && node --test`
Expected: **176 pass, 0 fail**.

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const s=require("fs").readFileSync("app/components.css","utf8");
const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length;
console.log("braces",o,c,o===c?"balanced":"UNBALANCED");'
```

Add to `test/harness.html`, in the Rounds section:

```js
  (function(){
    const before = win.localStorage.getItem("hpatlas:posts");
    ev('savePost("A card written by the harness", ["d-kangra"])');
    const posts = JSON.parse(win.localStorage.getItem("hpatlas:posts") || "[]");
    check("a card can be written", posts.length >= 1 && /harness/.test(posts[0].text),
      JSON.stringify(posts[0] || null));
    check("a written card is private", posts[0] && posts[0].visibility === "private");
    check("a written card keeps its tag",
      posts[0] && posts[0].tags.indexOf("d-kangra") >= 0, JSON.stringify(posts[0] && posts[0].tags));
    win.openRec("d-kangra"); await wait(250);
    check("a tagged card shows on its record",
      /written by the harness/.test(doc.getElementById("pbody").textContent));
    ev('deletePost(' + JSON.stringify(posts[0].id) + ')');
    const after = JSON.parse(win.localStorage.getItem("hpatlas:posts") || "[]");
    check("a card can be removed", !after.some(p => /harness/.test(p.text)),
      JSON.stringify(after.map(p => p.id)));
  })();
```

The `savePost` and `deletePost` calls go through `ev()` because both are
script-scoped functions rather than properties of `window`. Report the harness
checks as outstanding — you have no browser.

- [ ] **Step 8: Commit**

```bash
git add app/app.js app/components.css index.html test/harness.html
git commit -m "feat: write your own cards into the Rounds feed"
```

---

### Task 8: Posts sync, and the rules that allow it

**Files:** Modify `app/app.js`, `firestore.rules`

**Interfaces:**
- Produces: `pushPost(post)`, `removePost(id)`, `pullPosts()` — replacing Task 7's no-ops.

- [ ] **Step 1: Publish-ready rules**

Add to `firestore.rules`, inside the `documents` block and above the catch-all:

```
    // A post belongs to one author and is readable by nobody else. Posts
    // live outside users/{uid} because they are unbounded user text and the
    // user document has a hard 1 MB limit that progress and notes already
    // share. Opening a shared feed later means adding one clause to `read`
    // — that is the whole reason for this shape.
    match /posts/{postId} {
      allow read:   if request.auth != null && resource.data.author == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.author == request.auth.uid
                    && request.resource.data.visibility == "private";
      allow update, delete: if request.auth != null && resource.data.author == request.auth.uid;
    }
```

- [ ] **Step 2: Replace the no-ops**

```js
/* Posts sync one document each rather than riding in the user document,
   which already carries progress, notes and the streak against a hard
   1 MB limit. Failures are logged the way every other write here is —
   a silent failure would leave a card the student wrote on one device
   only, with nothing said. */
function postDoc(fb, id){ return fb.firestore().collection("posts").doc(id); }
function pushPost(post){
  if(!authUser() || !post) return;
  loadFirebase().then(fb => postDoc(fb, post.id).set(post))
    .catch(err => { console.error("[parikrama] post push failed:", err && err.code, err);
                    toast("Card saved on this device only"); });
}
function removePost(id){
  if(!authUser() || !id) return;
  loadFirebase().then(fb => postDoc(fb, id).delete())
    .catch(err => console.error("[parikrama] post delete failed:", err && err.code, err));
}
/* Union by id, newest wins, so a card written on either device survives. */
function pullPosts(){
  const u = authUser();
  if(!u) return Promise.resolve();
  return loadFirebase().then(fb =>
    fb.firestore().collection("posts").where("author", "==", u.uid).get().then(snap => {
      const remote = [];
      snap.forEach(doc => remote.push(doc.data()));
      const byId = {};
      localPosts().concat(validPosts(remote, null)).forEach(p => {
        if(!byId[p.id] || p.t > byId[p.id].t) byId[p.id] = p;
      });
      const merged = validPosts(Object.keys(byId).map(k => byId[k]), null);
      store.set("posts", merged);
      /* Anything this device holds that the server has not seen — written
         while signed out, or while a push failed. */
      const have = {}; remote.forEach(p => { have[p.id] = 1; });
      merged.filter(p => !have[p.id]).forEach(pushPost);
      if(S.view === "rounds") render();
    })
  ).catch(err => console.error("[parikrama] post pull failed:", err && err.code, err));
}
```

- [ ] **Step 3: Pull on sign-in, and clear on sign-out**

In `pullAndMerge`'s caller — the `onAuthChange` handler in `mountAccount` — after `pullAndMerge(user)` resolves, chain `pullPosts()`:

```js
    pullAndMerge(user)
      .then(() => pullPosts())
      .then(() => { render(); toast("Progress synced"); })
      .catch(() => toast("Could not sync just now"));
```

Add `store.del("posts");` to `wipeLocal()`, alongside the `SYNC_KEYS` loop — posts are local data belonging to the person who signed out, and a shared device must not keep them. Note in your report that `posts` is deliberately **not** in `SYNC_KEYS` and that this line is why `wipeLocal` still clears it.

- [ ] **Step 4: Verify**

Run: `node --check app/app.js && node --test`
Expected: **176 pass, 0 fail**.

Confirm posts never entered the synced document:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && grep -n '"posts"' app/sync.js
```

Expected: no output. If `posts` appears in `app/sync.js` at all, stop — it must not be a `SYNC_KEYS` entry.

State in your report that **the rules cannot be tested here** — they need a live Firebase project, and the repo owner must publish them before posts sync at all.

- [ ] **Step 5: Commit**

```bash
git add app/app.js firestore.rules
git commit -m "feat: posts sync in their own collection"
```

---

### Task 9: Ship it

**Files:** Modify `sw.js`, `README.md`

- [ ] **Step 1: Service worker**

Bump `CACHE`. Read `ASSETS` and confirm whether it needs changes rather than assuming — this sub-project adds no new files, but verify against the list.

- [ ] **Step 2: The offline build**

Run `./build-single.sh ../hp-revision.html` and confirm the new code is present:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && ./build-single.sh ../hp-revision.html && \
  for p in "function setConf" "function validPosts" "function markConf" "function factId"; do
    printf "%-22s %s\n" "$p" "$(grep -c "$p" ../hp-revision.html)"; done
```

Every count must be 1. The offline build forces `FB_READY = false`, so posts there are local-only and never sync — confirm the composer still works and that no sign-in affordance appears.

- [ ] **Step 3: README**

Document: the two taps and what each does to the feed; that neither is required; that a post is a card rather than a note, capped at 400 characters and 500 cards; that posts live in their own collection and why; that the rules must be published; and that fact ids are now a hash of the fact's text, which reset the seen count once.

- [ ] **Step 4: Full verification**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node --test
```
Expected: **176 pass, 0 fail**.

Then the repo owner runs `test/harness.html` and walks it by hand: add a card, see it in the feed, mark it Got it, reload and confirm it stuck, mark a fact Again and watch it come back, then publish the rules and confirm a card written on one device appears on another.

- [ ] **Step 5: Commit**

```bash
git add sw.js README.md
git commit -m "chore: document posts and the confidence signal"
```

---

## What this plan cannot verify

- **The `posts` Firestore rules** need a live project; the repo owner must publish them.
- **Cross-device post sync** needs two signed-in devices.
- **The live re-queue and the composer** are DOM behaviour; the harness covers them but only the repo owner can run it.

## Verification summary

| Spec requirement | Task |
|---|---|
| Two taps, neither required | 5 |
| Pressing the held state clears it | 2, 5 |
| Only `got` and `again` storable | 2 |
| Four-tier ordering; unmarked feed unchanged | 3 |
| Again re-queued five ahead, end if fewer remain | 5 |
| `conf` joins `SYNC_KEYS` | 2 |
| Posts are cards, not notes | 7 |
| 400-character cap with a visible counter | 6, 7 |
| 500-post ceiling | 6 |
| Posts never in the user document | 8 |
| `post:<id>` cannot collide with `recordId#hash` | 7 |
| Always `visibility: "private"` | 6 |
| Rules written ready to publish | 8 |
| A tagged post surfaces on its record | 7 |
| Ids hash the text; `seen` pruned once | 1, 5 |
