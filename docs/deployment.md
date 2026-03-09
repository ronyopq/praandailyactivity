# Deployment Guide (Cloudflare Pages + Workers)

## Prerequisites
- Node.js 20+ and Corepack enabled
- Cloudflare account with Workers, D1, R2, Pages enabled
- `wrangler` authenticated (`wrangler login`)

## 1) Install Dependencies
```bash
corepack pnpm install
```

## 2) Configure Worker Environment
1. Copy `apps/api-worker/.dev.vars.example` to `apps/api-worker/.dev.vars` for local dev.
2. In Cloudflare, set production secrets:
```bash
wrangler secret put JWT_ACCESS_SECRET
wrangler secret put JWT_REFRESH_SECRET
```

## 3) Provision Cloudflare Resources
```bash
wrangler d1 create smart-work-tracker-db
wrangler kv namespace create praan-files
```
Update `apps/api-worker/wrangler.toml` with the returned `database_id` and KV namespace `id`.

## 4) Apply D1 Migrations
```bash
cd apps/api-worker
wrangler d1 migrations apply smart-work-tracker-db
```

## 5) Deploy API Worker
```bash
cd apps/api-worker
wrangler deploy
```

## 6) Deploy Frontend to Cloudflare Pages (Git Connected)
Set these values in Pages project settings:

- Production branch: `main`
- Root directory: `/` (repo root)
- Build command:
  `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @smart-work-tracker/web build`
- Build output directory:
  `apps/web/out`
- Environment variable:
  `NEXT_PUBLIC_API_BASE_URL=https://<your-api-domain>`

Because this app is exported statically (`output: "export"`), Pages should serve from `apps/web/out`.

## 7) Set API CORS/App Origin
In Worker env vars/secrets, set:
- `APP_ORIGIN=https://praandailyactivity.pages.dev`
- `API_ORIGIN=https://<your-api-domain>`

## 8) Production Verification Checklist
- Register/login works and secure cookies are set.
- Dashboard cards/charts return user data.
- Work plans CRUD + import/export work.
- Activity logging with attachment upload succeeds.
- Followup sticky reminders appear for pending items.
- Calendar merges all 3 sources with correct colors.
- Monthly report exports download in all formats.
- File preview uses signed URLs and expires after 5 minutes.
