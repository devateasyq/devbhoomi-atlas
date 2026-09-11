# Notes, Profile and Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A note on any record, a daily streak that survives one missed day, and a profile page that makes signing in visibly worth something — including the data export and account deletion deferred from the last sub-project.

**Architecture:** The pure logic — note merging, the 1,000-character cap, streak qualification and roll-over — lives in `app/sync.js` and is unit-tested in Node with no Firebase and no DOM. A new `SYNC_KEYS` registry there becomes the single source of truth for which keys sync and how each merges, replacing four separate hand-maintained lists. `app/app.js` gains the note editor in the detail panel, the streak hooks, and a `#/profile` view.

**Tech Stack:** Plain ES5-compatible browser JavaScript, no framework, no build step, no npm. Firebase Auth + Firestore via the vendored compat SDK. Tests on Node's built-in `node --test` plus the committed browser harness.

## Global Constraints

- **Zero npm dependencies**; no `package.json`; `test/` imports nothing outside Node's stdlib.
- **No build step.** `app/sync.js` uses `var`/`function`, no ES module syntax, and one trailing `typeof module` guard.
- **Run tests with `node --test`** (no path argument) from the repo root, or `node --test test/<file>.test.js` for one file. A *directory* argument is broken on Node 25.2.1.
- **89 tests pass today.** All must still pass.
- **Synced keys:** `seen`, `quiz`, `pyq`, and now `notes` and `streak`. **Never synced:** `theme`, `mapoff`, `legendopen` — these belong to the device.
- **Notes are capped at 1,000 characters each**, enforced in the editor with a visible counter, never silently at save.
- **One note per record.** Not a thread.
- **No public/private toggle.** Notes are private; sharing is a later sub-project. A control labelled "public" that publishes nothing must not ship.
- **A day counts** when any one of these is reached: 20 facts seen, 5 quiz answers, 5 past-paper answers, or **5 distinct** records opened.
- **Days are local calendar dates.** Local midnight ends a day, not a rolling 24 hours.
- **One grace day** absorbs a single missed day; it returns after seven consecutive qualifying days. Two missed days reset the run. **Best is never reduced.**
- **Merging is always generous:** higher run, higher best, later date, higher counters, union of records. Nobody is punished for owning two devices.
- **Bump `CACHE` in `sw.js`** after any asset change.

---

## Why the first task is a refactor

`localState()`, both branches of `pullAndMerge()`, and `mergeState()` each enumerate the synced keys separately — four hand-maintained lists. The last review flagged this as drift waiting to happen "when notes land". Adding two keys to four places is how one gets missed, and a missed key means data that silently never syncs.

Task 1 replaces all four with one registry.

## File Structure

**Modify:**
- `app/sync.js` — the `SYNC_KEYS` registry, note merging, the streak engine. Pure, no DOM.
- `app/app.js` — note editor, streak hooks, `#/profile` view, export and delete.
- `app/components.css` — note editor and profile styling.
- `index.html`, `sw.js`, `README.md`, `build-single.sh`, `test/harness.html`.
- `test/sync.test.js` — all new pure-logic tests.

No new files: `app/sync.js` and `app/app.js` are the right homes, and a fifth script tag buys nothing.

---

### Task 1: One registry for the synced keys

**Files:** Modify `app/sync.js`, `app/app.js`, `test/sync.test.js`

**Interfaces:**
- Produces: `SYNC_KEYS` — an array of `{k, empty(), merge(a, b)}`, exported. `mergeState` iterates it. `localState()` in `app/app.js` and both branches of `pullAndMerge()` iterate it.

- [ ] **Step 1: Write the failing test**

Append to `test/sync.test.js`:

```js
test("SYNC_KEYS is the single source of truth for what syncs", () => {
  const keys = sync.SYNC_KEYS.map(e => e.k);
  assert.deepEqual(keys, ["seen", "quiz", "pyq", "notes", "streak"]);
  for(const e of sync.SYNC_KEYS){
    assert.equal(typeof e.empty, "function", e.k + " has no empty()");
    assert.equal(typeof e.merge, "function", e.k + " has no merge()");
  }
});

test("mergeState returns exactly the registry's keys", () => {
  const out = sync.mergeState({}, {});
  assert.deepEqual(Object.keys(out).sort(), sync.SYNC_KEYS.map(e => e.k).sort());
});

test("device preferences still never survive a merge", () => {
  const m = sync.mergeState({theme: "dark", mapoff: ["peak"], legendopen: true},
                            {theme: "light", mapoff: [], legendopen: false});
  for(const k of ["theme", "mapoff", "legendopen"])
    assert.ok(!(k in m), k + " belongs to the device and must not merge");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/sync.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'map')`, because `SYNC_KEYS` does not exist.

- [ ] **Step 3: Add the registry**

`app/sync.js` already carries a `mergeStreak(a, b)` that takes the higher of
two numbers. It is dead — nothing in the app calls it, and the real streak is
a record, not a number. Delete it and the test that covers it, so the name is
free for the function that replaces it:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const fs=require("fs");
let a=fs.readFileSync("app/sync.js","utf8");
a=a.replace(/\nfunction mergeStreak\(a, b\)\{\n  return Math\.max\(typeof a === "number" \? a : 0, typeof b === "number" \? b : 0\);\n\}\n/,"\n");
fs.writeFileSync("app/sync.js",a);
let t=fs.readFileSync("test/sync.test.js","utf8");
t=t.replace(/test\("mergeStreak takes the higher count"[\s\S]*?\n\}\);\n\n/,"");
fs.writeFileSync("test/sync.test.js",t);
console.log("dead mergeStreak removed:", !/function mergeStreak\(a, b\)/.test(a));'
```

Expected: `dead mergeStreak removed: true`. Also drop `mergeStreak: mergeStreak,`
from the `module.exports` object — Step 3 adds it back pointing at the new
function.

Then replace the existing `mergeState` with:

```js
/* The single source of truth for what syncs and how each key merges. It was
   previously spelled out in four places — localState, both branches of
   pullAndMerge, and mergeState — which is how a key gets missed and its data
   silently stops syncing. Add a key here and every consumer follows. */
