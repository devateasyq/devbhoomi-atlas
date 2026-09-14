# Every HP Exam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the atlas describing itself as an HPAS tool, and let the nine Himachal exams it already serves say so — without claiming past papers it does not have.

**Architecture:** No content changes. A new `data/exams.js` registry, a view that renders it, a pre-rendered `/exams/` page, and copy edits in five places. The registry is the single source of truth: the view, the static page and the tests all read it, so an exam cannot be described two ways.

**Tech Stack:** Plain ES5-compatible browser JavaScript. No framework, no build step, no npm. Node's built-in test runner.

## Global Constraints

- **Zero npm dependencies**; no `package.json`; `test/` imports nothing outside Node's stdlib.
- **No build step for the app.** Data files are plain browser scripts assigning a global; `app/*.js` are classic `<script src>` includes. `tools/build-pages.js` is Node-only and runs by hand.
- **Run tests with `node --test`** (no path argument) from the repo root. A *directory* argument is broken on this Node build. `assert.notMatch` is unavailable; `assert.match` is.
- **191 tests pass today.** All must still pass.
- **No content changes.** Not one record, fact or quiz question.
- **All 448 past papers are HPAS**, already labelled `HPAS Prelims <year>` on each chip. That label stays.
- **The honesty rule: no exam appears as a room with nothing in it.** Every exam states what this app holds for it — the shared Himachal core for all nine, past papers for HPAS alone.
- **Conducting bodies, verified — do not "correct" these from memory:**
  - **HPPSC** (Shimla) — HPAS Combined Competitive, Assistant Professor, **and HP Police Constable**.
  - **HPRCA** — Himachal Pradesh Rajya Chayan Aayog, Hamirpur. **HPSSC Hamirpur was dissolved in February 2023** after the December 2022 paper leak. `HPSSC` and `HPSSSB` must not appear as a current authority anywhere.
  - **HPBOSE** (Dharamshala) — HP TET, ten categories, 150 MCQs in 150 minutes, no negative marking.
- **No exam dates, vacancy counts or application windows** — stale within weeks. Link the body's own site instead.
- **Bump `CACHE` in `sw.js`** after any asset change.
- **Re-run `node tools/build-pages.js`** after any change to page copy or `data/`.
- The canonical host is `https://www.parikramapath.com` — the apex 308-redirects to it.

---

## File Structure

**Create:**
- `data/exams.js` — the registry. One responsibility: what the exams are and what we hold for each.
- `test/exams.test.js` — guards the registry's shape and the honesty rule.

**Modify:**
- `app/app.js` — NAV entry, TITLE/SUB, `viewExams()`, render branch, hero kicker.
- `app/components.css` — the exams list.
- `index.html` — script tag, title, meta description, OG/Twitter copy.
- `tools/build-pages.js` — footer copy, and emit `/exams/`.
- `sw.js`, `test/load.js`, `build-single.sh` — pick up the new data file.
- `test/pages.test.js` — the HPAS-only string check.
- `test/harness.html`, `README.md`, `og.jpg`.

---

### Task 1: The exams registry

**Files:** Create `data/exams.js`, `test/exams.test.js`. Modify `index.html`, `sw.js`, `test/load.js`, `build-single.sh`.

**Interfaces:**
- Produces: global `EXAMS` — `{updated, rows: [{id, name, body, bodyUrl, level, what, papers, covers}]}`. `papers` is `{n, years}` with `n: 0` when none. `covers` is an array of the app's own view ids.

- [ ] **Step 1: Write the failing test**

