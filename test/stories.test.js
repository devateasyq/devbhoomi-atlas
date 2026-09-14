"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");
const stories = require("../app/stories.js");
const sync = require("../app/sync.js");

const {D} = loadData();

/* The same index app.js and tools/build-pages.js build, so the pool the
   strip draws from is exactly what the app can open. */
function buildIdx(D){
  const idx = [];
  [[D.districts,"district"],[D.states,"state"],[D.events,"event"],
   [D.battles,"battle"],[D.people,"person"],[D.topics,"topic"],[D.rivers,"river"]]
    .forEach(([arr,k]) => (arr || []).forEach(r => idx.push({r, kind:k})));
  (D.features || []).forEach(r => idx.push({r, kind:r.k}));
  return idx;
}
const POOL = buildIdx(D);
const IDS = new Set(POOL.map(e => e.r.id));

/* ---------- the day key ---------- */

/* stories.js deliberately does not answer "what day is it" — sync.js
   already does, for the streak, and two answers to that question is one
   too many. The strip composes with it, so that is what is tested. */
test("stories.js does not redefine dayKey", () => {
  assert.equal(stories.dayKey, undefined,
    "a second definition of the calendar day has crept back in");
});

/* ---------- daySeed ---------- */

test("daySeed is deterministic and differs between adjacent days", () => {
  assert.equal(stories.daySeed("2026-09-14"), stories.daySeed("2026-09-14"));
  assert.notEqual(stories.daySeed("2026-09-14"), stories.daySeed("2026-09-15"));
});

test("daySeed spreads a year of dates without collisions", () => {
  const seen = new Set();
  for(let i = 0; i < 365; i++){
    const d = new Date(2026, 0, 1 + i);
    seen.add(stories.daySeed(sync.dayKey(d)));
  }
  assert.equal(seen.size, 365, "a year of dates collided into " + seen.size + " seeds");
});

/* ---------- teaser ---------- */

test("every record in the corpus yields a teaser line", () => {
  const blank = POOL.filter(e => !stories.teaser(e.r)).map(e => e.r.id);
  assert.deepEqual(blank, [], "records with no teaser: " + blank.join(", "));
});

test("no teaser carries markup", () => {
  for(const e of POOL){
    const t = stories.teaser(e.r);
    assert.ok(!/[<>]/.test(t), e.r.id + " teaser carries markup: " + t);
  }
});

test("teasers are clamped and cut on a word boundary", () => {
  for(const e of POOL){
    const t = stories.teaser(e.r);
    assert.ok(t.length <= stories.TEASER_MAX + 1, e.r.id + " teaser is " + t.length + " chars");
    if(t.endsWith("…")) assert.ok(!/\s…$/.test(t), e.r.id + " clamped mid-space: " + t);
  }
});

test("clamp leaves a short string untouched", () => {
  assert.equal(stories.clamp("Kangra Fort", 40), "Kangra Fort");
});

test("clamp does not cut mid-word", () => {
  const out = stories.clamp("Bilaspur was a separate Part-C state", 20);
  assert.ok(out.endsWith("…"), "expected an ellipsis, got " + out);
  assert.ok(!out.includes("sepa…"), "cut mid-word: " + out);
});

/* ---------- pickStories ---------- */

test("the same seed yields the identical five records", () => {
  const a = stories.pickStories(POOL, 12345, 5).map(e => e.r.id);
  const b = stories.pickStories(POOL, 12345, 5).map(e => e.r.id);
  assert.deepEqual(a, b);
});

test("different days yield different records", () => {
  const a = stories.pickStories(POOL, stories.daySeed("2026-09-14"), 5).map(e => e.r.id);
  const b = stories.pickStories(POOL, stories.daySeed("2026-09-15"), 5).map(e => e.r.id);
  assert.notDeepEqual(a, b);
});

test("every pick is a real record the app can open", () => {
  for(let s = 0; s < 50; s++)
    for(const e of stories.pickStories(POOL, s, 5))
      assert.ok(IDS.has(e.r.id), "picked an id outside the index: " + e.r.id);
});

test("the five kinds are distinct, so a day is never five lakes", () => {
  for(let s = 0; s < 200; s++){
    const kinds = stories.pickStories(POOL, s, 5).map(e => e.kind);
    assert.equal(new Set(kinds).size, kinds.length, "repeated kind at seed " + s + ": " + kinds.join(","));
  }
});

test("five are always returned", () => {
  for(let s = 0; s < 50; s++)
    assert.equal(stories.pickStories(POOL, s, 5).length, 5, "short strip at seed " + s);
});

test("a pool smaller than n returns what it has rather than looping", () => {
  const small = POOL.slice(0, 3);
  assert.equal(stories.pickStories(small, 7, 5).length, 3);
});

