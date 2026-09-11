"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");

const {D, MAP} = loadData();

/* Every record id that any `rel` array points at must exist. This is the
   invariant the whole app rests on: a dangling id renders a dead chip. */
function allRecords(){
  const out = [];
  for(const key of ["districts","states","events","battles","people","topics","rivers","features"]){
    for(const r of (D[key] || [])) out.push(r);
  }
  return out;
}

test("record ids are unique", () => {
  const seen = new Set();
  for(const r of allRecords()){
    assert.ok(!seen.has(r.id), "duplicate id: " + r.id);
    seen.add(r.id);
  }
});

test("every rel id resolves to a real record", () => {
  const ids = new Set(allRecords().map(r => r.id));
  for(const r of allRecords()){
    for(const id of (r.rel || [])){
      assert.ok(ids.has(id), r.id + " points at missing record " + id);
    }
  }
});

test("every MAP.places entry has a position and a kind", () => {
  for(const [pid, p] of Object.entries(MAP.places)){
    assert.equal(typeof p.x, "number", pid + " has no x");
    assert.equal(typeof p.y, "number", pid + " has no y");
    assert.ok(p.k, pid + " has no kind");
  }
});
