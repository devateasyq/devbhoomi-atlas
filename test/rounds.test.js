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

test("orderFacts returns every fact exactly once", () => {
  const out = rounds.orderFacts(FACTS, []);
  assert.equal(out.length, FACTS.length);
  assert.equal(new Set(out.map(f => f.id)).size, FACTS.length);
});

test("no seen fact comes before an unseen one", () => {
  const seen = FACTS.slice(0, 40).map(f => f.id);
  const out = rounds.orderFacts(FACTS, seen);
  const seenSet = new Set(seen);
  let hitSeen = false;
  for(const f of out){
    if(seenSet.has(f.id)) hitSeen = true;
    else assert.ok(!hitSeen, "unseen fact " + f.id + " came after a seen one");
  }
});

test("seen facts come back oldest-seen first, so a full cycle spaces repetition", () => {
  const seen = FACTS.slice(0, 5).map(f => f.id);          // index 0 seen longest ago
  const out = rounds.orderFacts(FACTS, seen).filter(f => seen.includes(f.id));
  assert.deepEqual(out.map(f => f.id), seen);
});

test("orderFacts never mutates the seen array it is given", () => {
  const seen = FACTS.slice(0, 3).map(f => f.id);
  const copy = seen.slice();
  rounds.orderFacts(FACTS, seen);
  assert.deepEqual(seen, copy);
});

test("orderFacts copes with a seen id that no longer exists", () => {
  /* exam hooks get edited, which shifts atom indices and orphans an id */
  const out = rounds.orderFacts(FACTS, ["ps-shipkila#99", "no-such-record#0"]);
  assert.equal(out.length, FACTS.length);
});

test("orderFacts shuffles rather than returning source order", () => {
  /* 265 facts: identical order twice running is effectively impossible
     unless nothing is shuffling at all */
  const a = rounds.orderFacts(FACTS, []).map(f => f.id).join();
  const b = rounds.orderFacts(FACTS, []).map(f => f.id).join();
  assert.notEqual(a, b);
});

/* ---------- the art behind each card ---------- */
const {MAP} = loadData();
const BY_ID = new Map();
for(const k of ["districts","states","events","battles","people","topics","rivers","features"]){
  for(const r of (D[k] || [])) BY_ID.set(r.id, r);
}

test("districts resolve to their own outline", () => {
  const f = FACTS.find(x => x.kind === "district");
  const g = rounds.factGeom(BY_ID.get(f.srcId), f.kind, MAP);
  assert.equal(g && g.shape, "area", "no area for " + f.srcId);
  assert.ok(g.d.length > 50, "district path looks truncated");
});

test("rivers resolve to their own course", () => {
  const f = FACTS.find(x => x.kind === "river" && MAP.rivers[x.srcId]);
  const g = rounds.factGeom(BY_ID.get(f.srcId), f.kind, MAP);
  assert.equal(g && g.shape, "line", "no line for " + f.srcId);
});

test("map features resolve to a point inside the map", () => {
  for(const kind of ["peak","pass","lake","glacier"]){
    const f = FACTS.find(x => x.kind === kind);
    const g = rounds.factGeom(BY_ID.get(f.srcId), f.kind, MAP);
    assert.equal(g && g.shape, "point", "no point for " + f.srcId);
    assert.ok(g.x > 0 && g.x < MAP.w && g.y > 0 && g.y < MAP.h,
      f.srcId + " point falls outside the map");
  }
});

test("factGeom returns null rather than throwing for a record with no geometry", () => {
  assert.equal(rounds.factGeom({id:"nope"}, "topic", MAP), null);
  assert.equal(rounds.factGeom(null, "topic", MAP), null);
  assert.equal(rounds.factGeom({id:"x"}, "topic", null), null);
});

test("most facts can be placed on the map", () => {
  let placed = 0;
  for(const f of FACTS) if(rounds.factGeom(BY_ID.get(f.srcId), f.kind, MAP)) placed++;
  const pct = Math.round(placed / FACTS.length * 100);
  assert.ok(pct >= 60, "only " + pct + "% of facts could be placed on the map");
});
