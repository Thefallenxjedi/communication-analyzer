#!/usr/bin/env bash
# Five concurrent POSTs to /api/analyze (free funnel). Usage:
#   ./scripts/load-test-analyze.sh [base_url] [audio_path]
set -euo pipefail

BASE="${1:-http://localhost:3000}"
AUDIO="${2:-scripts/fixtures/sample-speech.wav}"
OUT_DIR="${TMPDIR:-/tmp}/analyze-load-test-$$"
mkdir -p "$OUT_DIR"

if [[ ! -f "$AUDIO" ]]; then
  echo "Missing audio: $AUDIO"
  exit 1
fi

echo "Target: $BASE/api/analyze"
echo "Audio:  $AUDIO"
echo "Output: $OUT_DIR"
echo ""

start=$(date +%s)
for i in 1 2 3 4 5; do
  (
    code=$(curl -sS -o "$OUT_DIR/out-$i.json" -w "%{http_code}" \
      -X POST "$BASE/api/analyze" \
      -F "audio=@$AUDIO;type=audio/wav" \
      -F "anonymousId=load-test-user-$i-$(date +%s)" \
      -F "captureMethod=upload" \
      -F "durationSec=13" \
      -F "firstName=Load" \
      -F "email=loadtest$i@example.com")
    echo "user$i: HTTP $code"
  ) &
done
wait
end=$(date +%s)

echo ""
echo "Wall time: $((end - start))s"
echo ""

for i in 1 2 3 4 5; do
  f="$OUT_DIR/out-$i.json"
  if [[ -f "$f" ]]; then
    node -e "
      const fs = require('fs');
      const raw = fs.readFileSync('$f', 'utf8');
      try {
        const j = JSON.parse(raw);
        if (j.error) console.log('user$i: ERROR', j.error.slice(0, 120));
        else if (j.report?.overallScore != null) console.log('user$i: OK score', j.report.overallScore);
        else console.log('user$i: OK keys', Object.keys(j).join(','));
      } catch {
        console.log('user$i: non-JSON', raw.slice(0, 80));
      }
    "
  fi
done

echo "Full responses: $OUT_DIR"
