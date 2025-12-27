import {
  IsString,
  IsNumber,
  IsEnum,
  IsDate,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GivingCategory, PaymentMethod } from '@prisma/client';

export class RecordGivingDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(GivingCategory)
  category: GivingCategory;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  paymentRef?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  givenDate?: Date;

  @IsString()
  @IsOptional()
  isAnonymous?: boolean;
}

export class QueryGivingDto {
  @IsEnum(GivingCategory)
  @IsOptional()
  category?: GivingCategory;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}
