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
/* SYNC_KEYS now carries five entries (seen, quiz, pyq, notes, streak), not
   the three this fixture originally covered — the fixture is extended so
   "everything together" actually exercises everything (review cheap-extras
   list, test/sync.test.js:77). */
test("mergeState applies all five rules together", () => {
  const local  = {seen: ["f1"], quiz: {"Q1": {v: 1, t: 10}}, pyq: {},
                  notes: {"d-kangra": {text: "older note", t: 10}},
                  streak: {n: 2, best: 2, last: "2026-01-05", grace: 1, day: "2026-01-05",
                           facts: 20, quiz: 0, pyq: 0, recs: []}};
  const remote = {seen: ["f2"], quiz: {"Q1": {v: 0, t: 99}}, pyq: {"P1": {v: 1, t: 5}},
                  notes: {"d-kangra": {text: "newer note", t: 900}},
                  streak: {n: 1, best: 3, last: "2026-01-04", grace: 0, day: "2026-01-04",
                           facts: 5, quiz: 1, pyq: 0, recs: []}};
  const m = sync.mergeState(local, remote);
  assert.deepEqual(m.seen, ["f1", "f2"]);
  assert.equal(m.quiz["Q1"].v, 0);
  assert.equal(m.pyq["P1"].v, 1);
  assert.equal(m.notes["d-kangra"].text, "newer note", "the more recent note should win");
  assert.equal(m.streak.best, 3, "the higher best should win");
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
  assert.deepEqual(keys, ["seen", "quiz", "pyq", "conf", "notes", "streak"]);
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

/* ---------- resetDocument ---------- */
/* Finding 4 (review, IMPORTANT): "Clear progress" used to write localState()
   over the remote document with no merge, which is safe only for quiz/pyq —
   but the document now also carries notes and streak, which a laptop idle
   since morning may not know about. resetDocument merges first, then forces
   only the two fields the button promises to clear. */
test("resetDocument clears quiz and pyq but keeps everything else merged", () => {
  const local  = {seen: ["f1"], quiz: {"Q1": {v: 1, t: 10}}, pyq: {"P1": {v: 1, t: 10}},
                  notes: {"d-kangra": {text: "local stale note", t: 10}},
                  streak: {n: 1, best: 1, last: "2026-01-05", grace: 1, day: "2026-01-05",
                           facts: 20, quiz: 0, pyq: 0, recs: []}};
  const remote = {seen: ["f2"], quiz: {"Q2": {v: 1, t: 5}}, pyq: {},
                  notes: {"d-mandi": {text: "written on the phone this morning", t: 999999}},
                  streak: {n: 2, best: 2, last: "2026-01-06", grace: 1, day: "2026-01-06",
                           facts: 20, quiz: 0, pyq: 0, recs: []}};
  const out = sync.resetDocument(local, remote);
  assert.deepEqual(out.quiz, {}, "reset must clear quiz");
  assert.deepEqual(out.pyq, {}, "reset must clear pyq");
  assert.equal(out.notes["d-mandi"].text, "written on the phone this morning",
    "a note that exists only on the cloud must survive a laptop's reset");
  assert.equal(out.notes["d-kangra"].text, "local stale note", "the laptop's own note must survive too");
  assert.equal(out.streak.best, 2, "the streak must be merged, not replaced");
  assert.deepEqual(out.seen.sort(), ["f1", "f2"]);
});

test("resetDocument copes with no remote document yet", () => {
  const local = {seen: ["f1"], quiz: {"Q1": {v: 1, t: 1}}, pyq: {}, notes: {}, streak: sync.emptyStreak()};
  const out = sync.resetDocument(local, {});
  assert.deepEqual(out.quiz, {});
  assert.deepEqual(out.seen, ["f1"]);
});

/* ---------- streak ---------- */
const DAY = {facts: 20, quiz: 5, pyq: 5, notes: 3};

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

test("only DISTINCT records count as notes written", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < 8; i++) s = sync.bumpStreak(s, "note", "d-kangra", "2026-01-05");
  assert.equal(s.n, 0, "editing one record eight times is not three notes");
  assert.equal(s.noted.length, 1);
  for(const id of ["d-shimla", "d-mandi"])
    s = sync.bumpStreak(s, "note", id, "2026-01-05");
  assert.equal(s.n, 1, "notes on three distinct records should qualify");
});

