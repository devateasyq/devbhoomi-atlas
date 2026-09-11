/* ============================================================
   Parikrama Path — application
   Every view is a projection of the single D object in /data.
   ============================================================ */
"use strict";

/* ---------- index ---------- */
const ERA = Object.fromEntries(D.eras.map(e => [e.id, e]));
const KINDS = {
  district:{lb:"District",        pl:"Districts",        c:"var(--e4)",  view:"map"},
  state:   {lb:"Princely State",  pl:"Hill states",      c:"var(--e6)",  view:"map"},
  event:   {lb:"Event",           pl:"Timeline events",  c:"var(--e2)",  view:"timeline"},
  battle:  {lb:"Battle / Treaty", pl:"Battles & treaties",c:"var(--e7)", view:"battles"},
  person:  {lb:"Person",          pl:"People",           c:"var(--e9)",  view:"people"},
  topic:   {lb:"Topic",           pl:"Topic notes",      c:"var(--accent)",view:"topics"},
  river:   {lb:"River",           pl:"Rivers",           c:"var(--water)", view:"map"},
  peak:    {lb:"Peak",            pl:"Peaks",            c:"var(--ink-2)", view:"map"},
  pass:    {lb:"Pass",            pl:"Passes",           c:"var(--e2)",    view:"map"},
  lake:    {lb:"Lake",            pl:"Lakes & reservoirs",c:"var(--indigo)",view:"map"},
  glacier: {lb:"Glacier",         pl:"Glaciers",         c:"var(--e3)",    view:"map"}
};
const KIND_ORDER = ["district","river","peak","pass","lake","glacier",
                    "state","person","event","battle","topic"];
const IDX = new Map();
[[D.districts,"district"],[D.states,"state"],[D.events,"event"],
 [D.battles,"battle"],[D.people,"person"],[D.topics,"topic"],[D.rivers,"river"]]
  .forEach(([arr,k]) => arr.forEach(r => IDX.set(r.id, {r, kind:k})));
/* Features carry their own kind on the record, so they cannot use the
   fixed array-to-kind mapping above. */
(D.features || []).forEach(r => IDX.set(r.id, {r, kind:r.k}));
const PLACE_REC = new Map((D.features || []).map(r => [r.pid, r.id]));
/* Facts are a projection of the records, built once at load like SEARCH. */
const FACTS = buildFacts(D);

/* Every marker's district, resolved once at load. A record's own
   `districts` list wins where it has one — it is curated, and it is right
   for border cases like Shipki La, which sits outside the simplified
   outline. Geometry answers the rest, and the nearest centroid catches
   the handful on a boundary. */
const MK_DIST = (() => {
  const byMap = {};
  D.districts.forEach(d => { if(d.map) byMap[d.map] = d.id; });
  const out = {};
  for(const [pid, p] of Object.entries(MAP.places)){
    const rec = PLACE_REC.has(pid) ? IDX.get(PLACE_REC.get(pid)).r : null;
    if(rec && rec.districts && rec.districts.length){ out[pid] = rec.districts.slice(); continue; }
    const hit = districtAt(p.x, p.y, MAP.paths) || nearestDistrict(p.x, p.y, MAP.centroids);
    out[pid] = hit && byMap[hit] ? [byMap[hit]] : [];
  }
  return out;
})();
/* rivers declare the districts they flow through */
const RIVER_DIST = (() => {
  const out = {};
  (D.rivers || []).forEach(r => { out[r.id] = (r.districts || []).slice(); });
  return out;
})();

const nameOf = o => o.r.name || o.r.t || o.r.title;
const eraOf  = o => o.r.era ? ERA[o.r.era] : null;
const rels   = r => (r.rel || []).filter(id => IDX.has(id));

/* ---------- dom & storage helpers ---------- */
const $ = s => document.querySelector(s);
const num = n => n == null ? "" : n.toLocaleString("en-IN");
const store = {
  get(k,d){ try{ const v=localStorage.getItem("hpatlas:"+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem("hpatlas:"+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem("hpatlas:"+k); }catch(e){} }
};
let toastTimer = null;
function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove("on"), 2200);
}

function renderBlocks(arr){
  if(!arr || !arr.length) return "";
  let out = '<div class="blk">';
  for(const b of arr){
    const t = b[0];
    if(t==="h")        out += '<h5>'+b[1]+'</h5>';
    else if(t==="p")   out += '<p>'+b[1]+'</p>';
    else if(t==="ul")  out += '<ul>'+b[1].map(x=>'<li>'+x+'</li>').join('')+'</ul>';
    else if(t==="note"){
      const dis = /disput|correction|check/i.test(b[1]);
      out += '<div class="note'+(dis?' dispute':'')+'"><div class="lb">'+b[1]+'</div><p>'+b[2]+'</p></div>';
    }
  }
  return out+'</div>';
}
function factsList(pairs){
  const rows = pairs.filter(p => p[1] != null && p[1] !== "");
  if(!rows.length) return "";
  return '<dl class="facts">'+rows.map(p=>'<dt>'+p[0]+'</dt><dd>'+p[1]+'</dd>').join('')+'</dl>';
}

/* ---------- app state ---------- */
const S = {
  view:"home", sel:null, trail:[], seen:[], legendOpen:false, focus:"",
  era:"all", battleFilter:"all", topicSec:"all",
  revMode:"papers",
  qIdx:0, qSec:"all", qAnswered:null,
  pyYear:"all", pyHP:true, pyIdx:0, pyAnswered:null
};

