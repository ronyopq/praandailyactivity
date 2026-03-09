import { Hono } from "hono";
import type { AppBindings } from "../types";
import { badRequest, forbidden, notFound } from "../utils/http";
import { getCurrentUserId } from "../services/access";
import { mapFile } from "../services/mappers";
import { logAudit } from "../utils/audit";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
]);

function extension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

export const uploadRoutes = new Hono<AppBindings>();

uploadRoutes.post("/", async (c) => {
  const userId = getCurrentUserId(c);
  const formData = await c.req.formData().catch(() => null);
  if (!formData) return badRequest("Invalid multipart form data");

  const activityId = Number(formData.get("activityId"));
  if (!activityId) return badRequest("activityId is required");

  const activity = await c.env.DB.prepare(
    "SELECT id, user_id FROM activities WHERE id = ?1",
  )
    .bind(activityId)
    .first<{ id: number; user_id: number }>();
  if (!activity) return notFound("Activity not found");
  if (activity.user_id !== userId) {
    return forbidden("Only activity owner can upload files");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return badRequest("file is required");

  const ext = extension(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return badRequest("Unsupported file extension");
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return badRequest("Unsupported MIME type");
  }
  if (file.size > MAX_FILE_SIZE) {
    return badRequest("File size exceeds 10MB limit");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${userId}/${activityId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  await c.env.FILES_KV.put(key, await file.arrayBuffer(), {
    metadata: {
      contentType: file.type,
      contentDisposition: `inline; filename="${safeName}"`,
      originalName: file.name,
    },
  });

  const result = await c.env.DB.prepare(
    `INSERT INTO files (activity_id, user_id, r2_key, original_name, mime_type, size_bytes)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(activityId, userId, key, file.name, file.type, file.size)
    .run();

  const fileId = Number((result.meta as { last_row_id?: number }).last_row_id);
  const row = await c.env.DB.prepare("SELECT * FROM files WHERE id = ?1")
    .bind(fileId)
    .first<Record<string, unknown>>();
  if (!row) return c.json({ error: "Uploaded file metadata not found" }, 500);

  await logAudit(c, "files.upload", "files", fileId, {
    activityId,
    originalName: file.name,
  });
  return c.json({ data: mapFile(row) }, 201);
});
