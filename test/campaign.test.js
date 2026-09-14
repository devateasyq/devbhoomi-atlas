"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");
const c = require("../app/campaign.js");

const {D, MAP} = loadData();
const CHIPS = c.buildChips(D);
const chip = id => CHIPS.find(x => x.id === id);

test("one chip per battle, in chronological order", () => {
  assert.equal(CHIPS.length, D.battles.length);
  for(let i = 1; i < CHIPS.length; i++){
    assert.ok(CHIPS[i].y >= CHIPS[i-1].y,
      CHIPS[i].id + " (y=" + CHIPS[i].y + ") sorts before " + CHIPS[i-1].id);
  }
});

test("every chip carries what the four passes need", () => {
  for(const ch of CHIPS){
    assert.ok(ch.name && ch.name.trim(), ch.id + " has no name");
    assert.ok(ch.place, ch.id + " has no place");
    assert.equal(ch.sides.length, 2, ch.id + " has not got two sides");
    assert.ok(ch.winSide === 0 || ch.winSide === 1, ch.id + " has no winSide");
  }
});

/* The union rule. e6 (1752-1846) and e7 (1790-1816) overlap, so a reader who
   puts the 1806 and 1809 battles in the other band is not wrong in any way
   they could have known. */
test("overlapping era spans both grade as correct", () => {
  for(const id of ["b-mahalmorian", "b-kangra1809"]){
    const bands = c.acceptedBands(D, chip(id));
    assert.ok(bands.includes("e6"), id + " should accept e6, got " + bands.join(","));
    assert.ok(bands.includes("e7"), id + " should accept e7, got " + bands.join(","));
  }
});

/* The Second Anglo-Sikh War is authored e6 but dated 1849, which falls
   OUTSIDE e6's own 1752-1846 span. The authored era must still be accepted,
   which is why the rule is a union and not a span lookup. */
test("the authored era is accepted even when the year falls outside its span", () => {
  const bands = c.acceptedBands(D, chip("b-anglosikh2"));
  assert.ok(bands.includes("e6"), "authored era e6 must be accepted, got " + bands.join(","));
  assert.ok(bands.includes("e9"), "1849 falls in e9, which must also be accepted");
});

/* The Suket Satyagraha is y=1948.1 — past the end of its own authored e9
   (1848-1948) and inside e10. Both must pass. */
test("a boundary year accepts both its authored era and the next", () => {
  const bands = c.acceptedBands(D, chip("b-suket1948"));
  assert.ok(bands.includes("e9"), "authored e9 must be accepted");
  assert.ok(bands.includes("e10"), "1948.1 falls in e10, which must be accepted");
});

test("an unrelated band is graded wrong", () => {
  assert.equal(c.gradeBand(D, chip("b-bhangani"), "e5"), true);
  assert.equal(c.gradeBand(D, chip("b-bhangani"), "e1"), false);
  assert.equal(c.gradeBand(D, chip("b-bhangani"), "e10"), false);
});

test("every chip has at least one accepted band", () => {
  for(const ch of CHIPS){
    assert.ok(c.acceptedBands(D, ch).length > 0, ch.id + " can never be placed correctly");
  }
});

test("accepted bands are in chronological order", () => {
  const bands = c.acceptedBands(D, chip("b-suket1948"));
  assert.deepEqual(bands, ["e9", "e10"],
    "b-suket1948 should return [e9, e10] in chronological order, got [" + bands.join(",") + "]");
});

test("unknown era ids are placed last after known eras", () => {
  const unknownChip = {id: "x", era: "eZZ", y: 1806};
  const bands = c.acceptedBands(D, unknownChip);
  assert.ok(bands.includes("eZZ"), "unknown era eZZ must be included");
  assert.equal(bands[bands.length - 1], "eZZ", "unknown era eZZ must be last");
  const realEraIndex = bands.indexOf("e7");
  assert.ok(realEraIndex >= 0, "e7 should be included (1806 falls in e7 span)");
  assert.ok(realEraIndex < bands.length - 1, "real era e7 should come before unknown era eZZ");
});

