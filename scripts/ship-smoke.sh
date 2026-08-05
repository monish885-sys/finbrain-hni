#!/usr/bin/env bash
# Track A+B local ship smoke — deterministic Fin, no live LLM required.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> typecheck / tests / evals"
pnpm typecheck
pnpm test
pnpm eval:deterministic
pnpm eval:stress

echo "==> start API"
pnpm --filter @capstone/api start &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
sleep 3

TOKEN=$(curl -sf -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vikram@kapoor.demo","password":"capstone2026"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

echo "==> health"
curl -sf http://localhost:4000/health | python3 -c 'import sys,json; assert json.load(sys.stdin)["status"]=="ok"'

echo "==> networth"
curl -sf http://localhost:4000/family/networth -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); assert d["family"]["family_id"]=="fam_kapoor_001"; assert len(d["holdings"])>0'

echo "==> desk CA→HNI"
PLAN=$(curl -sf -X POST http://localhost:4000/ai/desk/run -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"familyId":"fam_kapoor_001"}')
PLAN_ID=$(echo "$PLAN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["day_plan"]["id"])')
ITEM_ID=$(echo "$PLAN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["day_plan"]["items"][0]["id"])')
curl -sf -X POST "http://localhost:4000/ai/desk/plans/$PLAN_ID/ca-review" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"decisions\":[{\"item_id\":\"$ITEM_ID\",\"action\":\"approve\"}]}" >/dev/null
curl -sf -X POST "http://localhost:4000/ai/desk/plans/$PLAN_ID/hni-approve" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"decisions\":[{\"item_id\":\"$ITEM_ID\",\"action\":\"approve\"}]}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); assert "instructions only" in d["note"].lower()'

echo "==> Fin ask (live brainset)"
curl -sf -X POST http://localhost:4000/ai/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"Do I need to pay advance tax this quarter?","deterministic":true,"portfolio":"live","familyId":"fam_kapoor_001"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); assert d["source"]=="fin"; assert d["response"]["refused"] is False'

echo
echo "SHIP SMOKE PASS — Track A+B local ready (deterministic)."
echo "Optional: set CA_BUDDY_LLM_PROVIDER=openai + CA_BUDDY_LLM_API_KEY for live narration."
