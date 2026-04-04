import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIError } from 'openai';

export type GenerateRecipeInput = {
  ingredients?: string[];
  dishType?: string;
  complexity?: string;
};

export type GeneratedRecipePayload = {
  title: string;
  ingredients: string[];
  steps: string[];
};

function parseAndValidateRecipeJson(raw: string): GeneratedRecipePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('AI response was not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BadRequestException('AI response JSON has invalid shape');
  }

  const o = parsed as Record<string, unknown>;
  const { title, ingredients, steps } = o;

  if (typeof title !== 'string' || !title.trim()) {
    throw new BadRequestException('AI response: invalid or missing title');
  }
  if (!Array.isArray(ingredients)) {
    throw new BadRequestException('AI response: ingredients must be an array');
  }
  if (!ingredients.every((x) => typeof x === 'string')) {
    throw new BadRequestException(
      'AI response: ingredients must be an array of strings',
    );
  }
  if (!Array.isArray(steps)) {
    throw new BadRequestException('AI response: steps must be an array');
  }
  if (!steps.every((x) => typeof x === 'string')) {
    throw new BadRequestException(
      'AI response: steps must be an array of strings',
    );
  }
  if (ingredients.length === 0 || steps.length === 0) {
    throw new BadRequestException(
      'AI response: ingredients and steps must be non-empty',
    );
  }

  return {
    title: title.trim(),
    ingredients: ingredients.map((s) => String(s).trim()).filter(Boolean),
    steps: steps.map((s) => String(s).trim()).filter(Boolean),
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  async generateRecipe(
    input: GenerateRecipeInput,
  ): Promise<GeneratedRecipePayload> {
    const apiKey =
      this.config.get<string>('OPENAI_API_KEY')?.trim() ||
      this.config.get<string>('OPENROUTER_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Set OPENAI_API_KEY (or OPENROUTER_API_KEY) in your environment.',
      );
    }

    const baseURL =
      this.config.get<string>('OPENAI_BASE_URL')?.trim() ||
      this.config.get<string>('OPENROUTER_BASE_URL')?.trim();
    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() ||
      this.config.get<string>('OPENROUTER_MODEL')?.trim() ||
      'gpt-4o-mini';

    const openai = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL: baseURL.replace(/\/$/, '') } : {}),
    });

    const payload = {
      ingredients: input.ingredients ?? [],
      dishType: input.dishType ?? null,
      complexity: input.complexity ?? null,
    };

    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You are a cooking assistant.',
              'Respond with ONE JSON object only. No markdown, no code fences, no text before or after the JSON.',
              'The JSON must have exactly these keys:',
              '- "title": string',
              '- "ingredients": array of strings (one string per ingredient line)',
              '- "steps": array of strings (one string per step)',
              'All string values must be non-empty where applicable.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `Generate a recipe. Input (JSON): ${JSON.stringify(payload)}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw?.trim()) {
        throw new BadRequestException('AI returned an empty response');
      }

      return parseAndValidateRecipeJson(raw);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      if (e instanceof APIError) {
        throw new ServiceUnavailableException(
          `OpenAI request failed: ${e.message}`,
        );
      }
      throw new ServiceUnavailableException(
        e instanceof Error ? e.message : 'OpenAI request failed',
      );
    }
  }

  /**
   * Food photo via OpenAI Images API (DALL·E). Uses official `api.openai.com` — a
   * dedicated `OPENAI_API_KEY` is recommended; OpenRouter keys usually do not work here.
   */
  async generateDishImage(params: {
    title: string;
    dishType?: string;
  }): Promise<Buffer | null> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      this.logger.warn(
        'Dish image skipped: set OPENAI_API_KEY for DALL·E (OpenRouter keys are not used for images).',
      );
      return null;
    }

    const model =
      this.config.get<string>('OPENAI_IMAGE_MODEL')?.trim() || 'dall-e-3';
    const openai = new OpenAI({ apiKey });

    const dish = params.dishType?.trim();
    const prompt = [
      'Professional food photography, top-down and slightly angled view.',
      `The dish: ${params.title.trim()}.`,
      dish ? `Style / type: ${dish}.` : '',
      'Appetizing, natural soft lighting, shallow depth of field, no text, no watermark, no people, no hands.',
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const res = await openai.images.generate({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) {
        this.logger.warn('Dish image: empty b64 from API');
        return null;
      }
      return Buffer.from(b64, 'base64');
    } catch (e) {
      if (e instanceof APIError) {
        this.logger.warn(`Dish image failed: ${e.message}`);
      } else {
        this.logger.warn(
          e instanceof Error ? e.message : 'Dish image generation failed',
        );
      }
      return null;
    }
  }
}