Create `test/exams.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const {EXAMS} = require("../data/exams.js");
const {loadData} = require("./load");
const {D} = loadData();

const VIEWS = ["home","map","timeline","battles","topics","people",
               "trends","compare","rounds","revise"];

test("every exam is fully described", () => {
  assert.ok(EXAMS.rows.length >= 9, "got " + EXAMS.rows.length);
  for(const e of EXAMS.rows){
    for(const k of ["id","name","body","bodyUrl","level","what"])
      assert.ok(e[k] && String(e[k]).trim(), e.id + " is missing " + k);
    assert.ok(/^https:\/\//.test(e.bodyUrl), e.id + ": " + e.bodyUrl);
    assert.ok(e.what.length > 25, e.id + "'s description says nothing useful");
  }
});

test("exam ids are unique", () => {
  const ids = EXAMS.rows.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

/* The honesty rule, as a test. An exam may not claim papers this repo
   does not contain. */
test("no exam claims past papers it does not have", () => {
  const held = D.pyq.length;
  for(const e of EXAMS.rows){
    assert.equal(typeof e.papers.n, "number", e.id);
    if(e.id === "hpas") assert.equal(e.papers.n, held, "HPAS should claim exactly what is in data/pyq.js");
    else assert.equal(e.papers.n, 0, e.id + " claims papers this repo does not hold");
  }
});

test("every exam says what it covers, using real views", () => {
  for(const e of EXAMS.rows){
    assert.ok(Array.isArray(e.covers) && e.covers.length, e.id + " covers nothing");
    for(const v of e.covers)
      assert.ok(VIEWS.includes(v), e.id + " points at a view that does not exist: " + v);
  }
});

/* HPSSC Hamirpur was dissolved in February 2023 and replaced by HPRCA.
   Naming it as a current authority would be wrong on the one page aimed
   at its candidates. */
test("no dissolved recruitment body is named as current", () => {
  const blob = JSON.stringify(EXAMS);
  for(const dead of ["HPSSC", "HPSSSB"])
    assert.ok(!blob.includes(dead), "the registry still names " + dead);
});

test("the registry records when it was last checked", () => {
  assert.match(EXAMS.updated, /^\d{4}-\d{2}$/, EXAMS.updated);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/exams.test.js`
Expected: FAIL — `Cannot find module '../data/exams.js'`.

- [ ] **Step 3: Write the registry**

Create `data/exams.js`:

```js
/* ============================================================
   The Himachal exams this atlas serves.

   The material here — 270 records, the fact feed, the 151 quiz questions
   — is Himachal general studies, and every exam below tests it. What
   differs between them is depth and the rest of the paper, not the
   Himachal portion.

   The honesty rule: `papers` states what THIS REPO holds, not what
   exists in the world. All 448 past papers are HPAS. Every other exam
   reads 0 and says so on the page. An exam listed here with a paper bank
   it does not have would be the same failure as an invented figure.

   Bodies change. HPSSC Hamirpur was dissolved in February 2023 after the
   December 2022 paper leak and replaced by HPRCA. Re-check `updated`
   against the boards' own sites before each release.
   ============================================================ */

var EXAMS = {
  updated: "2026-09",
  rows: [
    {id:"hpas", name:"HPAS — Combined Competitive Examination",
     body:"HPPSC, Shimla", bodyUrl:"https://www.hppsc.hp.gov.in/", level:"Class I / II",
     what:"The heaviest Himachal paper of the lot: geography, history from the janapadas to statehood, art and culture, polity and the state economy, in prelims and again in mains.",
     papers:{n:448, years:"2020–2025"},
     covers:["map","timeline","battles","topics","people","compare","revise"]},

    {id:"hppsc-asst-prof", name:"Assistant Professor",
     body:"HPPSC, Shimla", bodyUrl:"https://www.hppsc.hp.gov.in/", level:"Class I",
     what:"Subject papers carry the weight, but the general-studies section asks the same Himachal geography, history and polity as everything else on this list.",
     papers:{n:0, years:""},
     covers:["map","timeline","topics","people"]},

    {id:"hp-police-constable", name:"Police Constable",
     body:"HPPSC, Shimla", bodyUrl:"https://www.hppsc.hp.gov.in/", level:"Class III",
     what:"A written paper of general knowledge with a distinct Himachal section — districts, rivers, passes, fairs and the freedom movement.",
     papers:{n:0, years:""},
     covers:["map","topics","rounds","compare"]},

    {id:"hprca-patwari", name:"Patwari",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"Himachal geography and revenue administration, with districts, tehsils and land settlement history worth knowing cold.",
     papers:{n:0, years:""},
     covers:["map","compare","topics","rounds"]},

    {id:"hprca-panchayat-secretary", name:"Panchayat Secretary",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"Himachal general knowledge alongside panchayati raj — the polity notes and the district profiles carry most of it.",
     papers:{n:0, years:""},
     covers:["topics","map","compare","rounds"]},

    {id:"hprca-joa-it", name:"Junior Office Assistant (IT)",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"Computer knowledge is its own half; the other half is general knowledge in which Himachal is the largest single block.",
     papers:{n:0, years:""},
     covers:["rounds","map","topics","compare"]},

    {id:"hprca-clerk", name:"Clerk",
     body:"HPRCA, Hamirpur", bodyUrl:"https://hprca.in/", level:"Class III",
     what:"General knowledge with a standing Himachal section: districts, rivers, culture and the making of the state.",
     papers:{n:0, years:""},
     covers:["rounds","map","topics","compare"]},

    {id:"hp-tet-jbt", name:"HP TET — JBT",
     body:"HPBOSE, Dharamshala", bodyUrl:"https://hpbose.org/", level:"Teacher eligibility",
     what:"150 questions in 150 minutes, no negative marking. Pedagogy dominates, but the Himachal general-awareness portion is drawn from exactly this material.",
     papers:{n:0, years:""},
     covers:["rounds","map","topics"]},

    {id:"hp-tet-tgt", name:"HP TET — TGT",
     body:"HPBOSE, Dharamshala", bodyUrl:"https://hpbose.org/", level:"Teacher eligibility",
     what:"Arts, Medical and Non-Medical variants share a general-awareness section in which Himachal geography, history and culture recur every year.",
     papers:{n:0, years:""},
     covers:["rounds","map","timeline","topics"]}
  ]
};

if(typeof module !== "undefined" && module.exports){ module.exports = {EXAMS: EXAMS}; }
```

