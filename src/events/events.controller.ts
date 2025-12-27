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
import { EventsService } from './events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  RegisterForEventDto,
  SearchEventsDto,
} from './dto/event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @Public()
  findAll(
    @Query() query: SearchEventsDto,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.eventsService.findAll(query, page, limit);
  }

  @Get('upcoming')
  @Public()
  getUpcoming(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.eventsService.getUpcoming(limit);
  }

  @Get('featured')
  @Public()
  getFeatured(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.eventsService.getFeatured(limit);
  }

  @Get('stats')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.eventsService.getStats();
  }

  @Post('register')
  register(
    @CurrentUser('id') userId: string,
    @Body() registerDto: RegisterForEventDto,
  ) {
    return this.eventsService.register(userId, registerDto);
  }

  @Get('my-registrations')
  getUserRegistrations(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.eventsService.getUserRegistrations(userId, page, limit);
  }

  @Get(':id/registrations')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  getEventRegistrations(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.eventsService.getEventRegistrations(id, page, limit);
  }

  @Delete(':eventId/cancel-registration')
  cancelRegistration(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.cancelRegistration(userId, eventId);
  }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.PASTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
