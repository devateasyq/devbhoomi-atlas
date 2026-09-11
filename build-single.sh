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
                           "rivers.js","features.js","quiz.js","pyq.js"))
js  += "\n" + "\n".join(pathlib.Path("app", f).read_text()
                        for f in ("logo.js","trends.js","mapkit.js","app.js"))
html = re.sub(r'\s*<link rel="stylesheet" href="app/[^"]+">', "", html)
html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)
html = re.sub(r'\s*<link rel="(icon|apple-touch-icon)"[^>]*>', "", html)
html = re.sub(r'\s*<script src="[^"]+"></script>', "", html)
html = html.replace("</head>", "<style>\n" + css + "\n</style>\n</head>")
html = html.replace("</body>", "<script>\n" + js + "\n</script>\n</body>")
out.write_text(html)
print(f"{out} — {out.stat().st_size if out.exists() else 0:,} bytes" if False else f"{out} written")
PY
ls -l "${1:-../hp-revision.html}"
