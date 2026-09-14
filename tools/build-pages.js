"use strict";
/* ============================================================
   Pre-render one static page per record.

   Why this exists: link-preview crawlers (WhatsApp, Telegram, Twitter,
   Facebook) and search engines do not run the SPA, and a URL fragment is
   never sent to the server at all — so with hash routing every one of the
   270 records is, to a crawler, the same page. These pages give each
   record a real URL, its own title and description, its own preview card,
   and its prose in the HTML rather than assembled by JavaScript.

   The page is readable on its own. It does NOT auto-redirect into the
   app: someone arriving from a search or a group chat gets the answer
   immediately instead of waiting for a 3 MB single-page app, and the
   atlas is one clearly-marked click away.

   Run: node tools/build-pages.js
   ============================================================ */

const fs = require("fs");
const path = require("path");
const {loadData} = require("../test/load.js");

const ROOT = path.join(__dirname, "..");
/* www, not the apex: parikramapath.com 308-redirects to www, and a
   canonical pointing at a redirecting host is a canonical a search
   engine is entitled to ignore. Verified against the live site, not
   assumed. If Vercel is ever switched to serve the apex as primary,
   change this one line and re-run. */
const SITE = "https://www.parikramapath.com";
const OUT  = path.join(ROOT, "r");

const {D} = loadData();

const KINDS = {
  district:{lb:"District",       view:"map"},
  state:   {lb:"Princely state", view:"map"},
  event:   {lb:"Event",          view:"timeline"},
  battle:  {lb:"Battle / treaty",view:"battles"},
  person:  {lb:"Person",         view:"people"},
  topic:   {lb:"Topic",          view:"topics"},
  river:   {lb:"River",          view:"map"},
  peak:    {lb:"Peak",           view:"map"},
  pass:    {lb:"Pass",           view:"map"},
  lake:    {lb:"Lake",           view:"map"},
  glacier: {lb:"Glacier",        view:"map"}
};

/* Same index the app builds, so a page exists for exactly what the app
   can open — no more, no fewer. */
const IDX = new Map();
[[D.districts,"district"],[D.states,"state"],[D.events,"event"],
 [D.battles,"battle"],[D.people,"person"],[D.topics,"topic"],[D.rivers,"river"]]
  .forEach(([arr, k]) => (arr || []).forEach(r => IDX.set(r.id, {r, kind: k})));
(D.features || []).forEach(r => IDX.set(r.id, {r, kind: r.k}));

const esc = v => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
/* Attribute values and meta content cannot carry markup; the source prose
   has <b> and <i> in it. */
const strip = v => String(v == null ? "" : v).replace(/<[^>]*>/g, "");
const nameOf = r => r.name || r.t || r.title || r.id;

function firstProse(r){
  for(const b of (r.blocks || [])) if(b[0] === "p") return strip(b[1]);
  for(const b of (r.blocks || [])) if(b[0] === "ul" && Array.isArray(b[1])) return strip(b[1][0]);
  return "";
}
/* Cut on a word boundary — a description sliced mid-word reads as broken
   rather than as truncated. */
