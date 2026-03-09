import { Hono } from "hono";
import { SignJWT, jwtVerify } from "jose";
import type { AppBindings } from "../types";
import { canReadUser, getCurrentUserId } from "../services/access";
import { mapFile } from "../services/mappers";
import { badRequest, forbidden, notFound, unauthorized } from "../utils/http";
import { requireAuth } from "../middleware/auth";

interface FileAccessToken {
  fileId: number;
  viewerId: number;
  exp: number;
}

interface FileKvMetadata {
  contentType?: string;
  contentDisposition?: string;
  originalName?: string;
}

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

async function signFileAccessToken(
  secret: string,
  payload: FileAccessToken,
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secretKey(secret));
}

async function verifyFileAccessToken(secret: string, token: string) {
  const verified = await jwtVerify(token, secretKey(secret));
  return verified.payload as unknown as FileAccessToken;
}

export const fileRoutes = new Hono<AppBindings>();

fileRoutes.get("/", requireAuth, async (c) => {
  const viewerId = getCurrentUserId(c);
  const month = c.req.query("month");

  const params: unknown[] = [viewerId, viewerId];
  let where = "(f.user_id = ?1 OR f.user_id IN (SELECT id FROM users WHERE supervisor_id = ?2))";
  if (month) {
    where += " AND strftime('%Y-%m', f.created_at) = ?3";
    params.push(month);
  }

  const rows = await c.env.DB.prepare(
    `SELECT f.*
     FROM files f
     WHERE ${where}
     ORDER BY f.created_at DESC`,
  )
    .bind(...params)
    .all<Record<string, unknown>>();

  return c.json({ data: rows.results.map(mapFile) });
});

fileRoutes.get("/:id/signed-url", requireAuth, async (c) => {
  const fileId = Number(c.req.param("id"));
  if (!fileId) return badRequest("Invalid file id");
  const viewerId = getCurrentUserId(c);

  const file = await c.env.DB.prepare(
    "SELECT * FROM files WHERE id = ?1",
  )
    .bind(fileId)
    .first<Record<string, unknown>>();
  if (!file) return notFound("File not found");

  const ownerId = Number(file.user_id);
  const canRead = await canReadUser(c, viewerId, ownerId);
  if (!canRead) return forbidden("Not allowed to access this file");

  const token = await signFileAccessToken(c.env.JWT_ACCESS_SECRET, {
    fileId,
    viewerId,
    exp: Math.floor(Date.now() / 1000) + 300,
  });
  const apiOrigin = c.env.API_ORIGIN.includes("<your-subdomain>")
    ? new URL(c.req.url).origin
    : c.env.API_ORIGIN;
  const signedUrl = `${apiOrigin}/api/files/${fileId}/content?token=${encodeURIComponent(token)}`;
  return c.json({ data: { url: signedUrl, expiresInSeconds: 300 } });
});

fileRoutes.get("/:id/content", async (c) => {
  const fileId = Number(c.req.param("id"));
  if (!fileId) return badRequest("Invalid file id");

  const token = c.req.query("token");
  if (!token) return unauthorized("Missing file access token");

  try {
    const payload = await verifyFileAccessToken(c.env.JWT_ACCESS_SECRET, token);
    if (Number(payload.fileId) !== fileId) return unauthorized("Invalid token scope");

    const file = await c.env.DB.prepare(
      "SELECT * FROM files WHERE id = ?1",
    )
      .bind(fileId)
      .first<Record<string, unknown>>();
    if (!file) return notFound("File not found");

    const key = String(file.r2_key);
    const stored = await c.env.FILES_KV.getWithMetadata<FileKvMetadata>(
      key,
      "arrayBuffer",
    );
    if (!stored.value) return notFound("Stored file object not found");

    const headers = new Headers();
    headers.set(
      "Content-Type",
      String(
        file.mime_type ||
          stored.metadata?.contentType ||
          "application/octet-stream",
      ),
    );
    headers.set(
      "Content-Disposition",
      String(
        stored.metadata?.contentDisposition ||
          `inline; filename="${String(file.original_name).replaceAll('"', "_")}"`,
      ),
    );
    headers.set("Cache-Control", "private, max-age=60");
    return new Response(stored.value, { headers });
  } catch {
    return unauthorized("Invalid or expired file token");
  }
});
