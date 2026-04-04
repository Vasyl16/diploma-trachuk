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

  /** When true, generate a dish image (DALL·E) and store it; requires OpenAI Images API access. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true';
  })
  generateImage?: boolean;
}
