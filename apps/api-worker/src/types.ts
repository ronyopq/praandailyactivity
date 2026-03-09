import type { Context } from "hono";

export interface JwtUserPayload {
  [key: string]: unknown;
  sub: string;
  email: string;
  type: "access" | "refresh";
}

export interface Env {
  DB: D1Database;
  FILES_KV: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  APP_ORIGIN: string;
  API_ORIGIN: string;
  ACCESS_TOKEN_TTL_SECONDS?: string;
  REFRESH_TOKEN_TTL_SECONDS?: string;
}

export interface AppBindings {
  Bindings: Env;
  Variables: {
    user: JwtUserPayload;
  };
}

export type AppContext = Context<AppBindings>;