function clamp(s, n){
  s = String(s || "").replace(/\s+/g, " ").trim();
  if(s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

function blocksHtml(r){
  let out = "";
  for(const b of (r.blocks || [])){
    if(b[0] === "p")  out += "<p>" + b[1] + "</p>\n";
    else if(b[0] === "h") out += "<h2>" + esc(b[1]) + "</h2>\n";
    else if(b[0] === "ul" && Array.isArray(b[1]))
      out += "<ul>" + b[1].map(x => "<li>" + x + "</li>").join("") + "</ul>\n";
    else if(b[0] === "note")
      out += '<aside class="note"><b>' + esc(b[1]) + "</b> " + b[2] + "</aside>\n";
  }
  return out;
}

/* The handful of scalar fields worth showing as a table — what a reader
   searching "Kangra area population" actually came for. */
const FACTS_BY_KIND = {
  district: [["Headquarters","hq"],["Division","div"],["Formed","formed"],
             ["Area","area","km²"],["Population (2011)","pop"],
             ["Density (2011)","den","per km²"],["Literacy (2011)","lit","%"],
             ["Sex ratio (2011)","sr"]],
  state:    [["Seat","seat"],["Capital","capital"],["Dynasty","dynasty"],
             ["Group","group"],["Founder","founder"],["Founded","founded"],["Merged","merged"]],
  peak:     [["Height","h","m"],["District","dist"]],
  pass:     [["Height","h","m"],["Connects","conn"]],
  lake:     [["District","dist"],["Type","type"]],
  glacier:  [["District","dist"],["Feeds","feeds"]],
  river:    [["Length","len","km"],["Source","src"]]
};
function factsHtml(r, kind){
  const spec = FACTS_BY_KIND[kind] || [];
  const rows = spec.map(([lb, k, unit]) => {
    const v = r[k];
    if(v === undefined || v === null || v === "") return "";
    const val = typeof v === "number" ? v.toLocaleString("en-IN") : strip(v);
    return "<tr><th>" + esc(lb) + "</th><td>" + esc(val) +
           (unit ? " " + esc(unit) : "") + "</td></tr>";
  }).filter(Boolean).join("");
  return rows ? '<table class="facts">' + rows + "</table>\n" : "";
}

const CSS = `:root{color-scheme:light dark;--bg:#EDEEE9;--fg:#17201D;--dim:#4B5650;
--line:#CDD3C7;--card:#F8F9F5;--accent:#1F5048}
@media(prefers-color-scheme:dark){:root{--bg:#111614;--fg:#E9ECE5;--dim:#AFB9B2;
--line:#333D38;--card:#1A211E;--accent:#6BB3A2}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
 font:17px/1.65 Georgia,'Times New Roman',serif;padding:28px 20px 64px}
main{max-width:720px;margin:0 auto}
.kick{font:500 11px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;
 color:var(--accent);margin-bottom:10px}
h1{font-size:40px;line-height:1.1;letter-spacing:-.02em;margin:0 0 18px}
h2{font-size:20px;margin:30px 0 8px}
p,li{color:var(--dim)}
ul{padding-left:22px}
.note{border-left:3px solid var(--accent);background:var(--card);padding:12px 16px;
 margin:20px 0;font-size:15px;color:var(--dim)}
table.facts{border-collapse:collapse;margin:20px 0;width:100%;font-size:15px}
table.facts th,table.facts td{text-align:left;padding:7px 12px 7px 0;
 border-bottom:1px solid var(--line);vertical-align:top}
table.facts th{width:44%;color:var(--dim);font-weight:600}
.cta{display:inline-block;margin:26px 0 8px;padding:12px 20px;border-radius:9px;
 background:var(--accent);color:var(--bg);text-decoration:none;font:600 15px/1 system-ui}
.home{display:block;margin-bottom:22px;font:500 13px/1 ui-monospace,monospace;
 letter-spacing:.06em;color:var(--dim);text-decoration:none}
footer{margin-top:40px;padding-top:18px;border-top:1px solid var(--line);
 font-size:13px;color:var(--dim)}
footer a{color:var(--accent)}`;

function page(id, entry){
  const r = entry.r, kind = entry.kind;
  const k = KINDS[kind] || {lb: "Record", view: "map"};
  const name = nameOf(r);
  const title = name + " — " + k.lb + " | Parikrama Path";
  /* Used by the 39 records that carry no prose block. It is a meta
     description on a real page, so it must not describe the site as
     HPAS-only any more than the hand-written ones do. */
  const desc = clamp(firstProse(r) ||
    (name + " \u2014 " + (KINDS[entry.kind] || {lb:"record"}).lb.toLowerCase() +
     " in the Himachal Pradesh material shared by HPAS, HPRCA, Police and TET exams."), 155);
  const url = SITE + "/r/" + id + "/";
  const app = SITE + "/#/" + k.view + "/" + id;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#111614">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Parikrama Path">
<meta property="og:locale" content="en_IN">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(name + " — " + k.lb)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(name + " — " + k.lb)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/og.jpg">
<link rel="icon" href="${SITE}/icon.svg" type="image/svg+xml">
<style>${CSS}</style>
</head>
<body>
<main>
<a class="home" href="${SITE}/">&larr; Parikrama Path</a>
<div class="kick">${esc(k.lb)}</div>
<h1>${esc(name)}</h1>
${factsHtml(r, kind)}${blocksHtml(r)}
<a class="cta" href="${esc(app)}">Open in the atlas &rarr;</a>
<footer>
Revision notes for the <b>Himachal Pradesh</b> portion of HP competitive exam
syllabuses — HPAS, HPRCA, Police and TET.
<a href="${SITE}/">See the whole atlas</a> — a clickable map, five years of past papers,
and a fact feed.
</footer>
</main>
</body>
</html>
`;
}

/* ---------- write ---------- */
fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(OUT, {recursive: true});

const urls = [];
let n = 0;
for(const [id, entry] of IDX){
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, "index.html"), page(id, entry));
  urls.push(SITE + "/r/" + id + "/");
  n++;
}

/* The exams page, pre-rendered for the same reason the records are: a
   crawler never runs the app, and "HPRCA Patwari syllabus" is searched
   far more than "HPAS". */
const {EXAMS} = require("../data/exams.js");
const examRows = EXAMS.rows.map(e =>
  '<div class="exrow"><h2>' + esc(e.name) + "</h2>\n" +
  '<p class="who"><a href="' + esc(e.bodyUrl) + '" rel="noopener">' + esc(e.body) +
    "</a> · " + esc(e.level) + "</p>\n" +
  "<p>" + esc(e.what) + "</p>\n" +
  "<p class=\"held\">" + (e.papers && e.papers.n
    ? esc(e.papers.n + " past papers here, " + e.papers.years)
    : "No past papers here yet — the shared Himachal material applies in full") +
  "</p></div>").join("\n");

const examsDesc = "Which Himachal Pradesh exams this atlas helps with — HPAS, " +
  "HPRCA Patwari, Panchayat Secretary, JOA and Clerk, HP Police Constable and " +
  "HP TET — and exactly what it holds for each.";
const examsUrl = SITE + "/exams/";
const examsHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Which HP exams this helps with | Parikrama Path</title>
<meta name="description" content="${esc(examsDesc)}">
<link rel="canonical" href="${esc(examsUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Parikrama Path">
<meta property="og:url" content="${esc(examsUrl)}">
<meta property="og:title" content="Which HP exams this helps with">
<meta property="og:description" content="${esc(examsDesc)}">
<meta property="og:image" content="${SITE}/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Which HP exams this helps with">
<meta name="twitter:description" content="${esc(examsDesc)}">
<link rel="icon" href="${SITE}/icon.svg" type="image/svg+xml">
<style>${CSS}
.exrow{border-top:1px solid var(--line);padding-top:16px;margin-top:20px}
.who{font-size:14px}.held{font-size:14px;color:var(--dim)}</style>
</head>
<body>
<main>
<a class="home" href="${SITE}/">&larr; Parikrama Path</a>
<div class="kick">Himachal Pradesh</div>
<h1>Which exams this helps with</h1>
<p>Everything here is the Himachal Pradesh material these exams share — geography,
history, polity, economy and culture. The past-paper bank is HPAS only, and each
exam below says plainly what is here for it.</p>
${examRows}
<a class="cta" href="${SITE}/">Open the atlas &rarr;</a>
<footer>Conducting bodies last checked ${esc(EXAMS.updated)}. They do change —
the state's previous staff selection board was dissolved in 2023 and its
recruitment moved to HPRCA — so confirm against the board's own site before you rely on it.</footer>
</main>
</body>
</html>
`;
fs.mkdirSync(path.join(ROOT, "exams"), {recursive: true});
fs.writeFileSync(path.join(ROOT, "exams", "index.html"), examsHtml);
urls.push(examsUrl);

const today = new Date().toISOString().slice(0, 10);
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ['<url><loc>' + SITE + '/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>']
    .concat(urls.map(u =>
      '<url><loc>' + u + '</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq></url>'))
    .join("\n") +
  "\n</urlset>\n";
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

fs.writeFileSync(path.join(ROOT, "robots.txt"),
  "User-agent: *\nAllow: /\n\nSitemap: " + SITE + "/sitemap.xml\n");

console.log("pages:   " + n);
console.log("sitemap: " + (urls.length + 1) + " urls");
console.log("robots:  written");
