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

/* WHY this exists: the view and the grader must index the SAME list, or
   a correct tap can be rejected forever. viewCampaignYear() displays
   canonicalOrder(D, eraId) narrowed to whatever battles are actually in
   this run's pool (a weak-set run only pools previously-missed battles),
   but gradeYear used to grade slot N against the FULL, unfiltered
   canonicalOrder. When the pool's battles are non-contiguous in the full
   chronology, slot N of the displayed (filtered) list is a different
   battle than slot N of the full list, so the tap the player is shown as
   correct is graded wrong — permanently, since nothing else ever advances
   the pass. Routing both the view and gradeYear through this one function
   makes that drift impossible: pass the run's pool (or omit/null it for
   the unfiltered, full-board case) and both sides always agree. */
function orderInPool(D, eraId, poolIds){
  var order = canonicalOrder(D, eraId);
  if(poolIds == null) return order;
  return order.filter(function(id){ return poolIds.indexOf(id) >= 0; });
}

function gradeYear(D, eraId, index, chipId, poolIds){
  if(arguments.length < 5) throw new Error("gradeYear: pass the run's pool, or null for the full board");
  return orderInPool(D, eraId, poolIds)[index] === chipId;
}

function gradePlace(chip, placeId){
  return chip.place === placeId;
}

/* The ids pass 3 may offer as answers. gradePlace() accepts a tap only when
   it equals chip.place exactly, so whatever the board draws MUST come from
   here — if the drawn set is narrower than the graded set, a chip whose
   marker is missing can never be graded correct and that pass deadlocks
   forever. That is not hypothetical: MAP.places.dhami is authored k:"state"
   (Dhami is a hill state whose marker predates the 1939 firing recorded as
   b-dhami), so filtering on marker kind alone silently dropped it.

   This lives in the module rather than in the view precisely so the view and
   the test cannot each keep their own copy of the rule and drift apart. */
function placeOptions(D, MAP){
  var claimed = {};
  var chips = buildChips(D);
  for(var i = 0; i < chips.length; i++) claimed[chips[i].place] = true;
  var out = [];
  for(var pid in MAP.places){
    if(!Object.prototype.hasOwnProperty.call(MAP.places, pid)) continue;
    if(MAP.places[pid].k === "battle" || claimed[pid]) out.push(pid);
  }
  return out;
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

/* The four-part shape a mains answer needs. `sig` is last because it is the
   "why it matters" close, not because it is least important. */
var CHAIN_KEYS = ["cause", "course", "result", "sig"];
var CHAIN_LABELS = {cause: "Cause", course: "Course",
                    result: "Result", sig: "Why it matters"};

function chainParts(D, chipId){
  var b = (D.battles || []).find(function(x){ return x.id === chipId; });
  if(!b) return [];
  return CHAIN_KEYS.map(function(k){
    return {key: k, label: CHAIN_LABELS[k], text: b[k]};
  });
}

/* Mix chipId and salt into a well-mixed 32-bit seed, reusing the same
   xorshift-multiply avalanche sideOrder relies on above (see the long
   comment on sideOrder for why a plain `h*31+c` rolling hash read at a low
   bit is not good enough here: 31 is odd, so that scheme's low bit collapses
   to parity and never really mixes). Salt is folded in with a large odd
   multiplier before the avalanche so it perturbs high bits too. */
function chainSeed(chipId, salt){
  var h = 0;
  for(var i = 0; i < chipId.length; i++) h = (h * 31 + chipId.charCodeAt(i)) | 0;
  h = (h ^ (Math.imul(salt | 0, 2654435761) | 0)) | 0;
  h = (h ^ (h >>> 16)) | 0;
  h = Math.imul(h, 2246822519) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 3266489917) | 0;
  h = (h ^ (h >>> 16)) | 0;
  return h >>> 0;                              /* unsigned 32-bit seed */
}

/* mulberry32: a small, fast, deterministic PRNG. Good enough for shuffling
   four items; not for anything cryptographic. */
