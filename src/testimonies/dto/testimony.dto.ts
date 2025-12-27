import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { TestimonyStatus } from '@prisma/client';

export class CreateTestimonyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  content: string;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsUrl()
  @IsOptional()
  videoUrl?: string;
}

export class UpdateTestimonyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @IsEnum(TestimonyStatus)
  @IsOptional()
  status?: TestimonyStatus;
}

export class SearchTestimoniesDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(TestimonyStatus)
  @IsOptional()
  status?: TestimonyStatus;
}
