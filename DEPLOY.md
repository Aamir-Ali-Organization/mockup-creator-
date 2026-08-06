# Deploy to Vercel

This repo is a monorepo. **Only `apps/web` (Next.js) should be deployed.**

## Fix current failure

Your error:

`The Next.js output directory ".next" was not found at ".../apps/backend/.next"`

means Vercel **Root Directory is `apps/backend`**. Change it:

1. Open [Vercel Dashboard](https://vercel.com) → project **mockup**
2. **Settings** → **General**
3. **Root Directory** → **Edit** → set to `apps/web` → **Save**
4. Enable **Include source files outside of the Root Directory in the Build Step**
5. **Settings** → **Environment Variables** → add keys from `apps/web/.env.example`
6. **Deployments** → **Redeploy** (or push a new commit)

### Recommended build settings

| Setting | Value |
|--------|--------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Install Command | `cd ../.. && PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --filter @mockup/web...` |
| Build Command | `cd ../.. && pnpm --filter @mockup/web build` |
| Output Directory | *(leave empty / default)* |

Do **not** set Output Directory to anything custom.

## Env vars to add in Vercel

```
OPENAI_API_KEY
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_SIZE=1024x1024
AUTO_GENERATE_MOCKUP=true
GHL_API_KEY
GHL_LOCATION_ID
GHL_API_BASE=https://services.leadconnectorhq.com
GHL_FACEBOOK_LEAD_FIELD=facebook_lead_id
GHL_MOCKUP_GENERATED_FIELD=mockup_generated
GHL_MOCKUP_IMAGE_FIELD=mockup_image
```
