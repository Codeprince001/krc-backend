import {
  IsString,
  IsDate,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDevotionalDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsString()
  @MaxLength(500)
  bibleVerse: string;

  @IsString()
  @MaxLength(200)
  verseReference: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  author: string;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  prayer?: string;
}

export class UpdateDevotionalDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  content?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  bibleVerse?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  verseReference?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  author?: string;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  prayer?: string;
}
