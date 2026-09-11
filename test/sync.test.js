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

test("mergeAnswers picks the later timestamp regardless of argument order", () => {
  const a = {"Q1": {v: 1, t: 100}}, b = {"Q1": {v: 0, t: 900}};
  assert.deepEqual(sync.mergeAnswers(a, b), sync.mergeAnswers(b, a));
});

/* On a tie — two legacy t:0 answers is the common real case — the result is
   NOT order-independent: the first argument wins. That is deliberate (it is
   how a caller can prefer "local" over "remote" on an exact tie) but it must
   be pinned down, or a future change could silently make ties pick whichever
   side happens to be b instead. */
test("mergeAnswers keeps the first argument's answer on an exact tie", () => {
  const a = {"Q1": {v: 1, t: 0}}, b = {"Q1": {v: 0, t: 0}};
  assert.equal(sync.mergeAnswers(a, b)["Q1"].v, 1, "a's answer should win when a is first");
  assert.equal(sync.mergeAnswers(b, a)["Q1"].v, 0, "b's answer should win when b is first");
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

/* normaliseAnswers must only accept a legacy value that is exactly 0 or 1 —
   NaN and negative numbers are not legitimate stored answers and must be
   dropped as corrupt rather than silently coerced. */
test("normaliseAnswers drops corrupt legacy numbers instead of coercing them", () => {
  const out = sync.normaliseAnswers({"Q1": NaN, "Q2": -1, "Q3": 2, "Q4": 1});
  assert.ok(!("Q1" in out), "NaN must be dropped, not coerced to 0");
  assert.ok(!("Q2" in out), "-1 must be dropped, not coerced to 1");
  assert.ok(!("Q3" in out), "2 must be dropped");
  assert.deepEqual(out["Q4"], {v: 1, t: 0});
});

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

/* ---------- notes ---------- */
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

/* Finding 2 (review): normaliseNotes used to drop any blank-text entry,
   which made a tombstone {text: "", t} impossible to represent — an absent
   key always lost to a present remote key in mergeNotes, so a deletion was
   silently undone by the next sync. Blank text (whitespace-only or a true
   empty-string tombstone) is now kept through normalise and hidden only at
   read time (see realNotes below) — junk with no text STRING at all is the
   only thing normaliseNotes still drops. */
test("normaliseNotes keeps a whitespace-only note rather than dropping it", () => {
  const out = sync.normaliseNotes({a: {text: "   \n ", t: 1}, b: {text: "real", t: 1}});
  assert.deepEqual(Object.keys(out).sort(), ["a", "b"]);
});

test("normaliseNotes keeps an empty-string tombstone rather than dropping it", () => {
  const out = sync.normaliseNotes({"d-kangra": {text: "", t: 500}});
  assert.deepEqual(out["d-kangra"], {text: "", t: 500});
});

test("normaliseNotes still drops junk with no text string at all", () => {
  const out = sync.normaliseNotes({a: null, b: 42, c: {t: 1}, d: {text: "ok", t: 2}, e: {text: "", t: 3}});
  assert.deepEqual(Object.keys(out).sort(), ["d", "e"]);
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

/* Contract change per finding 2: deleting a note used to remove the key,
   which mergeNotes (additive-with-recency) cannot represent as "newer than
   a remote that still has it" — an absent key always lost. setNote now
   writes a tombstone {text: "", t: Date.now()} instead, so the deletion
   itself is a dated entry that can win a merge like any other note. */
test("setNote with empty text stores a tombstone rather than removing the key", () => {
  const before = Date.now();
  const out = sync.setNote({"x": {text: "gone soon", t: 1}}, "x", "   ");
  assert.ok("x" in out, "a cleared note must remain as a tombstone, not disappear");
  assert.equal(out["x"].text, "", "cleared text is stored as an empty-string tombstone");
  assert.ok(out["x"].t >= before, "the tombstone needs a fresh timestamp to outrace a stale remote note");
});

test("setNote does not mutate the map it is given", () => {
  const notes = {};
  sync.setNote(notes, "x", "hello");
  assert.deepEqual(notes, {});
});

/* ---------- shouldWriteNote ---------- */
/* Finding 1 (review, CRITICAL): flushNote used to decide whether to write by
   comparing the textarea's text against storage. That comparison has no
   memory of whether the student actually typed — if storage changes under
   an open panel (a sync landing, a wipe on sign-out) the "stored" side moves
   and the stale textarea value gets written back as if it were fresh, or an
   empty textarea deletes a note that just arrived. shouldWriteNote makes
   "did the student type" (dirty) the gate, checked before text is ever
   compared. */
test("shouldWriteNote never writes when the student never typed, however storage and the box differ", () => {
  assert.equal(sync.shouldWriteNote("old draft", "old draft", false), false);
  assert.equal(sync.shouldWriteNote("old draft", "a newer note synced in", false), false,
    "a stale textarea must not overwrite a note that synced in while untouched");
  assert.equal(sync.shouldWriteNote("a note that just synced in", "", false), false,
    "an untouched, initially-empty textarea must not delete a note that arrived after");
});

test("shouldWriteNote writes when the student typed and the value actually changed", () => {
  assert.equal(sync.shouldWriteNote("old draft", "old draft, revised", true), true);
});

test("shouldWriteNote still suppresses the double save when dirty but unchanged", () => {
  /* blur fires flushNote, then the Save button's own blur fires it again;
     both see the same unchanged text, so only the first should write. */
  assert.equal(sync.shouldWriteNote("same text", "same text", true), false);
});

test("shouldWriteNote treats a non-string stored value as no stored note", () => {
  assert.equal(sync.shouldWriteNote(undefined, "typed", true), true);
  assert.equal(sync.shouldWriteNote(undefined, "", true), false);
});

/* ---------- hostile record ids ----------
   Record ids are internal fixed strings (e.g. "d-kangra") and are never
   user-typed, but notes also arrive from Firestore via JSON.parse. Unlike
   an object literal, JSON.parse gives "__proto__" a genuine own enumerable
   property, so a naive out[k] = ... write reassigns the output object's
   own prototype instead of storing an entry. These tests build the hostile
   input the same way real data would arrive: through JSON.parse. */

test("normaliseNotes treats __proto__ as junk, not a prototype reassignment", () => {
  const hostile = JSON.parse('{"__proto__": {"text": "evil", "t": 1}, "d-kangra": {"text": "ok", "t": 1}}');
  const out = sync.normaliseNotes(hostile);
  assert.deepEqual(Object.keys(out), ["d-kangra"]);
  assert.equal(Object.getPrototypeOf(out), Object.prototype);
  assert.equal(out.text, undefined);
  assert.equal(out.t, undefined);
  assert.equal(out["d-kangra"].text, "ok");
});

test("normaliseNotes accepts constructor and toString as ordinary record ids", () => {
  const out = sync.normaliseNotes({constructor: {text: "c-note", t: 1}, toString: {text: "ts-note", t: 2}});
  assert.equal(out["constructor"].text, "c-note");
  assert.equal(out["toString"].text, "ts-note");
});

test("mergeNotes treats __proto__ as junk, not a prototype reassignment", () => {
  const hostile = JSON.parse('{"__proto__": {"text": "evil", "t": 1}, "d-kangra": {"text": "a", "t": 1}}');
  const clean = {"d-mandi": {text: "b", t: 5}};
  const m = sync.mergeNotes(hostile, clean);
  assert.deepEqual(Object.keys(m).sort(), ["d-kangra", "d-mandi"]);
  assert.equal(Object.getPrototypeOf(m), Object.prototype);
  assert.equal(m.text, undefined);
  assert.equal(m.t, undefined);
  assert.equal(m["d-kangra"].text, "a");
  assert.equal(m["d-mandi"].text, "b");
});

test("mergeNotes treats __proto__ as junk regardless of which side carries it", () => {
  const clean = {"d-kangra": {text: "a", t: 1}};
  const hostile = JSON.parse('{"__proto__": {"text": "evil", "t": 9}, "d-mandi": {"text": "b", "t": 1}}');
  const m = sync.mergeNotes(clean, hostile);
  assert.deepEqual(Object.keys(m).sort(), ["d-kangra", "d-mandi"]);
  assert.equal(Object.getPrototypeOf(m), Object.prototype);
});

test("mergeNotes accepts constructor and toString as ordinary record ids", () => {
  const a = {constructor: {text: "c-note", t: 1}};
  const b = {toString: {text: "ts-note", t: 1}};
  const m = sync.mergeNotes(a, b);
  assert.equal(m["constructor"].text, "c-note");
  assert.equal(m["toString"].text, "ts-note");
});

test("setNote treats __proto__ as junk, not a prototype reassignment", () => {
  const hostile = JSON.parse('{"__proto__": {"text": "evil", "t": 1}, "d-kangra": {"text": "keep me", "t": 1}}');
  const out = sync.setNote(hostile, "__proto__", "attempted takeover");
  assert.equal(Object.getPrototypeOf(out), Object.prototype);
  assert.equal(out.text, undefined);
  assert.equal(out.t, undefined);
  assert.equal(out["d-kangra"].text, "keep me", "a legitimate neighbouring note must survive");
  assert.ok(!Object.keys(out).includes("__proto__"));
});

/* realNotes is the one place "is this a real, displayable note" is decided,
   used by noteBlock, viewProfile and exportData alike so a tombstone or a
   whitespace-only entry never renders as a note or counts in a tally. */
test("realNotes hides a tombstone and a whitespace-only note, keeps a real one", () => {
  const out = sync.realNotes({a: {text: "", t: 5}, b: {text: "   ", t: 5}, c: {text: "real", t: 5}});
  assert.deepEqual(Object.keys(out), ["c"]);
});

test("realNotes drops junk the same way normaliseNotes does", () => {
  assert.deepEqual(sync.realNotes({a: null, b: 42}), {});
  assert.deepEqual(sync.realNotes(null), {});
});

/* The round trip the review said no existing test covered: delete a note,
   then merge against a remote that has not seen the deletion yet. Before
   finding 2's fix this came back — the tombstone must win because it is
   newer, and it must not show up as a note afterwards either. */
test("a deleted note stays deleted after merging against a remote that still has it", () => {
  const original = {"d-kangra": {text: "private note", t: 1000}};
  const afterDelete = sync.setNote(original, "d-kangra", "");
  assert.equal(afterDelete["d-kangra"].text, "", "setNote must tombstone, not remove, the key");

  const remoteStillHasIt = {"d-kangra": {text: "private note", t: 1000}};
  const merged = sync.mergeNotes(afterDelete, remoteStillHasIt);
  assert.equal(merged["d-kangra"].text, "", "the newer tombstone must beat the older remote note");
  assert.deepEqual(sync.realNotes(merged), {}, "a tombstoned record must not appear as a real note");
});

test("setNote accepts constructor and toString as ordinary record ids", () => {
  const out1 = sync.setNote({}, "constructor", "c-note");
  assert.equal(out1["constructor"].text, "c-note");
  const out2 = sync.setNote({}, "toString", "ts-note");
  assert.equal(out2["toString"].text, "ts-note");
});

/* ---------- streak ---------- */
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

/* Strengthened per review: the original version of this test asserted only
   `.n`, which is exactly what let a real bug in mergeStreak's date-picking
   through — merging a real streak against a fresh, never-synced emptyStreak
   silently wiped `.last`/`.day` and today's counters even though `.n`
   happened to survive via Math.max. Assert every field a real merge must
   preserve, not just the one the bug didn't touch. */
test("mergeStreak copes with either side missing", () => {
  const only = {n: 2, best: 2, last: "2026-01-05", grace: 1, day: "2026-01-05",
                facts: 20, quiz: 3, pyq: 1, recs: ["d-kangra", "d-shimla"]};

  const withNull = sync.mergeStreak(only, null);
  assert.equal(withNull.n, 2);
  assert.equal(withNull.best, 2);
  assert.equal(withNull.last, "2026-01-05", "a real date must survive merging against nothing");
  assert.equal(withNull.day, "2026-01-05");
  assert.equal(withNull.facts, 20);
  assert.equal(withNull.quiz, 3);
  assert.equal(withNull.pyq, 1);
  assert.deepEqual(withNull.recs, ["d-kangra", "d-shimla"]);

  const nullWith = sync.mergeStreak(null, only);
  assert.equal(nullWith.n, 2);
  assert.equal(nullWith.best, 2);
  assert.equal(nullWith.last, "2026-01-05");
  assert.equal(nullWith.day, "2026-01-05");
  assert.equal(nullWith.facts, 20);
  assert.equal(nullWith.quiz, 3);
  assert.equal(nullWith.pyq, 1);
  assert.deepEqual(nullWith.recs, ["d-kangra", "d-shimla"]);

  assert.equal(sync.mergeStreak(null, null).n, 0);
});

/* Regression test for the bug found in review: daysApart(a, b) returns
   Infinity whenever EITHER date is "" (a fresh emptyStreak's last/day).
   mergeStreak's original "later date wins" ternary read that Infinity as
   "B is later" and picked the EMPTY side, discarding the real side's date
   and, via the day-gated counters, its facts/quiz/pyq/recs too. This is
   not a rare edge case: every existing user's first sync after this
   feature ships merges their real local streak against a remote with no
   "streak" key yet, i.e. exactly emptyStreak(). Check both argument
   orders, since the bug was order-dependent. */
test("mergeStreak preserves a real streak's date and today's counters against a fresh emptyStreak", () => {
  /* grace is deliberately 0 here: a fresh streak carries 1, and the merge
     rule is generous in every field, so the merged result should be 1.
     That is intentional forgiveness, not the bug this test guards. */
  const real = {n: 4, best: 6, last: "2026-01-05", grace: 0, day: "2026-01-05",
                facts: 12, quiz: 3, pyq: 2, recs: ["d-kangra", "d-shimla"]};
  const fresh = sync.emptyStreak();

  for(const [m, where] of [[sync.mergeStreak(real, fresh), "merged first"],
                           [sync.mergeStreak(fresh, real), "merged second"]]){
    assert.equal(m.last, "2026-01-05", "real " + where + " must keep its date");
    assert.equal(m.day, "2026-01-05", where);
    assert.equal(m.facts, 12, where);
    assert.equal(m.quiz, 3, where);
    assert.equal(m.pyq, 2, where);
    assert.deepEqual(m.recs, ["d-kangra", "d-shimla"], where);
    assert.equal(m.n, 4, "the run must survive " + where);
    assert.equal(m.best, 6, "the best must survive " + where);
    assert.equal(m.grace, 1, "the more forgiving grace wins " + where);
  }
});
