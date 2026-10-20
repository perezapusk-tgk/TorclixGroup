# TorclixGroup

**SaaS Operating System for studios.**

TorclixGroup is a multi-tenant platform concept for studios that create and operate client Websites and Mini Apps from one workspace.

## Current build — Phase 2

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

Next infrastructure layers:
1. PostgreSQL persistence
2. Authentication and organizations
3. Real project/document API
4. Template engine
5. Publishing pipeline
6. Custom domains and SSL
7. CRM / leads / booking
8. Telegram Mini Apps
9. Billing and usage
10. White-label and client portal

## Development

Requires Node.js 20.19+ or 22.12+ and pnpm 10.

Run the web app with `pnpm --filter @torclix/web dev`.

Run the API with `pnpm --filter @torclix/api dev`.


## Runtime configuration

The API now has two storage modes:
- without `DATABASE_URL`: in-memory fallback for local prototyping;
- with `DATABASE_URL`: PostgreSQL-backed projects and site documents.

Set `VITE_API_URL` in the web app to point at the API. The API exposes:
- `GET/POST /api/projects`
- `GET/PATCH /api/projects/:id`
- `GET/PUT /api/projects/:id/document`
- `GET/POST /api/clients`
- `GET/POST /api/leads`
- `GET/POST /api/bookings`
- `GET /api/templates`
- `GET /preview/:id`

The Builder can open a real server-rendered project preview when the API is configured.