const NAV = [
  {id:"home",     lb:"Overview", mob:1, ic:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'},
  {id:"map",      lb:"Map", mob:1,      ic:'<path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/>'},
  {id:"timeline", lb:"Timeline", ic:'<path d="M12 3v18"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="17" r="2"/><path d="M14 7h6M4 17h6"/>'},
  {id:"battles",  lb:"Battles",  ic:'<path d="M14.5 14.5L21 21M9.5 14.5L3 21"/><path d="M18 3l-9 9M6 3l9 9"/>'},
  {id:"topics",   lb:"Topics",   ic:'<path d="M4 5h16M4 12h16M4 19h10"/>'},
  {id:"people",   lb:"People",   ic:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6"/>'},
  {id:"trends",   lb:"Trends",   ic:'<path d="M4 19V5"/><path d="M4 15l5-5 4 4 7-7"/><path d="M20 11V7h-4"/>'},
  {id:"rounds",   lb:"Rounds", mob:1,   ic:'<path d="M12 3a9 9 0 109 9"/><path d="M12 7a5 5 0 105 5"/><circle cx="12" cy="12" r="1.6"/>'},
  {id:"revise",   lb:"Revise", mob:1,   ic:'<path d="M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M9 8h6"/>'}
];
const COUNTS = {map:D.districts.length, timeline:D.events.length, battles:D.battles.length,
                topics:D.topics.length, people:D.people.length, trends:D.pyq.length,
                rounds:FACTS.length, revise:D.quiz.length + D.pyq.length};
const SUB = {home:"Start here", map:"12 districts · "+D.states.length+" hill states",
             timeline:"Prehistory to 1971", battles:"Wars, sieges and treaties",
             topics:"Notes by subject", people:"Rulers, rebels, builders",
             trends:"What the papers actually ask", rounds:"One fact at a time",
             revise:"Past papers and quiz"};
const TITLE = {home:"Overview", map:"Atlas", timeline:"Timeline", battles:"Battles & Treaties",
               topics:"Topics", people:"People", trends:"Question Trends", rounds:"Rounds", revise:"Revise"};

/* ---------- router: #/view or #/view/record-id ---------- */
function currentHash(){ return "#/"+S.view+(S.sel ? "/"+S.sel : ""); }
function writeHash(){
  const h = currentHash();
  if(location.hash !== h) location.hash = h;
}
function readHash(){
  const parts = location.hash.replace(/^#\/?/,"").split("/").filter(Boolean);
  const view = parts[0] && TITLE[parts[0]] ? parts[0] : "home";
  const id = parts[1] && IDX.has(parts[1]) ? parts[1] : null;
  return {view, id};
}
function applyHash(){
  const {view, id} = readHash();
  if(id){
    const o = IDX.get(id);
    if(o.kind === "event" && o.r.era) S.era = o.r.era;
    setView(view, true);
    openRec(id, null, true);
  } else {
    if(S.sel){ S.sel = null; $("#panel").hidden = true; }
    setView(view, true);
  }
}
window.addEventListener("hashchange", () => {
  // Ignore the hashchange caused by our own writeHash().
  const {view, id} = readHash();
  if(view === S.view && (id || null) === S.sel) return;
  applyHash();
});

/* ---------- navigation ---------- */
function buildNav(){
  $("#railnav").innerHTML = NAV.map(n =>
    '<button class="navbtn" type="button" data-view="'+n.id+'">'+
    '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+n.ic+'</svg><span>'+n.lb+'</span>'+
    (COUNTS[n.id] ? '<span class="cnt">'+COUNTS[n.id]+'</span>' : '')+'</button>').join('');
  /* Nine tabs clipped their own labels on a phone. The bar carries the four
     you reach for; everything else is one tap away on the Overview. */
  $("#mtabs").innerHTML = NAV.filter(n => n.mob).map(n =>
    '<button class="mtab" type="button" data-view="'+n.id+'">'+
    '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+n.ic+'</svg><span>'+n.lb+'</span></button>').join('');
}
function setView(view, fromHash){
  S.view = view;
  document.querySelectorAll("[data-view]").forEach(b => {
    if(b.dataset.view === view) b.setAttribute("aria-current","page");
    else b.removeAttribute("aria-current");
  });
  $("#crumbtitle").textContent = TITLE[view];
  $("#crumbsub").textContent = SUB[view];
  $("#vbtitle").textContent = TITLE[view];
  $("#vbsub").textContent = SUB[view];
  render();
  $("#stage").scrollTop = 0;
  if(!fromHash) writeHash();
}
function go(view){ setView(view, false); }

/* ---------- locator minimap ---------- */
function locatorFor(id){
  const o = IDX.get(id); if(!o) return "";
  const r = o.r;
  let hiName = null, mark = null, caption = "";

  if(o.kind === "district"){ hiName = r.map; caption = "<b>"+r.name+" district</b>"+r.hq+" · "+num(r.area)+" km²"; }
  else if(o.kind === "river"){
    const geo = MAP.rivers[id];
    const paths = Object.values(MAP.paths).map(dd => '<path class="lp" d="'+dd+'"/>').join('');
    return '<div class="locator"><svg viewBox="0 0 '+MAP.w+' '+MAP.h+'" aria-hidden="true">'+paths+
      '<path class="lr" d="'+geo.d+'"/></svg><div class="lt"><b>'+r.name+'</b>'+
      (r.lenHP || r.joins || "")+'</div></div>';
  }
  else {
    const pid = r.seat || r.place || r.pid;
    if(pid && MAP.places[pid]){
      const p = MAP.places[pid];
      mark = [p.x, p.y];
      caption = "<b>"+p.n+"</b>"+p.lat.toFixed(2)+"°N, "+p.lng.toFixed(2)+"°E";
    }
    const d = (r.rel || []).find(x => IDX.has(x) && IDX.get(x).kind === "district");
    if(d){
      hiName = IDX.get(d).r.map;
      if(!caption) caption = "<b>"+IDX.get(d).r.name+" district</b>Where this belongs today";
      else caption += "<br>in " + IDX.get(d).r.name + " district";
    }
  }
  if(!hiName && !mark) return "";

  const paths = Object.entries(MAP.paths).map(([n,dd]) =>
    '<path class="'+(n===hiName?"lh":"lp")+'" d="'+dd+'"/>').join('');
  return '<div class="locator">'+
    '<svg viewBox="0 0 '+MAP.w+' '+MAP.h+'" aria-hidden="true">'+paths+
      (mark ? '<circle class="lm" cx="'+mark[0]+'" cy="'+mark[1]+'" r="26"/>' : '')+
    '</svg><div class="lt">'+caption+'</div></div>';
}

/* ---------- related, grouped by kind ---------- */
function relBlock(ids){
  const valid = ids.filter(id => IDX.has(id));
  if(!valid.length) return "";
  const byKind = {};
  valid.forEach(id => { const k = IDX.get(id).kind; (byKind[k] = byKind[k] || []).push(id); });
  const rows = KIND_ORDER.filter(k => byKind[k]).map(k =>
    '<div class="relrow"><span class="rl" style="color:'+KINDS[k].c+'">'+KINDS[k].pl+'</span>'+
    '<div class="rel">'+byKind[k].map(id =>
      '<button class="relchip" type="button" data-go="'+id+'">'+
      '<i class="k" style="background:'+KINDS[k].c+'"></i>'+nameOf(IDX.get(id))+'</button>').join('')+
    '</div></div>').join('');
  return '<div class="blk"><h5>Connected to — '+valid.length+' records</h5><div class="relgrp">'+rows+'</div></div>';
}

/* ---------- trail ---------- */
function pushTrail(id){
  const i = S.trail.indexOf(id);
  if(i >= 0) S.trail = S.trail.slice(0, i+1);
  else { S.trail.push(id); if(S.trail.length > 9) S.trail.shift(); }
}
function renderTrail(){
  const t = $("#trail");
  if(S.trail.length < 2){ t.hidden = true; t.innerHTML = ""; return; }
  t.hidden = false;
  t.innerHTML = '<span class="tl-lb">Path</span>'+S.trail.map((id,i) => {
    const last = i === S.trail.length-1;
    return (i ? '<span class="sep">&rsaquo;</span>' : '')+
      '<button type="button" class="'+(last?"cur":"")+'" data-trail="'+id+'">'+nameOf(IDX.get(id))+'</button>';
  }).join('');
  t.scrollLeft = t.scrollWidth;
}

/* Each kind shows only its own rows; factsList() already drops empties,
   so a record that omits an optional field simply loses that row. */
const FEATURE_FACTS = {
  peak:    [["Height","alt"],["Range","range"],["Also called","alias"],
            ["Known for","fame"]],
  pass:    [["Height","alt"],["Range","range"],["Connects","connects"],
            ["Status","status"],["On the route to","route"]],
  lake:    [["Type","type"],["Altitude","alt"],["On river","river"],
            ["Sacred to","sacred"],["Ramsar site","ramsar"]],
  glacier: [["Size","size"],["Valley / basin","valley"],["Feeds","feeds"],
            ["Retreat","retreat"]]
};

/* The forward direction lives in each feature's own `rel`; the reverse
   direction is generated here so the two can never disagree. */
const TOPIC_FEATURES = {"t-peaks":["peak","glacier"], "t-passes":["pass"], "t-lakes":["lake"]};
function featureChips(kinds){
  return kinds.map(k => {
    const list = (D.features || []).filter(f => f.k === k);
    if(!list.length) return "";
    return '<div class="blk"><h5>All '+list.length+' '+KINDS[k].pl.toLowerCase()+'</h5><div class="rel">'+
      list.map(f => '<button class="relchip" type="button" data-go="'+f.id+'">'+
        '<i class="k" style="background:'+KINDS[k].c+'"></i>'+f.name+'</button>').join('')+
      '</div></div>';
  }).join('');
}
function featuresIn(did){
  return (D.features || []).filter(f => (f.districts || []).includes(did));
}

/* ---------- detail panel ---------- */
function openRec(id, headerNote, fromHash){
  const o = IDX.get(id); if(!o) return;
  S.sel = id;
  pushTrail(id);
  const r = o.r, k = o.kind, era = eraOf(o);
  $("#pkind").textContent = headerNote ? headerNote+" · "+KINDS[k].lb : KINDS[k].lb;
  $("#ptitle").textContent = nameOf(o);
  let body = "";

  if(k === "district"){
    body += factsList([
      ["Headquarters", r.hq], ["Division", r.div+" division"], ["Formed", r.formed],
      ["Area", num(r.area)+" km²"], ["Population", num(r.pop)+"  (2011)"],
      ["Density", r.den+" / km²"], ["Literacy", r.lit+" %"], ["Sex ratio", r.sr]
    ]);
    body += locatorFor(id);
    if(r.fromStates){
      const v = r.fromStates.filter(x => IDX.has(x));
      if(v.length) body += '<div class="blk"><h5>Formed from these states</h5><div class="rel">'+
        v.map(x => '<button class="relchip" type="button" data-go="'+x+'">'+
        '<i class="k" style="background:'+KINDS.state.c+'"></i>'+IDX.get(x).r.name+'</button>').join('')+'</div></div>';
    }
    body += renderBlocks(r.blocks);
    const fs = featuresIn(id);
    if(fs.length) body += '<div class="blk"><h5>Features in this district — '+fs.length+'</h5><div class="rel">'+
      fs.map(f => '<button class="relchip" type="button" data-go="'+f.id+'">'+
        '<i class="k" style="background:'+KINDS[f.k].c+'"></i>'+f.name+'</button>').join('')+
      '</div></div>';
  }
  else if(k === "state"){
    body += factsList([
      ["Founded", r.founded], ["Founder", r.founder], ["Capital", r.capital],
      ["Dynasty", r.dynasty], ["Group", r.group], ["Fate", r.merged]
    ]);
    body += locatorFor(id);
    body += renderBlocks(r.blocks);
    if(r.rulers && r.rulers.length)
      body += '<div class="blk"><h5>Rulers to remember</h5><ul>'+r.rulers.map(x=>'<li>'+x+'</li>').join('')+'</ul></div>';
  }
  else if(k === "event"){
    body += factsList([["Date", r.yr], ["Era", era ? era.name : ""]]);
    body += '<div class="blk"><p style="color:var(--ink);font-weight:500">'+r.s+'</p></div>';
    body += locatorFor(id);
    body += renderBlocks(r.blocks);
  }
  else if(k === "battle"){
    body += factsList([
      ["Type", r.kind.charAt(0).toUpperCase()+r.kind.slice(1)], ["Date", r.yr],
      ["Sides", r.sides.join("  vs  ")], ["Winner", r.winner], ["Era", era ? era.name : ""]
    ]);
    body += locatorFor(id);
    body += renderBlocks([["h","Cause"],["p",r.cause],["h","Course"],["p",r.course],
                          ["h","Result"],["p",r.result],["h","Why it matters"],["p",r.sig]]);
  }
  else if(k === "person"){
    body += factsList([["Role", r.role], ["Dates", r.dates], ["Era", era ? era.name : ""]]);
    body += '<div class="blk"><p style="color:var(--ink);font-weight:500">'+r.one+'</p></div>';
    body += locatorFor(id);
    body += renderBlocks(r.blocks);
  }
  else if(k === "river"){
    body += factsList([
      ["Sanskrit", r.sans], ["Vedic name", r.vedic], ["Greek name", r.greek],
      ["Meaning", r.meaning], ["Source", r.source], ["Enters HP", r.entry],
      ["Leaves HP", r.exit], ["Joins", r.joins], ["Length in HP", r.lenHP],
      ["Tributaries", r.tribs], ["Projects", r.projects]
    ]);
    body += locatorFor(id);
    if(r.note) body += '<div class="blk"><p>'+r.note+'</p></div>';
    body += renderBlocks(r.blocks);
    if(r.districts && r.districts.length){
      const v = r.districts.filter(x => IDX.has(x));
      if(v.length) body += '<div class="blk"><h5>Flows through</h5><div class="rel">'+v.map(x =>
        '<button class="relchip" type="button" data-go="'+x+'">'+
        '<i class="k" style="background:'+KINDS.district.c+'"></i>'+IDX.get(x).r.name+'</button>').join('')+'</div></div>';
    }
  }
  else if(FEATURE_FACTS[k]){
    body += factsList(FEATURE_FACTS[k].map(([lb,f]) => [lb, r[f]]));
    body += locatorFor(id);
    body += renderBlocks(r.blocks);
    if(r.districts && r.districts.length){
      const v = r.districts.filter(x => IDX.has(x));
      if(v.length) body += '<div class="blk"><h5>'+
        (k === "pass" ? "Connects these districts" : "In these districts")+'</h5><div class="rel">'+
        v.map(x => '<button class="relchip" type="button" data-go="'+x+'">'+
        '<i class="k" style="background:'+KINDS.district.c+'"></i>'+IDX.get(x).r.name+
        '</button>').join('')+'</div></div>';
    }
  }
  else if(k === "topic"){
    body += factsList([["Section", r.sec], ["Covers", r.kw]]);
    body += renderBlocks(r.blocks);
    if(TOPIC_FEATURES[id]) body += featureChips(TOPIC_FEATURES[id]);
  }
  body += relBlock(rels(r));

  $("#pbody").innerHTML = body;
  $("#pbody").scrollTop = 0;
  $("#panel").hidden = false;
  renderTrail();
  paintSelection();
  if(!fromHash) writeHash();
}
function closePanel(){
  S.sel = null; S.trail = [];
  $("#panel").hidden = true;
  renderTrail(); paintSelection(); writeHash();
}
function goTo(id){
  const o = IDX.get(id); if(!o) return;
  const v = KINDS[o.kind].view;
  if(S.view !== v){
    if(o.kind === "event" && o.r.era) S.era = o.r.era;
    setView(v, true);
  }
  openRec(id);
  const node = document.querySelector('[data-c="'+id+'"], [data-e="'+id+'"]');
  if(node) node.scrollIntoView({block:"center", behavior:"smooth"});
}
function paintSelection(){
  const relIds = S.sel ? new Set(rels(IDX.get(S.sel).r)) : new Set();
  document.querySelectorAll(".dist").forEach(p => {
    p.classList.toggle("sel", !!S.sel && p.dataset.d === S.sel);
    p.classList.toggle("rel", !!S.sel && p.dataset.d !== S.sel && relIds.has(p.dataset.d));
  });
  document.querySelectorAll(".mk").forEach(m => {
    m.classList.toggle("sel", !!S.sel && m.dataset.rec === S.sel);
  });
  document.querySelectorAll(".ev").forEach(p => p.classList.toggle("sel", !!S.sel && p.dataset.e === S.sel));
  document.querySelectorAll("[data-c]").forEach(p => p.classList.toggle("sel", !!S.sel && p.dataset.c === S.sel));
}

/* ============================================================
   MAP
   Interaction note: pointer capture is taken ONLY once a drag
   actually starts. Capturing on pointerdown retargets the
   subsequent click event to the <svg>, which silently swallows
   every click on a district or marker.
   ============================================================ */
const MONASTERIES = new Set(["tabo","key","dhankar","trilokinath","gurughantal","mcleodganj"]);
const PLACE_LINK = {
  subathu:"ev-subathu", kotgarh:"p-stokes", sanjauli:"ev-hhsrc", pajhota:"ev-pajhota",
  nagchala:"ev-mandi-conspiracy", jutogh:"ev-1857", kasauli:"ev-1857", shimla:"t-british-shimla",
  dharamshala:"d-kangra", nirmand:"ev-nirmand", paonta:"ev-paonta", ramgarh:"b-malaun",
  bhangani:"b-bhangani", tattapani:"b-suket1948", shahpurkandi:"b-shahpur",
  bharmour:"s-chamba", sujanpur:"s-kangra", jagatsukh:"s-kullu", sundernagar:"s-suket",
  sarahan:"s-bushahr", kamru:"s-bushahr", sirmauritaal:"s-sirmaur", theog:"s-keonthal",
  koti:"s-keonthal", balsan:"d-shimla", tharoch:"d-shimla", mahlog:"d-solan"
};
function placeTarget(pid){
  const p = MAP.places[pid]; if(!p) return null;
  if(PLACE_REC.has(pid)) return PLACE_REC.get(pid);
  if(p.k === "state"){ const s = D.states.find(x => x.seat === pid); if(s) return s.id; }
  const b = D.battles.find(x => x.place === pid); if(b) return b.id;
  if(PLACE_LINK[pid]) return PLACE_LINK[pid];
  if(p.k === "temple") return MONASTERIES.has(pid) ? "t-monasteries" : "t-temples";
  if(p.k === "state") return "t-colonial-admin";
  return null;
}
function viewMap(){
  const paths = Object.entries(MAP.paths).map(([n,d]) => {
    const rec = D.districts.find(x => x.map === n);
    return '<path class="dist" d="'+d+'" data-d="'+(rec?rec.id:"")+'" data-name="'+n+'"/>';
  }).join('');
  const labels = Object.entries(MAP.centroids).map(([n,c]) =>
    '<g class="dl" transform="translate('+c[0]+','+c[1]+')"><text class="distlabel">'+n+'</text></g>').join('');
  const clipId = "hpclip";
  const clip = '<clipPath id="'+clipId+'">'+
    Object.values(MAP.paths).map(d => '<path d="'+d+'"/>').join('')+'</clipPath>';
  const rEntries = Object.entries(MAP.rivers).sort((a,b) => b[1].t - a[1].t);
  const rPaths = rEntries.map(([n,r]) =>
      '<path class="river t'+r.t+'" d="'+r.d+'" data-river="'+n+'"><title>'+n+
      (r.t === 1 ? '' : ' (tributary)')+'</title></path>').join('');
  // label paths live in <defs>; the text rides them with textPath
  const rDefs = rEntries.filter(([,r]) => r.lp)
    .map(([n,r]) => '<path id="rp-'+n+'" d="'+r.lp+'"/>').join('');
  const rLabels = rEntries.filter(([,r]) => r.lp).map(([n,r]) =>
      '<text class="rlab t'+r.t+'" dy="-3.5"><textPath href="#rp-'+n+'" startOffset="50%" '+
      'text-anchor="middle">'+D.rivers.find(x => x.id === n).name+'</textPath></text>').join('');
  const rivers = '<g class="rivers" clip-path="url(#'+clipId+')">'+
    rPaths+'<g class="rlabels">'+rLabels+'</g></g>';
  const marks = Object.entries(MAP.places)
    .map(([id,p]) => '<g class="mk" data-k="'+p.k+'" data-p="'+id+'" '+
      'data-rec="'+(placeTarget(id)||"")+'" data-n="'+p.n+'" '+
      'transform="translate('+p.x+','+p.y+')">'+
      '<g class="gly" style="fill:'+LAYER_BY_KIND[p.k].c+'">'+mkGlyph(LAYER_BY_KIND[p.k].glyph)+'</g>'+
      '<text y="-9">'+p.n+'</text></g>').join('');
  /* Every layer the map can draw, in LAYERS order. `base` layers (the
     district polygons) are the map itself, not an overlay, so they are
     not listed and cannot be hidden. */
  const shownKinds = LAYERS.filter(l => !l.base).map(l => l.k);
  const focusSel = '<div class="mapfocus"><label class="vh" for="focusd">Focus a district</label>'+
    '<select id="focusd"><option value="">All 12 districts</option>'+
    D.districts.slice().sort((x,y) => x.name.localeCompare(y.name)).map(d =>
      '<option value="'+d.id+'"'+(S.focus === d.id ? ' selected' : '')+'>'+d.name+'</option>').join('')+
    '</select></div>';
  const legend = '<div class="maplegend'+(S.legendOpen ? '' : ' shut')+'">'+
    '<button class="lgtoggle" type="button" id="lgtoggle" aria-expanded="'+S.legendOpen+'" '+
      'title="Layers and district focus" aria-label="Layers and district focus">'+
      '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+
        '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>'+
      '<span class="lt">Layers</span></button>'+
    '<div class="lgbody"><ul>'+
    shownKinds.map(k => {
      const l = LAYER_BY_KIND[k], off = S.mapOff.includes(k);
      return '<li><button type="button" class="lgi'+(off ? " off" : "")+'" data-lk="'+k+'" '+
        'aria-pressed="'+(!off)+'" title="Click to hide · double click to show only this">'+
        '<i style="background:'+l.c+'"></i>'+l.lb+'</button></li>';
    }).join('')+
    '</ul>'+
    (S.mapOff.length ? '<button type="button" class="lgall" id="lgall">Show all</button>' : '')+
    focusSel+
    '<div class="lghint">Click a district or marker to open its record</div>'+
    '</div></div>';
  return '<div id="mapview">'+
    '<div class="mapcanvas" id="mapcanvas">'+
      '<svg id="hpsvg" viewBox="0 0 '+MAP.w+' '+MAP.h+'" preserveAspectRatio="xMidYMid meet" '+
        'role="img" aria-label="Map of Himachal Pradesh — click a district or marker">'+
        '<defs>'+clip+rDefs+'</defs><g id="mapg">'+paths+rivers+labels+marks+'</g></svg>'+
      '<div id="maptip"></div>'+
      '<button id="focusbadge" type="button" hidden></button>'+legend+
      '<div class="zoomer">'+
        '<button type="button" data-zoom="1" aria-label="Zoom in">+</button>'+
        '<button type="button" data-zoom="-1" aria-label="Zoom out">&minus;</button>'+
        '<button type="button" data-zoom="0" aria-label="Reset view">&#8634;</button></div>'+
    '</div></div>';
}
let ZT = {k:1, x:0, y:0};
function applyZoom(){
  const g = document.getElementById("mapg"); if(!g) return;
  g.setAttribute("transform", "translate("+ZT.x+","+ZT.y+") scale("+ZT.k+")");
  const inv = 1/ZT.k;
  g.querySelectorAll(".mk,.dl").forEach(m => {
    const t = m.dataset.at || (m.dataset.at = m.getAttribute("transform").match(/translate\(([^)]+)\)/)[1]);
    m.setAttribute("transform", "translate("+t+") scale("+inv+")");
  });
  relabel();
}
/* Labels are laid out after every zoom: their boxes are constant in
   screen pixels, so in SVG units they shrink as you zoom in and more of
   them fit. Markers are never hidden — only their labels. */
const LABEL_PRI = {district:9, peak:4, pass:3, glacier:2, lake:1,
                   state:3, temple:2, battle:2};
function relabel(){
  const g = document.getElementById("mapg"); if(!g) return;
  const marks = [...g.querySelectorAll(".mk:not(.hid):not(.dim),.dl")];
  if(!marks.length) return;
  const inv = 1/ZT.k;
  const items = marks.map((m,i) => {
    /* applyZoom() caches the marker's untransformed origin in dataset.at as
       BARE numbers ("340.2,120.5"), while the transform attribute wraps them
       in translate(...). Read whichever is present and normalise, or this
       throws the moment a zoom has happened. */
    const raw = m.dataset.at ||
      ((m.getAttribute("transform") || "").match(/translate\(([^)]*)\)/) || [,""])[1];
    const xy = raw.split(/[\s,]+/).map(Number);
    const isDist = m.classList.contains("dl");
    const n = isDist ? (m.textContent || "") : (m.dataset.n || "");
    /* district labels are 13px and centred on the label itself, marker
       labels 10.5px and sitting above the glyph */
    const w = (n.length*(isDist ? 7.2 : 5.6)+6)*inv, h = (isDist ? 16 : 13)*inv;
    const item = {id:i, x:xy[0], y:xy[1], w:w, h:h, dy:LABEL_DY*inv,
            pri:(LABEL_PRI[isDist ? "district" : m.dataset.k] || 1)*1000 - n.length};
    /* .distlabel has no dy/dominant-baseline, so its ink actually sits
       roughly y-13..y+3 — centred on the text, not sitting above it like a
       marker label. Model that box explicitly rather than reusing the
       above-the-glyph box placeLabels() builds for marker labels. */
    if(isDist) item.box = {x1: xy[0] - w/2, x2: xy[0] + w/2, y1: xy[1] - h*0.8, y2: xy[1] + h*0.2};
    return item;
  });
  const keep = placeLabels(items);
  marks.forEach((m,i) => m.classList.toggle("nolabel", !keep.has(i)));
}
/* Hiding sets a class rather than re-rendering, so a toggle is instant.
   Labels must be laid out again afterwards: hiding twenty lakes frees
   room that peak labels can now use. */
/* Focus mode: one district stays lit, everything else recedes. Markers and
   rivers outside it are dimmed rather than removed, so the district keeps
   its place in the state rather than floating alone. */
/* Focusing a district moves the map to it. Dimming alone left the whole
   state on screen, which is not what "show me this district" means. */
function clearFocus(){
  S.focus = "";
  const sel = document.getElementById("focusd");
  if(sel) sel.value = "";
  applyFocus();
  zoomToFocus();
}
function zoomToFocus(){
  const g = document.getElementById("mapg"); if(!g) return;
  let t;
  if(S.focus){
    const rec = IDX.has(S.focus) ? IDX.get(S.focus).r : null;
    const d = rec && rec.map && MAP.paths[rec.map];
    t = d ? fitBox(pathBBox(d), MAP.w, MAP.h, 0.78, 9) : null;
  }
  if(!t) t = {k:1, x:0, y:0};                 // no focus: back to the whole state
  /* transition only for this move, or every drag frame would ease */
  g.classList.add("gliding");
  clearTimeout(zoomToFocus._t);
  zoomToFocus._t = setTimeout(() => g.classList.remove("gliding"), 480);
  ZT = t; applyZoom();
}
function applyFocus(){
  const g = document.getElementById("mapg"); if(!g) return;
  const on = !!S.focus;
  g.classList.toggle("focusing", on);
  g.querySelectorAll(".dist").forEach(p =>
    p.classList.toggle("dim", on && p.dataset.d !== S.focus));
  g.querySelectorAll(".mk").forEach(m =>
    m.classList.toggle("dim", on && !(MK_DIST[m.dataset.p] || []).includes(S.focus)));
  g.querySelectorAll(".river").forEach(r =>
    r.classList.toggle("dim", on && !(RIVER_DIST[r.dataset.river] || []).includes(S.focus)));
  /* tapping empty ground exits, but nobody would guess that unprompted */
  const badge = document.getElementById("focusbadge");
  if(badge){
    badge.hidden = !on;
    if(on) badge.innerHTML = '<b>'+(IDX.has(S.focus) ? IDX.get(S.focus).r.name : "")+'</b>'+
      '<span>tap the map to exit</span>';
  }
  relabel();
}
function applyLayers(){
  document.querySelectorAll(".mk").forEach(m =>
    m.classList.toggle("hid", S.mapOff.includes(m.dataset.k)));
  const rv = document.querySelector(".rivers");
  if(rv){
    rv.classList.toggle("off1", S.mapOff.includes("river1"));
    rv.classList.toggle("off2", S.mapOff.includes("river2"));
  }
  relabel();
}
function zoomBy(dir){
  if(dir === 0){ ZT = {k:1,x:0,y:0}; applyZoom(); return; }
  const nk = Math.min(9, Math.max(1, ZT.k * (dir>0 ? 1.45 : 1/1.45)));
  const cx = MAP.w/2, cy = MAP.h/2, r = nk/ZT.k;
  ZT.x = cx-(cx-ZT.x)*r; ZT.y = cy-(cy-ZT.y)*r; ZT.k = nk;
  if(ZT.k === 1){ ZT.x = 0; ZT.y = 0; }
  applyZoom();
}
function mountMap(){
  ZT = {k:1,x:0,y:0}; applyZoom(); paintSelection();
  const svg = document.getElementById("hpsvg");
  const tip = document.getElementById("maptip");
  const canvas = document.getElementById("mapcanvas");
  if(!svg) return;

  const toSvg = e => {
    const r = svg.getBoundingClientRect(), sc = MAP.w/r.width;
    return {x:(e.clientX-r.left)*sc, y:(e.clientY-r.top)*sc};
  };
  let down = null, dragging = false;

  /* Two-finger pinch. Pointer events give one call per finger, so the live
     ones are tracked and a second finger switches from panning to zooming.
     Without this a phone could only use the +/- buttons. */
  const pts = new Map();
  let pinch = null;
  const centre = () => {
    const v = [...pts.values()];
    return {x:(v[0].x + v[1].x)/2, y:(v[0].y + v[1].y)/2,
            d:Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y)};
  };
  svg.addEventListener("pointerdown", e => {
    if(e.button && e.button !== 0) return;
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pts.size === 2){
      const c = centre(), r = svg.getBoundingClientRect(), sc = MAP.w/r.width;
      pinch = {d:c.d, k:ZT.k,
               px:(c.x - r.left)*sc, py:(c.y - r.top)*sc, ox:ZT.x, oy:ZT.y};
      down = null; dragging = false; svg.classList.remove("grabbing");
      return;
    }
    down = {x:e.clientX, y:e.clientY, ox:ZT.x, oy:ZT.y, id:e.pointerId,
            target:e.target.closest(".mk") || e.target.closest(".river") || e.target.closest(".dist")};
    dragging = false;
  });
  svg.addEventListener("pointermove", e => {
    if(pts.has(e.pointerId)) pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pinch && pts.size >= 2){
      e.preventDefault();
      const c = centre();
      if(pinch.d > 0){
        /* scale about the point between the fingers, so the map grows from
           where they are rather than from the centre of the viewport */
        const nk = Math.min(9, Math.max(1, pinch.k * (c.d / pinch.d)));
        const r = nk / pinch.k;
        ZT.k = nk;
        ZT.x = pinch.px - (pinch.px - pinch.ox) * r;
        ZT.y = pinch.py - (pinch.py - pinch.oy) * r;
        if(ZT.k === 1){ ZT.x = 0; ZT.y = 0; }
        applyZoom();
      }
      return;
    }
    if(down && e.pointerId === down.id){
      const r = svg.getBoundingClientRect(), sc = MAP.w/r.width;
      const dx = e.clientX-down.x, dy = e.clientY-down.y;
      if(!dragging && Math.abs(dx)+Math.abs(dy) > 4){
        dragging = true; svg.classList.add("grabbing");
        try{ svg.setPointerCapture(e.pointerId); }catch(err){}
      }
      if(dragging){ ZT.x = down.ox+dx*sc; ZT.y = down.oy+dy*sc; applyZoom(); }
      return;
    }
    const hit = e.target.closest(".mk") || e.target.closest(".river") || e.target.closest(".dist");
    if(hit && !dragging){
      const rect = canvas.getBoundingClientRect();
      let title, sub;
      if(hit.classList.contains("mk")){
        const p = MAP.places[hit.dataset.p]; title = p.n; sub = LAYER_BY_KIND[p.k].lb;
      } else if(hit.classList.contains("river")){
        title = hit.dataset.river; sub = MAP.rivers[hit.dataset.river].t === 1 ? "Major river" : "Tributary";
      } else {
        const rec = hit.dataset.d && IDX.get(hit.dataset.d);
        title = hit.dataset.name;
        sub = rec ? rec.r.hq+" · "+num(rec.r.pop) : "";
      }
      tip.innerHTML = title+(sub ? '<span class="s">'+sub+'</span>' : '');
      tip.style.left = (e.clientX-rect.left)+"px";
      tip.style.top  = (e.clientY-rect.top)+"px";
      tip.classList.add("on");
    } else tip.classList.remove("on");
  });
  const release = e => {
    pts.delete(e.pointerId);
    if(pts.size < 2 && pinch){ pinch = null; down = null; dragging = false; return; }
    if(!down || e.pointerId !== down.id) return;
    const wasDragging = dragging;
    if(dragging){ try{ svg.releasePointerCapture(e.pointerId); }catch(err){} }
    svg.classList.remove("grabbing");
    const t = down.target;
    down = null; dragging = false;
    if(wasDragging) return;
    if(!t){
      /* tapping the empty ground around the state is the way back out of a
         focused district */
      if(S.focus) clearFocus();
      return;
    }
    if(t.classList.contains("river")){
      if(IDX.has(t.dataset.river)) openRec(t.dataset.river);
      else openRec("t-rivers", t.dataset.river);
    } else if(t.classList.contains("mk")){
      const rec = t.dataset.rec;
      if(rec && IDX.has(rec)) openRec(rec, MAP.places[t.dataset.p].n);
      else toast("No note linked to this place yet");
    } else if(t.dataset.d){
      openRec(t.dataset.d);
    }
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", e => { pts.delete(e.pointerId); pinch = null; down = null; dragging = false; svg.classList.remove("grabbing"); });
  svg.addEventListener("pointerleave", () => tip.classList.remove("on"));
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const p = toSvg(e), f = Math.exp(-e.deltaY*0.0015);
    const nk = Math.min(9, Math.max(1, ZT.k*f)), r = nk/ZT.k;
    ZT.x = p.x-(p.x-ZT.x)*r; ZT.y = p.y-(p.y-ZT.y)*r; ZT.k = nk;
    if(ZT.k === 1){ ZT.x = 0; ZT.y = 0; }
    applyZoom();
  }, {passive:false});
  relabel();

  /* A double click fires two clicks first, so the single-click action is
     deferred and cancelled if the second click lands. Same approach
     Plotly's legend uses; the cost is a barely perceptible lag. */
  const legendEl = document.querySelector(".maplegend");
  if(legendEl){
    /* One timer PER ROW, not one shared timer: with a single shared timer,
       clicking row A then row B inside the deferral window cancels A's
       pending toggle instead of applying it, silently swallowing a click. */
    const timers = new Map();
    const clearTimer = k => { clearTimeout(timers.get(k)); timers.delete(k); };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const kindsHere = () => [...legendEl.querySelectorAll(".lgi")].map(b => b.dataset.lk);
    const commit = () => {
      store.set("mapoff", S.mapOff);
      legendEl.querySelectorAll(".lgi").forEach(b => {
        const off = S.mapOff.includes(b.dataset.lk);
        b.classList.toggle("off", off);
        b.setAttribute("aria-pressed", String(!off));
      });
      let all = document.getElementById("lgall");
      if(S.mapOff.length && !all){
        all = document.createElement("button");
        all.type = "button"; all.className = "lgall"; all.id = "lgall";
        all.textContent = "Show all";
        const hint = legendEl.querySelector(".lghint");
        if(hint) legendEl.insertBefore(all, hint);
        else legendEl.appendChild(all);
      } else if(!S.mapOff.length && all) all.remove();
      applyLayers();
      applyFocus();
    };
    legendEl.addEventListener("click", e => {
      /* Show all must also drop pending toggles, or one fires just after
         and silently re-hides a layer the user just restored. */
      if(e.target.closest("#lgall")){ clearTimers(); S.mapOff = []; commit(); return; }
      const b = e.target.closest(".lgi"); if(!b) return;
      const k = b.dataset.lk;
      clearTimer(k);
      timers.set(k, setTimeout(() => {
        timers.delete(k);
        S.mapOff = layerToggle(S.mapOff, k); commit();
      }, 250));
    });
    legendEl.addEventListener("dblclick", e => {
      const b = e.target.closest(".lgi"); if(!b) return;
      clearTimer(b.dataset.lk);
      S.mapOff = layerIsolate(S.mapOff, b.dataset.lk, kindsHere());
      commit();
    });
    legendEl.addEventListener("keydown", e => {
      const b = e.target.closest(".lgi"); if(!b || e.key !== "Enter") return;
      e.preventDefault(); clearTimer(b.dataset.lk);
      S.mapOff = e.shiftKey
        ? layerIsolate(S.mapOff, b.dataset.lk, kindsHere())
        : layerToggle(S.mapOff, b.dataset.lk);
      commit();
    });
  }
  const lgt = document.getElementById("lgtoggle");
  if(lgt) lgt.addEventListener("click", () => {
    S.legendOpen = !S.legendOpen;
    store.set("legendopen", S.legendOpen);
    lgt.setAttribute("aria-expanded", String(S.legendOpen));
    lgt.closest(".maplegend").classList.toggle("shut", !S.legendOpen);
  });
  const fbadge = document.getElementById("focusbadge");
  if(fbadge) fbadge.addEventListener("click", clearFocus);
  const fsel = document.getElementById("focusd");
  if(fsel) fsel.addEventListener("change", () => {
    /* focusing is a map gesture, not a navigation: it moves the view and
       leaves the panel alone. The record is still one tap on the district. */
    S.focus = fsel.value;
    applyFocus();
    zoomToFocus();
    /* the panel has done its job — get it off the map so the district it
       just focused is actually visible */
    if(S.legendOpen && lgt) lgt.click();
  });

  applyLayers();
  applyFocus();
}

