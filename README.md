# SMART WORK TRACKER

Production-ready SaaS scaffold for:
- Monthly Work Plan
- Daily Activity Register
- Follow-up Reminders
- Calendar Activity View
- Monthly Report Generator
- File Attachments (R2)

## Tech Stack
- Frontend: Next.js 14, React, TailwindCSS, shadcn-style UI, FullCalendar
- Backend: Cloudflare Workers (Hono)
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare KV (binary attachments with metadata)
- Auth: JWT cookie auth (email + password)
- Deployment: Cloudflare Pages + Workers

## Monorepo Structure
```text
apps/
  web/         # Next.js frontend
  api-worker/  # Cloudflare Workers API
packages/
  shared-types/
db/
  migrations/
docs/
scripts/
```

## Local Development
```bash
corepack pnpm install

# Terminal 1: API Worker
corepack pnpm --filter @smart-work-tracker/api-worker dev

# Terminal 2: Web
corepack pnpm --filter @smart-work-tracker/web dev
```

## Validation
```bash
corepack pnpm -r typecheck
corepack pnpm --filter @smart-work-tracker/api-worker test
corepack pnpm -r build
```

## Documentation
- Architecture: `docs/architecture.md`
- UI Wireframes: `docs/ui-wireframes.md`
- API Specification: `docs/api-spec.md`
- Deployment Guide: `docs/deployment.md`
