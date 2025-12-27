import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { GroupPostType, GroupType } from '@prisma/client';

export class CreateGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsEnum(GroupType)
  type: GroupType;

  @IsUrl()
  @IsOptional()
  coverImage?: string;
}

export class UpdateGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @IsEnum(GroupType)
  @IsOptional()
  type?: GroupType;

  @IsUrl()
  @IsOptional()
  coverImage?: string;
}

export class CreateGroupPostDto {
  @IsUUID()
  groupId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsEnum(GroupPostType)
  type: GroupPostType;

  @IsUrl()
  @IsOptional()
  mediaUrl?: string;
}

export class UpdateGroupPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  mediaUrl?: string;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
