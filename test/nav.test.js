"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {ROOT} = require("./load");

/* app/app.js is a plain browser script with no module export — the app is one
   file, not a package. NAV is a self-contained literal near the top of it, so
   lift that literal out of the source and evaluate it, the way load.js
   evaluates the data files. */
function loadNav(){
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  const m = src.match(/^const NAV = \[[\s\S]*?^\];$/m);
  if(!m) throw new Error("loadNav: could not find the NAV literal in app/app.js");
  // eslint-disable-next-line no-eval
  return eval(m[0] + "\nNAV");
}
const NAV = loadNav();

/* The phone dock is a pill of four beside a search circle. Four is a layout
   constant, not a preference: a fifth tab is what pushed the labels to 9.5px
   and clipped them in the first place. */
test("the phone dock carries exactly four tabs", () => {
  const mob = NAV.filter(n => n.mob);
  assert.strictEqual(mob.length, 4,
    "expected four, got " + mob.length + ": " + mob.map(n => n.id).join(", "));
});

test("the four are the content views you navigate between", () => {
  assert.deepStrictEqual(NAV.filter(n => n.mob).map(n => n.id),
    ["home", "map", "rounds", "revise"]);
});

/* Profile left the dock when search took the fifth slot. The header account
   button carries the user's own name and opens the profile view, so the name
   at the top of the screen is the door to it. */
test("profile is not in the dock", () => {
  assert.ok(!NAV.some(n => n.mob && n.id === "profile"),
    "profile is still flagged mob — the dock would carry five");
});

test("every dock tab is a real view with a title", () => {
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  for(const n of NAV.filter(n => n.mob)){
    assert.ok(new RegExp("\\b" + n.id + ":").test(src.match(/^const TITLE = \{[\s\S]*?\};$/m)[0]),
      n.id + " has no entry in TITLE, so the router would send it home");
  }
});

/* The Battles view gains two sibling modes. These must NOT become nav
   entries: the rail is full at nine and the phone dock is deliberately
   four — a fifth dock tab is what clipped the labels to 9.5px. */
test("campaign and march are modes of Battles, not nav entries", () => {
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  const nav = src.slice(src.indexOf("const NAV = ["), src.indexOf("const COUNTS"));
  assert.ok(!/id:"campaign"/.test(nav), "campaign must not be a nav entry");
  assert.ok(!/id:"march"/.test(nav), "march must not be a nav entry");
  assert.ok(/function viewCampaign\(/.test(src), "viewCampaign is missing");
  assert.ok(/function viewMarch\(/.test(src), "viewMarch is missing");
});

test("the campaign run persists through the shared store helper", () => {
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  assert.ok(/store\.(get|set)\("campaign"/.test(src),
    "campaign state must go through store, which already prefixes hpatlas:");
  assert.ok(!/localStorage\.[gs]etItem\("hpatlas:campaign/.test(src),
    "do not bypass the store helper");
});
