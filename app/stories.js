/* ============================================================
   stories — the Overview strip's pure half.
   No DOM, no globals beyond what it defines. The day's five are a
   function of the calendar date and the corpus alone: no progress,
   no storage, no network. The same five all day, on every device.
   ============================================================ */
"use strict";

var STORY_N = 5;      /* cards in the strip */
var TEASER_MAX = 110; /* a card's line, before the ellipsis */

/* ---------- the day ---------- */

/* "What day is it" is sync.js's question, not this module's — the streak
   already answers it, and local midnight is already its rule and its test.
   Every entry point here takes that key as a string instead, so the app has
   one definition of the calendar day rather than two that can drift apart. */

/* FNV-1a over the date string, then one avalanche round. FNV alone leaves
   adjacent keys — which is all we ever hash — in adjacent buckets, and
   mulberry32 seeded with neighbouring integers opens with similar output,
   so consecutive days would draw overlapping strips. The mix is what makes
   the 14th and the 15th unrelated. */
function daySeed(key){
  var h = 0x811c9dc5, s = String(key);
  for(var i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/* mulberry32: small, fast, deterministic. Good enough for a shuffle that
   nobody is betting on. */
function mulberry32(seed){
  var state = seed >>> 0;
  return function(){
    state = (state + 0x6D2B79F5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- the teaser line ---------- */

/* Prose carries <b> and <i>; a card's line is text. */
function strip(v){ return String(v == null ? "" : v).replace(/<[^>]*>/g, ""); }

function firstProse(r){
  var b, i, bl = (r && r.blocks) || [];
  for(i = 0; i < bl.length; i++){ b = bl[i]; if(b[0] === "p") return strip(b[1]); }
  for(i = 0; i < bl.length; i++){
    b = bl[i];
    if(b[0] === "ul" && Object.prototype.toString.call(b[1]) === "[object Array]") return strip(b[1][0]);
  }
  return "";
}

/* Cut on a word boundary — a line sliced mid-word reads as broken rather
   than as truncated. */
function clamp(s, n){
  s = String(s || "").replace(/\s+/g, " ").trim();
  if(s.length <= n) return s;
  var cut = s.slice(0, n);
  var sp = cut.lastIndexOf(" ");
  if(sp > 0) cut = cut.slice(0, sp);
  return cut.replace(/[,;:]$/, "") + "…";
}

/* No record carries a summary field, so the line is derived. Battles have
   no blocks at all and twenty-two of the twenty-nine rivers have none
   either, which is what the tail of this chain is for — it was measured
   against the corpus, and all 270 records yield a line. */
function teaser(r, max){
  var t = firstProse(r);
  if(!t && r) t = strip(r.sig || r.one || r.note || r.meaning || r.s || "");
  return clamp(t, max || TEASER_MAX);
}

/* ---------- the day's pick ---------- */

/* Fisher-Yates, backwards, over a copy. The copy matters twice: the caller's
   pool is the app's live index, and the sort below would otherwise reorder
   it permanently. */
function shuffled(list, rng){
  var a = list.slice();
  for(var i = a.length - 1; i > 0; i--){
    var j = Math.floor(rng() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* Entries are {r, kind}, as IDX holds them.

   Sorted by id before the shuffle so the day's five never depend on the
   order the data files happened to load — otherwise adding a record to the
   middle of places.js would silently reshuffle every future day.

   Two passes. The first takes a record only where its kind is unused, which
   is what stops a day being five lakes. The second fills from whatever is
   left, so a caller handing in a single-kind pool gets a full strip rather
   than one card. With eleven kinds and five slots the second pass is
   unreachable for the real corpus, but the function is total without it. */
function pickStories(entries, seed, n){
  var want = n || STORY_N;
  var pool = entries.slice().sort(function(a, b){
    return a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0;
  });
  var order = shuffled(pool, mulberry32(seed));
  var out = [], kinds = {}, taken = {}, i, e;
  for(i = 0; i < order.length && out.length < want; i++){
    e = order[i];
    if(kinds[e.kind]) continue;
    kinds[e.kind] = 1; taken[e.r.id] = 1; out.push(e);
  }
  for(i = 0; i < order.length && out.length < want; i++){
    e = order[i];
    if(taken[e.r.id]) continue;
    taken[e.r.id] = 1; out.push(e);
  }
  return out;
}

/* `key` is a local YYYY-MM-DD date, as sync.js's dayKey() returns. */
function todayStories(entries, n, key){
  return pickStories(entries, daySeed(key), n || STORY_N);
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {daySeed: daySeed, mulberry32: mulberry32,
                    strip: strip, firstProse: firstProse, clamp: clamp, teaser: teaser,
                    pickStories: pickStories, todayStories: todayStories,
                    STORY_N: STORY_N, TEASER_MAX: TEASER_MAX};
}