- [ ] **Step 4: Load it everywhere the other data files are loaded**

Four places, and missing one breaks a different surface each time:

- `index.html` — add after the `data/economy.js` tag:
  ```html
  <script src="data/exams.js"></script>
  ```
- `sw.js` — add `"data/exams.js",` to `ASSETS` beside `"data/economy.js",`, and bump `CACHE`.
- `test/load.js` — add `"exams.js"` to the default file list.
- `build-single.sh` — add `"exams.js"` to the `data` tuple, or the offline build ships without it.

- [ ] **Step 5: Verify**

Run: `node --test`
Expected: **197 pass, 0 fail** (191 plus six new).

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && \
  grep -c "exams.js" index.html sw.js test/load.js build-single.sh
```
Expected: `1` from each. A `0` anywhere means that surface silently lacks the registry.

- [ ] **Step 6: Commit**

```bash
git add data/exams.js test/exams.test.js index.html sw.js test/load.js build-single.sh
git commit -m "feat: name the Himachal exams this atlas serves"
```

---

### Task 2: The exams view

**Files:** Modify `app/app.js`, `app/components.css`, `test/harness.html`

**Interfaces:**
- Consumes: `EXAMS` from Task 1.
- Produces: `viewExams()`; `#/exams` routable; a `compare`-style nav entry.

- [ ] **Step 1: Add the route**

`setView()` reads `TITLE[view]` and `SUB[view]` unguarded, so a view without both renders a blank header. In `app/app.js`, beside the other entries:

```js
             compare:"Side by side, sortable", exams:"Which exam this helps with",
```

and:

```js
               compare:"Compare", exams:"Exams",
```

Add to `NAV`, immediately after the `compare` entry:

```js
  {id:"exams",    lb:"Exams",    ic:'<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>'},
```

- [ ] **Step 2: Render it**

