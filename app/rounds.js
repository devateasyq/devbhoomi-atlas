/* ============================================================
   rounds — the fact feed's pure half.
   No DOM, no globals beyond what it defines. Facts are derived
   from the records' exam-hook notes at runtime, never authored
   separately, so a fact cannot drift from its source note.
   ============================================================ */
"use strict";

var MIN_FACT = 8;    /* "NTPC" is not a fact */
var MAX_FACT = 120;  /* above this a hook is a run of several facts */

/* Hooks are pipe-separated runs of facts carrying <b> emphasis, e.g.
   "3,930 m · Zanskar range · the <b>Sutlej enters India here</b>". */
function splitHook(raw){
  var txt = String(raw).replace(/<[^>]+>/g, "");
  var parts = txt.split("·");
  var out = [];
  for(var i = 0; i < parts.length; i++){
    var t = parts[i].replace(/\s+/g, " ").trim().replace(/\.$/, "");
    if(!t) continue;
    if(t.length > MAX_FACT){
      /* some hooks use no separator at all, so the whole hook arrives as
         one atom — the Hamirpur hook runs to 185 characters and covers
         two different districts */
      var pieces = t.split(/\.\s+/);
      for(var j = 0; j < pieces.length; j++){
        var p = pieces[j].replace(/\s+/g, " ").trim().replace(/\.$/, "");
        if(p) out.push(p);
      }
    } else out.push(t);
  }
  return out;
}

function keepFact(text, name){
  if(text.length < MIN_FACT || text.length > MAX_FACT) return false;
  /* An atom that only restates the record's own name says nothing: the
     name is already the headline on the card. "Dharmsura (White Sail) —
     also called White Sail" is the case this removes. */
  var core = text.toLowerCase().replace(/^(also (called|known as|spelt|spelled)|aka)\s+/, "");
  var ck = core.replace(/[^a-z0-9]+/g, "");
  var nk = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "");
  if(!ck) return false;
  if(nk && nk.indexOf(ck) >= 0) return false;
  return true;
}

/* Ids were recordId + "#" + the atom's index, so adding, removing or
   reordering a line in a record's exam hook shifted every id after it onto
   a different fact. That only mis-attributed `seen`, which is cosmetic —
   but a confidence rating landing on the wrong fact would bury something
   the student does not know, which is the opposite of the job. Hash the
   fact's own text instead: reordering moves nothing, and genuinely editing
   a fact's wording correctly makes it a new card, because it is one. */
function hash32(s){
  var h = 2166136261, i;                 /* FNV-1a, 32-bit */
  for(i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}
function factId(recordId, text){
  return recordId + "#" + hash32(String(text == null ? "" : text));
}

/* Ids that no current fact claims — a fact whose wording was edited, or
   anything left over from the old positional scheme. Dropped on load so
   they neither inflate the seen count nor sit in the synced document
   forever. */
function pruneSeen(seen, facts){
  /* Object.create(null), not {}: a plain object inherits Object.prototype,
     so have["constructor"] reads a function and reports a junk id as
     claimed by a real fact. The same shape has already cost this codebase
     two bugs — one in the notes map, one in mergeNotes. */
  var have = Object.create(null), out = [], i, list = seen || [];
  for(i = 0; i < (facts || []).length; i++) have[facts[i].id] = 1;
  for(i = 0; i < list.length; i++)
    if(have[list[i]]) out.push(list[i]);
  return out;
}

function buildFacts(D){
  var groups = [["district", D.districts], ["state", D.states], ["event", D.events],
                ["battle", D.battles], ["person", D.people], ["topic", D.topics],
                ["river", D.rivers], ["feature", D.features]];
  var out = [];
  for(var g = 0; g < groups.length; g++){
    var kind = groups[g][0], list = groups[g][1] || [];
    for(var i = 0; i < list.length; i++){
      var r = list[i];
      var name = r.name || r.t || r.title || r.id;
      /* feature records carry their own kind, so a pass shows as PASS */
      var k = (kind === "feature" && r.k) ? r.k : kind;
      var blocks = r.blocks || [], atoms = [];
      for(var b = 0; b < blocks.length; b++){
        if(blocks[b][0] !== "note") continue;
        if(!/exam hook/i.test(String(blocks[b][1]))) continue;
        atoms = atoms.concat(splitHook(blocks[b][2]));
      }
      for(var a = 0; a < atoms.length; a++){
        if(!keepFact(atoms[a], name)) continue;
        out.push({id: factId(r.id, atoms[a]), srcId: r.id, kind: k, name: name, text: atoms[a]});
      }
    }
  }
  return out;
}

function shuffle(a){
  for(var i = a.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* Unseen facts first, shuffled. Seen facts follow oldest-first, so when
   the pool is exhausted the feed cycles into what you saw longest ago —
   spaced repetition for free, and no "you're done" wall. */
function orderFacts(facts, seen){
  var at = {}, list = seen || [];
  for(var i = 0; i < list.length; i++) if(!(list[i] in at)) at[list[i]] = i;
  var fresh = [], stale = [];
  for(var j = 0; j < facts.length; j++){
    if(facts[j].id in at) stale.push(facts[j]); else fresh.push(facts[j]);
  }
  shuffle(fresh);
  stale.sort(function(x, y){ return at[x.id] - at[y.id]; });
  return fresh.concat(stale);
}

/* What to draw behind a fact. The feed is the atlas's feed, so every card
   shows where its subject is: the district filled, the river traced, or a
   point in the right valley. Returns null when a record has no geometry —
   the card then shows the outline alone. */
function factGeom(rec, kind, MAP){
  if(!rec || !MAP) return null;
  if(kind === "district" && rec.map && MAP.paths[rec.map])
    return {shape: "area", d: MAP.paths[rec.map]};
  if(kind === "river" && MAP.rivers && MAP.rivers[rec.id])
    return {shape: "line", d: MAP.rivers[rec.id].d};
  var pid = rec.pid || rec.seat || rec.place;
  if(pid && MAP.places && MAP.places[pid])
    return {shape: "point", x: MAP.places[pid].x, y: MAP.places[pid].y};
  return null;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {buildFacts: buildFacts, orderFacts: orderFacts, factGeom: factGeom, splitHook: splitHook,
                    keepFact: keepFact, MIN_FACT: MIN_FACT, MAX_FACT: MAX_FACT,
                    factId: factId, pruneSeen: pruneSeen};
}
