#!/bin/sh
# Produce a single self-contained HTML file that runs offline from the filesystem.
# Usage: ./build-single.sh [output.html]   (default: ../hp-revision.html)
set -e
cd "$(dirname "$0")"
python3 - "${1:-../hp-revision.html}" <<'PY'
import sys, re, pathlib
out  = pathlib.Path(sys.argv[1])
html = pathlib.Path("index.html").read_text()
css  = "\n".join(pathlib.Path("app", f).read_text() for f in ("tokens.css","layout.css","components.css"))
# Keep this list in the same order as the <script> tags in index.html.
js   = "\n".join(pathlib.Path("data", f).read_text()
                 for f in ("geo.js","places.js","history.js","topics.js",
                           "rivers.js","features.js","quiz.js","pyq.js","economy.js","exams.js"))
js  += "\n" + "\n".join(pathlib.Path("app", f).read_text()
                        for f in ("logo.js","trends.js","mapkit.js","credits.js","rounds.js","stories.js","revise.js","sync.js",
                                  "firebase-config.js","auth.js","app.js"))
# The single-file build runs from file://, where Firebase auth cannot work.
# Force guest mode rather than shipping a sign-in button that fails. This is
# a literal string match against a line in app/firebase-config.js — if that
# line is ever reformatted, the replacement below would silently become a
# no-op and the offline build would ship a dead sign-in button unnoticed, so
# assert it fired instead of trusting it did.
_fb_marker = "var FB_READY = !!("
if _fb_marker not in js:
    sys.exit("build-single.sh: expected FB_READY line not found in app/firebase-config.js — "
              "refusing to build, offline build would ship a live (but broken) sign-in button")
js = js.replace(_fb_marker, "var FB_READY = false && !!(")
# loadFirebase()'s vendor <script> list is unreachable once FB_READY is
# forced false above (it rejects on the FB_READY check before ever reaching
# this array), but the vendor/ filenames would still sit in the bundle as
# dead text — and the vendor/ files themselves are never shipped in this
# build. Strip the array so the offline build carries no reference to files
# it does not ship. Matched structurally (not a literal string) and
# asserted, for the same reason as the FB_READY check above.
_srcs_re = re.compile(r'var srcs = \[.*?\];', re.DOTALL)
_srcs_matches = _srcs_re.findall(js)
if len(_srcs_matches) != 1 or "firebase-app-compat" not in _srcs_matches[0]:
    sys.exit("build-single.sh: could not find the loadFirebase() vendor srcs array in "
              "app/firebase-config.js — refusing to build, cannot confirm the offline "
              "build is free of vendor/ references")
js = _srcs_re.sub("var srcs = [];", js, count=1)
html = re.sub(r'\s*<link rel="stylesheet" href="app/[^"]+">', "", html)
html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)
html = re.sub(r'\s*<link rel="(icon|apple-touch-icon)"[^>]*>', "", html)
html = re.sub(r'\s*<script src="[^"]+"></script>', "", html)
html = html.replace("</head>", "<style>\n" + css + "\n</style>\n</head>")
# The photographs are referenced by path, which cannot resolve from a single
# file on disk, so inline each one as a data URI.
import base64
for p in sorted(pathlib.Path("img").glob("*.webp")):
    uri = "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
    js = js.replace('"img/%s"' % p.name, '"%s"' % uri)
html = html.replace("</body>", "<script>\n" + js + "\n</script>\n</body>")
out.write_text(html)
print(f"{out} — {out.stat().st_size if out.exists() else 0:,} bytes" if False else f"{out} written")
PY
ls -l "${1:-../hp-revision.html}"