```js
/* One row per exam, each stating what this atlas actually holds for it.
   The coverage line is not decoration: somebody arriving from a search
   for "HPRCA Patwari syllabus" has to be able to tell in one screen what
   they are getting and what they are not. */
function viewExams(){
  const rows = (typeof EXAMS !== "undefined" ? EXAMS.rows : []).map(e => {
    const held = e.papers && e.papers.n
      ? '<span class="exhas">'+num(e.papers.n)+' past papers · '+esc(e.papers.years)+'</span>'
      : '<span class="exnot">No past papers here yet</span>';
    const links = (e.covers || []).map(v =>
      '<button class="exlink" type="button" data-view="'+esc(v)+'">'+
        esc(TITLE[v] || v)+'</button>').join('');
    return '<div class="exrow">'+
      '<div class="exhead"><h3>'+esc(e.name)+'</h3>'+
        '<a class="exbody" href="'+esc(e.bodyUrl)+'" target="_blank" rel="noopener">'+
          esc(e.body)+'</a></div>'+
      '<div class="exlevel">'+esc(e.level)+'</div>'+
      '<p class="exwhat">'+esc(e.what)+'</p>'+
      '<div class="exfoot">'+held+'<div class="exlinks">'+links+'</div></div>'+
    '</div>';
  }).join('');
  const when = typeof EXAMS !== "undefined" ? EXAMS.updated : "";
  return '<div class="pagewrap"><p class="exintro">'+
    'Everything in this atlas is the <b>Himachal Pradesh</b> material these exams '+
    'share — geography, history, polity, economy and culture. The past-paper bank '+
    'is HPAS only, and each exam below says plainly what is here for it.</p>'+
    '<div class="exlist">'+rows+'</div>'+
    '<p class="exnote">Conducting bodies last checked '+esc(when)+'. '+
    'They do change — HPSSC Hamirpur was dissolved in 2023 and replaced by HPRCA — '+
    'so confirm against the board\'s own site, linked above, before you rely on it.</p>'+
    '</div>';
}
```

In `render()`, beside the compare branch:

```js
  else if(S.view === "exams") s.innerHTML = viewExams();
```

The `[data-view]` buttons are already handled by the document-level delegated listener, so no click wiring is needed.

- [ ] **Step 3: Style it**

Append to `app/components.css`:

```css
/* ---------- exams ---------- */
.exintro{max-width:62ch;font-size:14.5px;line-height:1.6;color:var(--ink-2);margin:0 0 22px}
.exlist{display:grid;gap:14px}
.exrow{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:16px 18px}
.exhead{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px}
.exhead h3{font-family:var(--f-display);font-size:18px;font-weight:600;margin:0}
.exbody{font-family:var(--f-mono);font-size:11px;letter-spacing:.04em;color:var(--accent);
  text-decoration:underline;text-underline-offset:2px}
.exlevel{font-family:var(--f-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-3);margin-top:4px}
.exwhat{font-size:13.5px;line-height:1.55;color:var(--ink-2);margin:10px 0 12px;max-width:70ch}
.exfoot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
/* What we have and what we do not, said in the same breath and the same size. */
.exhas{font-family:var(--f-mono);font-size:11px;color:var(--good)}
.exnot{font-family:var(--f-mono);font-size:11px;color:var(--ink-3)}
.exlinks{display:flex;flex-wrap:wrap;gap:6px}
.exlink{font-size:11.5px;padding:4px 10px;border-radius:14px;border:1px solid var(--line);
  background:var(--ground);color:var(--ink-2);cursor:pointer;font-family:inherit}
.exlink:hover{border-color:var(--accent-line);color:var(--accent)}
.exnote{margin-top:20px;font-size:11.5px;line-height:1.6;color:var(--ink-3);max-width:62ch}
```

- [ ] **Step 4: Verify**

Run: `node --check app/app.js && node --test`
Expected: **197 pass, 0 fail** — this task adds no Node tests.

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node -e '
const s=require("fs").readFileSync("app/components.css","utf8");
const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length;
console.log("braces",o,c,o===c?"balanced":"UNBALANCED");'
```

Add to `test/harness.html`, before the compare checks:

```js
  ev('S.view="exams"; render();');
  await wait(300);
  check("the exams view lists every exam",
    doc.querySelectorAll(".exrow").length === ev("EXAMS.rows.length"),
    doc.querySelectorAll(".exrow").length + " rows");
  check("every exam states what is here for it",
    [...doc.querySelectorAll(".exrow")].every(r => r.querySelector(".exhas, .exnot")));
  check("only HPAS claims past papers",
    doc.querySelectorAll(".exhas").length === 1,
    doc.querySelectorAll(".exhas").length + " exams claim papers");
  check("each exam links into a section that exists",
    [...doc.querySelectorAll(".exlink")].every(b => !!TITLE_HAS(b.dataset.view)));
```

where `TITLE_HAS` is defined once above the checks:

```js
  const TITLE_HAS = v => !!ev("TITLE[" + JSON.stringify(v) + "]");
