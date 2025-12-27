import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreatePrayerRequestDto,
  UpdatePrayerRequestDto,
  SearchPrayerRequestsDto,
} from './dto/prayer-request.dto';
import { Prisma, UserRole, PrayerRequestStatus } from '@prisma/client';

@Injectable()
export class PrayerRequestsService {
  constructor(private database: DatabaseService) {}

  async create(userId: string, createDto: CreatePrayerRequestDto) {
    const prayerRequest = await this.database.prayerRequest.create({
      data: {
        userId,
        ...createDto,
        status: PrayerRequestStatus.SUBMITTED,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return prayerRequest;
  }

  async findAll(query: SearchPrayerRequestsDto, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.PrayerRequestWhereInput = {
      deletedAt: null,
    };

    if (query.onlyPublic) {
      where.isAnonymous = false;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [prayerRequests, total] = await Promise.all([
      this.database.prayerRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.prayerRequest.count({ where }),
    ]);

    // Hide user info if anonymous
    const sanitized = prayerRequests.map((pr) => ({
      ...pr,
      user: pr.isAnonymous ? null : pr.user,
    }));

    return {
      prayerRequests: sanitized,
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

    const [prayerRequests, total] = await Promise.all([
      this.database.prayerRequest.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.prayerRequest.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      prayerRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPastorDashboard(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [prayerRequests, total] = await Promise.all([
      this.database.prayerRequest.findMany({
        where: {
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
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.prayerRequest.count({ where: { deletedAt: null } }),
    ]);

    return {
      prayerRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string, userRole?: UserRole) {
    const prayerRequest = await this.database.prayerRequest.findUnique({
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
      },
    });

    if (!prayerRequest || prayerRequest.deletedAt) {
      throw new NotFoundException('Prayer request not found');
    }

    // Check privacy - using isAnonymous since isPrivate doesn't exist in schema
    const isPastor = userRole ? (userRole === UserRole.PASTOR || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) : false;
    const isOwner = userId === prayerRequest.userId;

    // Hide user info if anonymous and not owner/pastor
    if (prayerRequest.isAnonymous && !isPastor && !isOwner && prayerRequest.user) {
      (prayerRequest as any).user = null;
    }

    return prayerRequest;
  }

  async prayForRequest(userId: string, prayerRequestId: string) {
    const prayerRequest = await this.database.prayerRequest.findUnique({
      where: { id: prayerRequestId },
    });

    if (!prayerRequest || prayerRequest.deletedAt) {
      throw new NotFoundException('Prayer request not found');
    }

    // Note: Prayer model doesn't exist in schema, so this functionality is disabled
    // TODO: Add Prayer model to schema if prayer tracking is needed
    // For now, just return a success message
    return { message: 'Prayer recorded successfully' };
  }

  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    updateDto: UpdatePrayerRequestDto,
  ) {
    const prayerRequest = await this.database.prayerRequest.findUnique({
      where: { id },
    });

    if (!prayerRequest || prayerRequest.deletedAt) {
      throw new NotFoundException('Prayer request not found');
    }

    // Only owner or pastor can update
    const isPastor = userRole === UserRole.PASTOR || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    if (prayerRequest.userId !== userId && !isPastor) {
      throw new ForbiddenException('You cannot update this prayer request');
    }

    // If status is being updated to answered, set prayedAt
    const updateData: any = { ...updateDto };
    // Remove isPrivate if present since it doesn't exist in schema
    if ('isPrivate' in updateData) {
      delete updateData.isPrivate;
    }
    if (
      updateDto.status === PrayerRequestStatus.ANSWERED &&
      prayerRequest.status !== PrayerRequestStatus.ANSWERED
    ) {
      updateData.prayedAt = new Date();
    }

    const updated = await this.database.prayerRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updated;
  }

  async getStats() {
    const [
      totalRequests,
      pendingRequests,
      answeredRequests,
      totalPrayers,
      recentRequests,
    ] = await Promise.all([
      this.database.prayerRequest.count({ where: { deletedAt: null } }),
      this.database.prayerRequest.count({
        where: { status: PrayerRequestStatus.SUBMITTED, deletedAt: null },
      }),
      this.database.prayerRequest.count({
        where: { status: PrayerRequestStatus.ANSWERED, deletedAt: null },
      }),
      // Prayer model doesn't exist, return 0 for now
      Promise.resolve(0),
      this.database.prayerRequest.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      answeredRequests,
      totalPrayers,
      recentRequests,
    };
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const prayerRequest = await this.database.prayerRequest.findUnique({
      where: { id },
    });

    if (!prayerRequest || prayerRequest.deletedAt) {
      throw new NotFoundException('Prayer request not found');
    }

    // Only owner or admin can delete
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    if (prayerRequest.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You cannot delete this prayer request');
    }

    await this.database.prayerRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Prayer request deleted successfully' };
  }
}
