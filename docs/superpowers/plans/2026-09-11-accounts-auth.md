# Accounts and Sign-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optional Google / email-link sign-in that syncs a user's progress across devices, leaving the signed-out app exactly as it is today.

**Architecture:** A pure `app/sync.js` holds the merge rules and is unit-tested in Node with no Firebase present. `app/auth.js` wraps Firebase and lazily loads a vendored SDK only when someone actually signs in, so first paint and the offline experience are untouched. `app/app.js` gains a sign-in control and calls sync on auth changes. Guests keep using `localStorage` exactly as now.

**Tech Stack:** Plain ES5-compatible browser JavaScript, no build step. Firebase Auth + Firestore via the vendored compat SDK. Tests on Node's built-in `node --test` plus the committed browser harness.

## Global Constraints

- **The signed-out app must not change.** Every existing behaviour works with no account, no network and no Firebase config present. A missing or invalid config degrades to guest mode silently, never to a broken app.
- **No build step.** Plain `<script src>` tags; `app/sync.js` uses `var`/`function` and ends with a `typeof module` guard so Node can `require()` it, exactly like `app/mapkit.js` and `app/rounds.js`.
- **`test/` may import nothing outside Node's stdlib.** There is no `package.json` and none may be created. The Firebase SDK is vendored into the repo, never installed with npm.
- **Run tests with `node --test`** (no path argument) from the repo root, or `node --test test/<file>.test.js` for one file. A *directory* argument is broken on the installed Node 25.2.1.
- **69 tests pass today.** All must still pass.
- **Syncs:** notes (later sub-project), `hpatlas:seen`, `hpatlas:quiz`, `hpatlas:pyq`, streak (later sub-project).
  **Never syncs:** `hpatlas:theme`, `hpatlas:mapoff`, `hpatlas:legendopen` — these belong to the device.
- **Merge rules:** facts seen take the **union**; quiz and past-paper answers merge **per question, most recent wins**; the streak takes the **higher** count.
- **Firebase phone/OTP must not be used** — it is billed per verification and the platform was chosen for being free.
- **Bump `CACHE` in `sw.js`** after any asset change.

---

## Two things the spec left open, resolved here

**1. Answers carry no timestamp, so "most recent wins" cannot be implemented.**
`app/app.js:1134` stores `prog[q.q] = 1` or `0` — a bare number. Task 2 migrates the
value to `{v: 0|1, t: <epoch ms>}` and treats any bare number read from old data as
`{v: n, t: 0}`, so existing progress keeps working and always loses to a newer answer.

**2. The Firebase SDK is vendored but loaded lazily.**
Vendoring keeps the app working offline and out of npm. Loading it eagerly would put
~300 KB in front of first paint for the majority who never sign in. Task 3 loads it on
demand — when a signed-in session is restored, or when someone presses sign in.

---

## File Structure

**Create:**
- `app/sync.js` — pure merge rules. No Firebase, no DOM.
- `app/auth.js` — Firebase wrapper: lazy SDK load, sign in, sign out, auth-change callback.
- `app/firebase-config.js` — the project's keys, and `FB_READY`. Committed with empty values; the repo owner fills them in.
- `vendor/firebase-app-compat.js`, `vendor/firebase-auth-compat.js`, `vendor/firebase-firestore-compat.js` — the SDK.
- `firestore.rules` — security rules, deployed from the Firebase console.
- `test/sync.test.js` — merge-rule tests.

**Modify:**
- `app/app.js` — timestamped answers, the sign-in control, sync on auth change.
- `app/components.css` — sign-in control and dialog.
- `index.html`, `sw.js`, `README.md`, `build-single.sh`.

---

### Task 1: The merge rules

Pure functions, no Firebase. This is the part that decides whether someone loses progress, so it is written and tested first, alone.

**Files:**
- Create: `app/sync.js`, `test/sync.test.js`

**Interfaces:**
- Produces:
  - `normaliseAnswers(obj)` → `{[question]: {v: 0|1, t: number}}`. Accepts the legacy bare-number shape and lifts it to `{v, t:0}`.
  - `mergeSeen(a, b)` → array, union, order stable: everything from `a` in order, then anything in `b` not already present.
  - `mergeAnswers(a, b)` → merged answer map, most recent `t` wins; ties keep `a`.
  - `mergeStreak(a, b)` → the higher number. Used by a later sub-project; defined now because the rule belongs with its siblings.
  - `mergeState(local, remote)` → `{seen, quiz, pyq}`, applying the three rules.

- [ ] **Step 1: Write the failing test**