```

You have no browser; report these as outstanding.

- [ ] **Step 5: Commit**

```bash
git add app/app.js app/components.css test/harness.html
git commit -m "feat: a page saying which exams this helps with"
```

---

### Task 3: Stop calling it an HPAS app

**Files:** Modify `index.html`, `app/app.js`, `tools/build-pages.js`, `test/pages.test.js`, `README.md`

**Interfaces:**
- Consumes: nothing. Pure copy, plus one regeneration.

- [ ] **Step 1: The app's own page**

In `index.html`:

```html
<title>Parikrama Path — Himachal Pradesh general studies for HPAS, HPRCA, Police and TET</title>
```

```html
<meta name="description" content="The Himachal Pradesh material every HP competitive exam shares: a clickable map of the 12 districts and the hill states, a timeline to statehood, topic notes, sortable comparison tables, a scrollable fact feed and the HPAS past-paper bank.">
```

and the same sentence in `og:description` and `twitter:description`. Change `og:title` and `twitter:title` to:

```
Parikrama Path — Himachal Pradesh general studies for HP exams
```

- [ ] **Step 2: The hero**

In `viewHome()`:

```js
      '<div class="kicker">Himachal Pradesh · competitive exams</div>'+
```

- [ ] **Step 3: The generated pages**

In `tools/build-pages.js`, the footer line becomes:

```js
Revision notes for the <b>Himachal Pradesh</b> portion of HP competitive exam
syllabuses — HPAS, HPRCA, Police and TET.
```

- [ ] **Step 4: Guard it**

Replace the last test in `test/pages.test.js` with:

```js
test("the app no longer sells itself as HPAS-only", () => {
  const h = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(!h.includes("devateasyq.github.io"), "an old URL is still baked into index.html");
  assert.match(h, /property="og:image" content="https:\/\/www\.parikramapath\.com\/og\.jpg"/);
  assert.match(h, /rel="canonical" href="https:\/\/www\.parikramapath\.com\/"/);
  /* The title may name HPAS, but not as the only thing this is for. */
  const title = (h.match(/<title>([^<]+)<\/title>/) || [])[1];
  assert.ok(/HPRCA|TET|Police|HP exams/i.test(title), "the title still names only HPAS: " + title);
  const page = fs.readFileSync(path.join(R, "d-kangra", "index.html"), "utf8");
  assert.ok(!/HPPSC <b>HPAS<\/b> syllabus/.test(page), "a generated page still says HPAS syllabus");
});
```

- [ ] **Step 5: Regenerate and verify**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node tools/build-pages.js && node --test
```
Expected: `pages: 270`, then **197 pass, 0 fail**.

- [ ] **Step 6: README**

Replace the opening sentence — which currently reads "An interactive revision
atlas for the **Himachal Pradesh** portion of the **HPPSC HPAS** syllabus" — with:

```markdown
An interactive revision atlas for the **Himachal Pradesh** material that every HP
competitive exam shares — a clickable map of the 12 districts and the princely hill
states, a timeline from prehistory to statehood, battles and treaties, topic notes,
sortable comparison tables, a scrollable fact feed and a past-paper question bank.
```

And add this section immediately before `## Pages a crawler can read`:

```markdown
## Which exams this is for

The material here is Himachal general studies — geography, history, polity,
economy, culture — and it is the same material whichever HP exam you are sitting.
Nine are listed in `data/exams.js`, across three bodies:

- **HPPSC**, Shimla — HPAS, Assistant Professor, and Police Constable.
- **HPRCA**, Hamirpur — Patwari, Panchayat Secretary, JOA (IT), Clerk.
  (HPSSC Hamirpur was dissolved in February 2023 and replaced by HPRCA.)
- **HPBOSE**, Dharamshala — HP TET, JBT and TGT.

**The past papers are HPAS only** — all 448, 2020–2025 — and every exam on the
`#/exams` page says plainly what is here for it. An exam gets a paper bank the day
someone supplies the papers, not before.