var SYNC_KEYS = [
  {k: "seen",   empty: function(){ return []; }, merge: mergeSeen},
  {k: "quiz",   empty: function(){ return {}; }, merge: mergeAnswers},
  {k: "pyq",    empty: function(){ return {}; }, merge: mergeAnswers},
  {k: "notes",  empty: function(){ return {}; }, merge: mergeNotes},
  {k: "streak", empty: emptyStreak,              merge: mergeStreak}
];
function mergeState(local, remote){
  var L = local || {}, R = remote || {}, out = {}, i, e;
  for(i = 0; i < SYNC_KEYS.length; i++){
    e = SYNC_KEYS[i];
    out[e.k] = e.merge(L[e.k], R[e.k]);
  }
  return out;
}
```

`mergeNotes`, `emptyStreak` and `mergeStreak` do not exist yet — Tasks 2 and 3 add them. For this task only, add these placeholders **above** the registry so it is well-formed, and Tasks 2 and 3 replace them:

```js
/* replaced in Task 2 */
function mergeNotes(a, b){ return {}; }
/* replaced in Task 3 */
function emptyStreak(){ return {}; }
function mergeStreak(a, b){ return {}; }
```

Add `SYNC_KEYS: SYNC_KEYS` to the `module.exports` object.

- [ ] **Step 4: Route `app/app.js` through the registry**

Replace `localState()`:

```js
function localState(){
  var out = {}, i, e;
  for(i = 0; i < SYNC_KEYS.length; i++){
    e = SYNC_KEYS[i];
    out[e.k] = store.get(e.k, e.empty());
  }
  return out;
}
```

In `pullAndMerge()`, replace the owner-mismatch branch's five hand-written lines with:

```js
    if(owner && owner !== user.uid){
      for(const e of SYNC_KEYS) store.set(e.k, remote[e.k] || e.empty());
      store.set("owner", user.uid);
      S.seen = store.get("seen", []);
      toast("Loaded this account's progress");
      return Promise.resolve();
    }
```

and the merged-write branch's three `store.set` lines with:

```js
    for(const e of SYNC_KEYS) store.set(e.k, merged[e.k]);
```

leaving `store.set("owner", …)`, `S.seen = merged.seen;` and the transactional write as they are.

- [ ] **Step 5: One wipe helper, used everywhere local data is cleared**

Signing out on a shared device clears the local copy so the next person does
not inherit it. That list is a sixth hand-maintained enumeration, and once
notes exist, missing it means leaving somebody's private notes on a borrowed
laptop. Add beside `localState()`:

```js
/* Signing out on a shared device, or deleting the account, must leave
   nothing of the person behind — including notes, which are the most
   private thing here. Driven by SYNC_KEYS so a key added later is cleared
   without anybody remembering to come back for it. */
function wipeLocal(){
  for(const e of SYNC_KEYS) store.del(e.k);
  store.del("owner");
  S.seen = [];
}
```

In `mountAccount()`'s sign-out handler, replace

```js
          store.del("seen"); store.del("quiz"); store.del("pyq"); store.del("owner");
          S.seen = [];
```

with

```js
          wipeLocal();
```

leaving the comment above it — it explains why clearing belongs there rather
than in the `onAuthChange` backstop, and that reasoning is unchanged.

- [ ] **Step 6: Stop "Reset progress" deleting notes and the streak**

The reset button ends with a deliberate **non-merge** write:

```js
          return userDoc(fb, authUser()).set({seen: S.seen, quiz: {}, pyq: {}});
```

A non-merge `set` replaces the whole document — that is the point, since
`{merge: true}` can never remove a field and the old answers would come
straight back on the next pull. But it names three fields, so the moment
notes and streak live in that document this button silently deletes them
from the cloud on every device. The button promises to clear quiz and
past-paper progress; it must not take the rest with it.

Replace that line with:

```js
          /* Non-merge, so the cleared answers cannot come back — but built
             from the full local state with only quiz and pyq emptied, or
             this button would also wipe notes and the streak, which it
             never promised to touch. */
          const kept = localState();
          kept.quiz = {}; kept.pyq = {};
          return userDoc(fb, authUser()).set(kept);
```

The local side of the same handler (`store.del("quiz"); store.del("pyq");`)
is already correct — it names exactly what reset clears. Leave it.

- [ ] **Step 7: Verify**

Run: `node --check app/app.js && node --check app/sync.js && node --test`
Expected: **91 pass, 0 fail** (89, plus three new, minus the dead streak test).

Then confirm no hand-maintained list survives:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && \
  grep -n 'store\.\(set\|del\)("seen"\|store\.\(set\|del\)("quiz"\|store\.\(set\|del\)("pyq"' app/app.js
```

Every remaining hit must either sit inside a `SYNC_KEYS` loop, or write one
specific key for its own reason — the Rounds feed writing `seen`, the answer
handlers writing `quiz`/`pyq`, and the reset button deleting `quiz`/`pyq`
because that is exactly what it promises to clear. Report each and why it is
legitimate. The sign-out list must be gone.

Confirm the reset button no longer names its fields:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && grep -n 'quiz: {}, pyq: {}' app/app.js
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add app/sync.js app/app.js test/sync.test.js
git commit -m "refactor: one registry for the synced keys"
```

---

### Task 2: Note merging and the cap

**Files:** Modify `app/sync.js`, `test/sync.test.js`

**Interfaces:**
- Produces: `NOTE_MAX` (1000), `normaliseNotes(obj)` → `{[recordId]: {text, t}}` with text clamped and junk dropped, `mergeNotes(a, b)` → most recent wins per record, `setNote(notes, id, text)` → a new map with that note written and stamped, or the note removed when the text is empty.

- [ ] **Step 1: Write the failing test**

Append to `test/sync.test.js`:

```js
test("NOTE_MAX is the documented 1000 characters", () => {
  assert.equal(sync.NOTE_MAX, 1000);
});

test("normaliseNotes clamps an over-long note rather than dropping it", () => {
  const long = "x".repeat(1500);
  const out = sync.normaliseNotes({"d-kangra": {text: long, t: 5}});
  assert.equal(out["d-kangra"].text.length, 1000);
  assert.equal(out["d-kangra"].t, 5);
});

