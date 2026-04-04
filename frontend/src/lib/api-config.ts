/** Base URL for the Nest API (no trailing slash). */
export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}