`test/sync.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const sync = require("../app/sync.js");

/* ---------- answers ---------- */
test("normaliseAnswers lifts the legacy bare-number shape", () => {
  const out = sync.normaliseAnswers({"Q1": 1, "Q2": 0});
  assert.deepEqual(out["Q1"], {v: 1, t: 0});
  assert.deepEqual(out["Q2"], {v: 0, t: 0});
});

test("normaliseAnswers leaves an already-timestamped answer alone", () => {
  const out = sync.normaliseAnswers({"Q1": {v: 1, t: 1234}});
  assert.deepEqual(out["Q1"], {v: 1, t: 1234});
});

test("normaliseAnswers tolerates junk rather than throwing", () => {
  assert.deepEqual(sync.normaliseAnswers(null), {});
  assert.deepEqual(sync.normaliseAnswers(undefined), {});
  const out = sync.normaliseAnswers({"Q1": "nonsense", "Q2": 1});
  assert.ok(!("Q1" in out), "a non-numeric answer should be dropped, not kept");
  assert.deepEqual(out["Q2"], {v: 1, t: 0});
});

test("mergeAnswers keeps the most recent answer per question", () => {
  const a = {"Q1": {v: 1, t: 100}, "Q2": {v: 0, t: 500}};
  const b = {"Q1": {v: 0, t: 900}, "Q3": {v: 1, t: 50}};
  const m = sync.mergeAnswers(a, b);
  assert.equal(m["Q1"].v, 0, "the later answer to Q1 should win");
  assert.equal(m["Q1"].t, 900);
  assert.equal(m["Q2"].v, 0, "Q2 exists only in a and must survive");
  assert.equal(m["Q3"].v, 1, "Q3 exists only in b and must survive");
});

test("mergeAnswers treats legacy answers as older than any timestamped one", () => {
  const m = sync.mergeAnswers({"Q1": 1}, {"Q1": {v: 0, t: 5}});
  assert.equal(m["Q1"].v, 0, "a timestamped answer must beat a legacy one");
});

test("mergeAnswers is order-independent for the same inputs", () => {
  const a = {"Q1": {v: 1, t: 100}}, b = {"Q1": {v: 0, t: 900}};
  assert.deepEqual(sync.mergeAnswers(a, b), sync.mergeAnswers(b, a));
});

/* ---------- seen facts ---------- */
test("mergeSeen unions without losing or duplicating", () => {
  const m = sync.mergeSeen(["a", "b"], ["b", "c"]);
  assert.deepEqual(m, ["a", "b", "c"]);
});

test("mergeSeen copes with either side empty or absent", () => {
  assert.deepEqual(sync.mergeSeen([], ["a"]), ["a"]);
  assert.deepEqual(sync.mergeSeen(["a"], []), ["a"]);
  assert.deepEqual(sync.mergeSeen(null, undefined), []);
});

test("mergeSeen never mutates its inputs", () => {
  const a = ["a"], b = ["b"];
  sync.mergeSeen(a, b);
  assert.deepEqual(a, ["a"]);
  assert.deepEqual(b, ["b"]);
});

/* ---------- streak ---------- */
test("mergeStreak takes the higher count", () => {
  assert.equal(sync.mergeStreak(3, 7), 7);
  assert.equal(sync.mergeStreak(7, 3), 7);
  assert.equal(sync.mergeStreak(undefined, 4), 4);
  assert.equal(sync.mergeStreak(null, null), 0);
});

/* ---------- the whole state ---------- */
test("mergeState applies all three rules together", () => {
  const local  = {seen: ["f1"], quiz: {"Q1": {v: 1, t: 10}}, pyq: {}};
  const remote = {seen: ["f2"], quiz: {"Q1": {v: 0, t: 99}}, pyq: {"P1": {v: 1, t: 5}}};
  const m = sync.mergeState(local, remote);
  assert.deepEqual(m.seen, ["f1", "f2"]);
  assert.equal(m.quiz["Q1"].v, 0);
  assert.equal(m.pyq["P1"].v, 1);
});

test("mergeState handles a brand-new account with nothing on the server", () => {
  const local = {seen: ["f1"], quiz: {"Q1": 1}, pyq: {}};
  const m = sync.mergeState(local, {});
  assert.deepEqual(m.seen, ["f1"]);
  assert.equal(m.quiz["Q1"].v, 1, "local progress must survive first sign-in");
});

test("mergeState handles a fresh device with nothing stored locally", () => {
  const remote = {seen: ["f9"], quiz: {"Q9": {v: 1, t: 3}}, pyq: {}};
  const m = sync.mergeState({}, remote);
  assert.deepEqual(m.seen, ["f9"]);
  assert.equal(m.quiz["Q9"].v, 1, "the account's progress must arrive on a new device");
});

test("mergeState never syncs device preferences", () => {
  const m = sync.mergeState({theme: "dark", mapoff: ["peak"], legendopen: true},
                            {theme: "light", mapoff: [], legendopen: false});
  for(const k of ["theme", "mapoff", "legendopen"])
    assert.ok(!(k in m), k + " is a device preference and must not be merged");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/sync.test.js`
