/* ============================================================
   Devbhoomi Atlas — application
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
  topic:   {lb:"Topic",           pl:"Topic notes",      c:"var(--accent)",view:"topics"}
};
const KIND_ORDER = ["district","state","person","event","battle","topic"];
const IDX = new Map();
[[D.districts,"district"],[D.states,"state"],[D.events,"event"],
 [D.battles,"battle"],[D.people,"person"],[D.topics,"topic"]]
  .forEach(([arr,k]) => arr.forEach(r => IDX.set(r.id, {r, kind:k})));

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
  view:"home", sel:null, trail:[],
  mapMode:"districts", era:"all", battleFilter:"all", topicSec:"all",
  revMode:"cards", cardIdx:0, cardFlip:false, cardSec:"all",
  qIdx:0, qSec:"all", qAnswered:null
};

const NAV = [
  {id:"home",     lb:"Overview", ic:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'},
  {id:"map",      lb:"Map",      ic:'<path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/>'},
  {id:"timeline", lb:"Timeline", ic:'<path d="M12 3v18"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="17" r="2"/><path d="M14 7h6M4 17h6"/>'},
  {id:"battles",  lb:"Battles",  ic:'<path d="M14.5 14.5L21 21M9.5 14.5L3 21"/><path d="M18 3l-9 9M6 3l9 9"/>'},
  {id:"topics",   lb:"Topics",   ic:'<path d="M4 5h16M4 12h16M4 19h10"/>'},
  {id:"people",   lb:"People",   ic:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6"/>'},
  {id:"revise",   lb:"Revise",   ic:'<path d="M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M9 8h6"/>'}
];
const COUNTS = {map:D.districts.length, timeline:D.events.length, battles:D.battles.length,
                topics:D.topics.length, people:D.people.length, revise:D.quiz.length};
const SUB = {home:"Start here", map:"12 districts · "+D.states.length+" hill states",
             timeline:"Prehistory to 1971", battles:"Wars, sieges and treaties",
             topics:"Notes by subject", people:"Rulers, rebels, builders", revise:"Flashcards and quiz"};
const TITLE = {home:"Overview", map:"Atlas", timeline:"Timeline", battles:"Battles & Treaties",
               topics:"Topics", people:"People", revise:"Revise"};

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
  $("#mtabs").innerHTML = NAV.map(n =>
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
  else {
    const pid = r.seat || r.place;
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
  else if(k === "topic"){
    body += factsList([["Section", r.sec], ["Covers", r.kw]]);
    body += renderBlocks(r.blocks);
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
    if(o.kind === "state") S.mapMode = "states";
    if(o.kind === "district") S.mapMode = "districts";
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
const MAP_MODES = [
  {id:"districts", lb:"Districts",              kinds:[]},
  {id:"states",    lb:"Hill States",            kinds:["state"]},
  {id:"geo",       lb:"Peaks · Passes · Lakes", kinds:["peak","pass","lake"]},
  {id:"heritage",  lb:"Temples & Monasteries",  kinds:["temple"]},
  {id:"sites",     lb:"Battle & Movement Sites",kinds:["battle"]}
];
const MK_COLOR = {state:"var(--e6)", peak:"var(--ink-2)", pass:"var(--e2)",
                  lake:"var(--indigo)", temple:"var(--gold)", battle:"var(--vermilion)"};
const MK_LABEL = {state:"Seat of a hill state", peak:"Peak", pass:"Pass",
                  lake:"Lake / reservoir", temple:"Temple / monastery", battle:"Battle or movement site"};
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
  if(p.k === "state"){ const s = D.states.find(x => x.seat === pid); if(s) return s.id; }
  const b = D.battles.find(x => x.place === pid); if(b) return b.id;
  if(PLACE_LINK[pid]) return PLACE_LINK[pid];
  if(p.k === "temple") return MONASTERIES.has(pid) ? "t-monasteries" : "t-temples";
  if(p.k === "peak") return "t-peaks";
  if(p.k === "pass") return "t-passes";
  if(p.k === "lake") return "t-lakes";
  if(p.k === "state") return "t-colonial-admin";
  return null;
}
function viewMap(){
  const mode = MAP_MODES.find(m => m.id === S.mapMode) || MAP_MODES[0];
  const showLabels = mode.id === "districts";
  const paths = Object.entries(MAP.paths).map(([n,d]) => {
    const rec = D.districts.find(x => x.map === n);
    return '<path class="dist" d="'+d+'" data-d="'+(rec?rec.id:"")+'" data-name="'+n+'"/>';
  }).join('');
  const labels = Object.entries(MAP.centroids).map(([n,c]) =>
    '<g class="dl" transform="translate('+c[0]+','+c[1]+')"><text class="distlabel">'+n+'</text></g>').join('');
  const marks = Object.entries(MAP.places)
    .filter(([,p]) => mode.kinds.includes(p.k))
    .map(([id,p]) => '<g class="mk" data-p="'+id+'" data-rec="'+(placeTarget(id)||"")+'" '+
      'transform="translate('+p.x+','+p.y+')">'+
      '<circle r="5.5" fill="'+MK_COLOR[p.k]+'"/><text y="-10">'+p.n+'</text></g>').join('');
  const legend = mode.kinds.length
    ? '<div class="maplegend"><div class="lt">'+
      (mode.id==="states" ? "Seats of the hill states, c. 1815" : "Showing")+'</div><ul>'+
      mode.kinds.map(k => '<li><i style="background:'+MK_COLOR[k]+'"></i>'+MK_LABEL[k]+'</li>').join('')+
      '</ul></div>'
    : '<div class="maplegend"><div class="lt">Base map</div><ul>'+
      '<li>Click a district to open its record</li>'+
      '<li>Drag to pan · scroll to zoom</li></ul></div>';
  return '<div id="mapview">'+
    '<div class="maptools"><div class="seg">'+
      MAP_MODES.map(m => '<button type="button" data-mm="'+m.id+'" aria-pressed="'+(m.id===S.mapMode)+'">'+
        m.lb+'</button>').join('')+
    '</div></div>'+
    '<div class="mapcanvas" id="mapcanvas">'+
      '<svg id="hpsvg" viewBox="0 0 '+MAP.w+' '+MAP.h+'" preserveAspectRatio="xMidYMid meet" '+
        'role="img" aria-label="Map of Himachal Pradesh — click a district or marker">'+
        '<g id="mapg">'+paths+(showLabels?labels:"")+marks+'</g></svg>'+
      '<div id="maptip"></div>'+legend+
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

  svg.addEventListener("pointerdown", e => {
    if(e.button && e.button !== 0) return;
    down = {x:e.clientX, y:e.clientY, ox:ZT.x, oy:ZT.y, id:e.pointerId,
            target:e.target.closest(".mk") || e.target.closest(".dist")};
    dragging = false;
  });
  svg.addEventListener("pointermove", e => {
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
    const hit = e.target.closest(".mk") || e.target.closest(".dist");
    if(hit && !dragging){
      const rect = canvas.getBoundingClientRect();
      let title, sub;
      if(hit.classList.contains("mk")){
        const p = MAP.places[hit.dataset.p]; title = p.n; sub = MK_LABEL[p.k];
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
    if(!down || e.pointerId !== down.id) return;
    const wasDragging = dragging;
    if(dragging){ try{ svg.releasePointerCapture(e.pointerId); }catch(err){} }
    svg.classList.remove("grabbing");
    const t = down.target;
    down = null; dragging = false;
    if(wasDragging || !t) return;
    if(t.classList.contains("mk")){
      const rec = t.dataset.rec;
      if(rec && IDX.has(rec)) openRec(rec, MAP.places[t.dataset.p].n);
      else toast("No note linked to this place yet");
    } else if(t.dataset.d){
      openRec(t.dataset.d);
    }
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", e => { down = null; dragging = false; svg.classList.remove("grabbing"); });
  svg.addEventListener("pointerleave", () => tip.classList.remove("on"));
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const p = toSvg(e), f = Math.exp(-e.deltaY*0.0015);
    const nk = Math.min(9, Math.max(1, ZT.k*f)), r = nk/ZT.k;
    ZT.x = p.x-(p.x-ZT.x)*r; ZT.y = p.y-(p.y-ZT.y)*r; ZT.k = nk;
    if(ZT.k === 1){ ZT.x = 0; ZT.y = 0; }
    applyZoom();
  }, {passive:false});
}

/* ============================================================
   OTHER VIEWS
   ============================================================ */