test("the three ring goals are what the rings draw", () => {
  assert.equal(sync.DAY_GOAL.facts, 20, "the outermost ring's goal");
  assert.equal(sync.DAY_GOAL.quiz, 5, "the middle ring's goal");
  assert.equal(sync.DAY_GOAL.notes, 3, "the innermost ring's goal");
});

test("opening a record no longer counts towards a day", () => {
  let s = sync.emptyStreak();
  for(const id of ["a", "b", "c", "d", "e"]) s = sync.bumpStreak(s, "rec", id, "2026-01-05");
  assert.equal(s.n, 0, "reading alone is not revision any more — writing is");
});

/* ---------- the seven-day strip ---------- */

test("shiftDay moves whole days across month and year ends", () => {
  assert.equal(sync.shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(sync.shiftDay("2026-01-01", -1), "2025-12-31");
  assert.equal(sync.shiftDay("2026-01-05", -6), "2025-12-30");
  assert.equal(sync.shiftDay("2026-01-05", 0),  "2026-01-05");
});

test("a finished day is rolled into history when the next one starts", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < 12; i++) s = sync.bumpStreak(s, "facts", null, "2026-01-05");
  assert.equal(s.hist.length, 0, "today is not history yet");
  s = sync.bumpStreak(s, "facts", null, "2026-01-06");
  assert.equal(s.hist.length, 1);
  assert.equal(s.hist[0].d, "2026-01-05");
  assert.equal(s.hist[0].facts, 12, "the day kept its own total");
  assert.equal(s.facts, 1, "the new day started from zero");
});

test("history never grows past the strip it feeds", () => {
  let s = sync.emptyStreak();
  for(let d = 1; d <= 20; d++){
    const day = "2026-01-" + String(d).padStart(2, "0");
    s = sync.bumpStreak(s, "facts", null, day);
  }
  assert.ok(s.hist.length <= sync.HIST_MAX, "kept " + s.hist.length);
  assert.equal(s.hist[s.hist.length - 1].d, "2026-01-19", "the newest past day is kept");
});

test("recentDays returns seven days ending today, oldest first", () => {
  const days = sync.recentDays(sync.emptyStreak(), "2026-01-10");
  assert.equal(days.length, 7);
  assert.equal(days[0].d, "2026-01-04");
  assert.equal(days[6].d, "2026-01-10");
  assert.equal(days[6].today, true);
  assert.equal(days[0].today, false);
});

test("recentDays fills a gap with empty days rather than a short row", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < 20; i++) s = sync.bumpStreak(s, "facts", null, "2026-01-04");
  s = sync.bumpStreak(s, "facts", null, "2026-01-10");
  const days = sync.recentDays(s, "2026-01-10");
  assert.equal(days.length, 7);
  assert.equal(days[0].facts, 20, "the day that was worked is still there");
  assert.equal(days[3].facts, 0, "an untouched day draws as empty, not missing");
});

test("recentDays reads today live, not from history", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < 4; i++) s = sync.bumpStreak(s, "quiz", null, "2026-01-10");
  s = sync.bumpStreak(s, "note", "d-kangra", "2026-01-10");
  const today = sync.recentDays(s, "2026-01-10")[6];
  assert.equal(today.quiz, 4);
  assert.equal(today.notes, 1);
});

test("recentDays shows nothing for today when the stored day is older", () => {
  let s = sync.emptyStreak();
  for(let i = 0; i < 9; i++) s = sync.bumpStreak(s, "facts", null, "2026-01-09");
  const days = sync.recentDays(s, "2026-01-10");
  assert.equal(days[6].facts, 0, "today has not started yet");
  assert.equal(days[5].d, "2026-01-09");
});

test("mergeHist takes the better view of each past day", () => {
  const a = [{d: "2026-01-05", facts: 20, quiz: 1, pyq: 0, notes: 0}];
  const b = [{d: "2026-01-05", facts: 3,  quiz: 5, pyq: 0, notes: 2},
             {d: "2026-01-06", facts: 7,  quiz: 0, pyq: 0, notes: 0}];
  const m = sync.mergeHist(a, b);
  assert.equal(m.length, 2);
  assert.equal(m[0].facts, 20, "the device that saw more facts wins");
  assert.equal(m[0].quiz, 5,   "the device that saw more quiz wins");
  assert.equal(m[0].notes, 2);
  assert.equal(m[1].d, "2026-01-06");
});

