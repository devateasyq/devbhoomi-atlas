"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {ROOT, loadData} = require("./load");
const campaign = require("../app/campaign.js");

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

/* campaignState/campaignSave/campaignStart/campaignTouch are plain function
   declarations inside app.js, which is a browser script with no module
   exports (unlike app/campaign.js). A text-only assertion here (e.g.
   grepping for a "finalised" flag name) could pass without the flag ever
   being checked before the merge, so it would not actually constrain the
   double-merge bug. Instead lift the four function bodies out of the real
   source, verbatim, and eval them against a fake store + S so the actual
   production logic runs and is asserted on behaviourally — the same
   technique loadNav() above already uses for the NAV literal. */
function loadCampaignFns(store, S, newRun, isRunComplete, scoreRun, runMisses){
  const src = fs.readFileSync(path.join(ROOT, "app", "app.js"), "utf8");
  const names = ["campaignState", "campaignSave", "campaignStart", "campaignTouch"];
  const bodies = names.map(name => {
    const sigRe = new RegExp("^function " + name + "\\(", "m");
    const start = src.search(sigRe);
    if(start < 0) throw new Error("loadCampaignFns: " + name + " not found in app/app.js");
    const braceStart = src.indexOf("{", start);
    let depth = 0, i = braceStart;
    for(; i < src.length; i++){
      if(src[i] === "{") depth++;
      else if(src[i] === "}"){ depth--; if(depth === 0) break; }
    }
    if(depth !== 0) throw new Error("loadCampaignFns: unbalanced braces in " + name);
    return src.slice(start, i + 1);
  });
  // eslint-disable-next-line no-new-func
  const factory = new Function("store", "S", "newRun", "isRunComplete", "scoreRun", "runMisses",
    bodies.join("\n") + "\nreturn {campaignState, campaignSave, campaignStart, campaignTouch};");
  return factory(store, S, newRun, isRunComplete, scoreRun, runMisses);
}

/* Finding 1: campaignTouch() merges this run's first-try misses into the
   stored per-battle totals when the run completes. It is called after
   every graded placement, so it WILL be called again while S.campaignRun
   still points at the same finished run object — a duplicate event, a
   re-render, a resumed completion screen. It must be safe to call a
   completed run through campaignTouch() any number of times: the stored
   miss totals after the second call must equal the totals after the
   first. */
test("campaignTouch() finalises a completed run at most once (no double-merge)", () => {
  const {D} = loadData();
  const mem = {};
  const store = {
    get(k, d){ return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : d; },
    set(k, v){ mem[k] = v; }
  };
  const S = {};
  const fns = loadCampaignFns(store, S, campaign.newRun, campaign.isRunComplete,
    campaign.scoreRun, campaign.runMisses);

  S.campaignRun = campaign.newRun(D, {misses: {}, weak: false});
  const missId = S.campaignRun.pool[0];
  const missPass = campaign.PASSES[0];
  for(const id of S.campaignRun.pool){
    for(const pass of campaign.PASSES){
      if(id === missId && pass === missPass) campaign.recordAttempt(S.campaignRun, id, pass, false);
      campaign.recordAttempt(S.campaignRun, id, pass, true);
    }
  }
  assert.ok(campaign.isRunComplete(S.campaignRun), "test setup: run must be fully graded");

  fns.campaignTouch();
  const after1 = store.get("campaign", {}).misses[missId];
  assert.equal(after1, 1, "first touch should record exactly one first-try miss");

  fns.campaignTouch();
  const after2 = store.get("campaign", {}).misses[missId];
  assert.equal(after2, after1,
    "calling campaignTouch() again on the same completed run must not merge the misses a second time " +
    "(got " + after2 + ", expected " + after1 + " — campaignTouch is not idempotent)");
});