test("a pool of one kind still fills, rather than returning one card", () => {
  const lakes = POOL.filter(e => e.kind === "lake");
  assert.ok(lakes.length >= 5, "fixture needs five lakes");
  const got = stories.pickStories(lakes, 9, 5);
  assert.equal(got.length, 5);
  assert.equal(new Set(got.map(e => e.r.id)).size, 5, "the same lake twice");
});

test("pickStories does not mutate the pool it is handed", () => {
  const before = POOL.map(e => e.r.id);
  stories.pickStories(POOL, 777, 5);
  assert.deepEqual(POOL.map(e => e.r.id), before);
});

test("the day's five do not depend on the order the pool arrives in", () => {
  const reversed = POOL.slice().reverse();
  const a = stories.pickStories(POOL, 4242, 5).map(e => e.r.id);
  const b = stories.pickStories(reversed, 4242, 5).map(e => e.r.id);
  assert.deepEqual(a, b, "data file order leaked into the selection");
});

/* The campaign shuffle shipped biased once (a34e96c) because a chain-style
   shuffle was used instead of Fisher-Yates. The guard belongs where the
   shuffle is actually meant to be uniform: a single-kind pool, where the
   distinct-kinds rule cannot interfere. */
test("the shuffle is unbiased on a single-kind pool", () => {
  const lakes = POOL.filter(e => e.kind === "lake");
  const count = new Map();
  const RUNS = 4000;
  for(let s = 0; s < RUNS; s++)
    for(const e of stories.pickStories(lakes, s, 5))
      count.set(e.r.id, (count.get(e.r.id) || 0) + 1);
  assert.equal(count.size, lakes.length, "a lake was never picked in " + RUNS + " draws");
  const hits = [...count.values()];
  const mean = hits.reduce((a, b) => a + b, 0) / hits.length;
  assert.ok(Math.min(...hits) > mean * 0.85, "starved: " + Math.min(...hits) + " vs mean " + mean.toFixed(1));
  assert.ok(Math.max(...hits) < mean * 1.15, "favoured: " + Math.max(...hits) + " vs mean " + mean.toFixed(1));
});

/* Over the full pool the distinct-kinds rule deliberately lifts records in
   small kinds — one of twelve districts is likelier than one of sixty-eight
   events, and that is the cost of never showing five lakes. What must still
   hold is that nothing is stranded and nothing dominates. */
test("no record is stranded and none dominates the strip", () => {
  const count = new Map();
  const RUNS = 4000;
  for(let s = 0; s < RUNS; s++)
    for(const e of stories.pickStories(POOL, s, 5))
      count.set(e.r.id, (count.get(e.r.id) || 0) + 1);
  assert.equal(count.size, POOL.length, "some records were never picked in " + RUNS + " days");
  const hits = [...count.values()];
  const mean = hits.reduce((a, b) => a + b, 0) / hits.length;
  assert.ok(Math.min(...hits) > mean * 0.2, "stranded: " + Math.min(...hits) + " vs mean " + mean.toFixed(1));
  assert.ok(Math.max(...hits) < mean * 5, "dominating: " + Math.max(...hits) + " vs mean " + mean.toFixed(1));
});

/* Every kind should surface over a season; a kind that never appears means
   the walk is stopping before it reaches the smaller sets. */
test("every kind reaches the strip within a season", () => {
  const kinds = new Set();
  for(let s = 0; s < 90; s++) stories.pickStories(POOL, s, 5).forEach(e => kinds.add(e.kind));
  assert.equal(kinds.size, new Set(POOL.map(e => e.kind)).size, "missing kinds: " +
    [...new Set(POOL.map(e => e.kind))].filter(k => !kinds.has(k)).join(","));
});

/* ---------- todayStories ---------- */

test("todayStories is the pick for the day key it is given", () => {
  const viaParts = stories.pickStories(POOL, stories.daySeed("2026-09-14"), 5).map(e => e.r.id);
  assert.deepEqual(stories.todayStories(POOL, 5, "2026-09-14").map(e => e.r.id), viaParts);
});

test("todayStories holds steady across a whole local day", () => {
  const seen = new Set();
  for(let h = 0; h < 24; h++)
    seen.add(stories.todayStories(POOL, 5, sync.dayKey(new Date(2026, 8, 14, h, 0, 0)))
      .map(e => e.r.id).join(","));
  assert.equal(seen.size, 1, "the strip changed within one day");
});

test("todayStories turns over at local midnight", () => {
  const a = stories.todayStories(POOL, 5, sync.dayKey(new Date(2026, 8, 14, 23, 59, 0)));
  const b = stories.todayStories(POOL, 5, sync.dayKey(new Date(2026, 8, 15, 0, 1, 0)));
  assert.notEqual(a.map(e => e.r.id).join(","), b.map(e => e.r.id).join(","));
});
