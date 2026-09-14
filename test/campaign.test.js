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