test("a note at exactly the cap is untouched", () => {
  const exact = "y".repeat(1000);
  const out = sync.normaliseNotes({"d-kangra": {text: exact, t: 1}});
  assert.equal(out["d-kangra"].text, exact);
});

test("normaliseNotes drops junk rather than propagating it", () => {
  const out = sync.normaliseNotes({a: null, b: 42, c: {t: 1}, d: {text: "ok", t: 2}});
  assert.deepEqual(Object.keys(out), ["d"]);
  assert.deepEqual(sync.normaliseNotes(null), {});
});

test("normaliseNotes drops a note that is only whitespace", () => {
  const out = sync.normaliseNotes({a: {text: "   \n ", t: 1}, b: {text: "real", t: 1}});
  assert.deepEqual(Object.keys(out), ["b"]);
});

test("mergeNotes keeps the most recent note per record", () => {
  const a = {"d-kangra": {text: "older", t: 100}, "d-shimla": {text: "only a", t: 5}};
  const b = {"d-kangra": {text: "newer", t: 900}, "d-mandi":  {text: "only b", t: 5}};
  const m = sync.mergeNotes(a, b);
  assert.equal(m["d-kangra"].text, "newer");
  assert.equal(m["d-shimla"].text, "only a");
  assert.equal(m["d-mandi"].text,  "only b");
});

test("mergeNotes never mutates its inputs", () => {
  const a = {"x": {text: "a", t: 1}};
  const b = {"x": {text: "b", t: 2}};
  sync.mergeNotes(a, b);
  assert.equal(a["x"].text, "a");
  assert.equal(b["x"].text, "b");
});

test("setNote writes and stamps a note", () => {
  const before = Date.now();
  const out = sync.setNote({}, "d-kangra", "Kangra fort fell in 1620");
  assert.equal(out["d-kangra"].text, "Kangra fort fell in 1620");
  assert.ok(out["d-kangra"].t >= before);
});

test("setNote clamps to the cap on the way in", () => {
  const out = sync.setNote({}, "x", "z".repeat(2000));
  assert.equal(out["x"].text.length, 1000);
});

test("setNote with empty text removes the note", () => {
  const out = sync.setNote({"x": {text: "gone soon", t: 1}}, "x", "   ");
  assert.ok(!("x" in out), "an emptied note should be removed, not stored blank");
});

test("setNote does not mutate the map it is given", () => {
  const notes = {};
  sync.setNote(notes, "x", "hello");
  assert.deepEqual(notes, {});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/sync.test.js`
Expected: FAIL — `sync.NOTE_MAX` is undefined and `mergeNotes` returns `{}`.

- [ ] **Step 3: Replace the Task 1 placeholder**

In `app/sync.js`, replace `function mergeNotes(a, b){ return {}; }` with:

```js
/* Notes share one Firestore document with progress, and that document has a
   hard 1 MB limit. Exceed it and the WHOLE write is rejected — so an
   unbounded note would silently stop quiz progress syncing too. */
var NOTE_MAX = 1000;

function normaliseNotes(obj){
  var out = {}, k, v, text;
  if(!obj || typeof obj !== "object") return out;
  for(k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    v = obj[k];
    if(!v || typeof v !== "object" || typeof v.text !== "string") continue;
    text = v.text.slice(0, NOTE_MAX);
    if(!text.trim()) continue;          /* blank is the same as no note */
    out[k] = {text: text, t: typeof v.t === "number" ? v.t : 0};
  }
  return out;
}

function mergeNotes(a, b){
  var A = normaliseNotes(a), B = normaliseNotes(b), out = {}, k;
  for(k in A) if(Object.prototype.hasOwnProperty.call(A, k)) out[k] = A[k];
  for(k in B){
    if(!Object.prototype.hasOwnProperty.call(B, k)) continue;
    if(!out[k] || B[k].t > out[k].t) out[k] = B[k];
  }
  return out;
}

function setNote(notes, id, text){
  var out = normaliseNotes(notes), clean = String(text == null ? "" : text).slice(0, NOTE_MAX);
  if(!clean.trim()) { delete out[id]; return out; }
  out[id] = {text: clean, t: Date.now()};
  return out;
}
```

Add `NOTE_MAX: NOTE_MAX, normaliseNotes: normaliseNotes, mergeNotes: mergeNotes, setNote: setNote` to `module.exports`.

- [ ] **Step 4: Verify**

Run: `node --test`
Expected: **101 pass, 0 fail**.

- [ ] **Step 5: Commit**

```bash
git add app/sync.js test/sync.test.js
git commit -m "feat: add note merging and the length cap"
```

---

### Task 3: The streak engine

The whole of the streak's behaviour, as pure functions. Nothing touches storage or the DOM here.

**Files:** Modify `app/sync.js`, `test/sync.test.js`

**Interfaces:**
- Produces: `emptyStreak()`, `dayKey(date)` → `"YYYY-MM-DD"` from **local** date parts, `daysApart(a, b)` → whole days between two day keys, `bumpStreak(st, kind, id, today)` → a new streak state, `mergeStreak(a, b)`.
- `kind` is one of `"facts"`, `"quiz"`, `"pyq"`, `"rec"`. For `"rec"`, `id` is the record id, counted once per day.
- Streak shape: `{n, best, last, grace, day, facts, quiz, pyq, recs}` where `recs` is an array of today's distinct record ids.

- [ ] **Step 1: Write the failing test**

Append to `test/sync.test.js`:

```js
const DAY = {facts: 20, quiz: 5, pyq: 5, recs: 5};

test("dayKey uses local calendar parts, not UTC", () => {
  /* 23:30 local on the 5th must be the 5th, whatever the timezone offset */
  const d = new Date(2026, 0, 5, 23, 30, 0);
  assert.equal(sync.dayKey(d), "2026-01-05");
});

test("dayKey pads months and days", () => {
  assert.equal(sync.dayKey(new Date(2026, 8, 7, 12, 0, 0)), "2026-09-07");
});

test("daysApart counts whole days across month and year boundaries", () => {
  assert.equal(sync.daysApart("2026-01-31", "2026-02-01"), 1);
  assert.equal(sync.daysApart("2025-12-31", "2026-01-01"), 1);
  assert.equal(sync.daysApart("2026-03-01", "2026-03-01"), 0);
  assert.equal(sync.daysApart("2026-02-28", "2026-03-02"), 2);
});

test("a fresh streak is zero with one grace in hand", () => {
  const s = sync.emptyStreak();
  assert.equal(s.n, 0);
  assert.equal(s.best, 0);
  assert.equal(s.grace, 1);
});

test("counters accumulate without qualifying below the threshold", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < DAY.facts - 1; i++) s = sync.bumpStreak(s, "facts", null, "2026-01-05");
  assert.equal(s.n, 0, "19 facts is not a day");
  assert.equal(s.facts, 19);
});

