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
import { PrayerRequestsService } from './prayer-requests.service';
import {
  CreatePrayerRequestDto,
  UpdatePrayerRequestDto,
  SearchPrayerRequestsDto,
} from './dto/prayer-request.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('prayer-requests')
export class PrayerRequestsController {
  constructor(
    private readonly prayerRequestsService: PrayerRequestsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreatePrayerRequestDto,
  ) {
    return this.prayerRequestsService.create(userId, createDto);
  }

  @Get()
  findAll(
    @Query() query: SearchPrayerRequestsDto,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.prayerRequestsService.findAll(query, page, limit);
  }

  @Get('my-requests')
  findMyRequests(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.prayerRequestsService.findAllByUser(userId, page, limit);
  }

  @Get('pastor-dashboard')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPastorDashboard(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.prayerRequestsService.getPastorDashboard(page, limit);
  }

  @Get('stats')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.prayerRequestsService.getStats();
  }

  @Post(':id/pray')
  prayForRequest(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.prayerRequestsService.prayForRequest(userId, id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.prayerRequestsService.findOne(id, userId, userRole);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Body() updateDto: UpdatePrayerRequestDto,
  ) {
    return this.prayerRequestsService.update(id, userId, userRole, updateDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.prayerRequestsService.remove(id, userId, userRole);
  }
}
