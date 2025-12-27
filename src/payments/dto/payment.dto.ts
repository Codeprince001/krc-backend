import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class InitiatePaymentDto {
  @IsNumber()
  @Min(100)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @MaxLength(500)
  purpose: string;

  @IsString()
  @IsOptional()
  referenceId?: string; // Order ID, Event ID, etc.

  @IsString()
  @IsOptional()
  metadata?: string; // JSON string
}

export class VerifyPaymentDto {
  @IsString()
  paymentRef: string;
}

export class WebhookPayloadDto {
  @IsString()
  event: string;

  @IsString()
  data: string; // JSON string from payment provider
}