function viewHome(){
  const syl = [
    ["01","Ancient Himachal","Pre-history, Vedic references and the janapadas — Audumbara, Trigarta, Kuluta, Kulinda","t-janapadas"],
    ["02","Early medieval states","Emergence and growth of Kangra, Kullu and Chamba","s-chamba"],
    ["03","Mughals and Sikhs","The hill states and their relations with the Mughals and the Sikhs","t-mughal-relations"],
    ["04","The Gorkha invasion","Its nature and consequences; the Treaty of Segauli","t-gorkha"],
    ["05","Under colonial power","Sanads, grants, agency administration and territorial change","t-colonial-admin"],
    ["06","Praja Mandal, 1848–1948","The national movement with special reference to the Praja Mandal movements","t-freedom"],
    ["07","Making Himachal","Formation in 1948, the 1966 transfer, statehood in 1971","t-statehood"],
    ["08","Artistic and cultural heritage","Temples, Buddhist monasteries and Pahari painting","t-pahari-painting"],
    ["09","Geography of Himachal","Physiography, rivers, passes, peaks, lakes and protected areas","t-physio"],
    ["10","Polity and governance","Constitutional evolution, the Assembly, panchayati raj, state legislation","t-polity"],
    ["11","Economy","Horticulture, hydropower, industry and tourism","t-economy"]
  ];
  const prog = store.get("quiz",{});
  const done = Object.keys(prog).length, right = Object.values(prog).filter(Boolean).length;
  const tile = (v,l,s,view) => '<button class="tile" type="button" data-view="'+view+'">'+
    '<div class="v">'+v+'</div><div class="l">'+l+'</div><div class="s">'+s+'</div></button>';
  return '<div class="home">'+
  '<div class="hero">'+
    '<div class="kicker">HPPSC · HPAS 2026 · Himachal Pradesh</div>'+
    '<h1>Everything Himachal, connected.</h1>'+
    '<p>The HP-specific syllabus as one linked object. Click a district on the map and you get its dynasty, '+
    'its rulers, the battles fought on it and the modern statistics. Click a battle and you get the state that '+
    'lost it. Nothing here is a separate page — it is one set of '+IDX.size+' records seen from six angles.</p>'+
  '</div>'+
  '<div class="tiles">'+
    tile(D.events.length,"events on the timeline","Prehistory → 1971","timeline")+
    tile(D.states.length,"hill states mapped","Chamba to Kunihar","map")+
    tile(D.battles.length,"battles &amp; treaties","Bhangani to Suket","battles")+
    tile(D.topics.length,"topic note pages","5 subjects","topics")+
    tile(D.quiz.length,"practice questions",(done ? right+"/"+done+" correct so far" : "not started"),"revise")+
  '</div>'+
  '<div class="syllabus">'+
    '<div class="secthead"><h3>The syllabus, as eleven blocks</h3><span class="n">tap any row</span></div>'+
    syl.map(s => '<button class="sylrow" type="button" data-go="'+s[3]+'">'+
      '<span class="sn">'+s[0]+'</span><span><span class="st">'+s[1]+'</span>'+
      '<span class="sd">'+s[2]+'</span></span></button>').join('')+
  '</div>'+
  '<div class="syllabus" style="margin-top:30px">'+
    '<div class="secthead"><h3>How to use it</h3></div>'+
    '<div class="blk" style="max-width:66ch">'+
    '<p><b>Follow the links.</b> Every record lists what it connects to, grouped by type. The panel keeps a '+
    '<b>Path</b> trail of what you clicked through, so a chain like Kangra → Sansar Chand → Mahal Morian stays visible.</p>'+
    '<p><b>Share any note.</b> The link button in the panel copies a direct URL to that record — '+
    'useful for sending a specific fact to a study group.</p>'+
    '<p><b>Press <kbd>/</kbd></b> to search everything, or use <b>Surprise me</b> for a random record when you want '+
    'cold recall rather than a planned pass.</p>'+
    '<p>Where sources genuinely disagree — the number of states merged in 1948, the wildlife-sanctuary count, '+
    'several Praja Mandal founding years — the note says so rather than picking one silently. Those are marked '+
    '<b>Disputed</b>.</p>'+
    '</div>'+
  '</div></div>';
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
   REVISE — flashcards generated from the records, plus the MCQ bank
   ============================================================ */
let CARDS = null;
function buildCards(){
  const c = []; const push = (sec,q,a,id) => c.push({sec,q,a,id});
  D.districts.forEach(d => {
    push("Geography", d.name+" — headquarters and division?", "<b>"+d.hq+"</b>, in the "+d.div+" division.", d.id);
    push("Geography", "When was "+d.name+" district formed?", "<b>"+d.formed+"</b>", d.id);
    push("Geography", d.name+" — area, population and density?",
      "<b>"+num(d.area)+" km²</b> · population <b>"+num(d.pop)+"</b> · density <b>"+d.den+"/km²</b> (Census 2011).", d.id);
    push("Geography", d.name+" — literacy and sex ratio?",
      "Literacy <b>"+d.lit+"%</b> · sex ratio <b>"+d.sr+"</b> (Census 2011).", d.id);
  });
  D.states.forEach(s => {
    push("History", s.name+" — founder and founding date?", "<b>"+s.founder+"</b> · "+s.founded, s.id);
    push("History", s.name+" — capital?", "<b>"+s.capital+"</b>", s.id);
    push("History", "How did "+s.name+" end?", "<b>"+s.merged+"</b>", s.id);
  });
  D.events.forEach(e => {
    push("History", e.yr+" — what happened?", "<b>"+e.t+"</b><br>"+e.s, e.id);
    push("History", "When: "+e.t+"?", "<b>"+e.yr+"</b>", e.id);
  });
  D.battles.forEach(b => {
    push("History", b.name+" — year, sides, winner?",
      "<b>"+b.yr+"</b><br>"+b.sides.join("  vs  ")+"<br>Won by <b>"+b.winner+"</b>.", b.id);
    push("History", b.name+" — why does it matter?", b.sig, b.id);
  });
  D.people.forEach(p => push("History", "Who was "+p.name+"?",
    "<b>"+p.role+"</b> ("+p.dates+")<br>"+p.one, p.id));
  D.topics.forEach(t => push(t.sec, t.title+" — what must you be able to name?", t.kw, t.id));
  return c;
}
const cardPool = () => {
  if(!CARDS) CARDS = buildCards();
  return S.cardSec === "all" ? CARDS : CARDS.filter(c => c.sec === S.cardSec);
};
const quizPool = () => S.qSec === "all" ? D.quiz : D.quiz.filter(q => q.s === S.qSec);

function viewRevise(){
  const secs = ["all","History","Geography","Polity","Economy","Culture"];
  const active = S.revMode === "cards" ? S.cardSec : S.qSec;
  return '<div class="revwrap">'+
    '<div class="revtools"><div class="seg">'+
      '<button type="button" data-rm="cards" aria-pressed="'+(S.revMode==="cards")+'">Flashcards</button>'+
      '<button type="button" data-rm="quiz" aria-pressed="'+(S.revMode==="quiz")+'">Quiz</button>'+
    '</div><div class="chipset">'+secs.map(s =>
      '<button class="tog" type="button" data-rs="'+s+'" aria-pressed="'+(active===s)+'">'+
      (s === "all" ? "All" : s)+'</button>').join('')+'</div></div>'+
    (S.revMode === "cards" ? flashUI() : quizUI())+'</div>';
}
function flashUI(){
  const pool = cardPool();
  if(!pool.length) return '<div class="qcard">No cards in this section.</div>';
  if(S.cardIdx >= pool.length) S.cardIdx = 0;
  const c = pool[S.cardIdx];
  return '<div class="flash'+(S.cardFlip?" flipped":"")+'" id="flash">'+
    '<div class="flashinner">'+
      '<div class="fface"><div class="lb">'+c.sec+' · card '+(S.cardIdx+1)+' of '+pool.length+'</div>'+
        '<div class="q">'+c.q+'</div></div>'+
      '<div class="fface fback"><div class="lb">Answer</div><div class="a">'+c.a+'</div>'+
        '<div style="margin-top:auto"><button class="btn sm" type="button" data-go="'+c.id+'">'+
        'Open the full note</button></div></div>'+
    '</div></div>'+
    '<div class="fhint">Tap the card to flip · <kbd>&larr;</kbd> <kbd>&rarr;</kbd> to move · <kbd>space</kbd> to flip</div>'+
    '<div class="revnav">'+
      '<button class="btn" type="button" data-card="-1">&larr; Back</button>'+
      '<button class="btn" type="button" data-card="shuffle">Shuffle</button>'+
      '<button class="btn primary" type="button" data-card="1">Next &rarr;</button>'+
    '</div>';
}
function quizUI(){
  const pool = quizPool(), prog = store.get("quiz",{});
  const attempted = pool.filter(q => prog[q.q] !== undefined).length;
  const correct = pool.filter(q => prog[q.q] === 1).length;
  const pct = attempted ? Math.round(correct/attempted*100) : 0;
  const weak = {};
  pool.forEach(q => { if(prog[q.q] === 0) weak[q.t] = (weak[q.t]||0)+1; });
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
function stepCard(d){
  const pool = cardPool();
  if(d === "shuffle"){
    for(let i = CARDS.length-1; i > 0; i--){ const j = Math.random()*(i+1)|0; [CARDS[i],CARDS[j]] = [CARDS[j],CARDS[i]]; }
    S.cardIdx = 0; toast("Deck shuffled");
  } else S.cardIdx = (S.cardIdx + (+d) + pool.length) % pool.length;
  S.cardFlip = false; render();
}
function answer(i){
  if(S.qAnswered !== null) return;
  const q = quizPool()[S.qIdx]; if(!q) return;
  S.qAnswered = i;
  const prog = store.get("quiz",{}); prog[q.q] = i === q.a ? 1 : 0; store.set("quiz", prog);
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
    extra:(r.kw || r.role || r.yr || r.hq || r.capital || ""),
    txt:[nameOf(o), ALIAS[id]||"", r.alias||"", r.kw||"", r.role||"", r.one||"", r.s||"",
         r.sig||"", r.capital||"", r.founder||"", r.hq||"", r.yr||"",
         (r.sides||[]).join(" ")].join(" ").toLowerCase()
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

/* ---------- render dispatcher ---------- */
function render(){
  const s = $("#stage");
  if(S.view === "home")           s.innerHTML = viewHome();
  else if(S.view === "map")     { s.innerHTML = viewMap(); mountMap(); }
  else if(S.view === "timeline"){ s.innerHTML = viewTimeline(); paintSelection(); }
  else if(S.view === "battles") { s.innerHTML = viewBattles(); paintSelection(); }
  else if(S.view === "topics")  { s.innerHTML = viewTopics(); paintSelection(); }
  else if(S.view === "people")  { s.innerHTML = viewPeople(); paintSelection(); }
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
  const mm  = hit("[data-mm]");     if(mm){ S.mapMode = mm.dataset.mm; render(); return; }
  const zm  = hit("[data-zoom]");   if(zm){ zoomBy(+zm.dataset.zoom); return; }
  const era = hit("[data-era]");    if(era){ S.era = era.dataset.era; render(); return; }
  const ev  = hit(".ev");           if(ev){ openRec(ev.dataset.e); return; }
  const card= hit("[data-c]");      if(card){ openRec(card.dataset.c); return; }
  const bf  = hit("[data-bf]");     if(bf){ S.battleFilter = bf.dataset.bf; render(); return; }
  const ts  = hit("[data-ts]");     if(ts){ S.topicSec = ts.dataset.ts; render(); return; }
  const rm  = hit("[data-rm]");     if(rm){ S.revMode = rm.dataset.rm; S.qAnswered = null; render(); return; }
  const rs  = hit("[data-rs]");     if(rs){
      if(S.revMode === "cards"){ S.cardSec = rs.dataset.rs; S.cardIdx = 0; S.cardFlip = false; }
      else { S.qSec = rs.dataset.rs; S.qIdx = 0; S.qAnswered = null; }
      render(); return; }
  const fl  = hit("#flash");        if(fl){ S.cardFlip = !S.cardFlip; fl.classList.toggle("flipped", S.cardFlip); return; }
  const cn  = hit("[data-card]");   if(cn){ stepCard(cn.dataset.card); return; }
  const opt = hit("[data-opt]");    if(opt){ answer(+opt.dataset.opt); return; }
  const qn  = hit("[data-q]");      if(qn){ stepQ(+qn.dataset.q); return; }

  if(hit("#pclose")){ closePanel(); return; }
  if(hit("#pshare")){ shareCurrent(); return; }
  if(hit("#themebtn")){ cycleTheme(); return; }
  if(hit("#randbtn")){ surpriseMe(); return; }
  if(hit("#resetbtn")){
    if(confirm("Clear saved quiz progress? This cannot be undone.")){ store.del("quiz"); render(); toast("Progress cleared"); }
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
  const title = nameOf(IDX.get(S.sel))+" — Devbhoomi Atlas";
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
  if(S.view === "revise" && S.revMode === "cards"){
    if(e.key === "ArrowRight"){ e.preventDefault(); stepCard("1"); }
    else if(e.key === "ArrowLeft"){ e.preventDefault(); stepCard("-1"); }
    else if(e.key === " "){ e.preventDefault(); S.cardFlip = !S.cardFlip; render(); }
  } else if(S.view === "revise" && S.revMode === "quiz"){
    if(/^[1-4]$/.test(e.key)) answer(+e.key-1);
    else if(e.key === "ArrowRight"){ e.preventDefault(); stepQ(1); }
    else if(e.key === "ArrowLeft"){ e.preventDefault(); stepQ(-1); }
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
buildNav();
if(location.hash && readHash().view) applyHash();
else setView("home", true);

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
