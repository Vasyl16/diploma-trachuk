import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class AiGenerateRecipeDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsString()
  dishType?: string;

  @IsOptional()
  @IsString()
  complexity?: string;

  /** Diet style for the generated recipe (e.g. vegan). Stored on the recipe. */
  @IsOptional()
  @IsString()
  diet?: string;

  /** Dietary labels to respect (e.g. gluten-free). Stored on the recipe. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictions?: string[];

  /** Ingredients the model must not use (passed to the prompt only). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidIngredients?: string[];

  /** When true, the API also generates a dish image after the recipe is created. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true';
  })
  generateImage?: boolean;
}
