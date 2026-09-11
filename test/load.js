"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

/* The data files are plain browser scripts that assign onto a global `D`
   and declare `const MAP`. Evaluate them in this module's scope with those
   names pre-seeded, which is cheaper and more faithful than a DOM shim. */
function loadData(files){
  const D = {};
  let MAP = null;
  const list = files || ["geo.js","places.js","history.js","topics.js","rivers.js","quiz.js","pyq.js"];
  for(const f of list){
    const p = path.join(ROOT, "data", f);
    if(!fs.existsSync(p)) continue;
    /* data/places.js is the one file that *declares* the global D (the
       same role geo.js plays for MAP), via `const D = {};`. Since D here
       is pre-seeded as `const` (its identity must stay stable across
       files, unlike MAP which is reassignable), strip that declaration
       line entirely rather than converting it to an assignment — leaving
       the file's later `D.xxx = ...` lines to populate the outer D. */
    const src = fs.readFileSync(p, "utf8")
      .replace(/^const MAP\s*=/m, "MAP =")
      .replace(/^const D\s*=\s*\{\s*\}\s*;?\s*$/m, "");
    // eslint-disable-next-line no-eval
    eval(src);
  }
  return {D, MAP};
}
module.exports = {loadData, ROOT};
