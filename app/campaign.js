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
  /* Sort into the order eras appear in D.eras (chronological order).
     Any era id not in D.eras is placed last. */
  var eraIndex = {};
  for(var i = 0; i < eras.length; i++){
    eraIndex[eras[i].id] = i;
  }
  return out.sort(function(a, b){
    var aIdx = eraIndex.hasOwnProperty(a) ? eraIndex[a] : eras.length;
    var bIdx = eraIndex.hasOwnProperty(b) ? eraIndex[b] : eras.length;
    if(aIdx !== bIdx) return aIdx - bIdx;
    /* Preserve original order for unknown eras (those with the same index). */
    return 0;
  });
}

function gradeBand(D, chip, eraId){
  return acceptedBands(D, chip).indexOf(eraId) >= 0;
}

/* Pass 2 orders chips WITHIN a band, and it uses the authored era rather
   than wherever the reader put the chip in pass 1. Pass 1 grades leniently
   (see acceptedBands), so a chip can be correct in a band that is not its
   canonical one; letting that follow through into pass 2 would make the
   ordering non-deterministic. The board snaps every chip to its authored
   band before pass 2 begins, and the lock-in card shows the authored era. */
function canonicalOrder(D, eraId){
  return (D.battles || [])
    .filter(function(b){ return b.era === eraId; })
    .sort(function(a, b){ return a.y - b.y; })
    .map(function(b){ return b.id; });
}

function gradeYear(D, eraId, index, chipId){
  return canonicalOrder(D, eraId)[index] === chipId;
}

function gradePlace(chip, placeId){
  return chip.place === placeId;
}

/* sideIndex is an index into chip.sides, never a string. `winner` is prose
   for a reader ("Gorkhas (tactically)") and matches neither side. */
function gradeWinner(chip, sideIndex){
  return sideIndex === chip.winSide;
}

/* Which side to show first. Twelve of the sixteen battles have winSide 0,
   so an unshuffled pass hands 12/16 to a reader who always taps left. The
   shuffle is derived from the chip id and a per-run salt so it is stable
   within a run (a re-render must not move the buttons under a thumb) and
   different between runs.

   IMPORTANT: do not read the lowest bit of a plain `h = h*31 + c` rolling
   hash for this. 31 is odd, and multiplying by an odd number never changes
   parity, so every step of that loop preserves h's parity from the previous
   step; the salt the loop starts from is the only thing that can flip it.
   The result is that h&1 collapses to just (parity of salt) XOR (parity of
   the chip id's char codes) — only two possible outcomes ever, and they are
   exact complements of each other, no matter how many distinct salts a run
   picks from. The salt is then decorative: it can only toggle between the
   same two board layouts, one of which still hands a fixed-side player a
   knowable, better-than-chance score. To get an unpredictable, well-mixed
   bit we fold the salt in with a large odd multiplier (so it perturbs more
   than just the low bit) and finish with an xorshift-multiply avalanche
   (shift-xor, multiply, shift-xor) before reading out a MID-order bit
   (bit 15, not bit 0) of that finalized value. */
function sideOrder(chipId, salt){
  var h = 0;
  for(var i = 0; i < chipId.length; i++) h = (h * 31 + chipId.charCodeAt(i)) | 0;
  /* Fold the salt in with a large odd constant so it perturbs high bits too,
     not just the parity of h. */
  h = (h ^ (Math.imul(salt | 0, 2654435761) | 0)) | 0;
  /* xorshift-multiply finalizer (a la murmur3/splitmix-style mixing): each
     shift-xor step spreads entropy across bit positions, and multiplying by
     a large odd constant in between prevents any single input bit from
     mapping to a single, predictable output bit. */
  h = (h ^ (h >>> 16)) | 0;
  h = Math.imul(h, 2246822519) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 3266489917) | 0;
  h = (h ^ (h >>> 16)) | 0;
  /* Read a mid-order bit of the finalized value rather than bit 0: after the
     avalanche every bit is well mixed, but staying away from the very
     lowest bit keeps this robust even if a future edit weakens the mix. */
  return ((h >>> 15) & 1) ? [1, 0] : [0, 1];
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {PASSES: PASSES, buildChips: buildChips,
                    acceptedBands: acceptedBands, gradeBand: gradeBand,
                    canonicalOrder: canonicalOrder, gradeYear: gradeYear,
                    gradePlace: gradePlace, gradeWinner: gradeWinner,
                    sideOrder: sideOrder};
}
