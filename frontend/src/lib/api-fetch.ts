/** Same signature as `useAuth().getToken` from Clerk. */
export type GetClerkToken = () => Promise<string | null>;

/** Nest API call with `Authorization: Bearer <session JWT>`. */
export async function fetchWithAuth(
  url: string,
  init: RequestInit,
  getToken: GetClerkToken,
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("Content-Type")) {
    if (!(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}
