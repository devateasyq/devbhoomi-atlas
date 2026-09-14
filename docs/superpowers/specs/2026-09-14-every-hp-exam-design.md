# Every HP exam, not just HPAS — sub-project 4

**Date:** 2026-09-14
**Status:** approved, ready for planning

## Where this sits

The atlas was built for HPAS and says so in its title, its hero, its meta
description and the footer of all 270 generated pages. But the material it
holds — 270 records, 265 facts, 151 quiz questions on Himachal geography,
history, polity, economy and culture — is what *every* Himachal competitive
exam tests. The content was never HPAS-specific. Only the packaging was.

This sub-project unbundles the two.

## What does not change

**No content changes.** Not one record, fact or quiz question. They already
serve every exam on the list. Anyone expecting new material from this work will
not find it, and that is the point: the work is to stop hiding what is already
there behind one exam's name.

**The past papers stay HPAS.** All 448 are HPPSC HPAS prelims, 2020–2025, and
are already labelled "HPAS Prelims <year>" on every question chip. That label
stays and is what keeps the widening honest.

## The honesty rule

This is the constraint the rest of the design answers to.

**No exam appears as a room with nothing in it.** Every exam listed states what
this app actually holds for it: the shared Himachal core for all of them, past
papers for HPAS alone. An aspirant who arrives from a search for "HP Police
constable GK" must be able to tell within one screen exactly what they are
getting and what they are not.

Claiming to "cover" an exam whose papers we do not have would be the same
failure as an invented GSDP figure, in a different costume.

## Positioning

| Where | Now | Becomes |
|---|---|---|
| `<title>` | Himachal Pradesh revision for HPAS | Himachal Pradesh general studies for HPAS, HPRCA, Police and TET |
| Hero kicker | `HPPSC · HPAS 2026 · Himachal Pradesh` | `Himachal Pradesh · competitive exams` |
| Meta description | "the HPPSC HPAS syllabus" | the Himachal portion common to HP competitive exams |
| 270 page footers | "the HPPSC **HPAS** syllabus" | "the Himachal Pradesh portion of HP competitive exam syllabuses" |
| `og.jpg` | reads HPPSC · HPAS · HIMACHAL PRADESH | regenerated to match the new kicker |

## The exams registry

`data/exams.js` — a plain browser script like every other data file, loaded by
`index.html`, listed in `sw.js`, `test/load.js` and `build-single.sh`.

Each exam carries: `id`, `name`, `body` (the conducting authority), `bodyUrl`,
`level`, `what` (one line on what the Himachal portion of it tests), `papers`
(how many this app holds and for which years, or 0), and `covers` — an array of
the app's own view ids (`map`, `timeline`, `battles`, `topics`, `people`,
`compare`, `rounds`, `revise`), so a row can link into the sections that serve
it and a test can check those ids exist.

### The exams listed

Nine, chosen because they test the Himachal general-studies material this app
holds. Anything whose Himachal portion is negligible is left out rather than
padded in:

| Exam | Body |
|---|---|
| HPAS (Combined Competitive) | HPPSC |
| HPPSC Assistant Professor | HPPSC |
| HP Police Constable | HPPSC |
| HPRCA Patwari | HPRCA |
| HPRCA Panchayat Secretary | HPRCA |
| HPRCA JOA (IT) | HPRCA |
| HPRCA Clerk | HPRCA |
| HP TET — JBT | HPBOSE |
| HP TET — TGT | HPBOSE |

Only the first holds past papers here.

### The conducting bodies, verified

These were checked against current sources rather than recalled, because a wrong
board name on a page aimed at that board's candidates is spotted immediately and
costs the credibility the rest of the app is built on.

- **HPPSC** — Himachal Pradesh Public Service Commission, Shimla. Conducts the
  Combined Competitive Examination for **HPAS**, and — verified, and contrary to
  the obvious assumption — also the **HP Police Constable** recruitment (734
  posts advertised in 2026).
- **HPRCA** — Himachal Pradesh Rajya Chayan Aayog, Hamirpur. **HPSSC Hamirpur
  was dissolved in February 2023** after the December 2022 paper leak, and HPRCA
  replaced it. It now conducts Patwari, Panchayat Secretary, JOA (IT), Clerk,
  Junior Engineer and similar Class-III recruitment. Any page still saying
  "HPSSSB" or "HPSSC" is out of date.
- **HPBOSE** — HP Board of School Education, Dharamshala. Conducts **HP TET**
  across ten categories (JBT, TGT Arts / Medical / Non-Medical, Hindi, Sanskrit,
  Punjabi, Urdu and two Special Educator papers): 150 multiple-choice questions
  in 150 minutes, no negative marking.

Exam names and bodies must be re-checked before each release. Recruitment bodies
in HP have changed once already inside this app's lifetime.

## The exams page

A new view at `#/exams`, and a pre-rendered page at `/exams/` in the sitemap.

It lists each exam with its body, what the Himachal portion asks, and a plain
statement of coverage — "shared Himachal core" for all, "448 past papers,
2020–2025" for HPAS alone. Each row links into the parts of the app that serve
it.

It earns its place three times over: an aspirant learns what is actually tested,
the coverage claim stays honest and visible, and it opens a search surface the
app does not currently have. Far more people search "HPRCA Patwari syllabus" or
"HP Police constable GK" than search for HPAS.

## Verification

**Node:**
- Every exam in the registry has a name, a body, a `bodyUrl`, and a coverage
  statement. A row that claims nothing cannot be rendered.
- No exam claims past papers it does not have: `papers` is either 0 or matches
  the number of questions actually in `data/pyq.js` for that exam.
- The registry names no dissolved body — `HPSSC` and `HPSSSB` appear nowhere as
  a current authority.
- `/exams/` is in the sitemap, and its canonical matches its URL.
- The app no longer describes itself as HPAS-only: `index.html`'s `<title>` and
  meta description, and every generated page's footer, name more than one exam
  or name none. Asserted by string check, so it cannot regress quietly.

**Browser harness:**
- The exams view renders every exam in the registry.
- Each row states its coverage.
- A row's link reaches the section it names.

**Not automatable here:** whether the board names are still current. That is a
recurring human check, noted above.

## Explicitly not in this sub-project

- **No exam switcher, and no filtering of content by exam.** The core is shared;
  splitting it would imply distinctions this app cannot yet justify.
- **No past papers for any exam other than HPAS.** They are not in the repo and
  will not be invented. An exam gets its paper bank the day someone supplies the
  papers.
- **No per-exam syllabus mapping beyond the one-line `what`.** Real syllabus
  breakdowns are a separate piece of sourced work.
- **No exam dates, vacancy counts or application windows.** They change monthly
  and would be stale within weeks; the body's own site is linked instead, which
  is always current by definition.
