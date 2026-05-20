import { ConfigService } from '@nestjs/config';
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
export declare class AiService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    generateRecipe(input: GenerateRecipeInput): Promise<GeneratedRecipePayload>;
}