test("reaching any one threshold qualifies the day", () => {
  for(const [kind, need] of [["facts",20],["quiz",5],["pyq",5]]){
    let s = sync.emptyStreak();
    for(let i = 0; i < need; i++) s = sync.bumpStreak(s, kind, null, "2026-01-05");
    assert.equal(s.n, 1, kind + " should have qualified the day");
    assert.equal(s.last, "2026-01-05");
  }
});

test("only DISTINCT records count towards the day", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < 8; i++) s = sync.bumpStreak(s, "rec", "d-kangra", "2026-01-05");
  assert.equal(s.n, 0, "the same record eight times is not five records");
  assert.equal(s.recs.length, 1);
  for(const id of ["d-shimla","d-mandi","d-kullu","d-chamba"])
    s = sync.bumpStreak(s, "rec", id, "2026-01-05");
  assert.equal(s.n, 1, "five distinct records should qualify");
});

test("qualifying twice in one day does not increment twice", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < 40; i++) s = sync.bumpStreak(s, "facts", null, "2026-01-05");
  assert.equal(s.n, 1);
});

test("consecutive days build the run and counters reset each day", () => {
  let s = sync.emptyStreak();
  const qualify = (st, day) => {
    for(let i = 0; i < DAY.facts; i++) st = sync.bumpStreak(st, "facts", null, day);
    return st;
  };
  s = qualify(s, "2026-01-05");
  s = qualify(s, "2026-01-06");
  s = qualify(s, "2026-01-07");
  assert.equal(s.n, 3);
  assert.equal(s.best, 3);
  assert.equal(s.facts, DAY.facts, "counters should be today's only");
});

test("one missed day is absorbed by the grace day", () => {
  let s = sync.emptyStreak();
  const qualify = (st, day) => {
    for(let i = 0; i < DAY.facts; i++) st = sync.bumpStreak(st, "facts", null, day);
    return st;
  };
  s = qualify(s, "2026-01-05");
  s = qualify(s, "2026-01-06");
  s = qualify(s, "2026-01-08");           // the 7th is missed
  assert.equal(s.n, 3, "the run should continue through one missed day");
  assert.equal(s.grace, 0, "the grace day should have been spent");
});

test("a second missed day resets the run, but never the best", () => {
  let s = sync.emptyStreak();
  const qualify = (st, day) => {
    for(let i = 0; i < DAY.facts; i++) st = sync.bumpStreak(st, "facts", null, day);
    return st;
  };
  s = qualify(s, "2026-01-05");
  s = qualify(s, "2026-01-06");
  s = qualify(s, "2026-01-10");           // three days missed
  assert.equal(s.n, 1, "the run should have reset");
  assert.equal(s.best, 2, "the best must survive a reset");
});

test("a missed day with no grace in hand resets the run", () => {
  let s = sync.emptyStreak();
  s.grace = 0;
  const qualify = (st, day) => {
    for(let i = 0; i < DAY.facts; i++) st = sync.bumpStreak(st, "facts", null, day);
    return st;
  };
  s = qualify(s, "2026-01-05");
  s = qualify(s, "2026-01-07");           // one missed, no grace
  assert.equal(s.n, 1);
});

test("the grace day returns after seven consecutive days", () => {
  let s = sync.emptyStreak();
  s.grace = 0;
  for(let d = 1; d <= 7; d++){
    const day = "2026-01-" + String(d).padStart(2, "0");
    for(let i = 0; i < DAY.facts; i++) s = sync.bumpStreak(s, "facts", null, day);
  }
  assert.equal(s.n, 7);
  assert.equal(s.grace, 1, "seven consecutive days should restore the grace");
});

test("bumpStreak never mutates the state it is given", () => {
  const s = sync.emptyStreak();
  sync.bumpStreak(s, "facts", null, "2026-01-05");
  assert.equal(s.facts, 0);
});

test("mergeStreak is generous in every direction", () => {
  const a = {n: 5, best: 9, last: "2026-01-05", grace: 0, day: "2026-01-05",
             facts: 12, quiz: 1, pyq: 0, recs: ["d-kangra"]};
  const b = {n: 3, best: 11, last: "2026-01-06", grace: 1, day: "2026-01-06",
             facts: 4, quiz: 3, pyq: 2, recs: ["d-shimla"]};
  const m = sync.mergeStreak(a, b);
  assert.equal(m.n, 5, "the higher run wins");
  assert.equal(m.best, 11, "the higher best wins");
  assert.equal(m.last, "2026-01-06", "the later date wins");
  assert.equal(m.grace, 1, "the more forgiving grace wins");
});

