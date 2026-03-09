import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppContext, Env, JwtUserPayload } from "../types";

const ACCESS_COOKIE = "swt_access";
const REFRESH_COOKIE = "swt_refresh";

function getTtls(env: Env) {
  const accessTtl = Number(env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  const refreshTtl = Number(env.REFRESH_TOKEN_TTL_SECONDS ?? 2_592_000);
  return { accessTtl, refreshTtl };
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string) {
  return compare(password, hashed);
}

export async function signToken(
  payload: JwtUserPayload,
  secret: string,
  ttlSeconds: number,
) {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(secret));
}

export async function verifyToken<T extends JWTPayload>(
  token: string,
  secret: string,
) {
  const verified = await jwtVerify<T>(token, key(secret));
  return verified.payload;
}

export async function issueAuthCookies(
  c: AppContext,
  payload: { sub: string; email: string },
) {
  const { accessTtl, refreshTtl } = getTtls(c.env);
  const secureCookies =
    c.env.APP_ORIGIN.startsWith("https://") || c.req.url.startsWith("https://");
  const requestHost = new URL(c.req.url).hostname;
  const appHost = new URL(c.env.APP_ORIGIN).hostname;
  const sameSite: "Lax" | "None" = requestHost === appHost ? "Lax" : "None";
  const accessToken = await signToken(
    { ...payload, type: "access" },
    c.env.JWT_ACCESS_SECRET,
    accessTtl,
  );
  const refreshToken = await signToken(
    { ...payload, type: "refresh" },
    c.env.JWT_REFRESH_SECRET,
    refreshTtl,
  );

  setCookie(c, ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite,
    path: "/",
    maxAge: accessTtl,
  });
  setCookie(c, REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite,
    path: "/",
    maxAge: refreshTtl,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(Date.now() + accessTtl * 1000).toISOString(),
  };
}

export function clearAuthCookies(c: AppContext) {
  deleteCookie(c, ACCESS_COOKIE, { path: "/" });
  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
}

export function readAccessCookie(c: AppContext) {
  return getCookie(c, ACCESS_COOKIE);
}

export function readRefreshCookie(c: AppContext) {
  return getCookie(c, REFRESH_COOKIE);
}
