import {
  IsString,
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType, PaymentMethod, OrderStatus } from '@prisma/client';

export class OrderItemDto {
  @IsUUID()
  bookId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  deliveryAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  deliveryCity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  deliveryState?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  recipientName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  recipientPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  customerNotes?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class ProcessPaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  paymentRef: string;
}

export class QueryOrdersDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @IsString()
  @IsOptional()
  search?: string; // Order number or customer name
}
