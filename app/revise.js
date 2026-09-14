/* ============================================================
   revise — the Revise view's pure half.
   No DOM, no globals beyond what it defines. The weak-topic tally
   was computed inside quizUI(), which meant it only existed while
   you were already on the quiz tab; it is the one thing the hub
   most wants to say, so it lives out here where both can call it.
   ============================================================ */
"use strict";

/* rows are the quiz bank, {q: question text, t: topic record id}; prog is
   store.get("quiz"), keyed by question text. answerValue() lives in
   sync.js — the tally only needs "is this a recorded miss", and the shape
   of a stored answer is sync's business, so the caller passes the reader.

   Ties break by id rather than by the order the quiz file happens to list
   them in: a block on the hub that reshuffles its chips between two
   renders of identical data reads as broken. */
function weakTopics(rows, prog, n, valueOf){
  var out = [], miss = {}, i, r, v, ids;
  if(Object.prototype.toString.call(rows) !== "[object Array]") return out;
  if(!prog || typeof prog !== "object") return out;
  var read = valueOf || function(x){ return x; };
  for(i = 0; i < rows.length; i++){
    r = rows[i];
    if(!r || !r.t) continue;
    v = read(prog[r.q]);
    if(v !== 0) continue;
    miss[r.t] = (miss[r.t] || 0) + 1;
  }
  ids = Object.keys(miss).sort(function(a, b){
    if(miss[b] !== miss[a]) return miss[b] - miss[a];
    return a < b ? -1 : a > b ? 1 : 0;
  });
  for(i = 0; i < ids.length && (!n || out.length < n); i++)
    out.push({id: ids[i], misses: miss[ids[i]]});
  return out;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {weakTopics: weakTopics};
}
