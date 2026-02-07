#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCES_JSON="$ROOT_DIR/config/data-sources.json"
OUT_DIR="$ROOT_DIR/output/api-checks"
mkdir -p "$OUT_DIR"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required (used to parse config/data-sources.json)" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required for Playwright browser checks" >&2
  exit 1
fi

SOURCES=()
while IFS= read -r line; do
  SOURCES+=("$line")
done < <(node -e '
const fs=require("fs");
const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
for (const s of data.sources) {
  console.log(`${s.id}\t${s.url}`);
}
' "$SOURCES_JSON")

CURL_TSV="$OUT_DIR/curl_results.tsv"
CORS_TSV="$OUT_DIR/cors_probe.tsv"
BROWSER_TSV="$OUT_DIR/browser_fetch.tsv"
RATE_TSV="$OUT_DIR/rate_limit_probe.tsv"

printf "id\turl\thttp_code\ttime_total\tcontent_type\tbytes\n" > "$CURL_TSV"
printf "id\turl\thttp_code\tacao\tacac\tvary\n" > "$CORS_TSV"
printf "id\turl\tbrowser_ok\tbrowser_status\tbrowser_error\n" > "$BROWSER_TSV"
printf "id\turl\trate_headers\n" > "$RATE_TSV"

extract_header() {
  local file="$1" key="$2"
  awk -v key="$key" '{
    line=$0
    sub(/\r$/, "", line)
    low=tolower(line)
    if (index(low, tolower(key) ":")==1) {
      sub(/^[^:]*:[ ]*/, "", line)
      print line
      exit
    }
  }' "$file"
}

for row in "${SOURCES[@]}"; do
  id="${row%%$'\t'*}"
  url="${row#*$'\t'}"

  hdr="$(mktemp)"
  body="$(mktemp)"
  metrics="$(curl -L -sS --max-time 60 -D "$hdr" -o "$body" -w "%{http_code}\t%{time_total}\t%{content_type}\t%{size_download}" "$url" || echo "000\t0\t\t0")"
  http_code="$(printf "%s" "$metrics" | cut -f1)"
  time_total="$(printf "%s" "$metrics" | cut -f2)"
  content_type="$(printf "%s" "$metrics" | cut -f3)"
  bytes="$(printf "%s" "$metrics" | cut -f4)"
  printf "%s\t%s\t%s\t%s\t%s\t%s\n" "$id" "$url" "$http_code" "$time_total" "$content_type" "$bytes" >> "$CURL_TSV"

  cors_hdr="$(mktemp)"
  cors_code="$(curl -L -sS -o /dev/null -D "$cors_hdr" -H 'Origin: https://example.com' -w '%{http_code}' --max-time 60 "$url" || echo 000)"
  acao="$(extract_header "$cors_hdr" 'Access-Control-Allow-Origin' || true)"
  acac="$(extract_header "$cors_hdr" 'Access-Control-Allow-Credentials' || true)"
  vary="$(extract_header "$cors_hdr" 'Vary' || true)"
  printf "%s\t%s\t%s\t%s\t%s\t%s\n" "$id" "$url" "$cors_code" "$acao" "$acac" "$vary" >> "$CORS_TSV"

  rate_lines="$(awk '{ line=$0; sub(/\r$/, "", line); low=tolower(line); if (low ~ /^(x-ratelimit|ratelimit|retry-after|x-rate-limit|x-throttle)/) print line }' "$hdr" | paste -sd ';' -)"
  printf "%s\t%s\t%s\n" "$id" "$url" "${rate_lines:-none}" >> "$RATE_TSV"

  rm -f "$hdr" "$body" "$cors_hdr"
done

# Browser checks via Playwright CLI wrapper
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
PLAYWRIGHT_CLI_SESSION="api-checks" "$PWCLI" open https://example.com >/dev/null

for row in "${SOURCES[@]}"; do
  id="${row%%$'\t'*}"
  url="${row#*$'\t'}"
  out="$(PLAYWRIGHT_CLI_SESSION="api-checks" "$PWCLI" eval "() => fetch('$url').then(r => ({ok:r.ok,status:r.status,error:null})).catch(e => ({ok:false,status:null,error:String(e)}))")"
  json="$(printf "%s\n" "$out" | awk 'BEGIN{flag=0} /^### Result/{flag=1; next} /^### Ran Playwright code/{flag=0} flag{print}' | tr -d '\n\r ')"
  ok="$(printf "%s" "$json" | grep -o '"ok":[^,}]*' | head -n1 | cut -d: -f2)"
  browser_status="$(printf "%s" "$json" | grep -o '"status":[^,}]*' | head -n1 | cut -d: -f2)"
  err="$(printf "%s" "$json" | grep -o '"error":[^}]*' | head -n1 | cut -d: -f2-)"
  err="${err#\"}"; err="${err%\"}"
  if [ "$err" = "null" ]; then err=""; fi
  printf "%s\t%s\t%s\t%s\t%s\n" "$id" "$url" "$ok" "$browser_status" "$err" >> "$BROWSER_TSV"
done

echo "Wrote:"
echo "- $CURL_TSV"
echo "- $CORS_TSV"
echo "- $RATE_TSV"
echo "- $BROWSER_TSV"
