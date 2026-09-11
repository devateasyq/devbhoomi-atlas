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
    assert.ok(!/^also called white sail$/.test(f.text.toLowerCase()),
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
