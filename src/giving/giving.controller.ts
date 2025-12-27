import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GivingService } from './giving.service';
import { RecordGivingDto, QueryGivingDto } from './dto/giving.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('giving')
export class GivingController {
  constructor(private readonly givingService: GivingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  recordGiving(
    @CurrentUser('id') userId: string,
    @Body() recordDto: RecordGivingDto,
  ) {
    return this.givingService.recordGiving(userId, recordDto);
  }

  @Get()
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(
    @Query() query: QueryGivingDto,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.givingService.findAll(query, page, limit);
  }

  @Get('my-giving')
  findMyGiving(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.givingService.findAllByUser(userId, page, limit);
  }

  @Get('my-stats')
  getMyStats(@CurrentUser('id') userId: string) {
    return this.givingService.getUserStats(userId);
  }

  @Get('stats')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats(@Query() query: QueryGivingDto) {
    return this.givingService.getStats(query);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.givingService.remove(id);
  }
}