/* ============================================================
   OTHER VIEWS
   ============================================================ */
/* A section shows a photograph where one is genuinely apt; the rest get a
   tinted panel carrying their own icon, rather than a decorative photo of
   something unrelated. */
const SECT_PIC = {map:"district", timeline:"event", battles:"state",
                  topics:"topic", rounds:"peak"};
/* the cover changes between visits, so the app does not look identical
   every time it is opened */
const COVERS = ["district","lake","peak","river","pass"];

function viewHome(){
  const syl = [
    ["01","Ancient Himachal","Pre-history, Vedic references and the janapadas","t-janapadas"],
    ["02","Early medieval states","Kangra, Kullu and Chamba emerge","s-chamba"],
    ["03","Mughals and Sikhs","The hill states and their neighbours","t-mughal-relations"],
    ["04","The Gorkha invasion","Its nature, and the Treaty of Segauli","t-gorkha"],
    ["05","Under colonial power","Sanads, grants, agency administration","t-colonial-admin"],
    ["06","Praja Mandal, 1848–1948","The national movement in the hill states","t-freedom"],
    ["07","Making Himachal","1948, the 1966 transfer, statehood in 1971","t-statehood"],
    ["08","Art and culture","Temples, monasteries and Pahari painting","t-pahari-painting"],
    ["09","Geography","Physiography, rivers, passes, peaks, lakes","t-physio"],
    ["10","Polity and governance","Constitutional evolution and panchayati raj","t-polity"],
    ["11","Economy","Horticulture, hydropower, industry and tourism","t-economy"]
  ];
  const prog  = store.get("quiz",{});
  const done  = Object.keys(prog).length;
  const right = Object.values(prog).filter(v => answerValue(v) === 1).length;
  const seen  = (S.seen || []).length;

  const cover = COVERS[Math.floor(Math.random()*COVERS.length)];
  const cpic  = PICS[cover];
  const fact  = FACTS.length ? FACTS[Math.floor(Math.random()*FACTS.length)] : null;

  /* a live fact on the cover, as the invitation in */
  const teaser = fact
    ? '<button class="covfact" type="button" data-view="rounds">'+
        '<span class="cfk">'+(KINDS[fact.kind] ? KINDS[fact.kind].lb : "Fact")+'</span>'+
        '<span class="cfn">'+fact.name+'</span>'+
        '<span class="cft">'+fact.text+'</span>'+
        '<span class="cfg">Start scrolling &rarr;</span></button>'
    : '';

  const stat = (v,l) => '<span class="stat"><b>'+v+'</b>'+l+'</span>';
  const strip = '<div class="hstrip">'+
    stat(num(FACTS.length), "facts") +
    stat(num(IDX.size), "linked records") +
    stat(num(D.pyq.length), "past questions") +
    (seen ? stat(num(seen), "facts seen") : "") +
    (done ? stat(right+"/"+done, "quiz correct") : "") +
    '</div>';

  const sections = NAV.filter(n => n.id !== "home").map(n => {
    const pk = SECT_PIC[n.id] ? PICS[SECT_PIC[n.id]] : null;
    return '<button class="sect'+(pk ? " haspic" : "")+'" type="button" data-view="'+n.id+'">'+
      (pk ? '<img class="sectpic" src="'+pk.s+'" alt="" loading="lazy" decoding="async">' : '')+
      '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+n.ic+'</svg>'+
      '<span class="st">'+TITLE[n.id]+'</span>'+
      '<span class="sd">'+SUB[n.id]+'</span>'+
      (COUNTS[n.id] ? '<span class="sc">'+num(COUNTS[n.id])+'</span>' : '')+
      '</button>';
  }).join('');

  return '<div class="home">'+
  '<div class="cover">'+
    '<img class="covpic" src="'+cpic.s+'" alt="" decoding="async">'+
    '<div class="covbody">'+
      '<div class="kicker">HPPSC · HPAS 2026 · Himachal Pradesh</div>'+
      '<h1>Everything Himachal, connected.</h1>'+
      '<p class="pitch">Revision, not repetition.</p>'+
      teaser+
    '</div>'+
    '<span class="covcred">'+cpic.t+' &middot; '+cpic.a+' / '+cpic.l+'</span>'+
  '</div>'+
  strip+
  '<div class="sections">'+sections+'</div>'+
  '<div class="syllabus">'+
    '<div class="secthead"><h3>The syllabus, as eleven blocks</h3><span class="n">tap any row</span></div>'+
    syl.map(x => '<button class="sylrow" type="button" data-go="'+x[3]+'">'+
      '<span class="sn">'+x[0]+'</span><span><span class="st">'+x[1]+'</span>'+
      '<span class="sd">'+x[2]+'</span></span></button>').join('')+
  '</div>'+
  '</div>';
}

