import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { SermonType } from '@prisma/client';

export class CreateSermonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  speaker: string;

  @IsEnum(SermonType)
  category: SermonType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bibleReference?: string;

  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @IsUrl()
  @IsOptional()
  audioUrl?: string;

  @IsUrl()
  @IsOptional()
  thumbnail?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number; // in seconds

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

export class UpdateSermonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  speaker?: string;

  @IsEnum(SermonType)
  @IsOptional()
  category?: SermonType;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  bibleReference?: string;

  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @IsUrl()
  @IsOptional()
  audioUrl?: string;

  @IsUrl()
  @IsOptional()
  thumbnail?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

export class TrackSermonProgressDto {
  @IsUUID()
  sermonId: string;

  @IsInt()
  @Min(0)
  watchedDuration: number; // in seconds
}

export class SearchSermonsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(SermonType)
  @IsOptional()
  category?: SermonType;

  @IsString()
  @IsOptional()
  speaker?: string;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}
