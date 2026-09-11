"use strict";
const test = require("node:test");
const assert = require("node:assert");
const kit = require("../app/mapkit.js");

test("every marker kind has a distinct glyph", () => {
  const kinds = ["peak","pass","lake","glacier","state","temple","battle"];
  const seen = new Map();
  for(const k of kinds){
    const layer = kit.LAYER_BY_KIND[k];
    assert.ok(layer, "no layer for " + k);
    const g = kit.mkGlyph(layer.glyph);
    assert.ok(g.length > 0, k + " produced no markup");
    assert.ok(!seen.has(g), k + " shares a glyph with " + seen.get(g));
    seen.set(g, k);
  }
});

test("glyphs fit the 7-unit box so zoom counter-scaling stays correct", () => {
  for(const layer of kit.LAYERS){
    if(!layer.glyph || layer.glyph === "line") continue;
    const g = kit.mkGlyph(layer.glyph);
    const nums = (g.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    for(const n of nums) assert.ok(Math.abs(n) <= 7.01, layer.k + " glyph escapes the box: " + n);
  }
});

test("rivers are two independently addressable layers", () => {
  assert.ok(kit.LAYER_BY_KIND.river1);
  assert.ok(kit.LAYER_BY_KIND.river2);
  assert.notEqual(kit.LAYER_BY_KIND.river1.lb, kit.LAYER_BY_KIND.river2.lb);
});

test("the district layer is a base layer the legend cannot hide", () => {
  assert.equal(kit.LAYER_BY_KIND.district.base, true);
});

test("placeLabels drops labels whose boxes collide", () => {
  const items = [
    {id:"a", x:100, y:100, w:40, h:12, pri:10},
    {id:"b", x:104, y:100, w:40, h:12, pri:5}   // overlaps a
  ];
  const keep = kit.placeLabels(items);
  assert.ok(keep.has("a"), "highest priority must survive");
  assert.ok(!keep.has("b"), "colliding lower-priority label must be dropped");
});

test("placeLabels keeps labels that do not collide", () => {
  const items = [
    {id:"a", x:100, y:100, w:40, h:12, pri:10},
    {id:"b", x:400, y:400, w:40, h:12, pri:5}
  ];
  const keep = kit.placeLabels(items);
  assert.equal(keep.size, 2);
});

test("placeLabels respects priority, not input order", () => {
  const items = [
    {id:"low",  x:100, y:100, w:40, h:12, pri:1},
    {id:"high", x:104, y:100, w:40, h:12, pri:99}
  ];
  const keep = kit.placeLabels(items);
  assert.ok(keep.has("high"));
  assert.ok(!keep.has("low"));
});

test("zooming in fits more labels, because boxes shrink in SVG units", () => {
  const at = z => kit.placeLabels([
    {id:"a", x:100, y:100, w:40/z, h:12/z, pri:3},
    {id:"b", x:130, y:100, w:40/z, h:12/z, pri:2},
    {id:"c", x:160, y:100, w:40/z, h:12/z, pri:1}
  ]).size;
  assert.ok(at(4) > at(1), "more labels must fit at 4x than at 1x");
});

test("no two surviving label boxes overlap", () => {
  const items = [];
  for(let i = 0; i < 60; i++){
    items.push({id:"m"+i, x:(i*37)%900+50, y:(i*53)%900+50, w:50, h:12, pri:60-i});
  }
  const keep = kit.placeLabels(items);
  const boxes = items.filter(it => keep.has(it.id))
    .map(it => ({x1:it.x-it.w/2, x2:it.x+it.w/2, y1:it.y-it.h-9, y2:it.y-9}));
  for(let i = 0; i < boxes.length; i++){
    for(let j = i+1; j < boxes.length; j++){
      const a = boxes[i], b = boxes[j];
      const hit = !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
      assert.ok(!hit, "boxes " + i + " and " + j + " overlap");
    }
  }
});

const KINDS4 = ["peak","pass","lake","glacier"];

test("layerToggle hides then restores one kind", () => {
  let hidden = [];
  hidden = kit.layerToggle(hidden, "peak");
  assert.deepEqual(hidden, ["peak"]);
  hidden = kit.layerToggle(hidden, "peak");
  assert.deepEqual(hidden, []);
});

test("layerToggle never mutates its input", () => {
  const before = [];
  const after = kit.layerToggle(before, "lake");
  assert.deepEqual(before, [], "input array was mutated");
  assert.deepEqual(after, ["lake"]);
});

test("layerIsolate hides everything except the clicked kind", () => {
  const hidden = kit.layerIsolate([], "pass", KINDS4);
  assert.ok(!hidden.includes("pass"));
  assert.ok(hidden.includes("peak") && hidden.includes("lake") && hidden.includes("glacier"));
});

test("isolating the already-isolated kind restores everything", () => {
  let hidden = kit.layerIsolate([], "pass", KINDS4);
  hidden = kit.layerIsolate(hidden, "pass", KINDS4);
  assert.deepEqual(hidden, [], "second isolate must restore all layers");
});

test("a layer hidden in another map mode survives isolate and restore", () => {
  /* `visibleKinds` is only what the current legend shows. A layer hidden
     in a different mode is not in it, and must not be silently dropped. */
  let hidden = ["river1"];
  hidden = kit.layerIsolate(hidden, "pass", KINDS4);
  assert.ok(hidden.includes("river1"), "isolate dropped an out-of-scope hidden layer");
  hidden = kit.layerIsolate(hidden, "pass", KINDS4);
  assert.deepEqual(hidden, ["river1"], "restore must keep it and clear only this legend");
});

test("isolating a different kind switches the isolation", () => {
  let hidden = kit.layerIsolate([], "pass", KINDS4);
  hidden = kit.layerIsolate(hidden, "lake", KINDS4);
  assert.ok(!hidden.includes("lake"));
  assert.ok(hidden.includes("pass"));
});
