# TorclixGroup verification

## Hosted environment

- Web: https://torclixgroup-web.onrender.com
- API: https://torclixgroup-api.onrender.com
- API health: https://torclixgroup-api.onrender.com/health
- Published demo site: https://torclixgroup-api.onrender.com/published/p1
- Telegram Mini App runtime: https://torclixgroup-api.onrender.com/miniapp/p1

The canonical source is the `main` branch of the GitHub repository.

## Local verification

- API health: http://127.0.0.1:4000/health
- Dashboard: http://localhost:5173
- Published demo site: http://127.0.0.1:4000/published/p1
- Telegram Mini App runtime: http://127.0.0.1:4000/miniapp/p1

Development authentication uses `x-torclix-user: demo` only when `TORCLIX_DEV_AUTH=true`.

## Production authentication

Hosted Render services use Auth0/JWT authentication. Trial mode is currently enabled for the hosted product while paid Stripe checkout is being finalized.

Relevant API environment:
- `AUTH_ISSUER`
- `AUTH_AUDIENCE`
- `AUTH_JWKS_URL`
- `TORCLIX_DEV_AUTH=false`

Relevant web environment:
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`

## Database

Render runs migrations before API deploys:

```bash
pnpm --filter @torclix/api migrate
```

Production data is PostgreSQL-backed. Local tests can run without `DATABASE_URL` and use the in-memory development storage.

## Automated checks

Run:

```bash
pnpm install
pnpm test
pnpm build
pnpm lint
pnpm typecheck
```

The test suite covers authentication/access control, tenant isolation, publishing, public lead/booking/order flows, analytics, billing configuration, domains and plan limits.

## Telegram

The current architecture supports project routing through `/start <projectId>`, Mini App metadata and verified Telegram initData/webhook handling.

A single bot token cannot provide a separate Bot API identity for every client project. For a studio managing many independent client bots, the production architecture should evolve to per-client bot credentials or a universal router bot.

## Billing

Stripe checkout is implemented for EUR/USD/RUB when the corresponding Price IDs are configured. Direct plan changes are disabled outside trial mode.

Required API variables for paid billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_SCALE`
- Optional USD/RUB Price IDs:
  - `STRIPE_PRICE_STARTER_USD`
  - `STRIPE_PRICE_PRO_USD`
  - `STRIPE_PRICE_SCALE_USD`
  - `STRIPE_PRICE_STARTER_RUB`
  - `STRIPE_PRICE_PRO_RUB`
  - `STRIPE_PRICE_SCALE_RUB`

## Remaining technical blockers

1. Complete browser-level E2E coverage for Auth0, public flows and responsive behavior.
2. Finish production Stripe Price ID configuration and verify checkout/webhook end-to-end.
3. Decide the final multi-client Telegram bot architecture.
4. Add automated custom-domain SSL/DNS provisioning.
5. Add production backup/restore policy for the hosted PostgreSQL instance.
6. Improve error surfacing for asynchronous settings saves.
7. Perform a final mobile/API security regression pass before release.

Design work is intentionally deferred until these technical checks are complete.
