# Mockup Generator

Big Mad Drip campaign quote form + free AI uniform mockup. **Next.js** app (no database) — GHL is the CRM of record.

## Stack

- **App:** Next.js 15 (App Router), TypeScript, TailwindCSS, React Hook Form, TanStack Query
- **Integrations:** GoHighLevel Contacts API, OpenAI Images (`gpt-image-1`)
- **Shared:** Zod schemas + constants (`packages/shared`)
- **Deploy:** Vercel (set `maxDuration` 60s on generate route)

## Project structure

```text
apps/
  web/          Next.js app (form + API routes) ← primary
  frontend/     Legacy Vite UI
  backend/      Legacy Fastify + Postgres
packages/
  shared/       Shared Zod schemas and constants
```

## Quick start (Next.js)

```bash
pnpm install
pnpm --filter @mockup/shared build

# Env for the Next app (from root .env)
cp .env apps/web/.env.local

pnpm dev
```

Open http://localhost:3000

Required env vars in `apps/web/.env.local`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_SIZE=1024x1024
AUTO_GENERATE_MOCKUP=true
GHL_API_KEY=pit-...
GHL_LOCATION_ID=...
GHL_API_BASE=https://services.leadconnectorhq.com
GHL_FACEBOOK_LEAD_FIELD=facebook_lead_id
GHL_MOCKUP_GENERATED_FIELD=mockup_generated
GHL_MOCKUP_IMAGE_FIELD=mockup_image
```

No Postgres required.

## Lead flow (Facebook → GHL → Mockup form)

URL examples:

- Public traffic: `https://your-domain/`
- Facebook follow-up: `https://your-domain/?fleadid=FACEBOOK_LEAD_ID`

Also accepted: `fLeadId`, `leadId`, `facebookLeadId`.

Behavior:

1. No `fleadid` → public form → create **new GHL contact** on submit
2. `fleadid` found in GHL → prefill form from contact
3. `fleadid` present but contact missing → treat as new lead → create GHL contact on submit
4. If contact already has `mockup_generated=true` → do **not** call OpenAI again
5. After submit → success page with fancy loader while the mockup generates (~30–60s)

## API routes (Next.js)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/leads/resolve` | Prefill from GHL by `fleadid` |
| `POST` | `/api/submit` | Upsert GHL contact + return mockup job |
| `POST` | `/api/mockups/generate` | Generate AI mockup image (`maxDuration` 60) |

## Vercel deploy

Deploy the **Next.js** app — not the legacy Fastify backend.

### Project settings (important)

| Setting | Value |
|--------|--------|
| **Root Directory** | `apps/web` |
| **Framework** | Next.js |
| **Install Command** | `cd ../.. && pnpm install` |
| **Build Command** | `cd ../.. && pnpm --filter @mockup/shared build && pnpm --filter @mockup/web build` |
| **Output** | leave default (Next.js) |

> If Root Directory is `apps/backend`, the build fails looking for `@mockup/shared` — change it to `apps/web`.

Also enable **“Include source files outside of the Root Directory in the Build Step”** so the monorepo `packages/shared` is available.

### Environment variables

Add the same vars as `.env.local` in the Vercel project (Production + Preview).

Use a plan that allows **60s** function duration for `/api/mockups/generate`.

## Scripts

```bash
pnpm dev            # Next.js app (apps/web)
pnpm build          # shared + web
pnpm start          # production Next server
pnpm dev:legacy     # old Vite + Fastify stack
```

## Legacy Docker stack

Still available if needed:

```bash
docker compose up --build
```

- Frontend: http://localhost:8088
- Backend: http://localhost:3001