Expected: FAIL — `Cannot find module '../app/sync.js'`

- [ ] **Step 3: Write the implementation**

`app/sync.js`:

```js
/* ============================================================
   sync — the merge rules, and nothing else.
   No Firebase, no DOM, no storage. Two devices diverge, and
   every rule here exists so that nobody is punished for owning
   two devices: progress is never lost, only reconciled.
   ============================================================ */
"use strict";

/* Answers were once stored as a bare 1 or 0 with no timestamp, which makes
   "most recent wins" unanswerable. Legacy values lift to t:0 so they lose
   to any answer that carries a real time. */
function normaliseAnswers(obj){
  var out = {};
  if(!obj || typeof obj !== "object") return out;
  for(var k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    var v = obj[k];
    if(typeof v === "number") out[k] = {v: v ? 1 : 0, t: 0};
    else if(v && typeof v === "object" && typeof v.v === "number")
      out[k] = {v: v.v ? 1 : 0, t: typeof v.t === "number" ? v.t : 0};
    /* anything else is corrupt and is dropped rather than propagated */
  }
  return out;
}

function mergeAnswers(a, b){
  var A = normaliseAnswers(a), B = normaliseAnswers(b), out = {}, k;
  for(k in A) if(Object.prototype.hasOwnProperty.call(A, k)) out[k] = A[k];
  for(k in B){
    if(!Object.prototype.hasOwnProperty.call(B, k)) continue;
    if(!out[k] || B[k].t > out[k].t) out[k] = B[k];
  }
  return out;
}

/* Union, order stable: everything from a in order, then what only b has. */
function mergeSeen(a, b){
  var out = [], has = {}, i;
  var A = Array.isArray(a) ? a : [], B = Array.isArray(b) ? b : [];
  for(i = 0; i < A.length; i++) if(!has[A[i]]){ has[A[i]] = 1; out.push(A[i]); }
  for(i = 0; i < B.length; i++) if(!has[B[i]]){ has[B[i]] = 1; out.push(B[i]); }
  return out;
}

function mergeStreak(a, b){
  return Math.max(typeof a === "number" ? a : 0, typeof b === "number" ? b : 0);
}

/* Only the keys that belong to the person. Theme, hidden map layers and the
   legend's state belong to the device and are deliberately absent. */
function mergeState(local, remote){
  var L = local || {}, R = remote || {};
  return {
    seen: mergeSeen(L.seen, R.seen),
    quiz: mergeAnswers(L.quiz, R.quiz),
    pyq:  mergeAnswers(L.pyq,  R.pyq)
  };
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {normaliseAnswers: normaliseAnswers, mergeAnswers: mergeAnswers,
                    mergeSeen: mergeSeen, mergeStreak: mergeStreak, mergeState: mergeState};
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/sync.test.js` — expected 14 pass.
Then `node --test` — expected 83 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add app/sync.js test/sync.test.js
git commit -m "feat: add the progress merge rules"
```

---

### Task 2: Timestamp the answers

Without this the merge rule in Task 1 has nothing to work with. Backward compatible: existing saved progress keeps working and simply loses to any newer answer.

**Files:**
- Modify: `app/app.js` — `answer()`, `quizUI()`, `papersUI()`, and the Overview's score line
- Modify: `test/sync.test.js`

**Interfaces:**
- Consumes: `normaliseAnswers` from `app/sync.js`.
- Produces: `hpatlas:quiz` and `hpatlas:pyq` values shaped `{[question]: {v: 0|1, t: number}}`.

- [ ] **Step 1: Find every place that reads an answer**

Run: `grep -n 'prog\[' app/app.js`
Expected: five sites — a count of attempted, a count of correct, a weak-topic tally, the write in `answer()`, and the past-paper equivalents. Every one of them compares against a bare number today and must go through a reader.

- [ ] **Step 2: Write the failing test**

Append to `test/sync.test.js`:

```js
/* The app must read both shapes through one accessor, or old progress
   silently reads as "unattempted" and someone's history disappears. */
test("answerValue reads both the legacy and the timestamped shape", () => {
  assert.equal(sync.answerValue(1), 1);
  assert.equal(sync.answerValue(0), 0);
  assert.equal(sync.answerValue({v: 1, t: 99}), 1);
  assert.equal(sync.answerValue({v: 0, t: 99}), 0);
});

