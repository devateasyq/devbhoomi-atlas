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
    /* "__proto__" is never a real record id (ids are internal fixed
       strings like "d-kangra", never user-typed) but JSON.parse — unlike
       an object literal — gives it a genuine own enumerable property, so
       it passes the hasOwnProperty check above. Writing out[k] = ... for
       that key would not create an own property at all; it would reassign
       out's own [[Prototype]] to the note object, dropping the entry from
       Object.keys(out) and leaking "text"/"t" as inherited enumerable
       properties into any later for-in over this map. Reject it as junk,
       same as any other malformed entry. */
    if(k === "__proto__") continue;
    v = obj[k];
    if(!v || typeof v !== "object" || typeof v.text !== "string") continue;
    text = v.text.slice(0, NOTE_MAX);
    /* Blank text — including the empty-string tombstone setNote now writes
       for a deletion — used to be dropped right here, which is exactly
       what made a tombstone impossible to represent: an absent key always
       loses to a present remote key in mergeNotes' recency check, so a
       genuine deletion was silently undone by the next sync (review
       finding 2). Keep every entry that has a real text STRING, blank or
       not, and let realNotes() decide what counts as displayable at read
       time. Only an entry with no text string at all — corrupt data — is
       junk and is dropped here. */
    out[k] = {text: text, t: typeof v.t === "number" ? v.t : 0};
  }
  return out;
}

/* The one place "is this a real, displayable note" is decided — a tombstone
   {text: "", t} or a whitespace-only entry is neither, and every reader
   (noteBlock, viewProfile, exportData) must agree on that or a deletion can
   still leak back into the UI as a blank note, or into a tally that counts
   it. Keeping this filter here, instead of copied into three call sites,
   is what "use one treatment" means. */
function realNotes(notes){
  var norm = normaliseNotes(notes), out = {}, k;
  for(k in norm){
    if(!Object.prototype.hasOwnProperty.call(norm, k)) continue;
    if(norm[k].text.trim()) out[k] = norm[k];
  }
  return out;
}

function mergeNotes(a, b){
  var A = normaliseNotes(a), B = normaliseNotes(b), out = {}, k;
  /* A and B already had "__proto__" filtered out by normaliseNotes, so
     out[k] = A[k]/B[k] below can never target that key in practice — but
     this function is exported and must not rely on that invariant holding
     forever, so the same guard is repeated here rather than trusted from
     a distance. See normaliseNotes for why the write is otherwise unsafe. */
  for(k in A) if(Object.prototype.hasOwnProperty.call(A, k) && k !== "__proto__") out[k] = A[k];
  for(k in B){
    if(!Object.prototype.hasOwnProperty.call(B, k) || k === "__proto__") continue;
    /* !out[k] is not a safe "no entry yet" test: for an id that names an
       Object.prototype member (e.g. "toString", "constructor") out[k]
       reads the inherited builtin function — truthy, with no .t — so the
       comparison below silently loses the incoming note instead of taking
       it. hasOwnProperty is required to tell "nothing written yet" apart
       from "inherited from Object.prototype". */
    if(!Object.prototype.hasOwnProperty.call(out, k) || B[k].t > out[k].t) out[k] = B[k];
  }
  return out;
}

function setNote(notes, id, text){
  var out = normaliseNotes(notes), clean = String(text == null ? "" : text).slice(0, NOTE_MAX);
  /* Same hazard as normaliseNotes: "__proto__" is not a real record id, and
     out[id] = ... below would reassign out's own prototype instead of
     storing a note. Treat it as an invalid id: leave the map untouched. */
  if(id === "__proto__") return out;
  /* Clearing a note used to delete the key. mergeNotes is additive with a
     recency tiebreak, so an ABSENT key can never beat a PRESENT one on
     another device — deleting was indistinguishable from "never synced
     that change yet", and the next pull silently brought the note back
     (review finding 2). Write a dated tombstone instead: a deletion is now
     an entry like any other, so it wins a merge exactly when it is the
     more recent change. Whitespace-only input is canonicalised to the same
     empty-string tombstone, matching the old "blank is the same as no
     note" rule. */
  out[id] = {text: clean.trim() ? clean : "", t: Date.now()};
  return out;
}
/* flushNote decides whether the mounted note editor's value should be
   written to storage. Comparing the textarea's text against what is stored
   is not enough on its own: that comparison has no memory of whether the
   student actually typed anything, so anything else that changes
   hpatlas:notes under an open panel — a newer note landing via
   pullAndMerge, a wipe on sign-out — makes the comparison point at a value
   the student never wrote, and it gets saved right back over the top
   (review finding 1, CRITICAL). Gate on "did the student type" (dirty)
   first; only once that is true does the stored-vs-typed comparison run,
   which is what keeps the existing double-save suppression working (blur,
   then the Save button's own blur, must not save/push/toast twice). */