function viewTimeline(){
  const evs = [...D.events].sort((a,b) => a.y-b.y);
  const bar = '<div class="erabar">'+
    '<button class="erabtn" type="button" data-era="all" aria-pressed="'+(S.era==="all")+'" '+
      'style="--ec:var(--accent)">All eras</button>'+
    D.eras.map(e => '<button class="erabtn" type="button" data-era="'+e.id+'" '+
      'aria-pressed="'+(S.era===e.id)+'" style="--ec:var('+e.v+')">'+e.name+'</button>').join('')+
    '</div>';
  const eras = S.era === "all" ? D.eras : D.eras.filter(e => e.id === S.era);
  const body = eras.map(era => {
    const list = evs.filter(e => e.era === era.id);
    if(!list.length) return "";
    return '<section class="eragroup" style="--ec:var('+era.v+')">'+
      '<div class="erahead"><h3>'+era.name+'</h3><span class="span">'+era.span+'</span></div>'+
      list.map(e => '<button class="ev'+(e.big?" big":"")+'" type="button" data-e="'+e.id+'">'+
        '<span class="yr">'+e.yr+'</span><span class="bd"><span class="ti">'+e.t+'</span>'+
        '<span class="sm">'+e.s+'</span></span></button>').join('')+
      '</section>';
  }).join('');
  return '<div id="tlview">'+bar+'<div class="tl">'+body+'</div></div>';
}