test("answerValue returns undefined for an unattempted question", () => {
  assert.equal(sync.answerValue(undefined), undefined);
  assert.equal(sync.answerValue(null), undefined);
  assert.equal(sync.answerValue("nonsense"), undefined);
});

test("recordAnswer stamps the time it was answered", () => {
  const before = Date.now();
  const out = sync.recordAnswer({}, "Q1", 1);
  assert.equal(out["Q1"].v, 1);
  assert.ok(out["Q1"].t >= before, "answer was not stamped with a real time");
});

test("recordAnswer does not mutate the map it is given", () => {
  const prog = {};
  sync.recordAnswer(prog, "Q1", 1);
  assert.deepEqual(prog, {}, "recordAnswer mutated its input");
});
```

- [ ] **Step 3: Add the two accessors**

Insert into `app/sync.js` before the `module.exports` guard:

```js
/* One reader for both shapes. Every call site must go through this, or old
   saved progress reads as unattempted and a user's history vanishes. */
function answerValue(x){
  if(typeof x === "number") return x ? 1 : 0;
  if(x && typeof x === "object" && typeof x.v === "number") return x.v ? 1 : 0;
  return undefined;
}
function recordAnswer(prog, key, correct){
  var out = {}, k;
  for(k in prog) if(Object.prototype.hasOwnProperty.call(prog, k)) out[k] = prog[k];
  out[key] = {v: correct ? 1 : 0, t: Date.now()};
  return out;
}
```

Add `answerValue: answerValue, recordAnswer: recordAnswer` to `module.exports`.

- [ ] **Step 4: Route every call site through them**

In `app/app.js`, the write in `answer()` becomes:

```js
  const prog = store.get("quiz",{}); store.set("quiz", recordAnswer(prog, q.q, i === q.a));
```

and every read of the form `prog[q.q]` becomes `answerValue(prog[q.q])`. Apply the same
to the past-paper equivalents. Run the grep from Step 1 again afterwards and confirm no
bare `prog[...]` comparison survives.

- [ ] **Step 5: Load the module**

Add to `index.html` immediately before `app/app.js`:

```html
<script src="app/sync.js"></script>
```

Add `"app/sync.js"` to the `ASSETS` array in `sw.js` and bump `CACHE`.
Add `"sync.js"` to the app tuple in `build-single.sh`, before `app.js`.

- [ ] **Step 6: Verify**

Run: `node --check app/app.js && node --test`
Expected: 87 pass, 0 fail.

Then confirm old progress still reads. In a browser console on the app:

```js
localStorage.setItem("hpatlas:quiz", JSON.stringify({"some question": 1}));
```

reload, open Revise → Quiz, and confirm the score line counts that question as attempted
and correct rather than showing zero.

- [ ] **Step 7: Commit**

```bash
git add app/sync.js app/app.js test/sync.test.js index.html sw.js build-single.sh
git commit -m "feat: timestamp quiz and past-paper answers"
```

---

### Task 3: Firebase config and the lazy SDK loader

After this task the app behaves exactly as before, because no config is filled in yet. That is the point: the absence of Firebase must be a supported state, not a broken one.

**Files:**
- Create: `app/firebase-config.js`, `vendor/firebase-app-compat.js`, `vendor/firebase-auth-compat.js`, `vendor/firebase-firestore-compat.js`
- Modify: `index.html`, `sw.js`, `.gitignore`

**Interfaces:**
- Produces: `FB_CONFIG` (object) and `FB_READY` (boolean — true only when every required key is non-empty); `loadFirebase()` → Promise resolving to the `firebase` global, or rejecting if not configured.

- [ ] **Step 1: The config file, committed empty**

`app/firebase-config.js`:

```js
/* Firebase project keys. These are not secrets — they identify the project
   and are visible in any client — but the project is only safe because of
   the Firestore rules in firestore.rules. Fill these in from the Firebase
   console: Project settings > Your apps > Web app.
   Left empty, the app runs exactly as it always has, with no accounts. */
var FB_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};
var FB_READY = !!(FB_CONFIG.apiKey && FB_CONFIG.authDomain && FB_CONFIG.projectId && FB_CONFIG.appId);
```

- [ ] **Step 2: Vendor the SDK**

Download the three compat bundles into `vendor/`. Pin an exact version rather than
`latest`, so a remote change can never alter what ships:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && mkdir -p vendor
V=10.12.2
for m in app auth firestore; do
  curl -sS -o "vendor/firebase-$m-compat.js" \
    "https://www.gstatic.com/firebasejs/$V/firebase-$m-compat.js"
done
ls -la vendor && head -c 200 vendor/firebase-app-compat.js
```

