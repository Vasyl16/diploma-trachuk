/** Base URL for the Nest API (no trailing slash). */
export function getApiBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? ""
  ).trim();
  return raw.length > 0 ? raw : "http://localhost:3000";
}