test("canonical order within a band is by year", () => {
  /* e7 is the band that matters: it holds the Gorkha war sequence, where
     the fractional y keys are the only thing separating Kalanga (1814.8)
     from Jaithak (1814.9) from Malaun (1815.4). */
  assert.deepEqual(c.canonicalOrder(D, "e7"),
    ["b-mahalmorian", "b-kalanga", "b-jaithak", "b-malaun", "b-segauli"]);
  assert.deepEqual(c.canonicalOrder(D, "e5"),
    ["b-kangra1620", "b-bhangani", "b-nadaun"]);
  assert.deepEqual(c.canonicalOrder(D, "e9"),
    ["b-shahpur", "b-dhami", "b-suket1948"]);
});

test("empty bands order to nothing", () => {
  assert.deepEqual(c.canonicalOrder(D, "e1"), []);
  assert.deepEqual(c.canonicalOrder(D, "e10"), []);
});

test("on the full board, no band holds a single chip, so no slot is a free mark", () => {
  for(const e of D.eras){
    const n = c.canonicalOrder(D, e.id).length;
    assert.ok(n !== 1, e.id + " holds exactly one chip — its year slot is unearnable");
  }
});

test("year grading checks the chip against its slot", () => {
  assert.equal(c.gradeYear(D, "e7", 0, "b-mahalmorian", null), true);
  assert.equal(c.gradeYear(D, "e7", 1, "b-kalanga", null), true);
  assert.equal(c.gradeYear(D, "e7", 1, "b-jaithak", null), false);
  assert.equal(c.gradeYear(D, "e7", 9, "b-segauli", null), false);
});