Confirm each file is JavaScript and not an error page: `head -c 200` must show code, not
HTML. Record the version in a comment at the top of `app/firebase-config.js`.

- [ ] **Step 3: The lazy loader**

Append to `app/firebase-config.js`:

```js
/* The SDK is ~300 KB. Most visitors never sign in, so it is not put in front
   of first paint — it is fetched the first time it is actually needed, and
   the result is cached so a second call does not refetch. */
var _fbPromise = null;
function loadFirebase(){
  if(_fbPromise) return _fbPromise;
  if(!FB_READY) return Promise.reject(new Error("Firebase is not configured"));
  _fbPromise = new Promise(function(resolve, reject){
    var srcs = ["vendor/firebase-app-compat.js",
                "vendor/firebase-auth-compat.js",
                "vendor/firebase-firestore-compat.js"];
    var i = 0;
    (function next(){
      if(i >= srcs.length){
        try{
          if(!window.firebase.apps.length) window.firebase.initializeApp(FB_CONFIG);
          resolve(window.firebase);
        }catch(err){ reject(err); }
        return;
      }
      var s = document.createElement("script");
      s.src = srcs[i++];
      s.onload = next;
      s.onerror = function(){ reject(new Error("could not load " + s.src)); };
      document.head.appendChild(s);
    })();
  });
  return _fbPromise;
}
```

- [ ] **Step 4: Wire it in**

Add to `index.html` before `app/app.js`:

```html
<script src="app/firebase-config.js"></script>
```

Add `"app/firebase-config.js"` and the three `vendor/` files to the `ASSETS` array in
`sw.js`, so a signed-in user can still work offline. Bump `CACHE`.

- [ ] **Step 5: Verify the app is unchanged**

Run: `node --check app/firebase-config.js && node --test`
Expected: 87 pass, 0 fail.

Then serve the app and confirm, with the config still empty:

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && python3 -m http.server 8765
```

Open `http://localhost:8765/`, and in the console check `FB_READY === false`. Confirm the
Network panel shows **no** request for anything under `vendor/` — the SDK must not load
when nobody has signed in. Every view must work as before.

- [ ] **Step 6: Commit**

```bash
git add app/firebase-config.js vendor index.html sw.js
git commit -m "feat: vendor the Firebase SDK behind a lazy loader"
```

---

### Task 4: The auth module

**Files:**
- Create: `app/auth.js`
- Modify: `index.html`, `sw.js`

**Interfaces:**
- Consumes: `loadFirebase()`, `FB_READY`.
- Produces:
  - `authAvailable()` → boolean, just `FB_READY`.
  - `authUser()` → the current user object or `null`.
  - `onAuthChange(fn)` → registers `fn(user)`, called on every change and once with the current state.
  - `signInGoogle()` → Promise.
  - `sendSignInLink(email)` → Promise. Stores the address in `hpatlas:emailForSignIn` so the returning link can complete without asking again.
  - `completeEmailLink()` → Promise resolving to a user when the current URL is a sign-in link, and to `null` otherwise.
  - `signOutUser()` → Promise.

- [ ] **Step 1: Write the module**

`app/auth.js`:

```js
/* ============================================================
   auth — a thin wrapper over Firebase Auth.
   Every function is safe to call when Firebase is not configured;
   they resolve to null or reject cleanly, so the signed-out app
   never depends on any of this working.
   ============================================================ */
"use strict";

var _user = null, _watchers = [];

function authAvailable(){ return typeof FB_READY !== "undefined" && FB_READY; }
function authUser(){ return _user; }

function onAuthChange(fn){
  _watchers.push(fn);
  fn(_user);
  if(!authAvailable()) return;
  loadFirebase().then(function(fb){
    fb.auth().onAuthStateChanged(function(u){
      _user = u || null;
      for(var i = 0; i < _watchers.length; i++) _watchers[i](_user);
    });
  }).catch(function(){ /* stays signed out, which is a working state */ });
}

function signInGoogle(){
  return loadFirebase().then(function(fb){
    var p = new fb.auth.GoogleAuthProvider();
    return fb.auth().signInWithPopup(p);
  });
}

/* Passwordless email link. The address is kept so the returning link can
   finish without asking for it a second time on the same device. */
function sendSignInLink(email){
  return loadFirebase().then(function(fb){
    return fb.auth().sendSignInLinkToEmail(email, {
      url: location.origin + location.pathname,
      handleCodeInApp: true
    }).then(function(){
      try{ localStorage.setItem("hpatlas:emailForSignIn", email); }catch(e){}
    });
  });
}

function completeEmailLink(){
  if(!authAvailable()) return Promise.resolve(null);
  return loadFirebase().then(function(fb){
    if(!fb.auth().isSignInWithEmailLink(location.href)) return null;
    var email = "";
    try{ email = localStorage.getItem("hpatlas:emailForSignIn") || ""; }catch(e){}
    if(!email) email = window.prompt("Confirm the email address you asked the link for") || "";
    if(!email) return null;
    return fb.auth().signInWithEmailLink(email, location.href).then(function(res){
      try{ localStorage.removeItem("hpatlas:emailForSignIn"); }catch(e){}
      /* strip the one-time credentials out of the address bar */
      history.replaceState(null, "", location.origin + location.pathname + location.hash);
      return res.user;
    });
  });
}

function signOutUser(){
  if(!authAvailable()) return Promise.resolve();
  return loadFirebase().then(function(fb){ return fb.auth().signOut(); });
}
```

