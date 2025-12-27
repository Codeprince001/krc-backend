import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  author: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  categoryId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @IsString()
  @IsOptional()
  isbn?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  previewPages?: string[];

  @IsString()
  @IsOptional()
  pdfUrl?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stockQuantity: number;

  @IsBoolean()
  @IsOptional()
  isDigital?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsDateString()
  @IsOptional()
  publishedDate?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  pageCount?: number;
}

export class UpdateBookDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @IsString()
  @IsOptional()
  isbn?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  previewPages?: string[];

  @IsString()
  @IsOptional()
  pdfUrl?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDigital?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsDateString()
  @IsOptional()
  publishedDate?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  pageCount?: number;
}

export class CreateBookCategoryDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  order?: number;
}

export class UpdateBookCategoryDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SearchBooksDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isDigital?: boolean;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'title' | 'price' | 'createdAt' | 'soldCount';

  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc';
}
