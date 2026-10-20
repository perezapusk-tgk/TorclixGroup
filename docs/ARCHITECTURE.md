# TorclixGroup Architecture

TorclixGroup is a SaaS Operating System for studios: one workspace for creating, operating, and scaling client websites and Mini Apps.

## Product domains

- Identity: users, organizations, memberships, roles, permissions
- Studio: projects, clients, workspaces, branding, white-label
- Web: websites, pages, sections, components, templates, publishing, domains
- Mini Apps: modules, navigation, booking, catalog, orders, forms, loyalty, notifications
- Business: leads, CRM, bookings, products, services, staff, calendar, invoices
- Infrastructure: media, storage, domains, analytics, logs, backups
- SaaS: plans, billing, usage limits, subscriptions

## Multi-tenancy

Every business object is scoped to an organization. Authorization is evaluated before tenant-scoped services execute.

Request flow:

HTTP request
-> authentication/session verification
-> user lookup
-> active organization membership
-> role/permission check
-> tenant-scoped service
-> response

## Builder model

Builders store typed document trees instead of arbitrary page HTML. This allows templates, reusable sections, responsive properties, validation, versioning, publishing, and future visual editing.

## Initial delivery phases

1. Foundation: monorepo, shared types, auth boundary, tenant model, dashboard shell
2. Studio: projects, clients, templates, website builder
3. Mini Apps: modules, booking, catalog, forms, Telegram
4. SaaS: billing, plans, limits, white-label, domains
5. Polish: onboarding, analytics, responsive UX, production hardening
