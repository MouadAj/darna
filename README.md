# Darna

Deployment instructions for the free hosting setup are in [docs/deployment.md](docs/deployment.md).

Darna is a mobile-first, installable family-home app for household essentials, shopping, small home issues, family invitations, and a shared activity history. It is designed around fast, recognizable actions and large, labeled controls.

## Architecture

This repository is an npm-workspaces monorepo:

```text
apps/
  api/       NestJS REST API, Prisma schema/migrations/seed, Swagger
  web/       Next.js App Router PWA, next-intl, TanStack Query
packages/
  shared/    Shared domain types and validation constants
```

The web app never chooses a household scope for protected operations. The API resolves the user from an HTTP-only session cookie, loads the user's membership, and applies that authenticated `householdId` in every household-owned query. Item, shopping, issue, member, invitation, activity, and notification operations all follow this boundary.

## Prerequisites

- Node.js 24.15+ LTS
- npm 11 or newer
- PostgreSQL 16+ client/server tools; `npm run dev` manages a private local instance automatically

## Start locally

```bash
npm install
cp .env.example .env
npm run dev
```

That single development command initializes PostgreSQL in the ignored `.postgres-data/` directory, starts it on port `55432`, applies migrations, seeds the demo only when the database is empty, and starts the API and web app. Existing data is preserved between launches. Use `Ctrl+C` to stop the applications and `npm run db:stop` if you need to stop the local database separately.

Docker remains optional. `docker compose up -d postgres` provides the same database on port `55432` when Docker is available; start it before `npm run dev`, and the startup script will reuse it only when it belongs to this project.

Open:

- Web app: <http://localhost:3000/en>
- API: <http://localhost:4000/api>
- Swagger: <http://localhost:4000/api/docs>
- Health check: <http://localhost:4000/api/health>

French and Arabic routes are available at `/fr` and `/ar`. Arabic uses an RTL-ready layout. Signed-in users can change and save their language from **Family → Your account**; later sign-ins reopen the saved language.

## Development data and authentication

The seed creates **Ajmani Family** with Mouad (owner), Fatima, Ahmed, and Sara; a realistic essentials catalog; needed/low items; activity; home issues; and one pending invitation.

On the welcome screen, choose **View the demo home**, or use the normal login form with:

```text
mouad@housefamily.local
HouseFamily2026!
```

`DEV_AUTH_ENABLED=true` enables this development-only shortcut. It must be `false` in production.

Registration uses an email and an Argon2id-hashed password and signs the user in immediately. Email addresses identify accounts; Darna does not verify ownership of the address or send emails. Existing accounts, including those created before confirmation was removed, can log in with their current password. Registering an existing address never changes its password.

The owner flow is: **Create account → create the family home → create an invitation link → copy and share it privately**. Returning users choose **Log in**. Sessions use random tokens stored as SHA-256 hashes in PostgreSQL and HTTP-only, SameSite cookies; logout revokes the session.

Only the owner can create, replace, or cancel invitation links. Links expire after seven days and can be accepted once. New members choose a password; existing accounts must supply their current password. The link is a private access credential, so share it directly with the intended person. Creating a new link invalidates the previous one. Email delivery services and API keys are not required.

## Database workflow

```bash
# Regenerate Prisma Client after schema changes
npm run db:generate

# Apply committed migrations
npm run db:migrate

# Reset to useful local demo data (destructive to the configured database)
npm run db:seed
```

The schema covers users, households, single-household memberships, invitations, sessions, legacy authentication-token records, categories, items, shopping trips and trip items, home issues, activity, notifications, and push subscriptions. Household-owned tables are indexed by `householdId` and their common status/filter columns.

## Commands

```bash
npm run dev         # prepare local DB, then start web, API, and shared watcher
npm run db:stop     # stop the private local PostgreSQL instance
npm run build       # production builds for all workspaces
npm run typecheck   # strict TypeScript checks
npm run lint        # ESLint checks
npm test            # critical API service and UI interaction tests
```

## PWA and notifications

The production web build registers `public/sw.js`, supplies a web manifest and maskable icon, supports standalone display, and provides a calm offline fallback. The service worker intentionally does **not** cache authenticated API responses or private household data.

The database and authenticated subscription endpoint are prepared for Web Push. A production deployment still needs VAPID keys, a push-delivery worker/provider, notification preference rules, and HTTPS. The product UI should explain notification value before calling the browser permission API.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma and the API |
| `DIRECT_URL` | Optional direct database connection for migrations; use Neon's unpooled endpoint |
| `PORT` | Hosting-provider port; takes precedence over `API_PORT` |
| `API_PORT` | NestJS port, default `4000` |
| `WEB_ORIGIN` | Allowed credentialed CORS origins; comma-separated when needed |
| `SESSION_COOKIE_NAME` | HTTP-only session cookie name |
| `SESSION_TTL_DAYS` | Persistent session lifetime |
| `INVITATION_TTL_DAYS` | Family invitation lifetime |
| `DEV_AUTH_ENABLED` | Enables demo sign-in; development only |
| `NEXT_PUBLIC_API_URL` | Browser-visible API base URL; `/api` uses the recommended same-origin proxy |
| `API_INTERNAL_URL` | Server-side API origin used by the Next.js rewrite |
| `NEXT_PUBLIC_PUSH_ENABLED` | Keep `false` until push delivery is configured |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public push subscription key; only needed when push is enabled |

Production should use HTTPS, a managed PostgreSQL instance, strict production origins, `DEV_AUTH_ENABLED=false`, and a secrets manager for environment configuration.