test("mergeStreak copes with either side missing", () => {
  const only = {n: 2, best: 2, last: "2026-01-05", grace: 1, day: "2026-01-05",
                facts: 20, quiz: 0, pyq: 0, recs: []};
  assert.equal(sync.mergeStreak(only, null).n, 2);
  assert.equal(sync.mergeStreak(null, only).n, 2);
  assert.equal(sync.mergeStreak(null, null).n, 0);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/sync.test.js`
Expected: FAIL — `sync.dayKey is not a function`.

- [ ] **Step 3: Replace the Task 1 placeholders**

In `app/sync.js`, replace `function emptyStreak(){ return {}; }` and `function mergeStreak(a, b){ return {}; }` with:

```js
/* A day counts when any ONE of these is reached. Several routes, because a
   bus journey scrolling Rounds and a sit-down past paper are both revision. */
var DAY_GOAL = {facts: 20, quiz: 5, pyq: 5, recs: 5};

function emptyStreak(){
  return {n: 0, best: 0, last: "", grace: 1, day: "",
          facts: 0, quiz: 0, pyq: 0, recs: []};
}

/* Local calendar date. Local midnight ends a day — not a rolling 24 hours,
   and not UTC, which would roll over mid-evening in India. */
function dayKey(date){
  var d = date || new Date();
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

function daysApart(a, b){
  if(!a || !b) return Infinity;
  var pa = String(a).split("-"), pb = String(b).split("-");
  var da = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]);
  var db = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
  return Math.round((db - da) / 86400000);
}

function normaliseStreak(s){
  var e = emptyStreak();
  if(!s || typeof s !== "object") return e;
  return {
    n:     typeof s.n === "number" ? s.n : 0,
    best:  typeof s.best === "number" ? s.best : 0,
    last:  typeof s.last === "string" ? s.last : "",
    grace: typeof s.grace === "number" ? s.grace : 1,
    day:   typeof s.day === "string" ? s.day : "",
    facts: typeof s.facts === "number" ? s.facts : 0,
    quiz:  typeof s.quiz === "number" ? s.quiz : 0,
    pyq:   typeof s.pyq === "number" ? s.pyq : 0,
    recs:  Array.isArray(s.recs) ? s.recs.slice() : []
  };
}

function qualified(s){
  return s.facts >= DAY_GOAL.facts || s.quiz >= DAY_GOAL.quiz ||
         s.pyq >= DAY_GOAL.pyq || s.recs.length >= DAY_GOAL.recs;
}

function bumpStreak(st, kind, id, today){
  var s = normaliseStreak(st), day = today || dayKey();
  if(s.day !== day){                      /* a new day: counters start again */
    s.day = day; s.facts = 0; s.quiz = 0; s.pyq = 0; s.recs = [];
  }
  if(kind === "rec"){
    if(id && s.recs.indexOf(id) < 0) s.recs.push(id);
  } else if(kind === "facts" || kind === "quiz" || kind === "pyq"){
    s[kind] += 1;
  }
  if(s.last === day) return s;            /* already counted today */
  if(!qualified(s)) return s;

  var gap = daysApart(s.last, day);
  if(!s.last)            s.n = 1;         /* the first day ever */
  else if(gap === 1)     s.n += 1;
  else if(gap === 2 && s.grace > 0){ s.n += 1; s.grace -= 1; }
  else                   s.n = 1;         /* too long a gap, or no grace left */

  s.last = day;
  if(s.n > s.best) s.best = s.n;
  /* seven consecutive days earns the grace back */
  if(s.n > 0 && s.n % 7 === 0) s.grace = 1;
  return s;
}

/* Two devices both counting today must neither double-count nor reset each
   other, so every field takes the more generous value. */
function mergeStreak(a, b){
  var A = normaliseStreak(a), B = normaliseStreak(b);
  var later = daysApart(A.last, B.last) > 0 ? B.last : (A.last || B.last);
  var day = daysApart(A.day, B.day) > 0 ? B.day : (A.day || B.day);
  var recs = mergeSeen(A.day === day ? A.recs : [], B.day === day ? B.recs : []);
  return {
    n:     Math.max(A.n, B.n),
    best:  Math.max(A.best, B.best),
    last:  later,
    grace: Math.max(A.grace, B.grace),
    day:   day,
    facts: Math.max(A.day === day ? A.facts : 0, B.day === day ? B.facts : 0),
    quiz:  Math.max(A.day === day ? A.quiz  : 0, B.day === day ? B.quiz  : 0),
    pyq:   Math.max(A.day === day ? A.pyq   : 0, B.day === day ? B.pyq   : 0),
    recs:  recs
  };
}
```

Add `DAY_GOAL: DAY_GOAL, emptyStreak: emptyStreak, dayKey: dayKey, daysApart: daysApart, bumpStreak: bumpStreak, mergeStreak: mergeStreak` to `module.exports`.

- [ ] **Step 4: Verify**

Run: `node --test`
Expected: **117 pass, 0 fail**.

- [ ] **Step 5: Commit**

```bash
git add app/sync.js test/sync.test.js
git commit -m "feat: add the streak engine"
```

---

### Task 4: The note editor

**Files:** Modify `app/app.js`, `app/components.css`, `test/harness.html`

**Interfaces:**
- Consumes: `setNote`, `NOTE_MAX` from `app/sync.js`.
- Produces: `noteBlock(id)` → HTML for the note area of a record; `mountNote()` wiring, called at the end of `openRec`.

- [ ] **Step 1: Render the note area**

Add to `app/app.js` near the other panel helpers:

```js
/* One note per record, at the foot of the panel. The counter is visible
   rather than the cap being enforced silently at save. */
function noteBlock(id){
  const notes = store.get("notes", {});
  const cur = notes[id] && notes[id].text ? notes[id].text : "";
  return '<div class="blk noteblk"><h5>Your note</h5>'+
    '<textarea id="notetext" maxlength="'+NOTE_MAX+'" rows="3" '+
      'placeholder="Anything you want to remember about this…">'+
      cur.replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</textarea>'+
    '<div class="noterow"><span class="notecount" id="notecount">'+
      cur.length+' / '+NOTE_MAX+'</span>'+
      '<button class="btn sm" type="button" id="notesave">Save</button></div></div>';
}
function mountNote(id){
  const ta = document.getElementById("notetext");
  if(!ta) return;
  const count = document.getElementById("notecount");
  const save = () => {
    const next = setNote(store.get("notes", {}), id, ta.value);
    store.set("notes", next);
    if(authUser()) pushStateSoon();
    toast(ta.value.trim() ? "Note saved" : "Note removed");
  };
  ta.addEventListener("input", () => {
    count.textContent = ta.value.length + " / " + NOTE_MAX;
  });
  ta.addEventListener("blur", save);
  document.getElementById("notesave").addEventListener("click", save);
}
```

In `openRec`, immediately **before** `body += relBlock(rels(r));`:

```js
  body += noteBlock(id);
```

and after `$("#pbody").innerHTML = body;` add:

```js
  mountNote(id);
```

- [ ] **Step 2: Style it**

Append to `app/components.css`:

```css
.noteblk textarea{width:100%;font:inherit;font-size:14px;line-height:1.5;
  padding:9px 11px;border-radius:8px;border:1px solid var(--line);
  background:var(--ground);color:var(--ink);resize:vertical;min-height:66px}
.noteblk textarea:focus{outline:none;border-color:var(--accent-line)}
.noterow{display:flex;align-items:center;justify-content:space-between;margin-top:7px}
.notecount{font-family:var(--f-mono);font-size:10.5px;color:var(--ink-3)}
```

- [ ] **Step 3: Add harness checks**

Append inside the harness's load handler, before the summary line:

```js
  win.openRec("d-kangra");
  await wait(200);
  const ta = doc.getElementById("notetext");
  check("a record panel offers a note field", !!ta);
  if(ta){
    ta.value = "Kangra fort fell to Jahangir in 1620";
    ta.dispatchEvent(new win.Event("input"));
    check("the counter tracks what is typed",
      /36 \/ 1000/.test(doc.getElementById("notecount").textContent),
      doc.getElementById("notecount").textContent);
    doc.getElementById("notesave").click();
    await wait(150);
    win.openRec("d-shimla"); await wait(150);
    win.openRec("d-kangra"); await wait(200);
    check("the note survives navigating away and back",
      doc.getElementById("notetext").value === "Kangra fort fell to Jahangir in 1620",
      JSON.stringify(doc.getElementById("notetext").value));
    check("the textarea enforces the cap",
      doc.getElementById("notetext").getAttribute("maxlength") === "1000");
  }
```

- [ ] **Step 4: Verify**

Run: `node --check app/app.js && node --test`
Expected: **117 pass, 0 fail** — this task adds no Node tests; its logic was tested in Task 2.

Confirm the CSS braces balance:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const s=require("fs").readFileSync("app/components.css","utf8");
const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length;
console.log("braces",o,c,o===c?"balanced":"UNBALANCED");'
```

You have no browser, so say in your report that the four harness checks are outstanding.

- [ ] **Step 5: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: add a note to every record"
```

---

### Task 5: Wire the streak to real activity

**Files:** Modify `app/app.js`

**Interfaces:**
- Consumes: `bumpStreak`, `dayKey` from `app/sync.js`.
- Produces: `noteActivity(kind, id)` — records one unit of activity and persists the streak.

- [ ] **Step 1: Add the recorder**

```js
/* Every route to a qualifying day funnels through here, so the four call
   sites cannot drift apart in how they count. */
function noteActivity(kind, id){
  const before = store.get("streak", emptyStreak());
  const after = bumpStreak(before, kind, id, dayKey());
  store.set("streak", after);
  if(after.n !== before.n && after.n > 0) toast("Day " + after.n + " — streak going");
  if(authUser()) pushStateSoon();
  return after;
}
```

- [ ] **Step 2: Call it from all four sources**

- In `mountRounds()`'s `IntersectionObserver` callback, inside the `if(S.seen.indexOf(id) < 0){…}` block, after `pushStateSoon();` add:
  ```js
        noteActivity("facts", id);
  ```
- In the quiz answer handler, after the `store.set("quiz", …)` line:
  ```js
  noteActivity("quiz", q.q);
  ```
- In the past-paper answer handler, after its `store.set("pyq", …)` line:
  ```js
  noteActivity("pyq", q.q);
  ```
- In `openRec(id, …)`, immediately after `S.sel = id;`:
  ```js
  noteActivity("rec", id);
  ```

- [ ] **Step 3: Verify**

Run: `node --check app/app.js && node --test`
Expected: **117 pass, 0 fail**.

Then confirm every route is wired:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && grep -n 'noteActivity("' app/app.js
```

Expected: exactly four call sites — `facts`, `quiz`, `pyq`, `rec`. Report them.

- [ ] **Step 4: Commit**

```bash
git add app/app.js
git commit -m "feat: count real activity towards the daily streak"
```

---

### Task 6: The profile view

**Files:** Modify `app/app.js`, `app/components.css`, `test/harness.html`

**Interfaces:**
- Consumes: `emptyStreak`, `DAY_GOAL`, `dayKey`, `answerValue` from `app/sync.js`; `authUser`, `signOutUser`, `goTo`, `wipeLocal`.
- Produces: `viewProfile()` and `mountProfile()`, reached at `#/profile`.

- [ ] **Step 1: Make the route legal**

`TITLE` is what the hash router validates against, so a view is unreachable until it has a key there. Add to `app/app.js`:

```js
/* Not in NAV: the rail already carries nine entries and the phone bar is
   deliberately four. The header account button is the way in. */
TITLE.profile = "Your profile";
SUB.profile = "Streak, notes and your data";
```

placing these immediately after the `TITLE` and `SUB` declarations.

- [ ] **Step 2: Render it**

```js
function viewProfile(){
  const u = authUser();
  const st = store.get("streak", emptyStreak());
  const notes = store.get("notes", {});
  const quiz = store.get("quiz", {});
  const done = Object.keys(quiz).length;
  const right = Object.values(quiz).filter(v => answerValue(v) === 1).length;
  const papers = Object.keys(store.get("pyq", {})).length;
  const seen = (S.seen || []).length;

  const ids = Object.keys(notes).filter(id => IDX.has(id));
  const noteList = ids.length
    ? ids.map(id => '<button class="noterow2" type="button" data-go="'+id+'">'+
        '<span class="nr-t">'+nameOf(IDX.get(id))+'</span>'+
        '<span class="nr-x">'+notes[id].text.slice(0, 90).replace(/</g,"&lt;")+
        (notes[id].text.length > 90 ? "…" : "")+'</span></button>').join('')
    : '<p class="pmuted">No notes yet. Open any record and write one at the foot of the panel.</p>';

  const acct = u
    ? '<div class="pcard"><div class="pident"><b>'+(u.displayName || u.email || "Signed in")+'</b>'+
      (u.email && u.displayName ? '<span>'+u.email+'</span>' : '')+'</div>'+
      '<button class="btn sm" type="button" id="psignout">Sign out</button></div>'
    : '<div class="pcard"><div class="pident"><b>Not signed in</b>'+
      '<span>Your streak and notes are on this device only.</span></div>'+
      '<button class="btn sm primary" type="button" id="psignin">Sign in to sync</button></div>';

  return '<div class="profile">'+acct+
    '<div class="pstats">'+
      '<div class="pstat"><b>'+st.n+'</b>day streak</div>'+
      '<div class="pstat"><b>'+st.best+'</b>best ever</div>'+
      '<div class="pstat"><b>'+num(seen)+'</b>facts seen</div>'+
      '<div class="pstat"><b>'+(done ? Math.round(right/done*100)+"%" : "—")+'</b>quiz accuracy</div>'+
      '<div class="pstat"><b>'+num(papers)+'</b>past papers attempted</div>'+
    '</div>'+
    '<div class="ptoday">Today: '+st.facts+' facts · '+st.quiz+' quiz · '+
      st.pyq+' past paper · '+st.recs.length+' records'+
      (st.last === dayKey() ? ' — <b>today counts</b>' :
       ' — reach '+DAY_GOAL.facts+' facts, '+DAY_GOAL.quiz+' quiz, '+
       DAY_GOAL.pyq+' past paper or '+DAY_GOAL.recs+' records')+'</div>'+
    '<div class="syllabus"><div class="secthead"><h3>Your notes — '+ids.length+'</h3></div>'+
      noteList+'</div>'+
    '<div class="syllabus" style="margin-top:26px">'+
      '<div class="secthead"><h3>Your data</h3></div>'+
      '<div class="pdata"><button class="btn" type="button" id="pexport">Export everything</button>'+
      (u ? '<button class="btn danger" type="button" id="pdelete">Delete my account</button>' : '')+
      '</div></div>'+
  '</div>';
}
function mountProfile(){
  const so = document.getElementById("psignout");
  if(so) so.addEventListener("click", () => {
    /* Same contract as the header button it replaces: flush first, because
       onAuthChange fires after the token is gone and a push queued from
       there is silently discarded by the rules; then wipe, so a shared
       device keeps none of this person's notes or progress. */
    flushPendingPush(() => signOutUser()
      .then(() => { wipeLocal(); render(); toast("Signed out"); })
      .catch(() => toast("Could not sign out")));
  });
  const si = document.getElementById("psignin");
  if(si) si.addEventListener("click", () => { document.getElementById("acctdlg").hidden = false; });
  /* A note written three weeks ago is unfindable unless the index actually
     takes you to its record — the list is the only route back to it. */
  document.querySelectorAll("[data-go]").forEach(b => {
    b.addEventListener("click", () => { goTo(b.dataset.go); });
  });
}
```

In `render()`, add before the `revise` branch:

```js
  else if(S.view === "profile") { s.innerHTML = viewProfile(); mountProfile(); }
```

- [ ] **Step 3: Point the header button at it**

In `mountAccount()`, replace the button's click handler body with:

```js
  btn.addEventListener("click", () => { go("profile"); });
```

so the button always opens the profile, signed in or out. The dialog is now opened from the profile's *Sign in to sync*, and by `#acctdlg` directly.

- [ ] **Step 4: Style it**

Append to `app/components.css`:

```css
.profile{max-width:720px}
.pcard{display:flex;align-items:center;justify-content:space-between;gap:14px;
  background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:15px 17px;margin-bottom:14px}
.pident{display:flex;flex-direction:column;gap:2px;min-width:0}
.pident b{font-family:var(--f-display);font-size:17px;font-weight:600}
.pident span{font-size:12px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis}
.pstats{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}
.pstat{background:var(--surface);border:1px solid var(--line);border-radius:10px;
  padding:12px 13px;font-size:12px;color:var(--ink-2)}
.pstat b{display:block;font-family:var(--f-mono);font-size:23px;font-weight:600;
  color:var(--ink);letter-spacing:-.03em;line-height:1.15}
.ptoday{margin:12px 0 22px;font-size:12.5px;color:var(--ink-3)}
.noterow2{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;
  padding:11px 2px;border:0;border-top:1px solid var(--line);background:none;
  text-align:left;cursor:pointer;font:inherit}
.noterow2:hover .nr-t{color:var(--accent)}
.nr-t{font-weight:600;font-size:14px;color:var(--ink)}
.nr-x{font-size:12.5px;color:var(--ink-3);line-height:1.45}
.pmuted{font-size:13px;color:var(--ink-3)}
.pdata{display:flex;gap:9px;flex-wrap:wrap;padding-top:12px}
.btn.danger{border-color:var(--crit);color:var(--crit)}
.btn.danger:hover{background:var(--crit);color:var(--on-accent)}
```

- [ ] **Step 5: Add harness checks**

Append inside the harness's load handler, after the note checks from Task 4:

```js
  doc.getElementById("acctbtn").click();
  await wait(250);
  check("the header button opens the profile",
    /Your profile/.test(doc.getElementById("vbtitle").textContent),
    doc.getElementById("vbtitle").textContent);
  const prof = doc.querySelector(".profile");
  check("the profile lists the note just written",
    !!prof && /Kangra/.test(prof.textContent));
  const nrow = doc.querySelector("[data-go]");
  check("the notes index links to its record", !!nrow);
  if(nrow){
    nrow.click();
    await wait(300);
    check("following a note opens its record",
      doc.getElementById("ptitle").textContent.indexOf("Kangra") >= 0,
      doc.getElementById("ptitle").textContent);
  }
```

`renderAccount` hides the account button when Firebase is unavailable
(`btn.hidden = !authAvailable()`), but a hidden button still dispatches a
click, so this check does not depend on a live Firebase project.

- [ ] **Step 6: Verify**

Run: `node --check app/app.js && node --test`
Expected: **117 pass, 0 fail**.

Confirm the route is legal and the view renders:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && grep -n 'TITLE.profile\|S.view === "profile"' app/app.js
```

Both must appear. Without the `TITLE` key the hash router rejects `#/profile` and silently falls back to Overview.

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: add the profile view"
```

---

### Task 7: Export and delete

This closes an obligation the accounts spec recorded as deferred. Storing somebody's email and progress carries a duty to let them take it and to let them go.

**Files:** Modify `app/app.js`

**Interfaces:**
- Consumes: `SYNC_KEYS`, `loadFirebase`, `authUser`, `userDoc`, `signInGoogle`.
- Produces: `exportData()`, `deleteAccount()`.

- [ ] **Step 1: Export**

```js
/* Everything the app holds about you, as one file. Built from SYNC_KEYS so a
   key added later is exported without anybody remembering to add it here. */
function exportData(){
  const out = {exportedAt: new Date().toISOString(), app: "Parikrama Path"};
  for(const e of SYNC_KEYS) out[e.k] = store.get(e.k, e.empty());
  const u = authUser();
  if(u) out.account = {email: u.email || "", name: u.displayName || ""};
  const blob = new Blob([JSON.stringify(out, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "parikrama-path-" + dayKey() + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Exported");
}
```

- [ ] **Step 2: Delete**

```js
/* Firebase refuses to delete an account on a stale session, raising
   auth/requires-recent-login. Catch it, sign in again, retry — rather than
   showing a cryptic error to somebody trying to leave. */
function deleteAccount(){
  const u = authUser();
  if(!u) return;
  const typed = window.prompt(
    "This deletes your account and everything in it, on every device. " +
    "It cannot be undone.\n\nType DELETE to confirm.");
  if(typed !== "DELETE"){ toast("Not deleted"); return; }

  loadFirebase().then(fb =>
    userDoc(fb, u).delete()
      .then(() => u.delete())
      .catch(err => {
        if(!err || err.code !== "auth/requires-recent-login") throw err;
        toast("Confirm it is you, then it will be deleted");
        return signInGoogle().then(() => authUser().delete());
      })
  ).then(() => {
    wipeLocal();
    render();
    toast("Account deleted");
  }).catch(err => {
    console.error("[parikrama] delete failed:", err && err.code, err);
    toast("Could not delete the account");
  });
}
```

- [ ] **Step 3: Wire the buttons**

In `mountProfile()`, add:

```js
  const ex = document.getElementById("pexport");
  if(ex) ex.addEventListener("click", exportData);
  const del = document.getElementById("pdelete");
  if(del) del.addEventListener("click", deleteAccount);
```

- [ ] **Step 4: Verify**

Run: `node --check app/app.js && node --test`
Expected: **117 pass, 0 fail**.

Confirm export covers every synced key by reading `exportData` — it must iterate `SYNC_KEYS` rather than naming keys, so a key added later is included automatically. State in your report that **deletion cannot be tested here**: it needs a live Firebase project and a real account, and running it would destroy that account. Do not attempt it.

- [ ] **Step 5: Commit**

```bash
git add app/app.js
git commit -m "feat: export your data, and delete your account"
```

---

### Task 8: Ship it

**Files:** Modify `sw.js`, `README.md`, `build-single.sh`

- [ ] **Step 1: Service worker**

Bump `CACHE`. No new files were added, so `ASSETS` needs no change — confirm that by reading it rather than assuming.

- [ ] **Step 2: The offline build**

No new script files, so the tuple in `build-single.sh` is unchanged. Run it and confirm the new code is present:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && ./build-single.sh ../hp-revision.html && \
  for p in "function setNote" "function bumpStreak" "function viewProfile" "function exportData"; do
    printf "%-22s %s\n" "$p" "$(grep -c "$p" ../hp-revision.html)"; done
```

Every count must be 1. The offline build is guest-only, so the profile's sign-in card and the delete button are correctly absent there — confirm `FB_READY = false` is still present.

- [ ] **Step 3: README**

Add a section covering: one note per record, capped at 1,000 characters and why (the shared Firestore document's 1 MB limit); the streak's four routes and the grace day; the profile at `#/profile`, reached from the header button rather than the nav; and that export and deletion now exist, replacing the "not yet built" note the accounts section currently carries. Remove that stale note.

- [ ] **Step 4: Full verification**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node --test
```
Expected: **117 pass, 0 fail**.

Then the repo owner runs `http://localhost:8765/test/harness.html` and confirms `PASS`, and walks it by hand:

1. Open any record, write a note, navigate away and back — it is still there.
2. The counter moves as you type and stops at 1,000.
3. Scroll 20 facts in Rounds — a toast announces the day.
4. The header account button opens the profile; the streak and the note are both listed.
5. Export downloads a JSON file containing the note and the streak.
6. Signed in on a second device, the note and streak appear after sync.

- [ ] **Step 5: Commit**

```bash
git add sw.js README.md build-single.sh
git commit -m "chore: document notes, streak and the profile"
```

---

## What this plan cannot verify

- **Account deletion and the re-authentication path** need a live Firebase project and a real account; running the test destroys the account. Static review only.
- **Cross-device sync** of notes and streak needs two signed-in devices.
- **Day-boundary behaviour in the wild** — the pure functions are tested against fixed date strings, but a real midnight rollover is not something Node tests here observe.

## Verification summary

| Spec requirement | Task |
|---|---|
| One note per record, at the foot of the panel | 4 |
| 1,000-character cap, visible counter, not silent | 2, 4 |
| Notes merge most-recent-wins; join the synced set | 1, 2 |
| No public/private toggle | 4 (absent by construction) |
| Four qualifying routes; 5 **distinct** records | 3, 5 |
| Local calendar days | 3 |
| Grace day; returns after seven; best never reduced | 3 |
| Generous merging across devices | 3 |
| Profile at `#/profile`, not in the nav | 6 |
| Identity, streak, best, accuracy, past papers | 6 |
| Notes index, each linking to its record | 6 |
| Export everything | 7 |
| Delete, including `auth/requires-recent-login` | 7 |
| One registry replaces four key lists | 1 |
| Sign-out leaves no notes on a shared device | 1, 6 |
| "Reset progress" no longer destroys notes or streak | 1 |
