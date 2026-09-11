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

/* The map is an equirectangular projection fitted over the 123 existing
   markers; residual is 0.068 units on a 1000-unit map, i.e. exact. Any
   new marker must land on the same transform or it will sit in the wrong
   valley. */
const PROJ = {a: 292.5745, b: -22112.4202, c: -344.3249, d: 11450.7708};

test("twelve glaciers are on the map", () => {
  const g = Object.entries(MAP.places).filter(([, p]) => p.k === "glacier");
  assert.equal(g.length, 12);
});

test("every marker's x/y matches the projection of its lat/lng", () => {
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.lat == null) continue;
    const x = PROJ.a * p.lng + PROJ.b;
    const y = PROJ.c * p.lat + PROJ.d;
    assert.ok(Math.abs(x - p.x) < 0.5, pid + " x is off by " + (x - p.x).toFixed(2));
    assert.ok(Math.abs(y - p.y) < 0.5, pid + " y is off by " + (y - p.y).toFixed(2));
  }
});

test("glacier markers sit inside the map viewbox", () => {
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k !== "glacier") continue;
    assert.ok(p.x > 0 && p.x < MAP.w, pid + " x outside viewbox");
    assert.ok(p.y > 0 && p.y < MAP.h, pid + " y outside viewbox");
  }
});
