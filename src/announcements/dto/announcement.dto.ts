import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnnouncementCategory } from '@prisma/client';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsEnum(AnnouncementCategory)
  category: AnnouncementCategory;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date;
}

export class UpdateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  content?: string;

  @IsEnum(AnnouncementCategory)
  @IsOptional()
  category?: AnnouncementCategory;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date;
}

export class SearchAnnouncementsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(AnnouncementCategory)
  @IsOptional()
  category?: AnnouncementCategory;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}
