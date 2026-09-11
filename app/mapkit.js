/* ============================================================
   mapkit — the pure part of the map.
   No DOM, no `D`, no globals beyond what it defines. Everything
   here is a function of its arguments, so it unit-tests in Node.
   ============================================================ */
"use strict";

var LAYERS = [
  {k:"district", lb:"District",                 c:"var(--e4)",         glyph:null,       base:true},
  {k:"river1",   lb:"Major river",              c:"var(--water)",      glyph:"line"},
  {k:"river2",   lb:"Tributary",                c:"var(--water-soft)", glyph:"line"},
  {k:"peak",     lb:"Peak",                     c:"var(--ink-2)",      glyph:"triangle"},
  {k:"pass",     lb:"Pass",                     c:"var(--e2)",         glyph:"bowtie"},
  {k:"lake",     lb:"Lake / reservoir",         c:"var(--indigo)",     glyph:"drop"},
  {k:"glacier",  lb:"Glacier",                  c:"var(--e3)",         glyph:"hex"},
  {k:"state",    lb:"Seat of a hill state",     c:"var(--e6)",         glyph:"circle"},
  {k:"temple",   lb:"Temple / monastery",       c:"var(--gold)",       glyph:"pentagon"},
  {k:"battle",   lb:"Battle or movement site",  c:"var(--vermilion)",  glyph:"diamond"}
];
var LAYER_BY_KIND = {};
LAYERS.forEach(function(l){ LAYER_BY_KIND[l.k] = l; });

/* Shapes are centred on the origin and fit a +/-7 unit box, because
   applyZoom() counter-scales each marker group about its own origin. */
var GLYPHS = {
  triangle: '<path d="M0 -6.4L5.8 4.2L-5.8 4.2Z"/>',
  bowtie:   '<path d="M-5.6 -5.2L5.6 -5.2L0 0L5.6 5.2L-5.6 5.2L0 0Z"/>',
  drop:     '<path d="M0 6.2C-3.6 3.6 -5.2 1.2 -5.2 -1.2A5.2 5.2 0 0 1 5.2 -1.2C5.2 1.2 3.6 3.6 0 6.2Z"/>',
  hex:      '<path d="M0 -6L5.2 -3L5.2 3L0 6L-5.2 3L-5.2 -3Z"/>',
  circle:   '<circle r="5.5"/>',
  pentagon: '<path d="M0 -6.2L5.9 -1.9L3.6 5L-3.6 5L-5.9 -1.9Z"/>',
  diamond:  '<path d="M0 -6.4L6.4 0L0 6.4L-6.4 0Z"/>'
};
function mkGlyph(shape){ return GLYPHS[shape] || GLYPHS.circle; }

/* Greedy de-collision. Marker labels sit above the marker, offset by
   LABEL_DY, matching the `y="-9"` the marker <text> already uses. Highest
   priority wins the space; everything else that collides is simply not
   drawn — the marker itself stays visible and still shows a tooltip.
   An item may pass its own `box` (e.g. a district label, whose ink is not
   above-the-glyph like a marker's) — when present it is used as-is instead
   of the default above-the-glyph box, keeping this function a pure
   projection of its arguments. An item may also pass its own `dy` (the
   caller's zoom-scaled LABEL_DY) to override the module default below. */
var LABEL_DY = 9;
function placeLabels(items){
  var placed = [], keep = new Set();
  var sorted = items.slice().sort(function(a, b){ return b.pri - a.pri; });
  for(var i = 0; i < sorted.length; i++){
    var it = sorted[i];
    var dy = it.dy != null ? it.dy : LABEL_DY;
    var box = it.box || {x1: it.x - it.w/2, x2: it.x + it.w/2,
               y1: it.y - dy - it.h, y2: it.y - dy};
    var clash = false;
    for(var j = 0; j < placed.length; j++){
      var p = placed[j];
      if(!(box.x2 <= p.x1 || box.x1 >= p.x2 || box.y2 <= p.y1 || box.y1 >= p.y2)){
        clash = true; break;
      }
    }
    if(clash) continue;
    placed.push(box); keep.add(it.id);
  }
  return keep;
}

/* Legend behaviour, Plotly-style: click toggles one layer, double click
   isolates it, and double-clicking the already-isolated layer restores
   the lot. Pure functions over the hidden-key array so the reducer is
   testable without a DOM and the caller owns persistence. */
function layerToggle(hidden, k){
  return hidden.indexOf(k) >= 0
    ? hidden.filter(function(x){ return x !== k; })
    : hidden.concat([k]);
}
function layerIsolate(hidden, k, visibleKinds){
  var others = visibleKinds.filter(function(x){ return x !== k; });
  /* `keep` preserves any hidden layer the caller did not list in
     `visibleKinds` — it must survive BOTH isolating and restoring, so
     restoring returns `keep`, not []. With the current single-legend
     caller, `visibleKinds` is always every non-base layer, so this set is
     always empty in practice; the filter is kept because it costs nothing
     and protects a caller that one day passes a narrower list. */
  var keep = hidden.filter(function(x){ return visibleKinds.indexOf(x) < 0 && x !== k; });
  var isolated = others.every(function(x){ return hidden.indexOf(x) >= 0; })
              && hidden.indexOf(k) < 0;
  return isolated ? keep : keep.concat(others);
}

/* Which district a point falls in. The district paths are plain M/L
   polylines, so they parse into rings and a ray cast answers it. Needed
   because a marker knows its coordinates but not its district, and focus
   mode has to hide everything outside one. */
function parseRings(d){
  var parts = String(d).split(/(?=M)/), rings = [];
  for(var i = 0; i < parts.length; i++){
    var nums = parts[i].match(/-?\d+(?:\.\d+)?/g);
    if(!nums || nums.length < 6) continue;
    var ring = [];
    for(var j = 0; j + 1 < nums.length; j += 2) ring.push([+nums[j], +nums[j+1]]);
    rings.push(ring);
  }
  return rings;
}
function pointInRings(x, y, rings){
  var inside = false;
  for(var r = 0; r < rings.length; r++){
    var ring = rings[r];
    for(var i = 0, j = ring.length - 1; i < ring.length; j = i++){
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if(((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
        inside = !inside;
    }
  }
  return inside;
}
/* paths: the MAP.paths object. Returns the district name, or null when a
   point falls outside every one — which happens for markers drawn just
   off the simplified boundary. */
function districtAt(x, y, paths){
  for(var name in paths){
    if(!Object.prototype.hasOwnProperty.call(paths, name)) continue;
    if(pointInRings(x, y, parseRings(paths[name]))) return name;
  }
  return null;
}

/* A few markers sit on the state border, where the simplified outline runs
   inside them, so no polygon contains them. Fall back to the closest
   district centroid rather than leaving them in no district at all. */
function nearestDistrict(x, y, centroids){
  var best = null, bd = Infinity;
  for(var name in centroids){
    if(!Object.prototype.hasOwnProperty.call(centroids, name)) continue;
    var c = centroids[name];
    var d = (c[0] - x) * (c[0] - x) + (c[1] - y) * (c[1] - y);
    if(d < bd){ bd = d; best = name; }
  }
  return best;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {LAYERS: LAYERS, parseRings: parseRings,
                  pointInRings: pointInRings, districtAt: districtAt, nearestDistrict: nearestDistrict, LAYER_BY_KIND: LAYER_BY_KIND, mkGlyph: mkGlyph, placeLabels: placeLabels, LABEL_DY: LABEL_DY, layerToggle: layerToggle, layerIsolate: layerIsolate};
}
