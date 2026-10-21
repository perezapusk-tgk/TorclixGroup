# TorclixGroup Roadmap

## 01 — Foundation
- [x] Monorepo
- [x] Studio dashboard shell
- [x] Project model
- [x] Design system
- [~] Authentication boundary (external provider still required)
- [x] Organizations and memberships foundation
- [x] Database persistence foundation

## 02 — Studio
- [x] Projects CRUD
- [x] Clients and client portal
- [x] Template library
- [x] Team roles and permissions foundation
- [x] White-label branding

## 03 — Website Builder
- [x] Visual canvas
- [x] Pages and routing
- [x] Section library
- [x] Global styles
- [x] Responsive layouts
- [x] SEO and publishing
- [ ] Custom domains

## 04 — Mini App Builder
- [x] Modular app shell
- [x] Industry module catalog foundation
- [x] Beauty / salon modules
- [x] Fitness modules
- [x] Accounts and notifications
- [x] Booking and catalog
- [x] Telegram integration
- [ ] QR entry points

## 05 — Business OS
- [x] CRM
- [x] Leads
- [x] Bookings
- [x] Products and services
- [ ] Staff and calendar
- [x] Orders and invoices

## 06 — SaaS
- [ ] Plans and subscriptions
- [~] Usage limits
- [~] Billing
- [x] Analytics
- [x] Audit logs
- [ ] Backups


## Phase 3 — Product infrastructure foundation
- [x] Industry template manifests for restaurant, beauty, fitness, medical, real estate and services
- [x] Expanded shared domain model for organizations, memberships, leads, bookings and domains
- [x] API resources for projects, site documents, clients, leads, bookings and templates
- [x] PostgreSQL multi-tenant schema foundation
- [x] Visual block content editing in the builder
- [x] API hydration with localStorage fallback
- [x] Persistent PostgreSQL adapter (projects/documents/CRM records)
- [x] Authentication boundary + organization membership enforcement
- [x] Published project runtime and preview URLs (publish/unpublish + public published endpoint)
- [~] Custom domain records and API (SSL automation still pending)
- [x] Telegram Mini App runtime
- [~] Billing and usage enforcement

## Product platform expansion
- [x] Organization / tenant session foundation
- [x] Team workspace foundation
- [x] Roles and permission catalog
- [x] Billing plan and usage foundation
- [x] Client portal surface foundation
- [x] Dashboard session + billing + team hydration
- [ ] Production external authentication provider
- [ ] Live billing provider (Stripe or equivalent)
- [~] Full client portal routing and approval workflow

## Current execution priority
1. Production identity provider and session verification
2. Database migration runner and API integration tests
3. Builder publishing pipeline and draft/published document versions
4. Custom domains and SSL automation
5. ~~Telegram Mini App runtime~~ — implemented
6. CRM workflows, staff/calendar and business operations
7. Billing provider, usage enforcement, analytics and audit logs
