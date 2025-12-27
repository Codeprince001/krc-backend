import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(1000)
  body: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @IsOptional()
  data?: string; // JSON string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  actionUrl?: string;
}

export class SendBulkNotificationDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(1000)
  body: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @IsOptional()
  data?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  actionUrl?: string;
}

export class QueryNotificationsDto {
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean;
}
