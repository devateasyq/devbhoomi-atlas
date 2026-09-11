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
      var n = 0;
      for(var a = 0; a < atoms.length; a++){
        if(!keepFact(atoms[a], name)) continue;
        out.push({id: r.id + "#" + n, srcId: r.id, kind: k, name: name, text: atoms[a]});
        n++;
      }
    }
  }
  return out;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {buildFacts: buildFacts, splitHook: splitHook,
                    keepFact: keepFact, MIN_FACT: MIN_FACT, MAX_FACT: MAX_FACT};
}
