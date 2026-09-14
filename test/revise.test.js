"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");
const revise = require("../app/revise.js");

const {D} = loadData();

/* A quiz row is {q: question text, t: topic record id, a: answer index}.
   Progress is keyed by the question text, as store.get("quiz") holds it. */
const Q = (q, t) => ({q, t, a: 0});
const POOL = [
  Q("q1", "t-gorkha"), Q("q2", "t-gorkha"), Q("q3", "t-gorkha"),
  Q("q4", "t-polity"), Q("q5", "t-polity"),
  Q("q6", "t-economy"),
  Q("q7", "t-physio")
];

test("nothing attempted yields nothing to revise", () => {
  assert.deepEqual(revise.weakTopics(POOL, {}, 4), []);
});

test("a wrong answer counts against its topic", () => {
  assert.deepEqual(revise.weakTopics(POOL, {q1: 0}, 4), [{id: "t-gorkha", misses: 1}]);
});

test("right answers do not count against a topic", () => {
  assert.deepEqual(revise.weakTopics(POOL, {q1: 1, q2: 1}, 4), []);
});

test("unanswered questions do not count", () => {
  assert.deepEqual(revise.weakTopics(POOL, {q1: 0, q4: undefined}, 4),
    [{id: "t-gorkha", misses: 1}]);
});

test("the worst topic comes first", () => {
  const out = revise.weakTopics(POOL, {q1: 0, q2: 0, q4: 0}, 4);
  assert.deepEqual(out, [{id: "t-gorkha", misses: 2}, {id: "t-polity", misses: 1}]);
});

test("the list is capped at n", () => {
  const out = revise.weakTopics(POOL, {q1: 0, q4: 0, q6: 0, q7: 0}, 2);
  assert.equal(out.length, 2);
});

/* A block on the hub that reshuffles its chips between two renders of the
   same data reads as broken. Equal miss counts break by id, not by whatever
   order the quiz file happens to list them in. */
test("topics with equal misses are ordered by id, so the block is stable", () => {
  const out = revise.weakTopics(POOL, {q1: 0, q4: 0, q6: 0, q7: 0}, 9);
  assert.deepEqual(out.map(t => t.id), ["t-economy", "t-gorkha", "t-physio", "t-polity"]);
});

test("the same input always gives the same order", () => {
  const prog = {q1: 0, q4: 0, q6: 0};
  assert.deepEqual(revise.weakTopics(POOL, prog, 9), revise.weakTopics(POOL, prog, 9));
});

test("weakTopics does not mutate the pool or the progress it is handed", () => {
  const prog = {q1: 0, q4: 0};
  const poolBefore = JSON.stringify(POOL), progBefore = JSON.stringify(prog);
  revise.weakTopics(POOL, prog, 4);
  assert.equal(JSON.stringify(POOL), poolBefore);
  assert.equal(JSON.stringify(prog), progBefore);
});

test("a question with no topic is skipped rather than tallied under undefined", () => {
  const out = revise.weakTopics([{q: "x", t: "", a: 0}, Q("q1", "t-gorkha")],
    {x: 0, q1: 0}, 4);
  assert.deepEqual(out, [{id: "t-gorkha", misses: 1}]);
});

test("junk progress from storage does not throw", () => {
  for(const junk of [null, undefined, "nope", 7, []])
    assert.deepEqual(revise.weakTopics(POOL, junk, 4), [], JSON.stringify(junk));
});

test("an empty pool does not throw", () => {
  assert.deepEqual(revise.weakTopics([], {q1: 0}, 4), []);
  assert.deepEqual(revise.weakTopics(null, {q1: 0}, 4), []);
});

/* Against the real bank: every topic a question points at must be a record
   the Overview can actually link to, or the block offers dead chips. */
test("every quiz topic in the real bank is a record the app can open", () => {
  const ids = new Set();
  for(const k of ["districts","states","events","battles","people","topics","rivers","features"])
    for(const r of (D[k] || [])) ids.add(r.id);
  const prog = {};
  D.quiz.forEach(q => { prog[q.q] = 0; });
  const out = revise.weakTopics(D.quiz, prog, 500);
  assert.ok(out.length > 0, "expected the whole bank to tally");
  const dead = out.filter(t => !ids.has(t.id)).map(t => t.id);
  assert.deepEqual(dead, [], "quiz topics with no record: " + dead.join(", "));
});

test("the real bank tallies every wrong answer exactly once", () => {
  const prog = {};
  D.quiz.forEach(q => { prog[q.q] = 0; });
  const total = revise.weakTopics(D.quiz, prog, 500).reduce((a, t) => a + t.misses, 0);
  const distinct = new Set(D.quiz.map(q => q.q)).size;
  assert.equal(total, distinct, total + " tallied against " + distinct + " distinct questions");
});
