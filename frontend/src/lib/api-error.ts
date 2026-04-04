/**
 * Parse NestJS / JSON error bodies: { message: string | string[] }, { error: string }.
 */
export function parseApiErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (
      Array.isArray(o.message) &&
      o.message.every((x) => typeof x === "string")
    ) {
      return o.message.join(" ");
    }
    if (typeof o.error === "string" && o.error.length > 0) return o.error;
  }
  return fallback;
}
