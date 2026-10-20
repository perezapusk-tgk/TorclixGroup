# TorclixGroup

**SaaS Operating System for studios.**

TorclixGroup is being built as a multi-tenant platform where studios can create, operate and scale client Websites and Mini Apps from one workspace.

## Current build

- Premium Studio OS dashboard
- Projects, Templates, Clients, Websites, Mini Apps, Components, Analytics, Domains, Integrations, Billing and Settings workspaces
- New Project flow with Website / Mini App / Website + Mini App
- Industry selection and in-session project creation
- Responsive mobile/tablet layout
- Foundation packages for API, auth, database, billing, analytics and editor

## Architecture

`apps/web` — studio interface and future visual builder  
`apps/api` — backend API boundary  
`packages/*` — shared platform modules  
`templates/*` — industry template kits  
`docs/*` — architecture and roadmap

## Status

Foundation + Studio shell are active. Persistence, authentication, real publishing, domains, payments and external integrations are next.

## Development

Requires Node.js 20.19+ or 22.12+ for current Vite. Install with pnpm, then run `pnpm dev`.

Vite's current supported line is 8.x; production builds use `vite build`.
