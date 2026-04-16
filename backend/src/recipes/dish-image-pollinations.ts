/**
 * Public Pollinations image API — no API key or user login (server-side fetch only).
 * @see https://pollinations.ai
 */

const MAX_PROMPT_LEN = 2000;

export function buildDishImagePrompt(title: string, dishType?: string): string {
  const dish = dishType?.trim();
  const text = [
    'Professional food photography, top-down and slightly angled view.',
    `The dish: ${title.trim()}.`,
    dish ? `Style / type: ${dish}.` : '',
    'Appetizing, natural soft lighting, shallow depth of field, no text, no watermark, no people, no hands.',
  ]
    .filter(Boolean)
    .join(' ');
  return text.length > MAX_PROMPT_LEN ? text.slice(0, MAX_PROMPT_LEN) : text;
}

export async function fetchPollinationsDishImage(
  prompt: string,
  options: { width: number; height: number; model: string },
): Promise<{ buffer: Buffer; contentType: string }> {
  const encoded = encodeURIComponent(prompt);
  const q = new URLSearchParams({
    width: String(options.width),
    height: String(options.height),
    nologo: 'true',
    model: options.model,
  });
  const url = `https://image.pollinations.ai/prompt/${encoded}?${q.toString()}`;

  const res = await fetch(url, {
    headers: { Accept: 'image/*' },
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`Image service responded with ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    throw new Error('Image service returned a non-image response');
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    throw new Error('Empty image response');
  }
  return { buffer: buf, contentType };
}
