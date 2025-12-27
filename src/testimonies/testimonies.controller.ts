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
import { TestimoniesService } from './testimonies.service';
import {
  CreateTestimonyDto,
  UpdateTestimonyDto,
  SearchTestimoniesDto,
} from './dto/testimony.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('testimonies')
export class TestimoniesController {
  constructor(private readonly testimoniesService: TestimoniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateTestimonyDto,
  ) {
    return this.testimoniesService.create(userId, createDto);
  }

  @Get()
  @Public()
  findAll(
    @Query() query: SearchTestimoniesDto,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.testimoniesService.findAll(query, page, limit);
  }

  @Get('pending-review')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForReview(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.testimoniesService.findAllForReview(page, limit);
  }

  @Get('my-testimonies')
  findMyTestimonies(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.testimoniesService.findAllByUser(userId, page, limit);
  }

  @Get('stats')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.testimoniesService.getStats();
  }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.testimoniesService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.testimoniesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Body() updateDto: UpdateTestimonyDto,
  ) {
    return this.testimoniesService.update(id, userId, userRole, updateDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,  
  ) {
    return this.testimoniesService.remove(id, userId, userRole);
  }
}
