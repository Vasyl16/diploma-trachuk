/**
 * Comma-separated substrings → trimmed non-empty terms (feed filter query params).
 */
export function parseCommaSeparatedFilter(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