function viewBattles(){
  const KINDLB = {battle:"Battle", siege:"Siege", treaty:"Treaty", firing:"Confrontation"};
  const kinds = ["all","battle","siege","treaty","firing"];
  const list = [...D.battles].sort((a,b) => a.y-b.y)
    .filter(b => S.battleFilter === "all" || b.kind === S.battleFilter);
  return '<div class="pagewrap">'+
    '<p class="lede">Every war, siege, treaty and confrontation named in the syllabus, in order. Each card gives '+
    'the cause, the course, the result and why it matters — the four-part shape a mains answer needs.</p>'+
    '<div class="chipset" style="margin-bottom:16px">'+kinds.map(k =>
      '<button class="tog" type="button" data-bf="'+k+'" aria-pressed="'+(S.battleFilter===k)+'">'+
      (k === "all" ? "All ("+D.battles.length+")" : KINDLB[k])+'</button>').join('')+'</div>'+
    '<div class="grid">'+list.map(b => {
      const era = ERA[b.era];
      return '<button class="card" type="button" data-c="'+b.id+'" style="--ec:var('+era.v+')">'+
        '<span class="hd"><h4>'+b.name+'</h4><span class="yr">'+(b.yr.length>18 ? (b.y|0) : b.yr)+'</span></span>'+
        '<span class="sides"><span>'+b.sides[0]+'</span><span class="vs">vs</span><span>'+b.sides[1]+'</span></span>'+
        '<p>'+b.sig.split(". ")[0]+'.</p>'+
        '<span style="display:flex;gap:5px;flex-wrap:wrap"><span class="chip era">'+era.name+'</span>'+
        '<span class="chip">'+KINDLB[b.kind]+'</span>'+
        '<span class="chip out-'+(b.outcome==="win"?"win":b.outcome==="loss"?"loss":"treaty")+'">'+
        b.winner+'</span></span></button>';
    }).join('')+'</div></div>';
}

