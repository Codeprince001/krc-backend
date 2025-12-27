import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { MediaType } from '@prisma/client';

export class UploadMediaDto {
  @IsString()
  @MaxLength(200)
  filename: string;

  @IsEnum(MediaType)
  type: MediaType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
