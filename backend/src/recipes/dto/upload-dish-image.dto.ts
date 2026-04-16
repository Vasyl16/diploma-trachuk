import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** PNG/JPEG/WebP as raw base64 or data URL. */
export class UploadRecipeDishImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(9_000_000)
  imageBase64: string;
}