function shouldWriteNote(storedText, typedText, dirty){
  if(!dirty) return false;
  var had = typeof storedText === "string" ? storedText : "";
  var now = typeof typedText === "string" ? typedText : "";
  return now !== had;
}

/* A day counts when any ONE of these is reached. Several routes, because a
   bus journey scrolling Rounds and a sit-down past paper are both revision. */
/* The three rings, plus past papers which qualifies a day without one.
   "notes" is notes WRITTEN, counted once per record — writing on the same
   record five times is one note, not five. */
var DAY_GOAL = {facts: 20, quiz: 5, pyq: 5, notes: 3};

/* How many past days the strip below today can draw. */
var HIST_MAX = 7;

function emptyStreak(){
  return {n: 0, best: 0, last: "", grace: 1, day: "",
          facts: 0, quiz: 0, pyq: 0, noted: [], hist: []};
}

/* Local calendar date. Local midnight ends a day — not a rolling 24 hours,
   and not UTC, which would roll over mid-evening in India. */
function dayKey(date){
  var d = date || new Date();
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

function daysApart(a, b){
  if(!a || !b) return Infinity;
  var pa = String(a).split("-"), pb = String(b).split("-");
  var da = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]);
  var db = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
  return Math.round((db - da) / 86400000);
}

function normaliseStreak(s){
  var e = emptyStreak();
  if(!s || typeof s !== "object") return e;
  return {
    n:     typeof s.n === "number" ? s.n : 0,
    best:  typeof s.best === "number" ? s.best : 0,
    last:  typeof s.last === "string" ? s.last : "",
    grace: typeof s.grace === "number" ? s.grace : 1,
    day:   typeof s.day === "string" ? s.day : "",
    facts: typeof s.facts === "number" ? s.facts : 0,
    quiz:  typeof s.quiz === "number" ? s.quiz : 0,
    pyq:   typeof s.pyq === "number" ? s.pyq : 0,
    /* A streak saved before notes became a ring carries `recs` instead.
       It counted something else entirely — records opened — so it is
       dropped rather than silently reinterpreted as notes written. */
    noted: Array.isArray(s.noted) ? s.noted.slice() : [],
    hist:  normaliseHist(s.hist)
  };
}

function normaliseHist(h){
  var out = [], i, e;
  if(!Array.isArray(h)) return out;
  for(i = 0; i < h.length; i++){
    e = h[i];
    if(!e || typeof e !== "object" || typeof e.d !== "string" || !e.d) continue;
    out.push({d: e.d,
              facts: typeof e.facts === "number" ? e.facts : 0,
              quiz:  typeof e.quiz  === "number" ? e.quiz  : 0,
              pyq:   typeof e.pyq   === "number" ? e.pyq   : 0,
              notes: typeof e.notes === "number" ? e.notes : 0});
  }
  return trimHist(out);
}

/* Newest last, one entry per day, never longer than the strip can show. */
function trimHist(h){
  var by = {}, keys, i, out = [];
  for(i = 0; i < h.length; i++) by[h[i].d] = h[i];
  keys = Object.keys(by).sort();
  for(i = Math.max(0, keys.length - HIST_MAX); i < keys.length; i++) out.push(by[keys[i]]);
  return out;
}

function qualified(s){
  return s.facts >= DAY_GOAL.facts || s.quiz >= DAY_GOAL.quiz ||
         s.pyq >= DAY_GOAL.pyq || s.noted.length >= DAY_GOAL.notes;
}

/* Same YYYY-MM-DD shape as dayKey, moved by whole days. Arithmetic in UTC
   so a DST change cannot add or drop one; the keys themselves are local
   calendar dates and stay that way. */
function shiftDay(key, delta){
  var p = String(key).split("-");
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  d.setUTCDate(d.getUTCDate() + delta);
  var m = d.getUTCMonth() + 1, dd = d.getUTCDate();
  return d.getUTCFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
}

/* The last HIST_MAX days ending today, oldest first, gaps filled with
   zeros so a week away still draws seven rings rather than a short row.
   Today is read live off the counters, not from hist — it has not been
   rolled in yet. */
