/* ============================================================
   sync — the merge rules, and nothing else.
   No Firebase, no DOM, no storage. Two devices diverge, and
   every rule here exists so that nobody is punished for owning
   two devices: progress is never lost, only reconciled.
   ============================================================ */
"use strict";

/* Answers were once stored as a bare 1 or 0 with no timestamp, which makes
   "most recent wins" unanswerable. Legacy values lift to t:0 so they lose
   to any answer that carries a real time. */
function normaliseAnswers(obj){
  var out = {};
  if(!obj || typeof obj !== "object") return out;
  for(var k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    var v = obj[k];
    if(typeof v === "number") out[k] = {v: v ? 1 : 0, t: 0};
    else if(v && typeof v === "object" && typeof v.v === "number")
      out[k] = {v: v.v ? 1 : 0, t: typeof v.t === "number" ? v.t : 0};
    /* anything else is corrupt and is dropped rather than propagated */
  }
  return out;
}

function mergeAnswers(a, b){
  var A = normaliseAnswers(a), B = normaliseAnswers(b), out = {}, k;
  for(k in A) if(Object.prototype.hasOwnProperty.call(A, k)) out[k] = A[k];
  for(k in B){
    if(!Object.prototype.hasOwnProperty.call(B, k)) continue;
    if(!out[k] || B[k].t > out[k].t) out[k] = B[k];
  }
  return out;
}

/* Union, order stable: everything from a in order, then what only b has. */
function mergeSeen(a, b){
  var out = [], has = {}, i;
  var A = Array.isArray(a) ? a : [], B = Array.isArray(b) ? b : [];
  for(i = 0; i < A.length; i++) if(!has[A[i]]){ has[A[i]] = 1; out.push(A[i]); }
  for(i = 0; i < B.length; i++) if(!has[B[i]]){ has[B[i]] = 1; out.push(B[i]); }
  return out;
}

function mergeStreak(a, b){
  return Math.max(typeof a === "number" ? a : 0, typeof b === "number" ? b : 0);
}

/* Only the keys that belong to the person. Theme, hidden map layers and the
   legend's state belong to the device and are deliberately absent. */
function mergeState(local, remote){
  var L = local || {}, R = remote || {};
  return {
    seen: mergeSeen(L.seen, R.seen),
    quiz: mergeAnswers(L.quiz, R.quiz),
    pyq:  mergeAnswers(L.pyq,  R.pyq)
  };
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {normaliseAnswers: normaliseAnswers, mergeAnswers: mergeAnswers,
                    mergeSeen: mergeSeen, mergeStreak: mergeStreak, mergeState: mergeState};
}
