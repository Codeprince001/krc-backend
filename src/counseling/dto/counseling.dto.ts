import {
  IsString,
  IsUUID,
  IsDate,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CounselingStatus, CounselingCategory } from '@prisma/client';

export class CreateCounselingSessionDto {
  @IsDate()
  @Type(() => Date)
  slotDateTime: Date;

  @IsEnum(CounselingCategory)
  category: CounselingCategory;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  isAnonymous?: boolean;
}

export class UpdateCounselingSessionDto {
  @IsEnum(CounselingStatus)
  @IsOptional()
  status?: CounselingStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  counselorNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  followUpNotes?: string;
}

export class RescheduleCounselingDto {
  @IsDate()
  @Type(() => Date)
  newSlotDateTime: Date;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rescheduleReason?: string;
}

export class QueryCounselingSessions {
  @IsEnum(CounselingStatus)
  @IsOptional()
  status?: CounselingStatus;

  @IsEnum(CounselingCategory)
  @IsOptional()
  category?: CounselingCategory;

  @IsUUID()
  @IsOptional()
  pastorId?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;
}
