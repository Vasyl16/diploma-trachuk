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
  diet?: string;
  restrictions?: string[];
  avoidIngredients?: string[];
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
    const openRouterKey = this.config.get<string>('OPENROUTER_API_KEY')?.trim();
    const openRouterBase = this.config
      .get<string>('OPENROUTER_BASE_URL')
      ?.trim();
    const openAiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    const openAiBase = this.config.get<string>('OPENAI_BASE_URL')?.trim();

    const openRouterReady = Boolean(openRouterKey && openRouterBase);

    let apiKey: string;
    let baseURL: string | undefined;
    let model: string;

    if (openRouterReady) {
      apiKey = openRouterKey!;
      baseURL = openRouterBase!.replace(/\/$/, '');
      model =
        this.config.get<string>('OPENROUTER_MODEL')?.trim() ||
        'openai/gpt-4o-mini';
    } else if (openAiKey) {
      apiKey = openAiKey;
      baseURL = openAiBase?.replace(/\/$/, '');
      model = this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
    } else {
      throw new ServiceUnavailableException(
        'Set OPENAI_API_KEY (optional OPENAI_BASE_URL), or both OPENROUTER_API_KEY and OPENROUTER_BASE_URL.',
      );
    }

    const openai = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    const payload = {
      ingredients: input.ingredients ?? [],
      dishType: input.dishType ?? null,
      complexity: input.complexity ?? null,
      diet: input.diet?.trim() || null,
      restrictions: input.restrictions?.length ? input.restrictions : [],
      avoidIngredients: input.avoidIngredients?.length
        ? input.avoidIngredients
        : [],
    };

    const dietHints: string[] = [];
    if (payload.diet) {
      dietHints.push(
        `The recipe must suit this diet/style: "${payload.diet}".`,
      );
    }
    if (payload.restrictions.length) {
      dietHints.push(
        `Respect these dietary requirements (ingredients and steps must comply): ${JSON.stringify(payload.restrictions)}.`,
      );
    }
    if (payload.avoidIngredients.length) {
      dietHints.push(
        `Do NOT use any of these ingredients (or obvious substitutes that violate the spirit, e.g. almond milk if "dairy" is avoided): ${JSON.stringify(payload.avoidIngredients)}.`,
      );
    }
    const dietBlock =
      dietHints.length > 0
        ? ` Additional constraints: ${dietHints.join(' ')}`
        : '';

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
            content: `Generate a recipe. Input (JSON): ${JSON.stringify(payload)}.${dietBlock}`,
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
        const hint =
          e.status === 401
            ? ' Use OPENROUTER_API_KEY with OPENROUTER_BASE_URL together (not OPENAI_API_KEY against OpenRouter). Restart the API after changing backend/.env.'
            : '';
        throw new ServiceUnavailableException(
          `OpenAI request failed: ${e.message}.${hint}`,
        );
      }
      throw new ServiceUnavailableException(
        e instanceof Error ? e.message : 'OpenAI request failed',
      );
    }
  }
}
