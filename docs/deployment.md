# Deploy Darna on free plans

The repository is https://github.com/MouadAj/darna. Use Vercel Hobby for the web app, Render Free for the API, Neon Free for PostgreSQL, and EmailJS Free for confirmation and invitation emails. Use the assigned `vercel.app` address. No paid database, disk, worker, or custom domain is required.

This is a fresh online installation. Do not import the local database or run `db:seed` online. Local development data stays in `.postgres-data/`.

## 1. Create the database

In https://console.neon.tech, create a **Free** project named `darna`, preferably in Frankfurt near the API. Create/use an empty `darna` database. Copy both connection strings privately into Render's environment settings:

- `DATABASE_URL`: the pooled connection string (hostname contains `-pooler`), with SSL enabled.
- `DIRECT_URL`: the direct connection string with pooling disabled, with SSL enabled.

The API uses the pooled connection at runtime. Prisma CLI uses `DIRECT_URL` for migrations, falling back to `DATABASE_URL` for local development. Production startup applies committed migrations automatically and never seeds demo users.

## 2. Configure email

Create/sign in at https://dashboard.emailjs.com on the **Free** plan. Follow the EmailJS template instructions in the [README](../README.md#configure-emailjs). Configure server-side REST/private-key access for the connected service. Keep all four EmailJS values exclusively in Render; none belongs in Vercel or browser code.

Email delivery is required for the real account-registration flow. Do not enable development authentication to bypass email online.

## 3. Create the API

Open https://dashboard.render.com, connect the GitHub repository, and create a Blueprint from root `render.yaml`. Review that `darna-api` uses **Free** before creating it. The Blueprint explicitly sets Node 24, the build/start commands, health check, production mode, and disabled demo authentication.

Supply the prompted environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `WEB_ORIGIN` | Exact canonical HTTPS Vercel website origin, with no trailing slash |
| `EMAILJS_SERVICE_ID` | Connected EmailJS service |
| `EMAILJS_TEMPLATE_ID` | Action-email template |
| `EMAILJS_PUBLIC_KEY` | EmailJS public key, kept server-side |
| `EMAILJS_PRIVATE_KEY` | EmailJS private key |

If Vercel has not assigned the website address yet, update `WEB_ORIGIN` immediately after step 4 and redeploy the API before registering an account. Email links use this origin. Do not add wildcard preview origins.

Copy the actual assigned Render origin (for example `https://darna-api-xxxx.onrender.com`). `/api/health` must return HTTP 200 with `status: "ok"`. Render supplies `PORT`; the API listens on it automatically.

## 4. Create the website

In https://vercel.com/new, import `MouadAj/darna` into a personal **Hobby** project named `darna` (or an available variation).

- Framework: Next.js.
- Root Directory: `apps/web`.
- Enable **Include source files outside of the Root Directory in the Build Step** for the shared workspace and root lockfile.
- Node.js: 24.x (also specified in the web package).
- Keep the install/build commands from `apps/web/vercel.json`.
- Set `API_INTERNAL_URL` to the assigned Render origin, without `/api` or a trailing slash.
- Set `NEXT_PUBLIC_API_URL=/api`.
- Set `NEXT_PUBLIC_PUSH_ENABLED=false`; leave `NEXT_PUBLIC_VAPID_PUBLIC_KEY` unset.

Deploy. Copy the canonical production website origin into Render's `WEB_ORIGIN` and restart/redeploy the API. Changes to the rewrite destination or public variables require a new web deployment.

The browser calls the Vercel `/api` rewrite. Keep this same-origin arrangement so secure HTTP-only session cookies work without cross-site cookie exceptions. Never put Neon or EmailJS credentials in Vercel.

## 5. Verify before sharing

1. Open `/api/health` through the **Vercel** URL to verify the complete proxy path.
2. Open `/en/welcome`, `/fr/welcome`, and `/ar/welcome`; production must not show the demo button or an unconfigured notification prompt.
3. Register your own real account, receive the confirmation email, confirm it, log in, and create the family home. Confirm the email link uses the canonical website origin.
4. Add a needed item, open Shopping with no active trip, start/complete a trip, then reload and confirm data remains.
5. Log out and log back in. Confirm anonymous requests cannot read household data. Check a narrow mobile viewport and a desktop viewport.
6. Invite a family member and confirm their invitation email and acceptance flow.

## Free-plan limits

Free plans have usage limits and can change. Vercel Hobby is for personal/noncommercial use. Render Free sleeps after inactivity, so the first API request may be slow or require a retry while it wakes. Neon also suspends idle compute. EmailJS Free currently allows 200 email requests per month. A free service is not a promise of permanent unlimited hosting; stay within the free plans and review any upgrade prompt.

Official references: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel monorepos](https://vercel.com/docs/monorepos), [Render Free](https://render.com/docs/free), [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Neon plans](https://neon.com/pricing), [Neon with Prisma](https://neon.com/docs/guides/prisma), and [EmailJS plans](https://www.emailjs.com/pricing/).
