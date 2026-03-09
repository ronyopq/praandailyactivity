# SMART WORK TRACKER API Specification

Base URL:
- Local Worker: `http://127.0.0.1:8787`
- Production: set by `API_ORIGIN`

Auth:
- Cookie-based JWT (`swt_access`, `swt_refresh`)
- Use `credentials: include` from frontend

## Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Work Plans
- `GET /api/workplans?month=YYYY-MM&status=planned|in_progress|done&priority=low|medium|high&userId=<id>`
- `POST /api/workplans`
- `PUT /api/workplans/:id`
- `DELETE /api/workplans/:id`
- `POST /api/workplans/:id/convert-to-activity`
- `POST /api/workplans/import` (multipart file import, strict CSV template)
- `GET /api/workplans/export?month=YYYY-MM` (Excel-compatible CSV download)

## Activities
- `GET /api/activities?month=YYYY-MM&userId=<id>`
- `POST /api/activities`

## Followups
- `GET /api/followups?status=pending|done&today=true|false`
- `POST /api/followups`
- `PUT /api/followups/:id/status`

## Files / Upload
- `POST /api/upload` (multipart: `activityId`, `file`)
- `GET /api/files`
- `GET /api/files/:id/signed-url`
- `GET /api/files/:id/content?token=...`
Storage backend: Cloudflare KV (binary value + metadata).

## Dashboard / Calendar / Reports
- `GET /api/dashboard/summary`
- `GET /api/dashboard/charts`
- `GET /api/calendar/events?start=<iso>&end=<iso>&userId=<id>`
- `GET /api/report/monthly?month=YYYY-MM&format=json|pdf|word|excel`

## Status Enums
- Work plan: `planned | in_progress | done`
- Followup: `pending | done`

## Common Error Responses
- `400` validation or malformed payload
- `401` missing/invalid auth
- `403` forbidden by RBAC policy
- `404` missing entity
- `429` rate limit exceeded
