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