test("gradeYear throws when the pool argument is omitted entirely", () => {
  assert.throws(() => c.gradeYear(D, "e7", 0, "b-mahalmorian"),
    /pass the run's pool, or null/);
});

test("place grading is exact", () => {
  assert.equal(c.gradePlace(chip("b-mahalmorian"), "mahalmorian"), true);
  assert.equal(c.gradePlace(chip("b-mahalmorian"), "kangrafort"), false);
});

test("six battles share kangrafort and all grade correct there", () => {
  const atFort = CHIPS.filter(ch => ch.place === "kangrafort");
  assert.equal(atFort.length, 6);
  for(const ch of atFort) assert.equal(c.gradePlace(ch, "kangrafort"), true);
});

test("winner grading is by side index, not by prose", () => {
  /* Bhangani is the trap: outcome:"loss" but sides[0] won it. */
  assert.equal(c.gradeWinner(chip("b-bhangani"), 0), true);
  assert.equal(c.gradeWinner(chip("b-bhangani"), 1), false);
  /* Jaithak is the other direction: sides[1] won. */
  assert.equal(c.gradeWinner(chip("b-jaithak"), 1), true);
  assert.equal(c.gradeWinner(chip("b-jaithak"), 0), false);
});

test("side display order is a stable shuffle, and does shuffle", () => {
  const a = c.sideOrder("b-bhangani", 7);
  assert.deepEqual(c.sideOrder("b-bhangani", 7), a, "must be stable for one salt");
  for(const ch of CHIPS){
    const o = c.sideOrder(ch.id, 3);
    assert.equal(o.length, 2);
    assert.ok(o.includes(0) && o.includes(1), ch.id + " lost a side: " + o.join(","));
  }
  /* Across the sixteen chips at some salt, the winner must not sit on the
     same side every time, or always-tap-left beats the pass. */
  const salts = [0, 1, 2, 3, 4];
  const anyMixed = salts.some(s => {
    const left = CHIPS.map(ch => c.sideOrder(ch.id, s)[0] === ch.winSide);
    return left.some(Boolean) && left.some(v => !v);
  });
  assert.ok(anyMixed, "the shuffle never mixes which side holds the winner");
});

/* A parity-only hash (odd multiplier, lowest bit read out) collapses to just
   two complementary arrangements no matter how many salts you try, because
   multiplying by an odd number preserves parity: h&1 only ever tracks
   (parity of salt) XOR (parity of the chip id's char codes). A real shuffle
   must produce many distinct board arrangements across salts. */
test("arrangements are diverse across salts, not just two complementary boards", () => {
  const arrangements = new Set();
  for(let s = 0; s < 40; s++){
    arrangements.add(CHIPS.map(ch => c.sideOrder(ch.id, s)[0]).join(""));
  }
  assert.ok(arrangements.size > 8,
    "expected more than 8 distinct arrangements across salts 0..39, got " + arrangements.size);
});

/* Regression guard: two specific different salts must not produce the exact
   same arrangement for every chip. This is the shape of assertion a
   parity-only hash (h&1) would fail, since it only has two possible outputs
   and salt 0 vs salt 1 flip parity — but salt 0 vs salt 2 do not, which is
   exactly the case that must still differ under a proper mix. */
test("different salts produce a different arrangement for at least one chip", () => {
  const arrangementAt = s => CHIPS.map(ch => c.sideOrder(ch.id, s)[0]);
  const s0 = arrangementAt(0);
  const s2 = arrangementAt(2);
  assert.ok(s0.some((v, i) => v !== s2[i]),
    "salt 0 and salt 2 produced identical arrangements — hash is not mixing salt properly");
});

test("every battle has all four chain paragraphs with text", () => {
  for(const ch of CHIPS){
    const parts = c.chainParts(D, ch.id);
    assert.equal(parts.length, 4, ch.id + " has " + parts.length + " chain parts");
    assert.deepEqual(parts.map(p => p.key), ["cause", "course", "result", "sig"]);
    for(const p of parts){
      assert.ok(p.text && p.text.trim().length > 20,
        ch.id + " chain part " + p.key + " is empty or too short");
      assert.ok(p.label && p.label.trim(), ch.id + " chain part " + p.key + " has no label");
    }
  }
});

test("the shuffle keeps all four parts and never hands back the answer", () => {
  for(const ch of CHIPS){
    for(const salt of [0, 1, 2, 3]){
      const keys = c.shuffleChain(D, ch.id, salt).map(p => p.key);
      assert.equal(keys.length, 4, ch.id + " lost a part at salt " + salt);
      assert.deepEqual(keys.slice().sort(), ["cause", "course", "result", "sig"],
        ch.id + " duplicated or dropped a part at salt " + salt);
      assert.notDeepEqual(keys, c.CHAIN_KEYS,
        ch.id + " was served already-solved at salt " + salt);
    }
  }
});

test("the shuffle is stable for one salt", () => {
  const a = c.shuffleChain(D, "b-nadaun", 5).map(p => p.key);
  const b = c.shuffleChain(D, "b-nadaun", 5).map(p => p.key);
  assert.deepEqual(a, b);
});

/* The old rotate-and-swap scheme could only ever produce 6 of the 24
   permutations, and structurally could NEVER place `cause` first or `sig`
   last — a shortcut that hands the player half the "find the cause and put
   it first" task for free. A fair shuffle must let every key land in every
   slot a meaningful fraction of the time. */
test("every chain key can land in every slot at a fair rate", () => {
  const counts = [0, 1, 2, 3].map(() => ({cause: 0, course: 0, result: 0, sig: 0}));
  let total = 0;
  for(const ch of CHIPS){
    for(let s = 0; s < 500; s++){
      const keys = c.shuffleChain(D, ch.id, s).map(p => p.key);
      for(let slot = 0; slot < 4; slot++) counts[slot][keys[slot]]++;
      total++;
    }
  }
  const report = counts.map((row, slot) =>
    "slot" + slot + " | " + c.CHAIN_KEYS.map(k =>
      k + ":" + (100 * row[k] / total).toFixed(1) + "%").join("  ")).join("\n");
  for(let slot = 0; slot < 4; slot++){
    for(const k of c.CHAIN_KEYS){
      const pct = counts[slot][k] / total;
      assert.ok(pct >= 0.10,
        k + " lands in slot" + slot + " only " + (100 * pct).toFixed(1) +
        "% of the time (need >=10%)\n" + report);
    }
  }
});

/* A parity/low-diversity scheme can only ever emit a handful of distinct
   orderings across many salts. A real shuffle should range far more widely. */
test("shuffleChain produces many distinct orderings across salts", () => {
  const orderings = new Set();
  for(let s = 0; s < 500; s++){
    orderings.add(c.shuffleChain(D, "b-nadaun", s).map(p => p.key).join(","));
  }
  assert.ok(orderings.size >= 15,
    "expected at least 15 distinct orderings for b-nadaun across salts 0..499, got " +
    orderings.size);
});

test("gradeChainStep accepts only the right key at each slot", () => {
  assert.equal(c.gradeChainStep(0, "cause"), true);
  assert.equal(c.gradeChainStep(1, "course"), true);
  assert.equal(c.gradeChainStep(2, "result"), true);
  assert.equal(c.gradeChainStep(3, "sig"), true);
});

test("gradeChainStep rejects a wrong key for the slot", () => {
  assert.equal(c.gradeChainStep(0, "sig"), false);
  assert.equal(c.gradeChainStep(1, "cause"), false);
});

test("gradeChainStep is false, not throwing, for an out-of-range index", () => {
  assert.equal(c.gradeChainStep(4, "cause"), false);
  assert.equal(c.gradeChainStep(-1, "sig"), false);
});

test("a new run pools every chip and starts on the band pass", () => {
  const run = c.newRun(D, {});
  assert.equal(run.pool.length, D.battles.length);
  assert.equal(run.pass, "band");
  assert.equal(run.v, 1);
  assert.deepEqual(run.pool.slice().sort(), CHIPS.map(ch => ch.id).sort());
});

test("the pool seeds most-missed first", () => {
  const run = c.newRun(D, {misses: {"b-segauli": 5, "b-dhami": 2}});
  assert.equal(run.pool[0], "b-segauli");
  assert.equal(run.pool[1], "b-dhami");
  assert.equal(run.pool.length, D.battles.length, "seeding must not drop chips");
});

test("the weak set keeps only previously missed chips", () => {
  const run = c.newRun(D, {weak: true, misses: {"b-segauli": 5, "b-dhami": 2}});
  assert.deepEqual(run.pool, ["b-segauli", "b-dhami"]);
});

test("a weak set with nothing missed falls back to the full board", () => {
  const run = c.newRun(D, {weak: true, misses: {}});
  assert.equal(run.pool.length, D.battles.length);
});

test("a first-try correct answer earns its mark", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-bhangani", "band", true);
  assert.equal(c.scoreRun(run).score, 1);
});

