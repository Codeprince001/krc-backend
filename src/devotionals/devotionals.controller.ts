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
import { DevotionalsService } from './devotionals.service';
import {
  CreateDevotionalDto,
  UpdateDevotionalDto,
} from './dto/devotional.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('devotionals')
export class DevotionalsController {
  constructor(private readonly devotionalsService: DevotionalsService) {}

  @Post()
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDevotionalDto: CreateDevotionalDto) {
    return this.devotionalsService.create(createDevotionalDto);
  }

  @Get()
  @Public()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.devotionalsService.findAll(page, limit);
  }

  @Get('today')
  @Public()
  getTodaysDevotional() {
    return this.devotionalsService.getTodaysDevotional();
  }

  @Get('date/:date')
  @Public()
  getByDate(@Param('date') date: string) {
    return this.devotionalsService.getByDate(new Date(date));
  }

  @Get('month/:year/:month')
  @Public()
  getByMonth(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.devotionalsService.getByMonth(year, month);
  }

  @Get('stats')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.devotionalsService.getStats();
  }

  @Post('mark-read/:id')
  markAsRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.devotionalsService.markAsRead(userId, id);
  }

  @Get('my-history')
  getUserReadHistory(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.devotionalsService.getUserReadHistory(userId, page, limit);
  }

  @Get('my-streak')
  getUserStreak(@CurrentUser('id') userId: string) {
    return this.devotionalsService.getUserStreak(userId);
  }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.devotionalsService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.devotionalsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateDevotionalDto: UpdateDevotionalDto) {
    return this.devotionalsService.update(id, updateDevotionalDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.devotionalsService.remove(id);
  }
}