function recentDays(st, today){
  var s = normaliseStreak(st), t = today || dayKey(), by = {}, out = [], i, d, h;
  for(i = 0; i < s.hist.length; i++) by[s.hist[i].d] = s.hist[i];
  by[t] = {d: t,
           facts: s.day === t ? s.facts : 0,
           quiz:  s.day === t ? s.quiz  : 0,
           pyq:   s.day === t ? s.pyq   : 0,
           notes: s.day === t ? s.noted.length : 0};
  for(i = HIST_MAX - 1; i >= 0; i--){
    d = shiftDay(t, -i);
    h = by[d];
    out.push({d: d, today: d === t,
              facts: h ? h.facts : 0, quiz: h ? h.quiz : 0,
              pyq:   h ? h.pyq   : 0, notes: h ? h.notes : 0});
  }
  return out;
}

function bumpStreak(st, kind, id, today){
  var s = normaliseStreak(st), day = today || dayKey();
  if(s.day !== day){                      /* a new day: counters start again */
    /* The day being left behind goes into hist first, or the strip below
       today would only ever show today. */
    if(s.day) s.hist = trimHist(s.hist.concat([{
      d: s.day, facts: s.facts, quiz: s.quiz, pyq: s.pyq, notes: s.noted.length
    }]));
    s.day = day; s.facts = 0; s.quiz = 0; s.pyq = 0; s.noted = [];
  }
  if(kind === "note"){
    if(id && s.noted.indexOf(id) < 0) s.noted.push(id);
  } else if(kind === "facts" || kind === "quiz" || kind === "pyq"){
    s[kind] += 1;
  }
  /* Any other kind — e.g. a typo like noteActivity("fact", id) — falls
     through both branches above and counts nothing. That is deliberate,
     not an oversight: this comment is the only record of it. */
  if(s.last === day) return s;            /* already counted today */
  if(!qualified(s)) return s;

  var gap = daysApart(s.last, day);
  if(!s.last)            s.n = 1;         /* the first day ever */
  else if(gap === 1)     s.n += 1;
  else if(gap === 2 && s.grace > 0){ s.n += 1; s.grace -= 1; }
  else                   s.n = 1;         /* too long a gap, or no grace left */

  s.last = day;
  if(s.n > s.best) s.best = s.n;
  /* seven consecutive days earns the grace back */
  if(s.n > 0 && s.n % 7 === 0) s.grace = 1;
  return s;
}

/* Two devices both counting today must neither double-count nor reset each
   other, so every field takes the more generous value.

   "Later date wins" cannot be answered by feeding both dates straight to
   daysApart: daysApart returns Infinity when EITHER date is "" (a fresh
   emptyStreak's last/day, e.g. a remote that predates this feature and so
   has no "streak" key at all — normaliseStreak(undefined) above yields
   exactly that). Infinity > 0 reads as "B is later", so an unguarded
   ternary would pick the EMPTY side over a real date, wiping out a real streak's
   last-day and, via the day-gated counters below, today's facts/quiz/pyq/
   recs too — on every user's very first sync after this feature ships.
   Handle "one side has no date" explicitly, before daysApart is ever
   consulted for an actual gap. */
function mergeStreak(a, b){
  var A = normaliseStreak(a), B = normaliseStreak(b);
  var later = !A.last ? B.last : !B.last ? A.last : (daysApart(A.last, B.last) > 0 ? B.last : A.last);
  var day   = !A.day  ? B.day  : !B.day  ? A.day  : (daysApart(A.day,  B.day)  > 0 ? B.day  : A.day);
  var noted = mergeSeen(A.day === day ? A.noted : [], B.day === day ? B.noted : []);
  return {
    n:     Math.max(A.n, B.n),
    best:  Math.max(A.best, B.best),
    last:  later,
    grace: Math.max(A.grace, B.grace),
    day:   day,
    facts: Math.max(A.day === day ? A.facts : 0, B.day === day ? B.facts : 0),
    quiz:  Math.max(A.day === day ? A.quiz  : 0, B.day === day ? B.quiz  : 0),
    pyq:   Math.max(A.day === day ? A.pyq   : 0, B.day === day ? B.pyq   : 0),
    noted: noted,
    hist:  mergeHist(A.hist, B.hist)
  };
}

/* Two devices each hold their own view of a past day. Take the better of
   the two per field, the same generosity the live counters get — nobody
   should lose a closed ring because the other device saw less of it. */
