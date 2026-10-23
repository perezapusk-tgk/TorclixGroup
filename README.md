# TorclixGroup

**SaaS Operating System for studios.**

TorclixGroup is a multi-tenant platform concept for studios that create and operate client Websites and Mini Apps from one workspace.

## Current build — platform foundation

### Studio OS
- Overview dashboard
- Projects
- Clients
- Websites
- Mini Apps
- Templates
- Components
- Analytics
- Domains
- Integrations
- Billing
- Settings

### Project Builder
- Create Website / Mini App / Website + Mini App projects
- Industry presets
- Project workspace
- Pages and page navigation
- Modular section palette
- Hero, Features, Gallery, Pricing, Testimonials, FAQ, Booking, Contact, CTA and Story blocks
- Global accent control
- Responsive preview canvas
- Local document persistence
- Publish state
- Draft and published document versions
- PostgreSQL migration runner
- Multi-tenant organization and membership enforcement
- Production JWT/JWKS authentication boundary
- Custom domain records with DNS TXT verification
- Published-site routing on verified custom domains

### API foundation
- Health endpoint
- Project list endpoint
- Project creation endpoint
- Project lookup endpoint
- CORS foundation

## Architecture

`apps/web` — Studio OS and visual builder  
`apps/api` — backend API boundary  
`packages/shared` — shared domain contracts  
`packages/*` — editor, database, auth, billing and analytics boundaries  
`templates/*` — future industry template kits  
`docs/*` — architecture and roadmap

## Product direction

The target is not a generic website builder. TorclixGroup is intended to become the infrastructure layer a studio uses to run dozens or hundreds of client projects.

Current product layers:
1. Studio workspace and project management
2. Website publishing and public runtime
3. Telegram Mini App runtime and Telegram integration
4. CRM leads, clients, bookings, staff and calendar
5. Catalog, orders, analytics and audit log
6. Client portal and approvals
7. YooKassa billing with RUB/USD pricing configuration
8. White-label and advanced custom-domain automation

## Development

Requires Node.js 22.14.0 and pnpm 10.12.4.

Run the web app with `pnpm --filter @torclix/web dev`.

Run the API with `pnpm --filter @torclix/api dev`.

For PostgreSQL environments, apply migrations before startup with `pnpm --filter @torclix/api migrate`. The migration runner owns the database schema; API startup only verifies the canonical schema is present.


## Runtime configuration

The API now has two storage modes:
- without `DATABASE_URL`: in-memory fallback for local prototyping;
- with `DATABASE_URL`: PostgreSQL-backed multi-tenant projects, documents and CRM records.

For production, `CORS_ORIGIN` should be set to the Studio origin. Production authentication remains an external identity-provider integration boundary; the API validates the resulting user membership and role before tenant data is returned or mutated.

Set `VITE_API_URL` in the web app to point at the API. The API exposes:
- `GET/POST /api/projects`
- `GET/PATCH /api/projects/:id`
- `GET/PUT /api/projects/:id/document`
- `GET/POST /api/clients`
- `GET/POST /api/leads`
- `GET/POST /api/bookings`
- `GET /api/templates`
- `GET/POST /api/domains`
- `POST /api/domains/:id/verify` (DNS TXT verification)
- `POST /api/projects/:id/publish`
- `DELETE /api/projects/:id/publish`
- `GET /published/:id`
- `GET /preview/:id`

The Builder can open a real server-rendered project preview when the API is configured.

### YooKassa billing
Billing uses YooKassa. The checkout API creates redirect payments on the server and the webhook verifies the payment status through the YooKassa API before applying the organization plan. YooKassa recommends confirming webhook authenticity by checking the current object status; HTTP notifications are configured in the YooKassa merchant cabinet.

Required production variables:
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- optional `YOOKASSA_PRICE_USD_STARTER`, `YOOKASSA_PRICE_USD_PRO`, `YOOKASSA_PRICE_USD_SCALE`

Webhook endpoint:
`POST /api/billing/webhook`

Configure that HTTPS endpoint in YooKassa under **Интеграция → HTTP-уведомления** and enable `payment.succeeded` and `payment.canceled`.


## Analytics and audit log

The platform records privacy-minimized public-site events (page views, clicks and conversion starts) per organization/project and exposes a 1–90 day summary through `GET /api/analytics?days=30&projectId=`. Studio administrators and owners can inspect organization audit entries through `GET /api/audit?limit=100`. Public event ingestion is rate-limited and stores referrer hostnames rather than full URLs.


<!-- Production deployment synced with main. -->

<!-- Render sync checkpoint 2026-10-21 -->