test("mergeStreak carries history across devices", () => {
  const a = Object.assign(sync.emptyStreak(), {hist: [{d: "2026-01-05", facts: 20, quiz: 0, pyq: 0, notes: 0}]});
  const b = Object.assign(sync.emptyStreak(), {hist: [{d: "2026-01-06", facts: 0, quiz: 5, pyq: 0, notes: 0}]});
  const m = sync.mergeStreak(a, b);
  assert.equal(m.hist.length, 2);
  assert.deepEqual(m.hist.map(h => h.d), ["2026-01-05", "2026-01-06"]);
});

test("a streak saved before notes were a ring does not misread its old recs", () => {
  const old = {n: 3, best: 4, last: "2026-01-05", grace: 1, day: "2026-01-05",
               facts: 2, quiz: 0, pyq: 0, recs: ["a", "b", "c", "d"]};
  const s = sync.mergeStreak(old, null);
  assert.deepEqual(s.noted, [], "records opened is not notes written");
  assert.equal(s.n, 3, "the run itself still survives");
  assert.deepEqual(s.hist, []);
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
                facts: 20, quiz: 3, pyq: 1, noted: ["d-kangra", "d-shimla"]};

  const withNull = sync.mergeStreak(only, null);
  assert.equal(withNull.n, 2);
  assert.equal(withNull.best, 2);
  assert.equal(withNull.last, "2026-01-05", "a real date must survive merging against nothing");
  assert.equal(withNull.day, "2026-01-05");
  assert.equal(withNull.facts, 20);
  assert.equal(withNull.quiz, 3);
  assert.equal(withNull.pyq, 1);
  assert.deepEqual(withNull.noted, ["d-kangra", "d-shimla"]);

  const nullWith = sync.mergeStreak(null, only);
  assert.equal(nullWith.n, 2);
  assert.equal(nullWith.best, 2);
  assert.equal(nullWith.last, "2026-01-05");
  assert.equal(nullWith.day, "2026-01-05");
  assert.equal(nullWith.facts, 20);
  assert.equal(nullWith.quiz, 3);
  assert.equal(nullWith.pyq, 1);
  assert.deepEqual(nullWith.noted, ["d-kangra", "d-shimla"]);

  assert.equal(sync.mergeStreak(null, null).n, 0);
});

/* Regression test for the bug found in review: daysApart(a, b) returns
   Infinity whenever EITHER date is "" (a fresh emptyStreak's last/day).
   mergeStreak's original "later date wins" ternary read that Infinity as
   "B is later" and picked the EMPTY side, discarding the real side's date
   and, via the day-gated counters, its facts/quiz/pyq/notes too. This is
   not a rare edge case: every existing user's first sync after this
   feature ships merges their real local streak against a remote with no
   "streak" key yet, i.e. exactly emptyStreak(). Check both argument
   orders, since the bug was order-dependent. */
test("mergeStreak preserves a real streak's date and today's counters against a fresh emptyStreak", () => {
  /* grace is deliberately 0 here: a fresh streak carries 1, and the merge
     rule is generous in every field, so the merged result should be 1.
     That is intentional forgiveness, not the bug this test guards. */
  const real = {n: 4, best: 6, last: "2026-01-05", grace: 0, day: "2026-01-05",
                facts: 12, quiz: 3, pyq: 2, noted: ["d-kangra", "d-shimla"]};
  const fresh = sync.emptyStreak();

  for(const [m, where] of [[sync.mergeStreak(real, fresh), "merged first"],
                           [sync.mergeStreak(fresh, real), "merged second"]]){
    assert.equal(m.last, "2026-01-05", "real " + where + " must keep its date");
    assert.equal(m.day, "2026-01-05", where);
    assert.equal(m.facts, 12, where);
    assert.equal(m.quiz, 3, where);
    assert.equal(m.pyq, 2, where);
    assert.deepEqual(m.noted, ["d-kangra", "d-shimla"], where);
    assert.equal(m.n, 4, "the run must survive " + where);
    assert.equal(m.best, 6, "the best must survive " + where);
    assert.equal(m.grace, 1, "the more forgiving grace wins " + where);
  }
});

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
  assert.ok(!Object.prototype.hasOwnProperty.call(
    sync.mergeConf({"__proto__": {v: "got", t: 1}}, {}), "__proto__"));
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

/* ---------- posts ---------- */
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
