#!/bin/sh
# Run test/harness.html in headless Chrome and report PASS/FAIL counts.
#
# The harness drives the real app in an iframe with synthetic PointerEvents,
# so it is the only thing that catches the interaction bugs the node suite
# cannot see — above all the pointer-capture trap, where capturing on
# pointerdown retargets the later click to the <svg> and every map tap is
# silently swallowed. A dead map still passes the "a drag places nothing"
# check, so the positive "a tap ... scores" checks are the ones that matter.
#
# Usage: ./test/run-harness.sh        (exits non-zero if any check fails)
set -e
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
if [ ! -x "$CHROME" ]; then
  echo "run-harness: no Chrome binary found — open test/harness.html by hand" >&2
  exit 2
fi

PROFILE=$(mktemp -d)
trap 'rm -rf "$PROFILE"' EXIT

# --allow-file-access-from-files lets the harness reach into its own iframe
# over file://. --virtual-time-budget fast-forwards the harness's awaits so
# --dump-dom captures the finished result rather than "running…".
"$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --user-data-dir="$PROFILE" --allow-file-access-from-files \
  --virtual-time-budget=30000 --dump-dom "file://$PWD/test/harness.html" \
  2>/dev/null > "$PROFILE/out.html"

python3 - "$PROFILE/out.html" <<'PY'
import html, re, sys
src = open(sys.argv[1]).read()
rows = [(c, html.unescape(re.sub("<[^>]+>", "", t)).strip())
        for c, t in re.findall(r'<div class="(pass|fail)">(.*?)</div>', src, re.S)]
if not rows:
    print("run-harness: no checks were recorded — the harness did not finish")
    sys.exit(1)
fails = [t for c, t in rows if c == "fail"]
print("%d checks, %d passed, %d failed" % (len(rows), len(rows) - len(fails), len(fails)))
for t in fails:
    print("  FAIL  " + t)
sys.exit(1 if fails else 0)
PY
