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

  /** When true, the API also generates a dish image after the recipe is created. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true';
  })
  generateImage?: boolean;
}
