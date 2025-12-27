import {
  IsString,
  IsDate,
  IsEnum,
  IsOptional,
  IsUrl,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventCategory, EventStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsEnum(EventCategory)
  category: EventCategory;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  location: string;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  requiresRegistration?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAttendees?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  registrationFee?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}

export class UpdateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @IsEnum(EventCategory)
  @IsOptional()
  category?: EventCategory;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @IsOptional()
  location?: string;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  requiresRegistration?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAttendees?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  registrationFee?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}

export class RegisterForEventDto {
  @IsUUID()
  eventId: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  additionalInfo?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;
}

export class SearchEventsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(EventCategory)
  @IsOptional()
  category?: EventCategory;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  upcoming?: boolean;
}
