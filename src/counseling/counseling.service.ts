import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateCounselingSessionDto,
  UpdateCounselingSessionDto,
  RescheduleCounselingDto,
  QueryCounselingSessions,
} from './dto/counseling.dto';
import { CounselingStatus, Prisma, UserRole } from '@prisma/client';
import { DateHelper } from '../common/utils/helpers';

@Injectable()
export class CounselingService {
  constructor(private database: DatabaseService) {}

  /**
   * Find or create a counseling slot for the given date/time
   */
  private async findOrCreateSlot(dateTime: Date): Promise<string> {
    const slotDate = new Date(dateTime);
    slotDate.setHours(0, 0, 0, 0);
    
    const startTime = new Date(dateTime);
    const endTime = new Date(dateTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    // Try to find existing slot
    const existingSlot = await this.database.counselingSlot.findFirst({
      where: {
        date: slotDate,
        startTime: startTime,
      },
    });

    if (existingSlot) {
      return existingSlot.id;
    }

    // Create new slot
    const newSlot = await this.database.counselingSlot.create({
      data: {
        date: slotDate,
        startTime: startTime,
        endTime: endTime,
        maxBookings: 1,
        isAvailable: true,
      },
    });

    return newSlot.id;
  }

  /**
   * Generate available counseling slots for Wednesdays only
   * Slots: 10:00 AM - 12:00 PM, 2:00 PM - 5:00 PM
   */
  async generateAvailableSlots(month: number, year: number) {
    const slots: Array<{ dateTime: Date; isAvailable: boolean; isBooked: boolean }> = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);

      // Check if it's Wednesday (3 = Wednesday)
      if (date.getDay() === 3) {
        // Morning slots: 10:00 AM - 12:00 PM (30-minute intervals)
        const morningSlots = [
          { hour: 10, minute: 0 },
          { hour: 10, minute: 30 },
          { hour: 11, minute: 0 },
          { hour: 11, minute: 30 },
        ];

        // Afternoon slots: 2:00 PM - 5:00 PM (30-minute intervals)
        const afternoonSlots = [
          { hour: 14, minute: 0 },
          { hour: 14, minute: 30 },
          { hour: 15, minute: 0 },
          { hour: 15, minute: 30 },
          { hour: 16, minute: 0 },
          { hour: 16, minute: 30 },
        ];

        const allSlots = [...morningSlots, ...afternoonSlots];

        for (const slot of allSlots) {
          const slotDateTime = new Date(
            year,
            month - 1,
            day,
            slot.hour,
            slot.minute,
          );

          // Find or create slot
          const slotId = await this.findOrCreateSlot(slotDateTime);

          // Check if slot is already booked
          const existingBooking = await this.database.counselingBooking.findFirst({
            where: {
              slotId,
              status: {
                in: [CounselingStatus.SCHEDULED, CounselingStatus.CONFIRMED],
              },
            },
          });

          slots.push({
            dateTime: slotDateTime,
            isAvailable: !existingBooking,
            isBooked: !!existingBooking,
          });
        }
      }
    }

