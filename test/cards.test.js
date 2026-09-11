"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {loadData, ROOT} = require("./load");

const {D} = loadData();

/* buildCards() lives inside app.js, which expects a DOM. Extract just the
   function and run it against the real data — the cards must be generated
   from records, never authored separately, so they cannot drift. */
function buildCardsFn(){
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  const start = src.indexOf("function buildCards()");
  const end = src.indexOf("\nconst cardPool", start);
  assert.ok(start > 0 && end > start, "could not locate buildCards in app.js");
  const num = n => n == null ? "" : n.toLocaleString("en-IN");
  // eslint-disable-next-line no-new-func
  return new Function("D", "num", "IDX", src.slice(start, end) + "\nreturn buildCards();");
}

/* buildCards() uses IDX to turn a district id into a display name; IDX is
   defined above buildCards() in app.js but the extracted source doesn't
   carry it, so build an equivalent Map here from the loaded data. */
function buildIDX(){
  const IDX = new Map();
  [[D.districts,"district"],[D.states,"state"],[D.events,"event"],
   [D.battles,"battle"],[D.people,"person"],[D.topics,"topic"],[D.rivers,"river"]]
    .forEach(([arr,k]) => arr.forEach(r => IDX.set(r.id, {r, kind:k})));
  (D.features || []).forEach(r => IDX.set(r.id, {r, kind:r.k}));
  return IDX;
}

const runCards = () => buildCardsFn()(D, n => n == null ? "" : n.toLocaleString("en-IN"), buildIDX());

test("cards are generated for every feature", () => {
  const cards = runCards();
  for(const f of D.features){
    assert.ok(cards.some(c => c.id === f.id), "no card for " + f.id);
  }
});

test("cards are generated for every river", () => {
  const cards = runCards();
  for(const r of D.rivers){
    assert.ok(cards.some(c => c.id === r.id), "no card for river " + r.id);
  }
});

test("feature and river cards land in the Geography section", () => {
  const cards = runCards();
  const ids = new Set(D.features.map(f => f.id).concat(D.rivers.map(r => r.id)));
  for(const c of cards){
    if(ids.has(c.id)) assert.equal(c.sec, "Geography", c.id + " filed under " + c.sec);
  }
});

test("no card has an empty question or answer", () => {
  const cards = runCards();
  for(const c of cards){
    assert.ok(c.q && c.q.trim(), "empty question on " + c.id);
    assert.ok(c.a && String(c.a).trim(), "empty answer on " + c.id);
    assert.ok(!/undefined|\[object/.test(c.q + c.a), "broken interpolation on " + c.id);
  }
});