function mulberry32(seed){
  var state = seed >>> 0;
  return function(){
    state = (state + 0x6D2B79F5) | 0;
    var t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A seeded Fisher-Yates shuffle over the four chain parts.

   WHY NOT rotate-and-swap: an earlier version of this function rotated the
   canonical array by 1-3 positions and then conditionally swapped the
   middle two. That can only ever produce 6 of the 24 possible permutations,
   and worse, it is structurally biased: a rotation by 1-3 can NEVER leave
   `cause` (index 0) in slot 0, and can NEVER leave `sig` (index 3) in slot
   3 — the swap only ever touches the middle two slots, so it cannot repair
   either edge. That guaranteed `cause` was never served first and `sig`
   was never served last, which is a free hint for a game whose whole point
   is "find the cause and place it first". Fisher-Yates over a PRNG seed
   has no such structural blind spot: every slot is reachable by every key. */
function shuffleChain(D, chipId, salt){
  var parts = chainParts(D, chipId);
  if(parts.length !== 4) return parts;
  var seed = chainSeed(chipId, salt);
  var out;
  for(var attempt = 0; attempt < 8; attempt++){
    var rng = mulberry32(seed);
    out = parts.slice();
    for(var i = out.length - 1; i > 0; i--){
      var j = Math.floor(rng() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    if(!(out[0].key === CHAIN_KEYS[0] && out[1].key === CHAIN_KEYS[1] &&
         out[2].key === CHAIN_KEYS[2] && out[3].key === CHAIN_KEYS[3])){
      return out;
    }
    /* Landed on the solved order: reshuffle with an advanced seed rather
       than "fixing up" this result (e.g. rotating it), which is exactly
       the kind of post-hoc tweak that reintroduces positional bias. */
    seed = (seed + 0x9E3779B9) >>> 0;
  }
  /* Vanishingly unlikely: every attempt landed solved. Terminate safely by
     swapping the first two elements rather than looping forever. */
  var t = out[0]; out[0] = out[1]; out[1] = t;
  return out;
}

/* The op the [data-cgchain] tap handler actually performs: is `key` the
   right part for slot `index` (0=cause, 1=course, 2=result, 3=sig)? An
   out-of-range index simply never matches, since CHAIN_KEYS[index] is
   undefined there and no real key equals that. */
function gradeChainStep(index, key){
  return CHAIN_KEYS[index] === key;
}

/* Most-missed first, ties chronological. This is the revision loop: the
   battles the reader keeps dropping are the ones served first, so each
   round genuinely goes higher rather than repeating the same sweep. */
function seedPool(D, misses, weakOnly){
  misses = misses || {};
  var ids = buildChips(D).map(function(ch){ return ch.id; });
  if(weakOnly){
    var weak = ids.filter(function(id){ return (misses[id] || 0) > 0; });
    /* A weak set with nothing weak in it is an empty board, not a feature. */
    if(weak.length) ids = weak;
  }
  return ids.map(function(id, i){ return {id: id, m: misses[id] || 0, i: i}; })
            .sort(function(a, b){ return (b.m - a.m) || (a.i - b.i); })
            .map(function(x){ return x.id; });
}

/* The full run shape. `band`, `year` and `chain` are per-pass scratch
   state that only app.js's UI writes to (band/year record where a chip
   was placed during passes 1-2; chain records chain-round progress) —
   they are authored here anyway so the shape a fresh run has and the
   shape every unit test exercises are the same one, and so a run
   resumed from storage (old or new) always has the same key set as a
   freshly-made one. `finalised` is deliberately NOT part of this shape:
   it is a flag app.js sets once, after the run completes, and its
   absence means "not finalised yet" — see campaignTouch() in app.js. */
function newRun(D, opts){
  opts = opts || {};
  return {v: 1,
          weak: !!opts.weak,
          salt: opts.salt == null ? (Date.now() & 0xffff) : opts.salt,
          pool: seedPool(D, opts.misses, !!opts.weak),
          pass: PASSES[0],
          done: {}, miss: {}, marks: {},
          band: {}, year: {}, chain: {},
          startedAt: Date.now()};
}

/* A wrong attempt costs the mark but never blocks progress: the reader
   re-places and moves on, and the score stays honest without the game
   turning into a wall. */
function recordAttempt(run, chipId, pass, correct){
  run.done[chipId]  = run.done[chipId]  || {};
  run.miss[chipId]  = run.miss[chipId]  || {};
  run.marks[chipId] = run.marks[chipId] || {};
  if(run.done[chipId][pass]) return run;
  if(!correct){ run.miss[chipId][pass] = true; return run; }
  run.done[chipId][pass]  = true;
  run.marks[chipId][pass] = run.miss[chipId][pass] ? 0 : 1;
  return run;
}

function scoreRun(run){
  var score = 0;
  for(var i = 0; i < run.pool.length; i++){
    var m = run.marks[run.pool[i]] || {};
    for(var j = 0; j < PASSES.length; j++) score += (m[PASSES[j]] || 0);
  }
  return {score: score, max: run.pool.length * PASSES.length};
}

function isRunComplete(run){
  for(var i = 0; i < run.pool.length; i++){
    var d = run.done[run.pool[i]] || {};
    for(var j = 0; j < PASSES.length; j++) if(!d[PASSES[j]]) return false;
  }
  return true;
}

/* First-try misses only, keyed by chip, for merging into the stored counts
   that seed the next run's pool. */
function runMisses(run){
  var out = {};
  for(var id in run.miss){
    if(!Object.prototype.hasOwnProperty.call(run.miss, id)) continue;
    var n = 0;
    for(var j = 0; j < PASSES.length; j++) if(run.miss[id][PASSES[j]]) n++;
    if(n) out[id] = n;
  }
  return out;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {PASSES: PASSES, buildChips: buildChips,
                    acceptedBands: acceptedBands, gradeBand: gradeBand,
                    canonicalOrder: canonicalOrder, orderInPool: orderInPool,
                    gradeYear: gradeYear,
                    gradePlace: gradePlace, gradeWinner: gradeWinner,
                    sideOrder: sideOrder,
                    CHAIN_KEYS: CHAIN_KEYS, CHAIN_LABELS: CHAIN_LABELS,
                    chainParts: chainParts, shuffleChain: shuffleChain,
                    gradeChainStep: gradeChainStep,
                    seedPool: seedPool, newRun: newRun,
                    recordAttempt: recordAttempt, scoreRun: scoreRun,
                    isRunComplete: isRunComplete, runMisses: runMisses};
}