- [ ] **Step 2: Wire it in**

Add to `index.html` after `app/firebase-config.js` and before `app/app.js`:

```html
<script src="app/auth.js"></script>
```

Add `"app/auth.js"` to `sw.js`'s `ASSETS` and bump `CACHE`.

- [ ] **Step 3: Verify it is inert without config**

Run: `node --check app/auth.js && node --test`
Expected: 87 pass, 0 fail.

In the browser console with the config still empty:

```js
authAvailable()           // false
authUser()                // null
signOutUser()             // resolves, does nothing
onAuthChange(u => console.log("auth:", u))   // logs "auth: null" once
```

Confirm no `vendor/` request appears in the Network panel.

- [ ] **Step 4: Commit**

```bash
git add app/auth.js index.html sw.js
git commit -m "feat: add the Firebase auth wrapper"
```

---

### Task 5: The sign-in control

**Files:**
- Modify: `index.html`, `app/app.js`, `app/components.css`

**Interfaces:**
- Consumes: `authAvailable`, `authUser`, `onAuthChange`, `signInGoogle`, `sendSignInLink`, `completeEmailLink`, `signOutUser`.
- Produces: `renderAccount(user)`, which paints the header control and dialog for the given user or `null`.

- [ ] **Step 1: Add the markup**

In `index.html`, inside `<div class="bartools">` and **before** the `searchwrap` div:

```html
<button id="acctbtn" type="button" hidden aria-haspopup="dialog">Sign in</button>
```

And immediately before `</body>`:

```html
<div id="acctdlg" hidden role="dialog" aria-modal="true" aria-label="Sign in">
  <div class="acctcard">
    <h3>Sign in to sync</h3>
    <p>Your progress stays on this device unless you sign in. Signing in keeps your
       quiz history and the facts you have seen across every device you use.</p>
    <button class="btn primary" id="acctgoogle" type="button">Continue with Google</button>
    <div class="acctor">or</div>
    <label class="vh" for="acctemail">Email address</label>
    <input id="acctemail" type="email" placeholder="you@example.com" autocomplete="email">
    <button class="btn" id="acctlink" type="button">Email me a sign-in link</button>
    <p class="acctmsg" id="acctmsg"></p>
    <button class="btn sm" id="acctclose" type="button">Close</button>
  </div>
</div>
```

- [ ] **Step 2: Render and wire it**

Add to `app/app.js`, near the other render helpers:

```js
/* The control only appears when Firebase is configured: with no project set
   up, offering a sign-in that cannot work would be worse than offering none. */
function renderAccount(user){
  const btn = document.getElementById("acctbtn");
  if(!btn) return;
  btn.hidden = !authAvailable();
  if(!authAvailable()) return;
  btn.textContent = user ? (user.displayName || user.email || "Account") : "Sign in";
  btn.classList.toggle("in", !!user);
}
function mountAccount(){
  const btn = document.getElementById("acctbtn");
  const dlg = document.getElementById("acctdlg");
  const msg = document.getElementById("acctmsg");
  if(!btn || !dlg) return;
  const say = t => { msg.textContent = t; };
  const open = () => { dlg.hidden = false; say(""); };
  const shut = () => { dlg.hidden = true; };

  btn.addEventListener("click", () => {
    if(authUser()){
      signOutUser().then(() => toast("Signed out")).catch(() => toast("Could not sign out"));
    } else open();
  });
  document.getElementById("acctclose").addEventListener("click", shut);
  dlg.addEventListener("click", e => { if(e.target === dlg) shut(); });
  document.getElementById("acctgoogle").addEventListener("click", () => {
    say("Opening Google…");
    signInGoogle().then(() => { shut(); toast("Signed in"); })
                  .catch(err => say(err && err.message ? err.message : "Sign-in failed"));
  });
  document.getElementById("acctlink").addEventListener("click", () => {
    const email = document.getElementById("acctemail").value.trim();
    if(!email){ say("Enter an email address first"); return; }
    say("Sending…");
    sendSignInLink(email)
      .then(() => say("Link sent. Check your inbox — and your spam folder."))
      .catch(err => say(err && err.message ? err.message : "Could not send the link"));
  });
  onAuthChange(renderAccount);
  completeEmailLink().then(u => { if(u){ shut(); toast("Signed in"); } }).catch(() => {});
}
```

