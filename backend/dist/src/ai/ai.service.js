"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importStar(require("openai"));
function parseAndValidateRecipeJson(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new common_1.BadRequestException('AI response was not valid JSON');
    }
    if (typeof parsed !== 'object' || parsed === null) {
        throw new common_1.BadRequestException('AI response JSON has invalid shape');
    }
    const o = parsed;
    const { title, ingredients, steps } = o;
    if (typeof title !== 'string' || !title.trim()) {
        throw new common_1.BadRequestException('AI response: invalid or missing title');
    }
    if (!Array.isArray(ingredients)) {
        throw new common_1.BadRequestException('AI response: ingredients must be an array');
    }
    if (!ingredients.every((x) => typeof x === 'string')) {
        throw new common_1.BadRequestException('AI response: ingredients must be an array of strings');
    }
    if (!Array.isArray(steps)) {
        throw new common_1.BadRequestException('AI response: steps must be an array');
    }
    if (!steps.every((x) => typeof x === 'string')) {
        throw new common_1.BadRequestException('AI response: steps must be an array of strings');
    }
    if (ingredients.length === 0 || steps.length === 0) {
        throw new common_1.BadRequestException('AI response: ingredients and steps must be non-empty');
    }
    return {
        title: title.trim(),
        ingredients: ingredients.map((s) => String(s).trim()).filter(Boolean),
        steps: steps.map((s) => String(s).trim()).filter(Boolean),
    };
}
let AiService = AiService_1 = class AiService {
    config;
    logger = new common_1.Logger(AiService_1.name);
    constructor(config) {
        this.config = config;
    }
    async generateRecipe(input) {
        const openRouterKey = this.config.get('OPENROUTER_API_KEY')?.trim();
        const openRouterBase = this.config
            .get('OPENROUTER_BASE_URL')
            ?.trim();
        const openAiKey = this.config.get('OPENAI_API_KEY')?.trim();
        const openAiBase = this.config.get('OPENAI_BASE_URL')?.trim();
        const openRouterReady = Boolean(openRouterKey && openRouterBase);
        let apiKey;
        let baseURL;
        let model;
        if (openRouterReady) {
            apiKey = openRouterKey;
            baseURL = openRouterBase.replace(/\/$/, '');
            model =
                this.config.get('OPENROUTER_MODEL')?.trim() ||
                    'openai/gpt-4o-mini';
        }
        else if (openAiKey) {
            apiKey = openAiKey;
            baseURL = openAiBase?.replace(/\/$/, '');
            model = this.config.get('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
        }
        else {
            throw new common_1.ServiceUnavailableException('Set OPENAI_API_KEY (optional OPENAI_BASE_URL), or both OPENROUTER_API_KEY and OPENROUTER_BASE_URL.');
        }
        const openai = new openai_1.default({
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
        const dietHints = [];
        if (payload.diet) {
            dietHints.push(`The recipe must suit this diet/style: "${payload.diet}".`);
        }
        if (payload.restrictions.length) {
            dietHints.push(`Respect these dietary requirements (ingredients and steps must comply): ${JSON.stringify(payload.restrictions)}.`);
        }
        if (payload.avoidIngredients.length) {
            dietHints.push(`Do NOT use any of these ingredients (or obvious substitutes that violate the spirit, e.g. almond milk if "dairy" is avoided): ${JSON.stringify(payload.avoidIngredients)}.`);
        }
        const dietBlock = dietHints.length > 0
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
                throw new common_1.BadRequestException('AI returned an empty response');
            }
            return parseAndValidateRecipeJson(raw);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException) {
                throw e;
            }
            if (e instanceof openai_1.APIError) {
                const hint = e.status === 401
                    ? ' Use OPENROUTER_API_KEY with OPENROUTER_BASE_URL together (not OPENAI_API_KEY against OpenRouter). Restart the API after changing backend/.env.'
                    : '';
                throw new common_1.ServiceUnavailableException(`OpenAI request failed: ${e.message}.${hint}`);
            }
            throw new common_1.ServiceUnavailableException(e instanceof Error ? e.message : 'OpenAI request failed');
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map