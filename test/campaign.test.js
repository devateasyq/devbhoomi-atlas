"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {loadData} = require("./load");
const c = require("../app/campaign.js");

const {D} = loadData();
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

test("no band holds a single chip, so no slot is a free mark", () => {
  for(const e of D.eras){
    const n = c.canonicalOrder(D, e.id).length;
    assert.ok(n !== 1, e.id + " holds exactly one chip — its year slot is unearnable");
  }
});

test("year grading checks the chip against its slot", () => {
  assert.equal(c.gradeYear(D, "e7", 0, "b-mahalmorian"), true);
  assert.equal(c.gradeYear(D, "e7", 1, "b-kalanga"), true);
  assert.equal(c.gradeYear(D, "e7", 1, "b-jaithak"), false);
  assert.equal(c.gradeYear(D, "e7", 9, "b-segauli"), false);
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

test("a chain is correct only in full order", () => {
  assert.equal(c.gradeChain(["cause", "course", "result", "sig"]), true);
  assert.equal(c.gradeChain(["cause", "result", "course", "sig"]), false);
  assert.equal(c.gradeChain(["cause", "course", "result"]), false);
  assert.equal(c.gradeChain([]), false);
});
