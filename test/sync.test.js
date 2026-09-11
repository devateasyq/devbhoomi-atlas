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

/* ---------- streak ---------- */
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
