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
