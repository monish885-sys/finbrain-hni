# Setu Account Aggregator — your steps only (engineering is wired in-repo)

## Redirect URL on Bridge (“Please enter a valid value”)

Bridge **rejects** `http://localhost…`. Use an **https://** public URL.

Working values while Cloudflare quick tunnels are running:

| Field | Paste this |
|-------|------------|
| **Redirect URL** | `https://addressing-sum-precision-gps.trycloudflare.com/onboarding/connect/aa-return` |
| **Notification URL** | `https://transport-weeks-filters-formed.trycloudflare.com/connectors/webhooks/setu` |

If tunnels were restarted, URLs change — re-run `cloudflared tunnel --url http://localhost:3000` (web) and `:4000` (API), then update Bridge + `apps/api/.env` `SETU_REDIRECT_URL`.

Fallback for Bridge-only save (not for local return): `https://setu.co` — then override redirect per consent via API once Bridge accepts the product.

## 1. Setu Bridge (once)

1. Sign up / log in at https://bridge.setu.co
2. Create an **AA Gateway** product (purpose: wealth management / 101)
3. Enable **Auto-Fetch** if offered; set FI types: DEPOSIT, MUTUAL_FUNDS, EQUITIES, ETF, NPS
4. Copy credentials: `clientID`, `secret`, `product-instance-id` (Product ID)
5. Set notification URL to your reachable API:
   `https://<your-api-host>/connectors/webhooks/setu`
   (local: use ngrok/cloudflare tunnel to `http://localhost:4000`)

## 2. Local env

In `apps/api/.env`:

```
TSP_PROVIDER=setu
SETU_CLIENT_ID=...
SETU_CLIENT_SECRET=...
SETU_PRODUCT_INSTANCE_ID=...
SETU_BASE_URL=https://fiu-sandbox.setu.co
SETU_TOKEN_URL=https://uat.setu.co/api/v2/auth/token
SETU_REDIRECT_URL=http://localhost:3000/onboarding/connect/aa-return
WEB_APP_URL=http://localhost:3000
```

In `apps/web/.env.local`:

```
NEXT_PUBLIC_USE_LIVE_API=true
NEXT_PUBLIC_CAPSTONE_API_URL=http://localhost:4000
```

Restart `pnpm dev:api` and `pnpm dev`.

## 3. Onboard the family (in the app)

1. Open http://localhost:3000/register — create account
2. Profile: legal name, PAN, **mobile** (AA OTP), family name
3. Connect → **Banks, MF & demat (Setu Account Aggregator)** → complete Setu screens (OTP + link FIPs)
4. Optional: Family members → add 3 relatives; Manual → cash / anything AA missed
5. Review → Complete → open Owner God Mode

## Setu consent 500 (sandbox)

If CAPSTONE auth works but `POST /v2/consents` returns Setu `InternalServerError`, the Bridge **product config** is incomplete — not CAPSTONE code.

Check on Bridge:
1. AA Gateway product fully saved (Step 1 consent template: purpose 101, FI types, consent types)
2. Sandbox credentials match sandbox base URL (`fiu-sandbox.setu.co` + `uat.setu.co` token)
3. Redirect URL allowlisted: `http://localhost:3000/onboarding/connect/aa-return`
4. Email `support@setu.co` with the `traceId` from the error

Until Setu consent works, onboard with **Manual accounts** (cash / Invest Right / PPFAS / Upstox values) so God Mode still lights up.
