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
        const apiKey = this.config.get('OPENAI_API_KEY')?.trim() ||
            this.config.get('OPENROUTER_API_KEY')?.trim();
        if (!apiKey) {
            throw new common_1.ServiceUnavailableException('Set OPENAI_API_KEY (or OPENROUTER_API_KEY) in your environment.');
        }
        const baseURL = this.config.get('OPENAI_BASE_URL')?.trim() ||
            this.config.get('OPENROUTER_BASE_URL')?.trim();
        const model = this.config.get('OPENAI_MODEL')?.trim() ||
            this.config.get('OPENROUTER_MODEL')?.trim() ||
            'gpt-4o-mini';
        const openai = new openai_1.default({
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
                throw new common_1.BadRequestException('AI returned an empty response');
            }
            return parseAndValidateRecipeJson(raw);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException) {
                throw e;
            }
            if (e instanceof openai_1.APIError) {
                throw new common_1.ServiceUnavailableException(`OpenAI request failed: ${e.message}`);
            }
            throw new common_1.ServiceUnavailableException(e instanceof Error ? e.message : 'OpenAI request failed');
        }
    }
    async generateDishImage(params) {
        const apiKey = this.config.get('OPENAI_API_KEY')?.trim();
        if (!apiKey) {
            this.logger.warn('Dish image skipped: set OPENAI_API_KEY for DALL·E (OpenRouter keys are not used for images).');
            return null;
        }
        const model = this.config.get('OPENAI_IMAGE_MODEL')?.trim() || 'dall-e-3';
        const openai = new openai_1.default({ apiKey });
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
        }
        catch (e) {
            if (e instanceof openai_1.APIError) {
                this.logger.warn(`Dish image failed: ${e.message}`);
            }
            else {
                this.logger.warn(e instanceof Error ? e.message : 'Dish image generation failed');
            }
            return null;
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map