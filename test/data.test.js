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

const PREFIX = {peak:"pk-", pass:"ps-", lake:"lk-", glacier:"gl-"};

test("every feature has the required fields", () => {
  for(const f of (D.features || [])){
    assert.ok(f.id && f.k && f.pid && f.name, "incomplete feature: " + JSON.stringify(f.id));
    assert.ok(PREFIX[f.k], f.id + " has unknown kind " + f.k);
    assert.ok(f.id.startsWith(PREFIX[f.k]), f.id + " should start with " + PREFIX[f.k]);
    assert.ok(Array.isArray(f.blocks) && f.blocks.length, f.id + " has no blocks");
    assert.ok(Array.isArray(f.rel) && f.rel.length, f.id + " has no rel");
  }
});

test("every feature pid resolves to a real map marker of the same kind", () => {
  for(const f of (D.features || [])){
    const p = MAP.places[f.pid];
    assert.ok(p, f.id + " points at missing place " + f.pid);
    assert.equal(p.k, f.k, f.id + " kind " + f.k + " but marker is " + p.k);
  }
});

test("no two features share a pid", () => {
  const seen = new Map();
  for(const f of (D.features || [])){
    assert.ok(!seen.has(f.pid), f.pid + " claimed by both " + seen.get(f.pid) + " and " + f.id);
    seen.set(f.pid, f.id);
  }
});

test("every feature carries an exam hook", () => {
  for(const f of (D.features || [])){
    const hook = f.blocks.some(b => b[0] === "note" && /exam hook/i.test(b[1]));
    assert.ok(hook, f.id + " has no exam-hook note");
  }
});

test("all 18 passes are recorded", () => {
  const passes = (D.features || []).filter(f => f.k === "pass");
  assert.equal(passes.length, 18);
});

test("every pass marker on the map has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "pass").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "pass") assert.ok(have.has(pid), "pass marker " + pid + " has no record");
  }
});

test("all 12 peaks are recorded, with heights", () => {
  const peaks = (D.features || []).filter(f => f.k === "peak");
  assert.equal(peaks.length, 12);
  for(const p of peaks) assert.match(p.alt, /\d[\d,]*\s*m/, p.id + " has no height");
});

test("every peak marker on the map has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "peak").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "peak") assert.ok(have.has(pid), "peak marker " + pid + " has no record");
  }
});

test("Reo Purgyil is recorded as the highest point in the state", () => {
  const r = (D.features || []).find(f => f.id === "pk-reopurgyil");
  assert.ok(r, "pk-reopurgyil missing");
  assert.match(JSON.stringify(r), /highest/i);
});

test("all 20 lakes are recorded and typed", () => {
  const lakes = (D.features || []).filter(f => f.k === "lake");
  assert.equal(lakes.length, 20);
  for(const l of lakes){
    assert.match(l.type, /^(Natural|Reservoir)$/, l.id + " has bad type: " + l.type);
  }
});

test("every lake marker on the map has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "lake").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "lake") assert.ok(have.has(pid), "lake marker " + pid + " has no record");
  }
});

test("exactly three lakes are Ramsar sites, with the right years", () => {
  const r = (D.features || []).filter(f => f.k === "lake" && f.ramsar);
  assert.equal(r.length, 3, "HP has exactly three Ramsar sites");
  const byId = Object.fromEntries(r.map(f => [f.id, String(f.ramsar)]));
  assert.match(byId["lk-pong"] || "", /2002/);
  assert.match(byId["lk-renuka"] || "", /2005/);
  assert.match(byId["lk-chandratal"] || "", /2005/);
});

test("all 12 glaciers are recorded and say what they feed", () => {
  const gl = (D.features || []).filter(f => f.k === "glacier");
  assert.equal(gl.length, 12);
  for(const g of gl){
    assert.ok(g.feeds, g.id + " does not say which river it feeds");
    assert.ok(g.valley, g.id + " does not name its valley");
  }
});

test("every glacier marker has a record", () => {
  const have = new Set((D.features || []).filter(f => f.k === "glacier").map(f => f.pid));
  for(const [pid, p] of Object.entries(MAP.places)){
    if(p.k === "glacier") assert.ok(have.has(pid), "glacier marker " + pid + " has no record");
  }
});

test("Bara Shigri is recorded as the largest glacier in the state", () => {
  const g = (D.features || []).find(f => f.id === "gl-barashigri");
  assert.ok(g, "gl-barashigri missing");
  assert.match(JSON.stringify(g), /largest/i);
});

/* An "unknown" field must be omitted entirely, never set to a sentinel
   like an em-dash. factsList() and buildCards() already skip a missing
   field correctly; a placeholder string leaks through as a fact row
   reading "Field: —" or a card whose answer is the placeholder itself. */
test("no field is a bare placeholder instead of being omitted", () => {
  const PLACEHOLDER = /^[\s\-‐‑‒–—―.,;:_]*$|^(n\/a|na|none|unknown)$/i;
  const offenders = [];
  for(const [key, list] of [["features", D.features], ["rivers", D.rivers]]){
    for(const r of (list || [])){
      for(const [field, value] of Object.entries(r)){
        if(typeof value !== "string") continue;
        if(value.trim().length && PLACEHOLDER.test(value.trim())){
          offenders.push(key + " " + r.id + "." + field + " = " + JSON.stringify(value));
        }
      }
    }
  }
  assert.deepStrictEqual(offenders, [], "bare placeholder fields (should be omitted): " + offenders.join(", "));
});