Call `mountAccount();` once at the end of `app/app.js`, beside the other boot calls.

- [ ] **Step 3: Style it**

Append to `app/components.css`:

```css
#acctbtn{padding:6px 11px;border:1px solid var(--line);border-radius:20px;
  background:var(--surface);font:inherit;font-size:12px;color:var(--ink-2);cursor:pointer;
  white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}
#acctbtn:hover{border-color:var(--accent-line);color:var(--ink)}
#acctbtn.in{border-color:var(--accent-line);color:var(--accent)}
#acctdlg{position:fixed;inset:0;z-index:90;display:grid;place-items:center;
  background:rgba(8,16,13,.55);padding:18px}
#acctdlg[hidden]{display:none}
.acctcard{background:var(--surface);border:1px solid var(--line);border-radius:14px;
  padding:22px;width:min(380px,100%);box-shadow:var(--shadow-lg);
  display:flex;flex-direction:column;gap:11px}
.acctcard h3{font-family:var(--f-display);font-size:20px;font-weight:600;margin:0}
.acctcard p{font-size:13px;color:var(--ink-2);margin:0;line-height:1.5}
.acctor{font-family:var(--f-mono);font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink-3);text-align:center}
#acctemail{font:inherit;font-size:14px;padding:9px 11px;border-radius:8px;
  border:1px solid var(--line);background:var(--ground);color:var(--ink)}
#acctemail:focus{outline:none;border-color:var(--accent-line)}
.acctmsg{min-height:17px;font-size:12px;color:var(--accent)}
@media (max-width:600px){ #acctbtn{max-width:96px} }
```

- [ ] **Step 4: Add harness checks**

Append inside the harness's load handler, before the summary line:

```js
  /* With no Firebase project configured the control must stay hidden:
     offering a sign-in that cannot work is worse than offering none. */
  const ab = doc.getElementById("acctbtn");
  check("the account control exists", !!ab);
  check("it is hidden while Firebase is unconfigured",
    ab && ab.hidden === !ev("authAvailable()"), "hidden=" + (ab && ab.hidden));
  check("the app works signed out", !doc.getElementById("stage").hidden);
  check("no Firebase SDK was loaded",
    !doc.querySelector('script[src*="firebase-app-compat"]'));
```

- [ ] **Step 5: Verify**

Run: `node --check app/app.js && node --test` — expected 87 pass.
Open the harness at `http://localhost:8765/test/harness.html` and confirm the four new
checks are green and the title still reads `PASS`.

- [ ] **Step 6: Commit**

```bash
git add index.html app/app.js app/components.css test/harness.html
git commit -m "feat: add the sign-in control"
```

---

### Task 6: Sync progress to the account

**Files:**
- Create: nothing
- Modify: `app/app.js`, `sw.js`

**Interfaces:**
- Consumes: `mergeState` from `app/sync.js`; `loadFirebase`, `authUser`, `onAuthChange`.
- Produces: `pullAndMerge(user)` → Promise; `pushState(user)` → Promise; `localState()` → `{seen, quiz, pyq}`.

- [ ] **Step 1: Add the three functions**

Add to `app/app.js`:

```js
/* One document per user holds the progress that belongs to the person.
   Device preferences are deliberately absent — see the spec. */
function localState(){
  return {seen: store.get("seen", []), quiz: store.get("quiz", {}), pyq: store.get("pyq", {})};
}
function userDoc(fb, user){
  return fb.firestore().collection("users").doc(user.uid);
}
function pullAndMerge(user){
  if(!user) return Promise.resolve();
  return loadFirebase().then(fb => userDoc(fb, user).get().then(snap => {
    const remote = snap.exists ? (snap.data() || {}) : {};
    const merged = mergeState(localState(), remote);
    store.set("seen", merged.seen);
    store.set("quiz", merged.quiz);
    store.set("pyq",  merged.pyq);
    S.seen = merged.seen;
    /* the merged result goes straight back up, so both sides agree */
    return userDoc(fb, user).set(merged, {merge: true});
  }));
}
function pushState(user){
  if(!user) return Promise.resolve();
  return loadFirebase().then(fb => userDoc(fb, user).set(localState(), {merge: true}));
}
```

- [ ] **Step 2: Sync when auth changes**

