import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateEventDto,
  UpdateEventDto,
  RegisterForEventDto,
  SearchEventsDto,
} from './dto/event.dto';
import { EventStatus, Prisma } from '@prisma/client';
import { SlugHelper } from '../common/utils/helpers';

@Injectable()
export class EventsService {
  constructor(private database: DatabaseService) {}

  async create(createEventDto: CreateEventDto) {
    const slug = SlugHelper.generate(createEventDto.title);

    // Validate dates
    if (createEventDto.endDate < createEventDto.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const event = await this.database.event.create({
      data: {
        ...createEventDto,
        slug,
        status: EventStatus.UPCOMING,
        registrationFee: createEventDto.registrationFee
          ? new Prisma.Decimal(createEventDto.registrationFee)
          : null,
      },
    });

    return event;
  }

  async findAll(query: SearchEventsDto, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.EventWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.upcoming) {
      where.startDate = { gte: new Date() };
    }

    const [events, total] = await Promise.all([
      this.database.event.findMany({
        where,
        include: {
          _count: {
            select: { registrations: true },
          },
        },
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
      }),
      this.database.event.count({ where }),
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const event = await this.database.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!event || event.deletedAt) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async findBySlug(slug: string) {
    const event = await this.database.event.findFirst({
      where: { slug, deletedAt: null },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async getUpcoming(limit: number = 10) {
    const events = await this.database.event.findMany({
      where: {
        startDate: { gte: new Date() },
        status: EventStatus.UPCOMING,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
      take: limit,
      orderBy: { startDate: 'asc' },
    });

    return events;
  }

  async getFeatured(limit: number = 10) {
    const events = await this.database.event.findMany({
      where: {
        isFeatured: true,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
      take: limit,
      orderBy: { startDate: 'asc' },
    });

    return events;
  }

  async register(userId: string, registerDto: RegisterForEventDto) {
    const event = await this.findOne(registerDto.eventId);

    // Validate event status
    if (event.status !== EventStatus.UPCOMING) {
      throw new BadRequestException('This event is not open for registration');
    }

    // Check if already registered
    const existingRegistration = await this.database.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          userId,
          eventId: registerDto.eventId,
        },
      },
    });

    if (existingRegistration) {
      throw new ConflictException('You are already registered for this event');
    }

    // Check max attendees
    if (event.maxAttendees) {
      const registrationCount = await this.database.eventRegistration.count({
        where: { eventId: registerDto.eventId },
      });

      if (registrationCount >= event.maxAttendees) {
        throw new BadRequestException('Event is full');
      }
    }

    const registration = await this.database.eventRegistration.create({
      data: {
        userId,
        eventId: registerDto.eventId,
        notes: registerDto.additionalInfo,
        phoneNumber: registerDto.phone,
      },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send registration confirmation email/notification
    // TODO: If event has fee, initiate payment

    return registration;
  }

  async getUserRegistrations(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      this.database.eventRegistration.findMany({
        where: { userId },
        include: {
          event: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.eventRegistration.count({ where: { userId } }),
    ]);

    return {
      registrations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEventRegistrations(eventId: string, page: number = 1, limit: number = 20) {
    await this.findOne(eventId);

    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      this.database.eventRegistration.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.eventRegistration.count({ where: { eventId } }),
    ]);

    return {
      registrations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelRegistration(userId: string, eventId: string) {
    const registration = await this.database.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          userId,
          eventId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    await this.database.eventRegistration.delete({
      where: {
        eventId_userId: {
          userId,
          eventId,
        },
      },
    });

    // TODO: Send cancellation notification
    // TODO: Process refund if payment was made

    return { message: 'Registration cancelled successfully' };
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    await this.findOne(id);

    const updateData: any = { ...updateEventDto };

    if (updateEventDto.title) {
      updateData.slug = SlugHelper.generate(updateEventDto.title);
    }

    if (updateEventDto.registrationFee !== undefined) {
      updateData.registrationFee = updateEventDto.registrationFee
        ? new Prisma.Decimal(updateEventDto.registrationFee)
        : null;
    }

    if (updateEventDto.startDate && updateEventDto.endDate) {
      if (updateEventDto.endDate < updateEventDto.startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const event = await this.database.event.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });

    return event;
  }

  async getStats() {
    const [
      totalEvents,
      upcomingEvents,
      featuredEvents,
      totalRegistrations,
      eventsByCategory,
      topEvents,
    ] = await Promise.all([
      this.database.event.count({ where: { deletedAt: null } }),
      this.database.event.count({
        where: {
          status: EventStatus.UPCOMING,
          startDate: { gte: new Date() },
          deletedAt: null,
        },
      }),
      this.database.event.count({
        where: { isFeatured: true, deletedAt: null },
      }),
      this.database.eventRegistration.count(),
      this.database.event.groupBy({
        by: ['category'],
        _count: true,
        where: { deletedAt: null },
      }),
      this.database.event.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: { registrations: true },
          },
        },
        take: 5,
        orderBy: {
          registrations: {
            _count: 'desc',
          },
        },
      }),
    ]);

    return {
      totalEvents,
      upcomingEvents,
      featuredEvents,
      totalRegistrations,
      eventsByCategory,
      topEvents,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.database.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Event deleted successfully' };
  }
}
