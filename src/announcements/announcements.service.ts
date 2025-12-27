import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  SearchAnnouncementsDto,
} from './dto/announcement.dto';
import { Prisma } from '@prisma/client';
import { SlugHelper } from '../common/utils/helpers';

@Injectable()
export class AnnouncementsService {
  constructor(private database: DatabaseService) {}

  async create(createAnnouncementDto: CreateAnnouncementDto) {
    const slug = SlugHelper.generate(createAnnouncementDto.title);

    const announcement = await this.database.announcement.create({
      data: {
        ...createAnnouncementDto,
        slug,
      },
    });

    return announcement;
  }

  async findAll(query: SearchAnnouncementsDto, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.AnnouncementWhereInput = {
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    };

    if (query.search) {
      where.AND = {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.isPinned !== undefined) {
      where.isPinned = query.isPinned;
    }

    const [announcements, total] = await Promise.all([
      this.database.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      this.database.announcement.count({ where }),
    ]);

    return {
      announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const announcement = await this.database.announcement.findUnique({
      where: { id },
    });

    if (!announcement || announcement.deletedAt) {
      throw new NotFoundException('Announcement not found');
    }

    // Increment view count
    await this.database.announcement.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return announcement;
  }

  async findBySlug(slug: string) {
    const announcement = await this.database.announcement.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Increment view count
    await this.database.announcement.update({
      where: { id: announcement.id },
      data: { viewCount: { increment: 1 } },
    });

    return announcement;
  }

  async getPinned() {
    const announcements = await this.database.announcement.findMany({
      where: {
        isPinned: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return announcements;
  }

  async getByCategory(category: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      this.database.announcement.findMany({
        where: {
          category: category as any,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.announcement.count({
        where: {
          category: category as any,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      }),
    ]);

    return {
      announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, updateAnnouncementDto: UpdateAnnouncementDto) {
    await this.findOne(id);

    const updateData: any = { ...updateAnnouncementDto };

    if (updateAnnouncementDto.title) {
      updateData.slug = SlugHelper.generate(updateAnnouncementDto.title);
    }

    const announcement = await this.database.announcement.update({
      where: { id },
      data: updateData,
    });

    return announcement;
  }

  async getStats() {
    const [
      totalAnnouncements,
      pinnedAnnouncements,
      activeAnnouncements,
      announcementsByCategory,
    ] = await Promise.all([
      this.database.announcement.count({ where: { deletedAt: null } }),
      this.database.announcement.count({
        where: { isPinned: true, deletedAt: null },
      }),
      this.database.announcement.count({
        where: {
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      }),
      this.database.announcement.groupBy({
        by: ['category'],
        _count: true,
        where: { deletedAt: null },
      }),
    ]);

    return {
      totalAnnouncements,
      pinnedAnnouncements,
      activeAnnouncements,
      announcementsByCategory,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.database.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Announcement deleted successfully' };
  }
}
