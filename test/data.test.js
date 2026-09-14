"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");
const kit = require("../app/mapkit.js");

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

/* viewMap() does LAYER_BY_KIND[p.k].c unguarded — a marker kind added to
   data/geo.js without a matching LAYERS row in app/mapkit.js would throw
   there and blank the whole map view. Catch that in Node before it ever
   reaches a browser. */
test("every marker kind on the map has a LAYERS entry", () => {
  const kinds = new Set(Object.values(MAP.places).map(p => p.k));
  for(const k of kinds){
    assert.ok(kit.LAYER_BY_KIND[k], "MAP.places has kind " + k + " with no matching LAYERS entry in app/mapkit.js");
  }
});

/* The Campaign band pass grades a placement against era date ranges. The
   display `span` strings are not one parseable format ("c. 40,000 BCE – 1000
   BCE", "1948 – present"), so the numeric range is authored alongside them. */
test("every era carries a numeric span that brackets its display span", () => {
  for(const e of D.eras){
    assert.equal(typeof e.y0, "number", e.id + " has no numeric y0");
    assert.equal(typeof e.y1, "number", e.id + " has no numeric y1");
    assert.ok(e.y1 > e.y0, e.id + " has an inverted span: " + e.y0 + "–" + e.y1);
  }
});

test("every battle points at an existing era and falls inside some era's numeric span", () => {
  const spans = Object.fromEntries(D.eras.map(e => [e.id, e]));
  for(const b of D.battles){
    const own = spans[b.era];
    assert.ok(own, b.id + " points at missing era " + b.era);
    const inSome = D.eras.some(e => b.y >= e.y0 && b.y <= e.y1);
    assert.ok(inSome, b.id + " (y=" + b.y + ") falls in no era span at all");
  }
});

/* `winner` is prose ("Gorkhas (tactically)", "The state, momentarily") and
   `outcome` reads from the hill states' point of view, not as a side index —
   Bhangani is outcome:"loss" while sides[0] won it. winSide is the only
   machine-readable answer to "which of these two won?". */
test("every battle names which of its two sides won", () => {
  for(const b of D.battles){
    assert.ok(b.winSide === 0 || b.winSide === 1,
      b.id + " has winSide " + JSON.stringify(b.winSide) + ", expected 0 or 1");
    assert.equal(b.sides.length, 2, b.id + " does not have exactly two sides");
  }
});

/* Guards the shuffle requirement: twelve of sixteen are side 0 (only
   b-jaithak, b-shahpur, b-dhami and b-kalanga are side 1), so a reader
   who always taps the left-hand option would score 12/16 on an unshuffled
   winner pass. This test documents the imbalance so the UI cannot forget it. */
test("winSide is lopsided enough that the winner pass must shuffle", () => {
  const zero = D.battles.filter(b => b.winSide === 0).length;
  assert.ok(zero > D.battles.length / 2,
    "expected a side-0 majority (the reason the pass shuffles), got " + zero);
});

/* The two tests above only prove winSide is 0-or-1 and that the split isn't
   dead even — neither would notice a single record's winSide flipping to
   the wrong side (12-vs-4 has far too much slack for that). For all but two
   battles, `winner` shares distinctive vocabulary with the *winning* side's
   name and none with the losing side's, so a flipped winSide breaks one or
   both halves of that relationship. This derives the check from the prose
   itself instead of just re-asserting the stored value. */
const WINVOCAB_STOPWORDS = new Set([
  "the", "of", "and", "a", "an", "in", "under", "to", "for", "at", "on", "by", "with", "its", "their"
]);

function winVocabTokens(str){
  return new Set(
    str.toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean)
      .map(w => w.replace(/s$/, ""))
      .filter(Boolean)
      .filter(w => !WINVOCAB_STOPWORDS.has(w))
  );
}

function sharesWinVocab(a, b){
  const tb = winVocabTokens(b);
  for(const w of winVocabTokens(a)) if(tb.has(w)) return true;
  return false;
}

/* These two winners name an abstraction ("The state, momentarily", "The
   people's movement") rather than either named party in `sides`, so they
   share no vocabulary with either side and the token test below cannot
   check them. Named explicitly (rather than caught by a generic "no
   vocabulary at all" branch) so a future rewording of some other winner
   into abstract prose fails the assertion right below instead of silently
   joining this exemption. */
const WINNER_IS_PROSE_ABSTRACTION = new Set(["b-dhami", "b-suket1948"]);

test("the prose-only-winner exception list is exactly these two battles", () => {
  const noVocabAtAll = D.battles
    .filter(b => !sharesWinVocab(b.winner, b.sides[0]) && !sharesWinVocab(b.winner, b.sides[1]))
    .map(b => b.id)
    .sort();
  assert.deepStrictEqual(noVocabAtAll, [...WINNER_IS_PROSE_ABSTRACTION].sort(),
    "the set of battles whose winner shares no vocabulary with either side has changed");
});

test("winner's vocabulary matches the winning side and not the losing side", () => {
  for(const b of D.battles){
    if(WINNER_IS_PROSE_ABSTRACTION.has(b.id)) continue;
    const winningSide = b.sides[b.winSide];
    const losingSide = b.sides[1 - b.winSide];
    assert.ok(sharesWinVocab(b.winner, winningSide),
      b.id + ": winner " + JSON.stringify(b.winner) + " shares no vocabulary with winning side " + JSON.stringify(winningSide));
    assert.ok(!sharesWinVocab(b.winner, losingSide),
      b.id + ": winner " + JSON.stringify(b.winner) + " shares vocabulary with losing side " + JSON.stringify(losingSide));
  }
});
