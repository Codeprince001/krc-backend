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
import { SermonsService } from './sermons.service';
import {
  CreateSermonDto,
  UpdateSermonDto,
  TrackSermonProgressDto,
  SearchSermonsDto,
} from './dto/sermon.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('sermons')
export class SermonsController {
  constructor(private readonly sermonsService: SermonsService) {}

  @Post()
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSermonDto: CreateSermonDto) {
    return this.sermonsService.create(createSermonDto);
  }

  @Get()
  @Public()
  findAll(
    @Query() query: SearchSermonsDto,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.sermonsService.findAll(query, page, limit);
  }

  @Get('featured')
  @Public()
  getFeatured(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.sermonsService.getFeatured(limit);
  }

  @Get('latest')
  @Public()
  getLatest(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.sermonsService.getLatest(limit);
  }

  @Get('popular')
  @Public()
  getPopular(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.sermonsService.getPopular(limit);
  }

  @Get('stats')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.sermonsService.getStats();
  }

  @Post('track-progress')
  trackProgress(
    @CurrentUser('id') userId: string,
    @Body() trackDto: TrackSermonProgressDto,
  ) {
    return this.sermonsService.trackProgress(userId, trackDto);
  }

  @Get('my-progress')
  getUserProgress(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.sermonsService.getUserProgress(userId, page, limit);
  }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.sermonsService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.sermonsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateSermonDto: UpdateSermonDto) {
    return this.sermonsService.update(id, updateSermonDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.sermonsService.remove(id);
  }
}
