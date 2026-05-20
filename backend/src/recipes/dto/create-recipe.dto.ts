import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ingredients: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  steps: string[];

  /** Defaults to false (your own recipe). Set true only if ingesting AI output elsewhere. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isAI?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Diet style, e.g. vegan, vegetarian — stored lowercase. */
  @IsOptional()
  @IsString()
  diet?: string;

  /** Dietary labels, e.g. gluten-free, nut-free — stored lowercase. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictions?: string[];
}
