# Mockup Generator

Big Mad Drip campaign quote form + free AI uniform mockup. **Next.js** app (no database) — GHL is the CRM of record.

## Stack

- **App:** Next.js 15 (App Router), TypeScript, TailwindCSS, React Hook Form, TanStack Query
- **Integrations:** GoHighLevel Contacts API, OpenAI Images (`gpt-image-1`)
- **Shared:** Zod schemas + constants (`packages/shared`)
- **Deploy:** Vercel

## Project structure

```text
apps/
  web/          Next.js app (form + API routes) ← deploy this
  frontend/     Legacy Vite UI (ignore for deploy)
  backend/      Legacy Fastify + Postgres (ignore for deploy)
packages/
  shared/       Shared Zod schemas and constants
```

## Quick start

```bash
pnpm install
cp .env.example apps/web/.env.local   # or copy from root .env
pnpm dev
```

Open http://localhost:3000

## Environment variables

Copy `apps/web/.env.example` → `apps/web/.env.local` (and the same keys into Vercel):

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

## Vercel deploy (one-time setup)

1. Import the GitHub repo in Vercel  
2. Set these **Project Settings → General**:

| Setting | Value |
|--------|--------|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js |
| **Include files outside root** | Enabled |
| **Install Command** | `cd ../.. && PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --filter @mockup/web...` |
| **Build Command** | `cd ../.. && pnpm --filter @mockup/web build` |

3. Add the env vars above (Production + Preview)  
4. Deploy  

> Never set Root Directory to `apps/backend` or `apps/frontend`.

`@mockup/shared` builds automatically on install (`prepare`) and again via `apps/web` `prebuild`.

## Lead flow

- Public: `https://your-domain/`
- Facebook: `https://your-domain/?fleadid=FACEBOOK_LEAD_ID`
- After submit: `/success/{ghlContactId}`

## Scripts

```bash
pnpm dev            # Next.js app
pnpm build          # production build (web only)
pnpm start          # start production server
pnpm dev:legacy     # old Vite + Fastify stack
```