Conducting bodies change. `EXAMS.updated` records when they were last checked
against the boards' own sites; re-check it before each release.
```

- [ ] **Step 7: Commit**

```bash
git add index.html app/app.js tools/build-pages.js test/pages.test.js README.md r sitemap.xml
git commit -m "refactor: this is a Himachal atlas, not an HPAS one"
```

---

### Task 4: The exams page a crawler can read

**Files:** Modify `tools/build-pages.js`, `test/pages.test.js`

**Interfaces:**
- Consumes: `EXAMS`, and the `page()`/`esc()` helpers already in the generator.
- Produces: `/exams/index.html`, and its entry in `sitemap.xml`.

This is where the widening earns its keep for search: far more people look up "HPRCA Patwari syllabus" than look up HPAS.

- [ ] **Step 1: Write the failing test**

Append to `test/pages.test.js`:

```js
test("the exams page is pre-rendered and indexable", () => {
  const p = path.join(ROOT, "exams", "index.html");
  assert.ok(fs.existsSync(p), "no /exams/ page was generated");
  const h = fs.readFileSync(p, "utf8");
  const {EXAMS} = require("../data/exams.js");
  for(const e of EXAMS.rows)
    assert.ok(h.includes(e.name), "the exams page does not mention " + e.id);
  assert.match(h, /rel="canonical" href="https:\/\/www\.parikramapath\.com\/exams\/"/);
  assert.match(h, /property="og:url" content="https:\/\/www\.parikramapath\.com\/exams\/"/);
  assert.ok(!/<script/i.test(h), "a page that needs JS is a page a crawler cannot read");
});

test("the exams page states coverage honestly", () => {
  const h = fs.readFileSync(path.join(ROOT, "exams", "index.html"), "utf8");
  assert.match(h, /448/, "the HPAS paper count is missing");
  assert.match(h, /No past papers here yet/, "an exam without papers does not say so");
  for(const dead of ["HPSSC", "HPSSSB"])
    assert.ok(!h.includes(dead), "the page names a dissolved body: " + dead);
});

