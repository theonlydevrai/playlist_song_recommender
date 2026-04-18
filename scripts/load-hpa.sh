#!/usr/bin/env bash
set -euo pipefail

target_url="${1:-http://$(minikube ip):30002/cluster}"
requests="${2:-30}"
concurrency="${3:-6}"

payload_file="$(mktemp)"
trap 'rm -f "$payload_file"' EXIT

python3 - <<'PY' > "$payload_file"
import json

tracks = []
for i in range(220):
    tracks.append({
        'id': f'demo-{i}',
        'features': {
            'energy': (i % 10) / 10.0,
            'valence': ((i * 3) % 10) / 10.0,
            'danceability': ((i * 7) % 10) / 10.0,
            'acousticness': ((i * 5) % 10) / 10.0,
            'tempo': 80 + (i % 40),
            'loudness': -10 + (i % 5)
        }
    })

print(json.dumps({'tracks': tracks}))
PY

echo "Sending ${requests} requests to ${target_url} with concurrency ${concurrency}"
for _ in $(seq 1 "$requests"); do
  printf '%s\n' "$target_url"
done | xargs -n 1 -P "$concurrency" -I {} curl -sS -H 'Content-Type: application/json' -X POST "{}" --data-binary @"$payload_file" >/dev/null

echo 'Load test complete'