function mergeHist(a, b){
  var by = {}, all = (a || []).concat(b || []), i, e, cur;
  for(i = 0; i < all.length; i++){
    e = all[i]; cur = by[e.d];
    by[e.d] = cur ? {d: e.d,
                     facts: Math.max(cur.facts, e.facts),
                     quiz:  Math.max(cur.quiz,  e.quiz),
                     pyq:   Math.max(cur.pyq,   e.pyq),
                     notes: Math.max(cur.notes, e.notes)}
                  : e;
  }
  return trimHist(Object.keys(by).map(function(k){ return by[k]; }));
}

/* How well the student says they know a fact. Same {value, timestamp}
   shape the quiz and past-paper answers use, so it merges by the same
   most-recent-wins rule — one idea, not two.

   hasOwnProperty throughout, never `!out[k]`: mergeAnswers above still uses
   truthiness, which reads the inherited Object.prototype member for a key
   like "constructor" and silently drops the entry. That was a real bug in
   the notes map. Not repeated here. */
var CONF_VALUES = ["got", "again"];

function confOk(v){ return v === "got" || v === "again"; }

function normaliseConf(obj){
  var out = {}, k, e;
  if(!obj || typeof obj !== "object") return out;
  for(k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if(k === "__proto__") continue;
    e = obj[k];
    if(!e || typeof e !== "object" || !confOk(e.v)) continue;
    out[k] = {v: e.v, t: typeof e.t === "number" ? e.t : 0};
  }
  return out;
}

function mergeConf(a, b){
  var A = normaliseConf(a), B = normaliseConf(b), out = {}, k;
  for(k in A) if(Object.prototype.hasOwnProperty.call(A, k)) out[k] = A[k];
  for(k in B){
    if(!Object.prototype.hasOwnProperty.call(B, k)) continue;
    if(!Object.prototype.hasOwnProperty.call(out, k) || B[k].t > out[k].t) out[k] = B[k];
  }
  return out;
}

/* Pressing the state a card already holds clears it. One button that
   undoes itself is easier to reach, on a card you are scrolling past,
   than a third button for "I was wrong about that". */
function setConf(conf, id, v){
  var out = normaliseConf(conf);
  if(!confOk(v) || id === "__proto__") return out;
  if(Object.prototype.hasOwnProperty.call(out, id) && out[id].v === v){ delete out[id]; return out; }
  out[id] = {v: v, t: Date.now()};
  return out;
}

/* The single source of truth for what syncs and how each key merges. It was
   previously spelled out in four places — localState, both branches of
   pullAndMerge, and mergeState — which is how a key gets missed and its data
   silently stops syncing. Add a key here and every consumer follows. */
var SYNC_KEYS = [
  {k: "seen",   empty: function(){ return []; }, merge: mergeSeen},
  {k: "quiz",   empty: function(){ return {}; }, merge: mergeAnswers},
  {k: "pyq",    empty: function(){ return {}; }, merge: mergeAnswers},
  {k: "conf",   empty: function(){ return {}; }, merge: mergeConf},
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

/* "Clear progress" used to write localState() straight over the remote
   document with no merge — safe back when the document held only
   seen/quiz/pyq and local was authoritative, but not since notes and
   streak joined it: a laptop idle since morning does not know about notes
   written on a phone since, and a non-merge write would replace the
   cloud's copy of them with the laptop's stale one (review finding 4,
   IMPORTANT). Merge first, through the same rules every other sync uses,
   then force only the two fields the button promises to clear — the
   non-merge INTENT (a cleared answer must not come back) survives; the
   collateral damage to notes and streak does not. */
function resetDocument(local, remote){
  var out = mergeState(local, remote || {});
  out.quiz = {};
  out.pyq = {};
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
                    resetDocument: resetDocument,
                    answerValue: answerValue, recordAnswer: recordAnswer,
                    SYNC_KEYS: SYNC_KEYS, NOTE_MAX: NOTE_MAX, normaliseNotes: normaliseNotes,
                    realNotes: realNotes, mergeNotes: mergeNotes, setNote: setNote,
                    shouldWriteNote: shouldWriteNote,
                    CONF_VALUES: CONF_VALUES, normaliseConf: normaliseConf,
                    mergeConf: mergeConf, setConf: setConf,
                    DAY_GOAL: DAY_GOAL, HIST_MAX: HIST_MAX, emptyStreak: emptyStreak,
                    shiftDay: shiftDay, recentDays: recentDays, mergeHist: mergeHist,
                    dayKey: dayKey,
                    daysApart: daysApart, bumpStreak: bumpStreak};
}
