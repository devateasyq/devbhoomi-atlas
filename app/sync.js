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
    if(typeof v === "number" && (v === 0 || v === 1)) out[k] = {v: v, t: 0};
    else if(v && typeof v === "object" && (v.v === 0 || v.v === 1))
      out[k] = {v: v.v, t: typeof v.t === "number" ? v.t : 0};
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

/* Notes share one Firestore document with progress, and that document has a
   hard 1 MB limit. Exceed it and the WHOLE write is rejected — so an
   unbounded note would silently stop quiz progress syncing too. */
var NOTE_MAX = 1000;

function normaliseNotes(obj){
  var out = {}, k, v, text;
  if(!obj || typeof obj !== "object") return out;
  for(k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    v = obj[k];
    if(!v || typeof v !== "object" || typeof v.text !== "string") continue;
    text = v.text.slice(0, NOTE_MAX);
    if(!text.trim()) continue;          /* blank is the same as no note */
    out[k] = {text: text, t: typeof v.t === "number" ? v.t : 0};
  }
  return out;
}

function mergeNotes(a, b){
  var A = normaliseNotes(a), B = normaliseNotes(b), out = {}, k;
  for(k in A) if(Object.prototype.hasOwnProperty.call(A, k)) out[k] = A[k];
  for(k in B){
    if(!Object.prototype.hasOwnProperty.call(B, k)) continue;
    if(!out[k] || B[k].t > out[k].t) out[k] = B[k];
  }
  return out;
}

function setNote(notes, id, text){
  var out = normaliseNotes(notes), clean = String(text == null ? "" : text).slice(0, NOTE_MAX);
  if(!clean.trim()) { delete out[id]; return out; }
  out[id] = {text: clean, t: Date.now()};
  return out;
}
/* replaced in Task 3 */
function emptyStreak(){ return {}; }
function mergeStreak(a, b){ return {}; }

/* The single source of truth for what syncs and how each key merges. It was
   previously spelled out in four places — localState, both branches of
   pullAndMerge, and mergeState — which is how a key gets missed and its data
   silently stops syncing. Add a key here and every consumer follows. */
var SYNC_KEYS = [
  {k: "seen",   empty: function(){ return []; }, merge: mergeSeen},
  {k: "quiz",   empty: function(){ return {}; }, merge: mergeAnswers},
  {k: "pyq",    empty: function(){ return {}; }, merge: mergeAnswers},
  {k: "notes",  empty: function(){ return {}; }, merge: mergeNotes},
  {k: "streak", empty: emptyStreak,              merge: mergeStreak}
];
function mergeState(local, remote){
  var L = local || {}, R = remote || {}, out = {}, i, e;
  for(i = 0; i < SYNC_KEYS.length; i++){
    e = SYNC_KEYS[i];
    out[e.k] = e.merge(L[e.k], R[e.k]);
  }
  return out;
}

/* One reader for both shapes. Every call site must go through this, or old
   saved progress reads as unattempted and a user's history vanishes. */
function answerValue(x){
  if(typeof x === "number") return x ? 1 : 0;
  if(x && typeof x === "object" && typeof x.v === "number") return x.v ? 1 : 0;
  return undefined;
}
function recordAnswer(prog, key, correct){
  var out = {}, k;
  for(k in prog) if(Object.prototype.hasOwnProperty.call(prog, k)) out[k] = prog[k];
  out[key] = {v: correct ? 1 : 0, t: Date.now()};
  return out;
}

if(typeof module !== "undefined" && module.exports){
  module.exports = {normaliseAnswers: normaliseAnswers, mergeAnswers: mergeAnswers,
                    mergeSeen: mergeSeen, mergeStreak: mergeStreak, mergeState: mergeState,
                    answerValue: answerValue, recordAnswer: recordAnswer,
                    SYNC_KEYS: SYNC_KEYS, NOTE_MAX: NOTE_MAX, normaliseNotes: normaliseNotes,
                    mergeNotes: mergeNotes, setNote: setNote};
}
