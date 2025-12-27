import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CounselingService } from './counseling.service';
import {
  CreateCounselingSessionDto,
  UpdateCounselingSessionDto,
  RescheduleCounselingDto,
  QueryCounselingSessions,
} from './dto/counseling.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('counseling')
export class CounselingController {
  constructor(private readonly counselingService: CounselingService) {}

  @Get('available-slots')
  getAvailableSlots(
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.counselingService.generateAvailableSlots(month, year);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  bookSession(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateCounselingSessionDto,
  ) {
    return this.counselingService.bookSession(userId, createDto);
  }

  @Get()
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(
    @Query() query: QueryCounselingSessions,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.counselingService.findAll(query, page, limit);
  }

  @Get('my-sessions')
  findMySessions(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.counselingService.findAllByUser(userId, page, limit);
  }

  @Get('pastor-sessions')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findPastorSessions(
    @CurrentUser('id') pastorId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.counselingService.findAllByPastor(pastorId, page, limit);
  }

  @Get('stats')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.counselingService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.counselingService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateCounselingSessionDto) {
    return this.counselingService.update(id, updateDto);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() rescheduleDto: RescheduleCounselingDto,
  ) {
    return this.counselingService.reschedule(id, userId, rescheduleDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.counselingService.cancel(id, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.counselingService.remove(id);
  }
}