function viewTopics(){
  const secs = ["all", ...new Set(D.topics.map(t => t.sec))];
  const list = D.topics.filter(t => S.topicSec === "all" || t.sec === S.topicSec);
  const groups = {};
  list.forEach(t => (groups[t.sec] = groups[t.sec] || []).push(t));
  return '<div class="pagewrap">'+
    '<p class="lede">Structured note pages. Each is written as an answer skeleton — headings you can reproduce '+
    'under time, with the exam hook at the end.</p>'+
    '<div class="chipset" style="margin-bottom:18px">'+secs.map(s =>
      '<button class="tog" type="button" data-ts="'+s+'" aria-pressed="'+(S.topicSec===s)+'">'+
      (s === "all" ? "All sections" : s)+'</button>').join('')+'</div>'+
    Object.keys(groups).map(sec =>
      '<div class="secthead"><h3>'+sec+'</h3><span class="n">'+groups[sec].length+' pages</span></div>'+
      '<div class="topiclist">'+groups[sec].map(t =>
        '<button class="tcard" type="button" data-c="'+t.id+'"><h4>'+t.title+'</h4>'+
        '<span class="kw">'+t.kw+'</span></button>').join('')+'</div>').join('')+
    '</div>';
}

function viewPeople(){
  const order = ["Ruler","Commander","Statesman","Freedom fighter","Revolutionary","Rebel","Reformer","Artist","Colonial"];
  const groups = {};
  D.people.forEach(p => (groups[p.tag] = groups[p.tag] || []).push(p));
  const keys = Object.keys(groups).sort((a,b) => order.indexOf(a)-order.indexOf(b));
  return '<div class="pagewrap">'+
    '<p class="lede">The names that carry marks — rulers, commanders, reformers and the leaders of the Praja '+
    'Mandal movement. Each card opens with the one line you would write if you had only one line.</p>'+
    keys.map(k =>
      '<div class="secthead"><h3>'+k+'s</h3><span class="n">'+groups[k].length+'</span></div>'+
      '<div class="grid">'+groups[k].map(p => {
        const era = ERA[p.era];
        return '<button class="card" type="button" data-c="'+p.id+'" style="--ec:var('+era.v+')">'+
          '<span class="hd"><h4>'+p.name+'</h4><span class="yr">'+p.dates+'</span></span>'+
          '<p>'+p.one+'</p><span><span class="chip era">'+era.name+'</span></span></button>';
      }).join('')+'</div>').join('')+
    '</div>';
}

/* ============================================================
   REVISE — the past-paper bank and the curated MCQ quiz
   ============================================================ */
const quizPool = () => S.qSec === "all" ? D.quiz : D.quiz.filter(q => q.s === S.qSec);
const PY_YEARS = [...new Set(D.pyq.map(q => q.y))].sort((a,b) => b-a);
const pyPool = () => D.pyq.filter(q =>
  (S.pyYear === "all" || q.y === +S.pyYear) && (!S.pyHP || q.hp === 1));

function viewRevise(){
  const secs = ["all","History","Geography","Polity","Economy","Culture"];
  const modes = '<div class="seg">'+
    '<button type="button" data-rm="papers" aria-pressed="'+(S.revMode==="papers")+'">Past papers</button>'+
    '<button type="button" data-rm="quiz" aria-pressed="'+(S.revMode==="quiz")+'">Quiz</button>'+
    '</div>';
  let filters;
  if(S.revMode === "papers"){
    filters = '<div class="chipset">'+
      ['all'].concat(PY_YEARS).map(y =>
        '<button class="tog" type="button" data-py="'+y+'" aria-pressed="'+(String(S.pyYear)===String(y))+'">'+
        (y === "all" ? "All years" : y)+'</button>').join('')+
      '<button class="tog" type="button" data-pyhp="1" aria-pressed="'+S.pyHP+'">'+
      '<i class="dot"></i>Himachal only</button></div>';
  } else {
    const active = S.qSec;
    filters = '<div class="chipset">'+secs.map(x =>
      '<button class="tog" type="button" data-rs="'+x+'" aria-pressed="'+(active===x)+'">'+
      (x === "all" ? "All" : x)+'</button>').join('')+'</div>';
  }
  const body = S.revMode === "quiz" ? quizUI() : papersUI();
  return '<div class="revwrap"><div class="revtools">'+modes+filters+'</div>'+body+'</div>';
}

function papersUI(){
  const pool = pyPool();
  const prog = store.get("pyq",{});
  const key = q => q.y+"|"+q.q.slice(0,60);
  const attempted = pool.filter(q => answerValue(prog[key(q)]) !== undefined).length;
  const correct = pool.filter(q => answerValue(prog[key(q)]) === 1).length;
  const pct = attempted ? Math.round(correct/attempted*100) : 0;
  if(!pool.length) return '<div class="qcard">No questions match this filter.</div>';
  if(S.pyIdx >= pool.length) S.pyIdx = 0;
  const q = pool[S.pyIdx], ans = S.pyAnswered;
  const bar = '<div class="scorebar">'+
    '<div class="stat"><span class="v">'+attempted+'</span><span class="l">attempted</span></div>'+
    '<div class="stat"><span class="v">'+correct+'</span><span class="l">correct</span></div>'+
    '<div class="stat"><span class="v">'+pct+'%</span><span class="l">accuracy</span></div>'+
    '<div class="meter"><i style="width:'+pct+'%"></i></div></div>';
  const opts = q.o.map((o,i) => {
    let cls = "opt";
    if(ans !== null){ if(i === q.a) cls += " right"; else if(i === ans) cls += " wrong"; }
    return '<button class="'+cls+'" type="button" data-pyopt="'+i+'"'+(ans!==null?" disabled":"")+'>'+
      '<span class="ltr">'+"ABCD"[i]+'</span><span>'+q.o[i]+'</span></button>';
  }).join('');
  return bar+'<div class="qcard">'+
    '<div class="qmeta"><span class="chip py">HPAS Prelims '+q.y+'</span>'+
      (q.hp ? '<span class="chip hp">Himachal</span>' : '')+
      '<span class="chip">'+q.s+'</span>'+
      '<span class="qprog">'+(S.pyIdx+1)+' / '+pool.length+'</span></div>'+
    '<div class="qtext">'+q.q+'</div><div class="opts">'+opts+'</div>'+
    (ans !== null ? '<div class="expl"><b>'+(ans===q.a?"Correct.":"Not quite.")+'</b> '+
      'The official key marks <b>'+"ABCD"[q.a]+'</b>. '+(q.e ? q.e+' ' : '')+
      (q.t && IDX.has(q.t) ? '<button class="btn sm" style="margin-left:4px" type="button" data-go="'+q.t+'">'+
      'Read the note</button>' : '')+'</div>' : "")+
    '</div><div class="revnav" style="margin-top:14px">'+
      '<button class="btn" type="button" data-pyn="-1">&larr; Previous</button>'+
      '<button class="btn" type="button" data-pyn="rand">Random</button>'+
      '<button class="btn primary" type="button" data-pyn="1">'+
      (ans !== null ? "Next question &rarr;" : "Skip &rarr;")+'</button></div>';
}
function pyAnswer(i){
  if(S.pyAnswered !== null) return;
  const q = pyPool()[S.pyIdx]; if(!q) return;
  S.pyAnswered = i;
  const prog = store.get("pyq",{});
  store.set("pyq", recordAnswer(prog, q.y+"|"+q.q.slice(0,60), i === q.a));
  render();
}
function pyStep(d){
  const pool = pyPool();
  S.pyIdx = d === "rand" ? (Math.random()*pool.length|0)
                         : (S.pyIdx + (+d) + pool.length) % pool.length;
  S.pyAnswered = null; render();
}
function quizUI(){
  const pool = quizPool(), prog = store.get("quiz",{});
  const attempted = pool.filter(q => answerValue(prog[q.q]) !== undefined).length;
  const correct = pool.filter(q => answerValue(prog[q.q]) === 1).length;
  const pct = attempted ? Math.round(correct/attempted*100) : 0;
  const weak = {};
  pool.forEach(q => { if(answerValue(prog[q.q]) === 0) weak[q.t] = (weak[q.t]||0)+1; });
  const weakList = Object.entries(weak).sort((a,b) => b[1]-a[1]).slice(0,6);
  if(S.qIdx >= pool.length) S.qIdx = 0;
  const q = pool[S.qIdx];
  if(!q) return '<div class="qcard">No questions in this section.</div>';
  const ans = S.qAnswered;
  const bar = '<div class="scorebar">'+
    '<div class="stat"><span class="v">'+attempted+'</span><span class="l">attempted</span></div>'+
    '<div class="stat"><span class="v">'+correct+'</span><span class="l">correct</span></div>'+
    '<div class="stat"><span class="v">'+pct+'%</span><span class="l">accuracy</span></div>'+
    '<div class="meter"><i style="width:'+pct+'%"></i></div></div>'+
    (weakList.length ? '<div class="blk" style="margin-bottom:14px"><h5>Weakest topics so far</h5>'+
      '<div class="weak">'+weakList.map(w => '<button class="relchip" type="button" data-go="'+w[0]+'">'+
      '<i class="k" style="background:var(--crit)"></i>'+
      (IDX.has(w[0]) ? IDX.get(w[0]).r.title : w[0])+' · '+w[1]+'</button>').join('')+'</div></div>' : "");
  const opts = q.o.map((o,i) => {
    let cls = "opt";
    if(ans !== null){ if(i === q.a) cls += " right"; else if(i === ans) cls += " wrong"; }
    return '<button class="'+cls+'" type="button" data-opt="'+i+'"'+(ans!==null?" disabled":"")+'>'+
      '<span class="ltr">'+"ABCD"[i]+'</span><span>'+o+'</span></button>';
  }).join('');
  return bar+'<div class="qcard">'+
    '<div class="qmeta"><span class="chip">'+q.s+'</span>'+
      '<span class="qprog">'+(S.qIdx+1)+' / '+pool.length+'</span></div>'+
    '<div class="qtext">'+q.q+'</div><div class="opts">'+opts+'</div>'+
    (ans !== null ? '<div class="expl"><b>'+(ans===q.a?"Correct.":"Not quite.")+'</b> '+q.e+
      (IDX.has(q.t) ? ' <button class="btn sm" style="margin-left:6px" type="button" data-go="'+q.t+'">'+
      'Read the note</button>' : '')+'</div>' : "")+
    '</div><div class="revnav" style="margin-top:14px">'+
      '<button class="btn" type="button" data-q="-1">&larr; Previous</button>'+
      '<button class="btn primary" type="button" data-q="1">'+
      (ans !== null ? "Next question &rarr;" : "Skip &rarr;")+'</button></div>';
}
function answer(i){
  if(S.qAnswered !== null) return;
  const q = quizPool()[S.qIdx]; if(!q) return;
  S.qAnswered = i;
  const prog = store.get("quiz",{}); store.set("quiz", recordAnswer(prog, q.q, i === q.a));
  render();
}
function stepQ(d){
  const pool = quizPool();
  S.qIdx = (S.qIdx+d+pool.length) % pool.length; S.qAnswered = null; render();
}

