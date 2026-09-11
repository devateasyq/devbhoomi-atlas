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
