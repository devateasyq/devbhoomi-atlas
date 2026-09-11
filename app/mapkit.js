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

if(typeof module !== "undefined" && module.exports){
  module.exports = {LAYERS: LAYERS, LAYER_BY_KIND: LAYER_BY_KIND, mkGlyph: mkGlyph};
}
