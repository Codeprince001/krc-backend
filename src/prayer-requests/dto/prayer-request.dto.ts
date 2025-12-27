import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { PrayerRequestStatus } from '@prisma/client';

export class CreatePrayerRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}

export class UpdatePrayerRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsEnum(PrayerRequestStatus)
  @IsOptional()
  status?: PrayerRequestStatus;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  testimony?: string;
}

export class SearchPrayerRequestsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(PrayerRequestStatus)
  @IsOptional()
  status?: PrayerRequestStatus;

  @IsBoolean()
  @IsOptional()
  onlyPublic?: boolean;
}
