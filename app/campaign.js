/* ============================================================
   campaign — the battles game's pure half.
   No DOM, no globals beyond what it defines. Every chip is a
   projection of a D.battles record, so the game cannot drift
   from the Cards view, and every grading rule is testable
   under `node --test` with no browser.
   ============================================================ */
"use strict";

var PASSES = ["band", "year", "place", "winner", "chain"];

/* One chip per battle, chronological. The whole game reads this and
   nothing else, so a field missing here is a field the game cannot use. */
function buildChips(D){
  return (D.battles || []).slice()
    .sort(function(a, b){ return a.y - b.y; })
    .map(function(b){
      return {id: b.id, name: b.name, kind: b.kind, era: b.era,
              y: b.y, yr: b.yr, place: b.place,
              sides: b.sides.slice(), winSide: b.winSide, winner: b.winner};
    });
}

/* The union rule. A band is correct if it is the authored era OR if its
   numeric span contains the battle's year.

   Both halves are load-bearing. The spans overlap (e6 1752-1846 with e7
   1790-1816; e8 1815-1947 with e9 1848-1948), so span-containment alone
   would mark a defensible answer wrong — Mahal Morian 1806 is authored e7
   and the Relief of Kangra 1809 is authored e6, and a reader cannot tell
   those apart. And the authored era alone is not enough either: the Second
   Anglo-Sikh War is authored e6 but dated 1849, outside e6's own span. */
function acceptedBands(D, chip){
  var out = [chip.era];
  var eras = D.eras || [];
  for(var i = 0; i < eras.length; i++){
    var e = eras[i];
    if(chip.y >= e.y0 && chip.y <= e.y1 && out.indexOf(e.id) < 0) out.push(e.id);
  }
  return out.sort();
}

function gradeBand(D, chip, eraId){
  return acceptedBands(D, chip).indexOf(eraId) >= 0;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {PASSES: PASSES, buildChips: buildChips,
                    acceptedBands: acceptedBands, gradeBand: gradeBand};
}
