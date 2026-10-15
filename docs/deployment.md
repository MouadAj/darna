# Deploy Darna on free plans

Use two Vercel **Hobby** projects, Neon **Free** PostgreSQL, and EmailJS **Free**. The repository is https://github.com/MouadAj/darna. The web project is deployed at https://darna-ochre-eight.vercel.app; the API is deployed at https://darna-api-three.vercel.app. No paid plan or custom domain is required.

This is a fresh online installation. Do not import the local database or run `db:seed` online. Local development data stays in `.postgres-data/`.

## 1. Database

Create an empty Neon Free project. The deployed project is named `darna`, with its initial `neondb` database, in AWS London. Save both SSL-enabled connection strings privately in the API project's Vercel settings:

- `DATABASE_URL`: the pooled endpoint (hostname contains `-pooler`).
- `DIRECT_URL`: the direct endpoint with pooling disabled.

The API uses the pooled connection at runtime. Prisma CLI uses `DIRECT_URL` for migrations, falling back to `DATABASE_URL` locally. The API deployment build applies committed migrations and never seeds demo users.

## 2. Email

Use an EmailJS Free account and connect a sending service. Follow the [README template instructions](../README.md#configure-emailjs). Enable server-side REST/private-key access. Put all four EmailJS values exclusively in the API project's environment settings.

Real registration requires confirmation-email delivery. Production blocks development sign-in and preview links, even if the development flag is accidentally enabled.

## 3. API project on Vercel

Import `MouadAj/darna` into a personal Hobby project named `darna-api` (or an available variation).

- Root Directory: `apps/api`.
- Framework: NestJS.
- Node.js: 24.x.
- Include files outside the Root Directory for the shared workspace and lockfile.
- Use the install/build commands in `apps/api/vercel.json`.
- Enable environment variables for **Production**; do not share production database credentials with untrusted preview branches.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `WEB_ORIGIN` | `https://darna-ochre-eight.vercel.app` (exact canonical web origin) |
| `DEV_AUTH_ENABLED` | `false` |
| `NODE_ENV` | `production` |
| `EMAIL_FROM_NAME` | `Darna` |
| `EMAILJS_SERVICE_ID` | `service_darna` |
| `EMAILJS_TEMPLATE_ID` | `template_darna` |
| `EMAILJS_PUBLIC_KEY` | EmailJS public key, kept server-side |
| `EMAILJS_PRIVATE_KEY` | EmailJS private key |

Deploy and save the actual canonical API origin. Its `/api/health` endpoint must return HTTP 200 with `status: "ok"`. The standard Vercel NestJS integration supports the existing `src/main.ts` entrypoint.

## 4. Website project on Vercel

The `darna` project uses Root Directory `apps/web`, the Next.js preset, Node 24.x, and `apps/web/vercel.json`. Include files outside the Root Directory for the shared workspace and root lockfile.

Set these variables and **redeploy** the web project:

| Variable | Value |
| --- | --- |
| `API_INTERNAL_URL` | `https://darna-api-three.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `NEXT_PUBLIC_PUSH_ENABLED` | `false` |

Leave `NEXT_PUBLIC_VAPID_PUBLIC_KEY` unset until push delivery is configured. Never put Neon or EmailJS credentials in the web project. The browser calls the same-origin `/api` proxy so secure HTTP-only session cookies remain on the website origin. Keep the API's production health endpoint publicly reachable by that proxy; preview deployments may remain protected.

Request protection uses ESM-compatible Express middleware: 120 API requests per minute per IP, with separate limits of 5 registrations, 3 verification resends, and 8 logins per minute. Counters live in each warm function instance; they are not a distributed abuse-prevention service. Vercel’s immediate proxy is trusted for client IPs.

## 5. Verify before sharing

1. Open `/api/health` through the **website** URL to verify the complete proxy path.
2. Check `/en/welcome`, `/fr/welcome`, and `/ar/welcome`; production must hide the demo login and unconfigured push prompt.
3. Register a real account, receive the confirmation email, confirm it, log in, and create the family home. Check the confirmation URL uses the canonical website origin.
4. Add a needed item, open Shopping without an active trip, start/complete a trip, then reload and confirm persistence.
5. Log out and log back in. Confirm anonymous requests cannot read household data. Check mobile and desktop layouts.
6. Invite a family member and verify email delivery and acceptance.

## Optional Render hosting

`render.yaml` remains available as an alternative API configuration. Render requested card verification for this account, including its manual Free service flow, so the active deployment uses Vercel for the API. No Render service or paid resources were created. If using Render later, use **Free**, supply the API variables above plus `NODE_VERSION=24.x`, keep the repository root as the build directory, use the Blueprint's commands, and point the website proxy at the Render origin. Render's Free service sleeps after inactivity.

## Free-plan limits

Vercel Hobby is for personal/noncommercial use and has function, build, and transfer quotas. Neon Free suspends idle compute and has compute/storage limits. EmailJS Free currently includes 200 email requests per month. Stay within the free plans and review any upgrade prompt; free hosting is not unlimited or guaranteed forever.

Official references: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [Vercel monorepos](https://vercel.com/docs/monorepos), [Neon plans](https://neon.com/pricing), [EmailJS plans](https://www.emailjs.com/pricing/), and [Render Free](https://render.com/docs/free).