    return slots;
  }

  async bookSession(userId: string, createDto: CreateCounselingSessionDto) {
    // Validate that the slot is on a Wednesday
    const slotDate = new Date(createDto.slotDateTime);
    if (slotDate.getDay() !== 3) {
      throw new BadRequestException('Counseling sessions are only available on Wednesdays');
    }

    // Validate time slot
    const hour = slotDate.getHours();
    const minute = slotDate.getMinutes();

    const isValidMorningSlot = hour >= 10 && hour < 12;
    const isValidAfternoonSlot = hour >= 14 && hour < 17;

    if (!isValidMorningSlot && !isValidAfternoonSlot) {
      throw new BadRequestException(
        'Invalid time slot. Available times: 10:00 AM - 12:00 PM, 2:00 PM - 5:00 PM',
      );
    }

    if (minute !== 0 && minute !== 30) {
      throw new BadRequestException('Slots are available in 30-minute intervals');
    }

    // Find or create slot
    const slotId = await this.findOrCreateSlot(createDto.slotDateTime);

    // Check if slot is available
    const existingBooking = await this.database.counselingBooking.findFirst({
      where: {
        slotId,
        status: {
          in: [CounselingStatus.SCHEDULED, CounselingStatus.CONFIRMED],
        },
      },
    });

    if (existingBooking) {
      throw new ConflictException('This time slot is already booked');
    }

    // Check if user already has a pending/confirmed session
    const userPendingSession = await this.database.counselingBooking.findFirst({
      where: {
        userId,
        status: {
          in: [CounselingStatus.SCHEDULED, CounselingStatus.CONFIRMED],
        },
      },
    });

    if (userPendingSession) {
      throw new ConflictException(
        'You already have a pending counseling session. Please complete or cancel it first.',
      );
    }

    // Assign available pastor (round-robin or random)
    const pastor = await this.getAvailablePastor(createDto.slotDateTime);

    if (!pastor) {
      throw new BadRequestException('No pastor available for this slot');
    }

    // Create session
    const session = await this.database.counselingBooking.create({
      data: {
        userId,
        slotId,
        counselorId: pastor.id,
        category: createDto.category,
        description: createDto.reason,
        phoneNumber: createDto.phone || '',
        status: CounselingStatus.SCHEDULED,
      },
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
        slot: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // TODO: Schedule reminders (24 hours and 2 hours before)
    // TODO: Send confirmation notification

    return session;
  }

  async findAll(query: QueryCounselingSessions, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.CounselingBookingWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.pastorId) {
      where.counselorId = query.pastorId;
    }

    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.slot = {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const [sessions, total] = await Promise.all([
      this.database.counselingBooking.findMany({
        where,
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
          slot: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { slot: { startTime: 'asc' } },
      }),
      this.database.counselingBooking.count({ where }),
    ]);

    return {
      sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.database.counselingBooking.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          slot: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { slot: { startTime: 'desc' } },
      }),
      this.database.counselingBooking.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllByPastor(pastorId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.database.counselingBooking.findMany({
        where: {
          counselorId: pastorId,
          deletedAt: null,
        },
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
          slot: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { slot: { startTime: 'asc' } },
      }),
      this.database.counselingBooking.count({
        where: { counselorId: pastorId, deletedAt: null },
      }),
    ]);

    return {
      sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const session = await this.database.counselingBooking.findUnique({
      where: { id },
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
        slot: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!session || session.deletedAt) {
      throw new NotFoundException('Counseling session not found');
    }

    // If userId provided, verify ownership
    if (userId && session.userId !== userId) {
      throw new NotFoundException('Counseling session not found');
    }

    return session;
  }

  async update(id: string, updateDto: UpdateCounselingSessionDto) {
    const session = await this.findOne(id);

    const updatedSession = await this.database.counselingBooking.update({
      where: { id },
      data: {
        status: updateDto.status,
        counselorNotes: updateDto.counselorNotes || updateDto.followUpNotes,
        ...(updateDto.status === CounselingStatus.COMPLETED && {
          // No completedAt field in schema, but we can track via status
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        slot: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return updatedSession;
  }

  async reschedule(
    id: string,
    userId: string,
    rescheduleDto: RescheduleCounselingDto,
  ) {
    const session = await this.findOne(id, userId);

    if (session.status !== CounselingStatus.SCHEDULED && session.status !== CounselingStatus.CONFIRMED) {
      throw new BadRequestException('Only scheduled or confirmed sessions can be rescheduled');
    }

    // Validate new slot
    const newSlotDate = new Date(rescheduleDto.newSlotDateTime);
    if (newSlotDate.getDay() !== 3) {
      throw new BadRequestException('Counseling sessions are only available on Wednesdays');
    }

    // Find or create new slot
    const newSlotId = await this.findOrCreateSlot(rescheduleDto.newSlotDateTime);

    // Check if new slot is available
    const existingBooking = await this.database.counselingBooking.findFirst({
      where: {
        slotId: newSlotId,
        id: { not: id },
        status: {
          in: [CounselingStatus.SCHEDULED, CounselingStatus.CONFIRMED],
        },
      },
    });

    if (existingBooking) {
      throw new ConflictException('This time slot is already booked');
    }

    const updatedSession = await this.database.counselingBooking.update({
      where: { id },
      data: {
        slotId: newSlotId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        slot: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // TODO: Update reminders with new time
    // TODO: Send reschedule notification

    return updatedSession;
  }

  async cancel(id: string, userId: string) {
    const session = await this.findOne(id, userId);

    if (session.status !== CounselingStatus.SCHEDULED && session.status !== CounselingStatus.CONFIRMED) {
      throw new BadRequestException('Only scheduled or confirmed sessions can be cancelled');
    }

    const updatedSession = await this.database.counselingBooking.update({
      where: { id },
      data: {
        status: CounselingStatus.CANCELLED,
      },
    });

    // TODO: Cancel scheduled reminders
    // TODO: Send cancellation notification

    return updatedSession;
  }

  async getStats() {
    const [
      totalSessions,
      scheduledSessions,
      completedSessions,
      cancelledSessions,
      sessionsByCategory,
    ] = await Promise.all([
      this.database.counselingBooking.count({ where: { deletedAt: null } }),
      this.database.counselingBooking.count({
        where: {
          status: CounselingStatus.SCHEDULED,
          deletedAt: null,
        },
      }),
      this.database.counselingBooking.count({
        where: {
          status: CounselingStatus.COMPLETED,
          deletedAt: null,
        },
      }),
      this.database.counselingBooking.count({
        where: {
          status: CounselingStatus.CANCELLED,
          deletedAt: null,
        },
      }),
      this.database.counselingBooking.groupBy({
        by: ['category'],
        _count: true,
        where: { deletedAt: null },
      }),
    ]);

    return {
      totalSessions,
      scheduledSessions,
      completedSessions,
      cancelledSessions,
      sessionsByCategory,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.database.counselingBooking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Counseling session deleted successfully' };
  }

  private async getAvailablePastor(slotDateTime: Date) {
    // Get all pastors
    const pastors = await this.database.user.findMany({
      where: {
        role: { in: [UserRole.PASTOR, UserRole.ADMIN] },
        isActive: true,
      },
    });

    if (pastors.length === 0) {
      return null;
    }

    // Get session counts for each pastor on this date
    const startOfDay = new Date(slotDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(slotDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const pastorSessionCounts = await Promise.all(
      pastors.map(async (pastor) => {
        const count = await this.database.counselingBooking.count({
          where: {
            counselorId: pastor.id,
            slot: {
              date: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            status: {
              in: [CounselingStatus.SCHEDULED, CounselingStatus.CONFIRMED],
            },
          },
        });
        return { pastor, count };
      }),
    );

    // Return pastor with least sessions (load balancing)
    pastorSessionCounts.sort((a, b) => a.count - b.count);
    return pastorSessionCounts[0].pastor;
  }
}