/* ---------- search ----------
   Alternate spellings and older names that a candidate is likely to type but
   that do not appear in the record text. Keyed by record id. */
const ALIAS = {
  "b-segauli":"sagauli sugauli segauli anglo nepalese war",
  "ev-segauli":"sagauli sugauli segauli anglo nepalese war",
  "t-gorkha":"gurkha gorkha nepal amar singh thapa invasion",
  "s-kangra":"nagarkot trigarta katoch susharma",
  "d-kangra":"nagarkot trigarta dharamshala winter capital",
  "s-kahlur":"kahlur bilaspur chandel",
  "d-bilaspur":"kahlur gobind sagar bhakra",
  "s-bushahr":"bashahr bussahir rampur sarahan kamru",
  "s-sirmaur":"sirmour nahan prakash",
  "d-sirmaur":"sirmour nahan renuka paonta",
  "d-shimla":"simla mahasu",
  "t-british-shimla":"simla conference viceregal lodge rothney",
  "d-lahaul":"lahul spiti keylong cold desert",
  "s-nurpur":"dhameri pathania",
  "s-suket":"pangna sundernagar",
  "s-mandi":"choti kashi varanasi of the hills",
  "ev-dhami":"dhami firing halog bhagmal sautha",
  "b-dhami":"dhami firing halog bhagmal sautha",
  "t-freedom":"praja mandal freedom struggle national movement",
  "t-pahari-painting":"basohli guler kangra kalam miniature painting",
  "t-shaktipeeth":"shakti peeth jwalamukhi chintpurni naina devi brajeshwari",
  "t-monasteries":"tabo key kye dhankar gompa buddhist monastery",
  "ev-hp-formation":"formation 1948 chief commissioner province",
  "ev-statehood":"statehood 1971 eighteenth 18th state",
  "ev-punjab-reorg":"punjab reorganisation 1966 transfer",
  "ev-kangra-quake":"earthquake 1905 seismic",
  "p-parmar":"yashwant singh parmar architect of himachal",
  "t-statehood":"constitutional evolution part c union territory statehood"
};
const SEARCH = [];
IDX.forEach((o,id) => {
  const r = o.r;
  SEARCH.push({
    id, kind:o.kind, name:nameOf(o),
    extra:(r.kw || r.role || r.yr || r.hq || r.capital || r.sans || r.joins || r.alt || r.type || ""),
    txt:[nameOf(o), ALIAS[id]||"", r.alias||"", r.kw||"", r.role||"", r.one||"", r.s||"",
         r.sig||"", r.capital||"", r.founder||"", r.hq||"", r.yr||"",
         // rivers carry their classical names, which is what a candidate actually types
         r.sans||"", r.vedic||"", r.greek||"", r.meaning||"", r.source||"",
         r.entry||"", r.exit||"", r.joins||"", r.tribs||"", r.note||"",
         (r.sides||[]).join(" "),
         // features are looked up by height and by what they connect
         r.alt||"", r.range||"", r.connects||"", r.status||"", r.route||"",
         r.valley||"", r.feeds||"", r.sacred||"", r.ramsar||"", r.fame||"",
         r.type||"", r.river||"", r.size||"",
         (r.alt||"").replace(/,/g, "")].join(" ").toLowerCase()
  });
});
function runSearch(q){
  const box = $("#results"); q = q.trim().toLowerCase();
  if(q.length < 2){ box.hidden = true; box.innerHTML = ""; return; }
  const hits = [];
  for(const s of SEARCH){
    const n = s.name.toLowerCase();
    const score = n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : s.txt.includes(q) ? 4 : -1;
    if(score >= 0) hits.push({s, score});
  }
  hits.sort((a,b) => a.score-b.score || a.s.name.length-b.s.name.length);
  const top = hits.slice(0,24);
  box.innerHTML = top.length
    ? top.map((h,i) => '<button class="res'+(i===0?" act":"")+'" type="button" data-go="'+h.s.id+'">'+
        '<i class="k" style="background:'+KINDS[h.s.kind].c+'"></i><span class="t">'+h.s.name+'</span>'+
        (h.s.extra ? '<span class="e">'+String(h.s.extra).slice(0,40)+'</span>' : '')+
        '<span class="c">'+KINDS[h.s.kind].lb+'</span></button>').join('')
    : '<div class="nores">Nothing matches &ldquo;'+q+'&rdquo;.</div>';
  box.hidden = false;
}
function moveSearch(d){
  const box = $("#results"); if(box.hidden) return;
  const items = [...box.querySelectorAll(".res")]; if(!items.length) return;
  let i = items.findIndex(x => x.classList.contains("act"));
  items.forEach(x => x.classList.remove("act"));
  i = (i+d+items.length) % items.length;
  items[i].classList.add("act"); items[i].scrollIntoView({block:"nearest"});
}

/* ============================================================
   ROUNDS — one prelims fact per screen, moved by a flick.
   Facts are a projection of the records' exam hooks, so a card
   can never drift from the note it came from.
   ============================================================ */
function viewRounds(){
  /* The state's outline is identical on every card, so it is defined once
     and referenced — 265 cards must not each carry the district geometry,
     which runs to tens of kilobytes. It lives outside the feed because
     mountRounds() clears the feed's contents. */
  const outline = Object.values(MAP.paths).map(d => '<path d="'+d+'"/>').join('');
  return '<svg class="rartdefs" aria-hidden="true" width="0" height="0">'+
      '<symbol id="hpoutline" viewBox="0 0 '+MAP.w+' '+MAP.h+'">'+outline+'</symbol>'+
    '</svg>'+
    '<div id="roundsfeed" class="rounds" tabindex="0" role="region" '+
    'aria-label="Prelims facts, one per screen"></div>';
}
/* Where this fact sits in Himachal: the district filled, the river traced,
   or a point in the right valley. Topics and events have no one place, and
   show the outline alone. */
function roundArt(f){
  const rec = IDX.has(f.srcId) ? IDX.get(f.srcId).r : null;
  const g = factGeom(rec, f.kind, MAP);
  let hi = "";
  if(g && g.shape === "area")      hi = '<path class="hi-area" d="'+g.d+'"/>';
  else if(g && g.shape === "line") hi = '<path class="hi-line" d="'+g.d+'"/>';
  else if(g && g.shape === "point")
    hi = '<circle class="hi-halo" cx="'+g.x+'" cy="'+g.y+'" r="34"/>'+
         '<circle class="hi-dot" cx="'+g.x+'" cy="'+g.y+'" r="11"/>';
  return '<svg class="rart" viewBox="0 0 '+MAP.w+' '+MAP.h+'" aria-hidden="true">'+
    '<use href="#hpoutline"/>'+hi+'</svg>';
}
/* One fact per card. The kind label reuses the map legend's colour, so a
   glance says whether this is a pass, a lake, a district or a treaty. */
