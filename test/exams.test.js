"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {EXAMS} = require("../data/exams.js");
const {loadData} = require("./load");
const {D} = loadData();

const VIEWS = ["home","map","timeline","battles","topics","people",
               "trends","compare","rounds","revise"];

test("every exam is fully described", () => {
  assert.ok(EXAMS.rows.length >= 9, "got " + EXAMS.rows.length);
  for(const e of EXAMS.rows){
    for(const k of ["id","name","body","bodyUrl","level","what"])
      assert.ok(e[k] && String(e[k]).trim(), e.id + " is missing " + k);
    assert.ok(/^https:\/\//.test(e.bodyUrl), e.id + ": " + e.bodyUrl);
    assert.ok(e.what.length > 25, e.id + "'s description says nothing useful");
  }
});

test("exam ids are unique", () => {
  const ids = EXAMS.rows.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

/* The honesty rule, as a test. An exam may not claim papers this repo
   does not contain. */
test("no exam claims past papers it does not have", () => {
  const held = D.pyq.length;
  for(const e of EXAMS.rows){
    assert.equal(typeof e.papers.n, "number", e.id);
    if(e.id === "hpas") assert.equal(e.papers.n, held, "HPAS should claim exactly what is in data/pyq.js");
    else assert.equal(e.papers.n, 0, e.id + " claims papers this repo does not hold");
  }
});

test("every exam says what it covers, using real views", () => {
  for(const e of EXAMS.rows){
    assert.ok(Array.isArray(e.covers) && e.covers.length, e.id + " covers nothing");
    for(const v of e.covers)
      assert.ok(VIEWS.includes(v), e.id + " points at a view that does not exist: " + v);
  }
});

/* HPSSC Hamirpur was dissolved in February 2023 and replaced by HPRCA.
   Naming it as a current authority would be wrong on the one page aimed
   at its candidates. */
test("no dissolved recruitment body is named as current", () => {
  const blob = JSON.stringify(EXAMS);
  for(const dead of ["HPSSC", "HPSSSB"])
    assert.ok(!blob.includes(dead), "the registry still names " + dead);
});

test("the registry records when it was last checked", () => {
  assert.match(EXAMS.updated, /^\d{4}-\d{2}$/, EXAMS.updated);
});
