# TorclixGroup architecture

TorclixGroup is a studio operating system: one workspace creates and operates many client websites and Telegram Mini Apps.

## Product model

User → Organization/Studio → Project → Website / Mini App → Business modules.

## Application boundaries

- `apps/web`: studio UI, dashboard and visual builder shell.
- `apps/api`: tenant-aware API, publishing and Telegram integration.
- `packages/editor`: canonical document schema and editor operations.
- `packages/ui`: shared visual language and navigation tokens.
- `packages/access`: roles and permissions.
- `packages/auth`: production JWT verification.
- `packages/database`: PostgreSQL migrations and storage.

## Design direction

The interface follows the approved reference direction rather than a generic SaaS dashboard: near-black canvas, oversized editorial typography, numbered sections, thin rules, large quiet surfaces, restrained lime accent, generous whitespace, product-showcase composition and subtle motion.

## Editor rule

The database document is the source of truth. The web editor may cache drafts locally, but published content must always be persisted through the API.

## Security rule

Development identity headers are temporary and must never be enabled for production. Production authentication requires an external OIDC/JWT provider and validated issuer, audience and JWKS URL.