test("a mark is lost after a wrong attempt but the pass still completes", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-bhangani", "band", false);
  assert.equal(c.scoreRun(run).score, 0, "a wrong attempt must not earn");
  c.recordAttempt(run, "b-bhangani", "band", true);
  assert.equal(c.scoreRun(run).score, 0, "the mark stays lost");
  assert.equal(run.done["b-bhangani"].band, true, "but the pass is done");
});

test("a completed pass ignores further attempts", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-bhangani", "band", true);
  c.recordAttempt(run, "b-bhangani", "band", false);
  assert.equal(c.scoreRun(run).score, 1, "a done pass cannot be un-earned");
});

test("max score is five marks per chip in the pool", () => {
  assert.equal(c.scoreRun(c.newRun(D, {})).max, D.battles.length * 5);
  const weak = c.newRun(D, {weak: true, misses: {"b-segauli": 1}});
  assert.equal(c.scoreRun(weak).max, 5);
});

test("a perfect run scores full marks and reports complete", () => {
  const run = c.newRun(D, {});
  assert.equal(c.isRunComplete(run), false);
  for(const id of run.pool) for(const p of c.PASSES) c.recordAttempt(run, id, p, true);
  const s = c.scoreRun(run);
  assert.equal(s.score, s.max);
  assert.equal(c.isRunComplete(run), true);
});

test("misses are reported for merging into the stored counts", () => {
  const run = c.newRun(D, {});
  c.recordAttempt(run, "b-segauli", "year", false);
  c.recordAttempt(run, "b-segauli", "year", true);
  c.recordAttempt(run, "b-segauli", "place", false);
  c.recordAttempt(run, "b-bhangani", "band", true);
  assert.deepEqual(c.runMisses(run), {"b-segauli": 2});
});

/* ------------------------------------------------------------------
   Regression: weak-set pass 2 must not deadlock.

   viewCampaignYear() shows canonicalOrder(D, era) NARROWED to run.pool,
   but the [data-cgyear] click handler used to grade against the
   UNFILTERED canonicalOrder. When the pool skips battles that are
   non-contiguous in the full chronology, slot N of the displayed list
   is not slot N of the graded list and a correct tap is rejected
   forever. This simulates the view + click handler end to end, the
   way a real weak-set run plays out, and must complete every era.
   ------------------------------------------------------------------ */
