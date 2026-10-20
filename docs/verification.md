# TorclixGroup verification

Current main branch verification targets:

- Repository: https://github.com/perezapusk-tgk/TorclixGroup
- Health (local API): http://127.0.0.1:4000/health
- Dashboard (local web): http://localhost:5173
- Published demo site (local API): http://127.0.0.1:4000/published/p1
- Telegram Mini App runtime (local API): http://127.0.0.1:4000/miniapp/p1

## API checks

Development authentication uses the request header:

x-torclix-user: demo

Useful endpoints:

- GET /api/session
- GET /api/projects
- GET /api/domains
- GET /api/clients
- GET /api/leads
- GET /api/bookings
- POST /api/projects/p1/publish
- POST /public/projects/p1/leads
- POST /public/projects/p1/bookings

## PostgreSQL

Before starting the API with DATABASE_URL, apply migrations:

pnpm --filter @torclix/api migrate

The API does not create the production schema automatically.

## Production status

There is currently no public hosted TorclixGroup URL configured in this repository. The URLs above are local verification targets; the GitHub repository is the canonical source.

## Next production blockers

1. Telegram Bot API integration and initData validation.
2. Automated SSL certificate provisioning/renewal for verified domains.
3. Billing/subscriptions and plan enforcement.
4. Client Portal.
5. Analytics and audit log.
6. Public endpoint anti-abuse controls and PostgreSQL integration tests.