function roundCard(f){
  const k = KINDS[f.kind];
  const c = k ? k.c : "var(--accent)";
  const p = PIC_REC[f.srcId] || PICS[f.kind];
  return '<button class="short" type="button" data-fid="'+f.id+'" data-src="'+f.srcId+'" '+
      'style="--kc:'+c+'">'+
    (p ? '<img class="rpic" src="'+p.s+'" alt="" loading="lazy" decoding="async">' : '')+
    roundArt(f)+
    '<span class="k">'+(k ? k.lb : "Fact")+'</span>'+
    '<span class="nm">'+f.name+'</span>'+
    '<span class="ft">'+f.text+'</span>'+
    '<span class="go">Open the note &rarr;</span>'+
    (p ? '<span class="cred">'+p.t+' &middot; '+p.a+' / '+p.l+'</span>' : '')+
    '</button>';
}
let RQ = [], RI = 0, RIO = null;
/* The feed is endless, so it renders a window and extends it rather than
   building a node per fact. RQ is the current ordering, RI the cursor. */
function appendRounds(feed, n){
  const tmp = document.createElement("div");
  let html = "";
  for(let i = 0; i < n; i++){
    if(RI >= RQ.length){ RQ = orderFacts(FACTS, S.seen); RI = 0; }
    html += roundCard(RQ[RI++]);
  }
  tmp.innerHTML = html;
  while(tmp.firstChild){
    const el = tmp.firstChild;
    feed.appendChild(el);
    if(RIO) RIO.observe(el);
  }
}
function mountRounds(){
  const feed = document.getElementById("roundsfeed");
  if(!feed || !FACTS.length) return;
  RQ = orderFacts(FACTS, S.seen); RI = 0;
  feed.innerHTML = "";
  /* only now is anything here able to reveal cards, so only now may CSS
     start them hidden */
  feed.classList.add("anim");
  if(RIO) RIO.disconnect();
  /* A fact counts as seen only once it has settled on screen — blasting a
     thumb down the feed must not burn facts that were never read. */
  RIO = new IntersectionObserver(entries => {
    let extend = false;
    for(const en of entries){
      en.target.classList.add("on");
      if(en.intersectionRatio < 0.6) continue;
      const id = en.target.dataset.fid;
      if(S.seen.indexOf(id) < 0){ S.seen.push(id); store.set("seen", S.seen); }
      const cards = feed.children;
      if([].indexOf.call(cards, en.target) >= cards.length - 5) extend = true;
    }
    if(extend) appendRounds(feed, 15);
  }, {root: feed, threshold: 0.6});
  appendRounds(feed, 30);
  feed.addEventListener("click", e => {
    const b = e.target.closest(".short");
    if(b && IDX.has(b.dataset.src)) openRec(b.dataset.src);
  });
}

/* ---------- render dispatcher ---------- */
function render(){
  const s = $("#stage");
  /* #stage scrolls itself; a scroll-snap feed nested inside it would give
     two scrollbars and snapping that fights the outer scroll. */
  s.classList.toggle("noscroll", S.view === "rounds");
  if(S.view === "home")           s.innerHTML = viewHome();
  else if(S.view === "map")     { s.innerHTML = viewMap(); mountMap(); }
  else if(S.view === "timeline"){ s.innerHTML = viewTimeline(); paintSelection(); }
  else if(S.view === "battles") { s.innerHTML = viewBattles(); paintSelection(); }
  else if(S.view === "topics")  { s.innerHTML = viewTopics(); paintSelection(); }
  else if(S.view === "people")  { s.innerHTML = viewPeople(); paintSelection(); }
  else if(S.view === "trends")    s.innerHTML = viewTrends();
  else if(S.view === "rounds")  { s.innerHTML = viewRounds(); mountRounds(); }
  else if(S.view === "revise")    s.innerHTML = viewRevise();
}

/* ============================================================
   EVENTS
   ============================================================ */
document.addEventListener("click", e => {
  const t = e.target;
  const hit = sel => t.closest(sel);

  const nav = hit("[data-view]");   if(nav){ go(nav.dataset.view); return; }
  const gob = hit("[data-go]");     if(gob){ $("#results").hidden = true; goTo(gob.dataset.go); return; }
  const tr  = hit("[data-trail]");  if(tr){ goTo(tr.dataset.trail); return; }
  const zm  = hit("[data-zoom]");   if(zm){ zoomBy(+zm.dataset.zoom); return; }
  const era = hit("[data-era]");    if(era){ S.era = era.dataset.era; render(); return; }
  const ev  = hit(".ev");           if(ev){ openRec(ev.dataset.e); return; }
  const card= hit("[data-c]");      if(card){ openRec(card.dataset.c); return; }
  const bf  = hit("[data-bf]");     if(bf){ S.battleFilter = bf.dataset.bf; render(); return; }
  const ts  = hit("[data-ts]");     if(ts){ S.topicSec = ts.dataset.ts; render(); return; }
  const rm  = hit("[data-rm]");     if(rm){ S.revMode = rm.dataset.rm; S.qAnswered = null; render(); return; }
  const rs  = hit("[data-rs]");     if(rs){
      S.qSec = rs.dataset.rs; S.qIdx = 0; S.qAnswered = null;
      render(); return; }
  const opt = hit("[data-opt]");    if(opt){ answer(+opt.dataset.opt); return; }
  const qn  = hit("[data-q]");      if(qn){ stepQ(+qn.dataset.q); return; }
  const py  = hit("[data-py]");     if(py){ S.pyYear = py.dataset.py; S.pyIdx = 0; S.pyAnswered = null; render(); return; }
  const ph  = hit("[data-pyhp]");   if(ph){ S.pyHP = !S.pyHP; S.pyIdx = 0; S.pyAnswered = null; render(); return; }
  const po  = hit("[data-pyopt]");  if(po){ pyAnswer(+po.dataset.pyopt); return; }
  const pn  = hit("[data-pyn]");    if(pn){ pyStep(pn.dataset.pyn); return; }

  if(hit("#pclose")){ closePanel(); return; }
  if(hit("#pshare")){ shareCurrent(); return; }
  if(hit("#themebtn")){ cycleTheme(); return; }
  if(hit("#randbtn")){ surpriseMe(); return; }
  if(hit("#resetbtn")){
    if(confirm("Clear saved quiz and past-paper progress? This cannot be undone.")){ store.del("quiz"); store.del("pyq"); render(); toast("Progress cleared"); }
    return; }
  if(!hit(".searchwrap")) $("#results").hidden = true;
});

function surpriseMe(){
  const ids = [...IDX.keys()];
  goTo(ids[Math.random()*ids.length | 0]);
}
async function shareCurrent(){
  if(!S.sel) return;
  const url = location.href;
  const title = nameOf(IDX.get(S.sel))+" — Parikrama Path";
  try{
    if(navigator.share && matchMedia("(max-width:1000px)").matches){
      await navigator.share({title, url}); return;
    }
    await navigator.clipboard.writeText(url);
    toast("Link to this note copied");
  }catch(err){
    const ta = document.createElement("textarea");
    ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); toast("Link to this note copied"); }
    catch(e2){ toast("Copy failed — the link is in the address bar"); }
    ta.remove();
  }
}

$("#search").addEventListener("input", e => runSearch(e.target.value));
$("#search").addEventListener("keydown", e => {
  if(e.key === "ArrowDown"){ e.preventDefault(); moveSearch(1); }
  else if(e.key === "ArrowUp"){ e.preventDefault(); moveSearch(-1); }
  else if(e.key === "Enter"){
    const a = $("#results").querySelector(".res.act");
    if(a){ e.preventDefault(); $("#results").hidden = true; e.target.blur(); goTo(a.dataset.go); } }
  else if(e.key === "Escape"){ $("#results").hidden = true; e.target.blur(); }
});
document.addEventListener("keydown", e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if(e.key === "/" && !typing){ e.preventDefault(); $("#search").focus(); $("#search").select(); return; }
  if(e.key === "Escape"){ if(!$("#panel").hidden) closePanel(); return; }
  if(typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if(S.view === "revise" && S.revMode === "quiz"){
    if(/^[1-4]$/.test(e.key)) answer(+e.key-1);
    else if(e.key === "ArrowRight"){ e.preventDefault(); stepQ(1); }
    else if(e.key === "ArrowLeft"){ e.preventDefault(); stepQ(-1); }
  } else if(S.view === "revise" && S.revMode === "papers"){
    if(/^[1-4]$/.test(e.key)) pyAnswer(+e.key-1);
    else if(e.key === "ArrowRight"){ e.preventDefault(); pyStep(1); }
    else if(e.key === "ArrowLeft"){ e.preventDefault(); pyStep(-1); }
  }
});

/* ---------- theme ---------- */
function cycleTheme(){
  const cur = store.get("theme","system");
  store.set("theme", cur === "system" ? "light" : cur === "light" ? "dark" : "system");
  applyTheme();
}
function applyTheme(){
  const t = store.get("theme","system");
  if(t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const b = $("#themebtn");
  if(b) b.textContent = t === "system" ? "Theme: auto" : t === "light" ? "Theme: light" : "Theme: dark";
}

/* ---------- boot ---------- */
applyTheme();
/* The old boolean rivers toggle is now two legend layers. Migrate it so
   a returning visitor who had rivers off does not see them reappear. */
S.seen   = store.get("seen", []);
S.legendOpen = store.get("legendopen", false);
S.mapOff = store.get("mapoff", null) ||
  (store.get("rivers", true) ? [] : ["river1","river2"]);
store.del("rivers");
/* Map mode tabs are gone; every kind is now a permanent legend layer.
   Drop the stored key (lowercase, matching "mapoff"/"rivers"/"theme")
   so a returning visitor is not left with a dead one. */
store.del("mapmode");
buildNav();
document.getElementById("brandmark").innerHTML = logoMark(26);
document.getElementById("brandmarkm").innerHTML = logoMark(24);
if(location.hash && readHash().view) applyHash();
else setView("home", true);

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