In `mountAccount()`, replace `onAuthChange(renderAccount);` with:

```js
  onAuthChange(user => {
    renderAccount(user);
    if(!user) return;
    pullAndMerge(user)
      .then(() => { render(); toast("Progress synced"); })
      .catch(() => toast("Could not sync just now"));
  });
```

- [ ] **Step 3: Push after progress changes**

`answer()` and the past-paper answer handler both write progress. After each
`store.set(...)` in those two functions, add:

```js
  if(authUser()) pushState(authUser()).catch(() => {});
```

The failure is swallowed on purpose: a sync that cannot reach the network must never
interrupt someone answering questions. The next successful sync sends everything, because
`pushState` always sends the whole local state rather than a delta.

- [ ] **Step 4: Verify the signed-out path is untouched**

Run: `node --test` — expected 87 pass.

Open the harness and confirm it still reads `PASS`. Then, still signed out, answer a quiz
question and confirm `localStorage` updates and no network request is made.

- [ ] **Step 5: Commit**

```bash
git add app/app.js sw.js
git commit -m "feat: sync progress to the signed-in account"
```

---

### Task 7: Security rules, documentation, and the offline caveat

**Files:**
- Create: `firestore.rules`
- Modify: `README.md`, `build-single.sh`, `sw.js`

- [ ] **Step 1: Write the rules**

`firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // A user document is readable and writable only by that user. Nothing
    // else in the database is reachable from a client at all.
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy these from the Firebase console: Firestore Database → Rules → paste → Publish.
**The default rules let any signed-in user read every document. Publishing these is not
optional.**

- [ ] **Step 2: Keep the offline build honest**

The single-file build cannot authenticate: it runs from `file://`, where Firebase's
redirect and popup flows do not work. Make that explicit rather than shipping a dead
button — in `build-single.sh`, after the JavaScript is assembled, neutralise the config
so `FB_READY` is false and the control stays hidden:

```python
# The single-file build runs from file://, where Firebase auth cannot work.
# Force guest mode rather than shipping a sign-in button that fails.
js = js.replace("var FB_READY = !!(", "var FB_READY = false && !!(")
```

Add `"firebase-config.js"`, `"auth.js"` and `"sync.js"` to the app tuple in
`build-single.sh`, each before `app.js`. Do **not** add the `vendor/` files: nothing in
the offline build can use them.

- [ ] **Step 3: Document it**

Add a section to `README.md` covering: that sign-in is optional and the app works fully
without it; that `app/firebase-config.js` must be filled in from the Firebase console
before accounts do anything; that `firestore.rules` must be published; which keys sync
and which stay on the device; and that the offline single-file build is guest-only.

Add a short privacy note saying what is stored — email address, display name, and the
three progress keys — and that account deletion is not yet built.

- [ ] **Step 4: Verify the offline build**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && ./build-single.sh ../hp-revision.html && \
  grep -c "FB_READY = false" ../hp-revision.html && \
  grep -c "firebase-app-compat" ../hp-revision.html
```

Expected: the first grep returns 1, the second returns 0.

Open `../hp-revision.html` directly from disk and confirm no sign-in button appears and
every view works.

- [ ] **Step 5: Bump the cache and commit**

```bash
git add firestore.rules README.md build-single.sh sw.js
git commit -m "chore: firestore rules, docs, and a guest-only offline build"
```

---

## What this plan cannot verify

Stated plainly so nobody mistakes a green suite for a working sign-in:

- **The Google and email-link round trips need a live Firebase project and a human.**
  They cannot run in Node, and the browser harness cannot complete an OAuth popup.
- **The Firestore rules need testing in the console's Rules Playground**, or with the
  emulator, which is outside this project's zero-dependency constraint.
- **The repo owner must create the Firebase project** and paste four keys into
  `app/firebase-config.js`. Until then every task above is still verifiable, because the
  app is required to work unchanged with no config at all — that is exactly what the
  harness checks in Task 5.

## Verification summary

| Spec requirement | Task |
|---|---|
| Merge rules: union, most-recent-wins, higher streak | 1 |
| Answers carry a timestamp so recency is knowable | 2 |
| SDK vendored, pinned, and lazily loaded | 3 |
| Google sign-in and passwordless email link | 4 |
| Sign-in optional; app unchanged when unconfigured | 3, 4, 5 |
| Sign in, sign out, session restored, UI reflects state | 4, 5 |
| First-sign-in migration of local progress | 6 |
| Progress syncs, device preferences never do | 1, 6 |
| Firestore rules limit a user to their own document | 7 |
| Offline build is guest-only and says so | 7 |
| Privacy note; deletion deferred but recorded | 7 |