test("the sitemap includes the exams page", () => {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  assert.ok(xml.includes("<loc>https://www.parikramapath.com/exams/</loc>"));
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/pages.test.js`
Expected: FAIL — `no /exams/ page was generated`.

- [ ] **Step 3: Generate it**

In `tools/build-pages.js`, after the record loop and before the sitemap is written:

```js
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
HPSSC Hamirpur was dissolved in 2023 and replaced by HPRCA — so confirm against
the board's own site before you rely on it.</footer>
</main>
</body>
</html>
`;
fs.mkdirSync(path.join(ROOT, "exams"), {recursive: true});
fs.writeFileSync(path.join(ROOT, "exams", "index.html"), examsHtml);
urls.push(examsUrl);
```

- [ ] **Step 4: Verify**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node tools/build-pages.js && node --test
```
Expected: `pages: 270`, `sitemap: 272 urls`, then **200 pass, 0 fail**.

- [ ] **Step 5: Commit**

```bash
git add tools/build-pages.js test/pages.test.js exams sitemap.xml
git commit -m "feat: an exams page a crawler can read"
```

---

### Task 5: Ship it

**Files:** Modify `sw.js`, regenerate `og.jpg`

- [ ] **Step 1: The share card**

`og.jpg` reads `HPPSC · HPAS · HIMACHAL PRADESH`, which now contradicts every page
it is attached to. It was produced by rendering this card in a browser at 1240×780
and cropping to 1200×630 — the photos in `img/` are all 480×720 portrait, so
cropping one instead gives an upscaled strip that looks cheap at the one size that
matters.

Write this to a scratch file, serve it, screenshot it, crop, and replace `og.jpg`.
Only two lines differ from the card that produced the current file: the kicker and
the description.

```html
<!doctype html><meta charset="utf-8">
<style>
 @import url('https://fonts.googleapis.com/css2?family=Petrona:wght@600;700&family=IBM+Plex+Mono:wght@500&display=swap');
 *{margin:0;padding:0;box-sizing:border-box}
 body{width:1200px;height:630px;background:#111614;color:#E9ECE5;
   font-family:Petrona,Georgia,serif;display:flex;flex-direction:column;
   justify-content:center;padding:72px 80px;position:relative;overflow:hidden}
 .glow{position:absolute;width:900px;height:900px;border-radius:50%;right:-260px;top:-320px;
   background:radial-gradient(circle,#1F5048 0%,rgba(31,80,72,0) 68%)}
 .rings{position:absolute;right:96px;bottom:-90px;opacity:.5}
 .kicker{font-family:'IBM Plex Mono',monospace;font-size:20px;letter-spacing:.22em;
   text-transform:uppercase;color:#6BB3A2;margin-bottom:26px;position:relative}
 h1{font-size:82px;font-weight:700;letter-spacing:-.02em;line-height:1.04;position:relative}
 p{font-size:30px;color:#AFB9B2;margin-top:22px;max-width:800px;line-height:1.4;position:relative}
 .foot{position:absolute;left:80px;bottom:56px;font-family:'IBM Plex Mono',monospace;
   font-size:19px;letter-spacing:.1em;color:#7F8B84}
</style>
<div class="glow"></div>
<svg class="rings" width="300" height="300" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="84" fill="none" stroke="#6BB3A2" stroke-width="19" stroke-opacity=".9"
    stroke-dasharray="527.8" stroke-dashoffset="180" stroke-linecap="round" transform="rotate(-90 100 100)"/>
  <circle cx="100" cy="100" r="58" fill="none" stroke="#D9AC4F" stroke-width="19" stroke-opacity=".9"
    stroke-dasharray="364.4" stroke-dashoffset="95" stroke-linecap="round" transform="rotate(-90 100 100)"/>
  <circle cx="100" cy="100" r="32" fill="none" stroke="#E08872" stroke-width="19" stroke-opacity=".9"
    stroke-dasharray="201.1" stroke-dashoffset="70" stroke-linecap="round" transform="rotate(-90 100 100)"/>
</svg>
<div class="kicker">Himachal Pradesh &middot; competitive exams</div>
<h1>Parikrama Path</h1>
<p>The Himachal material every HP exam shares — a clickable atlas, past papers, and a fact feed you can actually finish.</p>
<div class="foot">Revision, not repetition.</div>
```

Crop and compress with:

```bash
sips -c 630 1200 --cropOffset 0 0 <screenshot>.jpg --out og.jpg
sips -s format jpeg -s formatOptions 82 og.jpg --out og.jpg
sips -g pixelWidth -g pixelHeight og.jpg
```

Expected: `1200` and `630`, and a file under 300 KB.

If you cannot render an image in this environment, **stop and report** rather than
shipping a card that contradicts the page — say so plainly and leave the existing
file in place.

- [ ] **Step 2: Service worker**

Bump `CACHE`. Confirm `ASSETS` lists `data/exams.js` — added in Task 1, but verify rather than assume, since a missing entry only shows up offline.

- [ ] **Step 3: The offline build**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && ./build-single.sh ../hp-revision.html && \
  for p in "var EXAMS" "function viewExams"; do printf "%-20s %s\n" "$p" "$(grep -c "$p" ../hp-revision.html)"; done
```
Expected: `1` each. `../hp-revision.html` is outside the repo and unstageable; that is expected.

- [ ] **Step 4: Full verification**

```bash
cd /Users/avinashnegi/Downloads/prep/hp-atlas && node --test
```
Expected: **200 pass, 0 fail**.

Then the repo owner runs `test/harness.html` and confirms only the six known pre-existing failures, and walks it by hand: the Exams entry appears in the rail, the page lists nine exams, only HPAS shows a paper count, and each link reaches its section.

- [ ] **Step 5: Commit**

```bash
git add sw.js og.jpg
git commit -m "chore: the share card matches the pages it is attached to"
```

---

## What this plan cannot verify

- **Whether the conducting bodies are still current.** HPRCA replaced HPSSC inside this app's lifetime. `EXAMS.updated` records when they were last checked and the page says so; keeping it true is a human job.
- **The browser harness**, which only the repo owner can run.
- **Whether the widened framing actually brings traffic.** Indexing takes weeks and depends on inbound links, not on this change.

## Verification summary

| Spec requirement | Task |
|---|---|
| No content changes | — (none of the tasks touch `data/` records) |
| Past papers stay labelled HPAS | — (chip already correct; Task 1 asserts the count) |
| No exam claims papers it lacks | 1 |
| No dissolved body named as current | 1, 4 |
| Registry has the nine exams, fully described | 1 |
| `covers` uses real view ids | 1 |
| Exams view renders the registry | 2 |
| Positioning copy, five places | 3 |
| "No page says HPAS-only", as a check | 3 |
| `/exams/` pre-rendered and in the sitemap | 4 |
| Share card matches the pages | 5 |
| No exam dates or vacancy counts | 1 (the registry has no such field) |
