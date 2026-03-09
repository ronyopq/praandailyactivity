const PROD_API = "https://smart-work-tracker-api-production.ronybd.workers.dev";
const DEV_API = "http://127.0.0.1:8787";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development" ? DEV_API : PROD_API);