function simulateYearPass(D, run, era){
  /* Mirrors viewCampaignYear's slot list: full chronological order,
     narrowed to what's actually in this run's pool. */
  const order = c.canonicalOrder(D, era).filter(id => run.pool.indexOf(id) >= 0);
  const placed = [];
  for(let slot = 0; slot < order.length; slot++){
    const leftover = order.filter(id => placed.indexOf(id) < 0);
    /* Mirrors the [data-cgyear] click handler: grade every available chip
       against this slot index. Exactly one must be accepted, or the pass
       either deadlocks (zero accepted) or is ambiguous (more than one). */
    const accepted = leftover.filter(id => c.gradeYear(D, era, slot, id, run.pool));
    assert.equal(accepted.length, 1,
      era + " slot " + slot + ": expected exactly one accepted chip among [" +
      leftover.join(",") + "], got " + accepted.length + " (" + accepted.join(",") + ")");
    placed.push(accepted[0]);
  }
  return placed;
}

test("weak-set pass 2 completes e7 even though the pool skips non-contiguous battles", () => {
  /* e7 full order: [b-mahalmorian, b-kalanga, b-jaithak, b-malaun, b-segauli].
     A weak pool of just the last two is non-contiguous in that order. */
  const run = c.newRun(D, {weak: true, misses: {"b-malaun": 1, "b-segauli": 1}});
  assert.deepEqual(run.pool.slice().sort(), ["b-malaun", "b-segauli"].sort());
  const placed = simulateYearPass(D, run, "e7");
  assert.deepEqual(placed, ["b-malaun", "b-segauli"], "e7 must order earliest first");
});

test("weak-set pass 2 completes e6 even though the pool skips a middle battle", () => {
  /* e6 full order: [b-kangra1809, b-lahore, b-anglosikh2]. A weak pool of
     the first and last skips the middle one, b-lahore. */
  const run = c.newRun(D, {weak: true, misses: {"b-kangra1809": 1, "b-anglosikh2": 1}});
  assert.deepEqual(run.pool.slice().sort(), ["b-anglosikh2", "b-kangra1809"].sort());
  const placed = simulateYearPass(D, run, "e6");
  assert.deepEqual(placed, ["b-kangra1809", "b-anglosikh2"], "e6 must order earliest first");
});

/* Pins the backwards-compatible path: with no pool filter, orderInPool
   must be indistinguishable from canonicalOrder, so gradeYear's existing
   four-argument callers (and every era with no weak-set narrowing) keep
   working exactly as before. */
test("orderInPool with a null pool is exactly canonicalOrder", () => {
  for(const e of D.eras){
    assert.deepEqual(c.orderInPool(D, e.id, null), c.canonicalOrder(D, e.id));
    assert.deepEqual(c.orderInPool(D, e.id, undefined), c.canonicalOrder(D, e.id));
  }
});

test("orderInPool narrows canonicalOrder to only the ids present in the pool", () => {
  assert.deepEqual(c.orderInPool(D, "e7", ["b-malaun", "b-segauli"]),
    ["b-malaun", "b-segauli"]);
  assert.deepEqual(c.orderInPool(D, "e6", ["b-anglosikh2", "b-kangra1809"]),
    ["b-kangra1809", "b-anglosikh2"]);
});

/* ------------------------------------------------------------------
   Regression: pass 3 (place) must be winnable for every chip.

   viewCampaignPlace() draws its tappable circles from placeOptions(),
   and gradePlace() only ever accepts a tap matching chip.place exactly.
   Both sides must come off that one function: if the drawn set were
   ever narrower than the graded set, a chip whose marker is missing
   could never be graded correct and the pass would deadlock forever.
   That is what happened to b-dhami, whose place is authored k:"state".

   This asserts against placeOptions() itself rather than restating the
   rule, so the view and the test cannot each keep a copy and drift.
   ------------------------------------------------------------------ */

test("every chip's place exists on the map and is among the rendered pass-3 options", () => {
  const rendered = new Set(c.placeOptions(D, MAP));
  for(const ch of CHIPS){
    assert.ok(MAP.places[ch.place], ch.id + " points at missing place " + ch.place);
    assert.ok(rendered.has(ch.place),
      ch.id + "'s place '" + ch.place + "' is never drawn by the renderer — pass 3 would deadlock on it");
  }
});
