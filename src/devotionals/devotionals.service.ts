import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateDevotionalDto,
  UpdateDevotionalDto,
} from './dto/devotional.dto';
import { Prisma } from '@prisma/client';
import { SlugHelper } from '../common/utils/helpers';

@Injectable()
export class DevotionalsService {
  constructor(private database: DatabaseService) {}

  async create(createDevotionalDto: CreateDevotionalDto) {
    const slug = SlugHelper.generate(createDevotionalDto.title);

    // Check if devotional already exists for this date
    const existingDevotional = await this.database.devotional.findFirst({
      where: {
        date: createDevotionalDto.date,
        deletedAt: null,
      },
    });

    if (existingDevotional) {
      throw new ConflictException(
        'A devotional already exists for this date',
      );
    }

    const devotional = await this.database.devotional.create({
      data: {
        slug,
        title: createDevotionalDto.title,
        content: createDevotionalDto.content,
        scripture: createDevotionalDto.bibleVerse || createDevotionalDto.verseReference || '',
        date: createDevotionalDto.date,
        author: createDevotionalDto.author,
        imageUrl: createDevotionalDto.image,
        tags: [],
      },
    });

    return devotional;
  }

  async findAll(page: number = 1, limit: number = 30) {
    const skip = (page - 1) * limit;

    const [devotionals, total] = await Promise.all([
      this.database.devotional.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.database.devotional.count({ where: { deletedAt: null } }),
    ]);

    return {
      devotionals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const devotional = await this.database.devotional.findUnique({
      where: { id },
    });

    if (!devotional || devotional.deletedAt) {
      throw new NotFoundException('Devotional not found');
    }

    // Increment view count
    await this.database.devotional.update({
      where: { id },
        data: { viewCount: { increment: 1 } },
    });

    return devotional;
  }

  async findBySlug(slug: string) {
    const devotional = await this.database.devotional.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!devotional) {
      throw new NotFoundException('Devotional not found');
    }

    // Increment view count
    await this.database.devotional.update({
      where: { id: devotional.id },
        data: { viewCount: { increment: 1 } },
    });

    return devotional;
  }

  async getTodaysDevotional() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const devotional = await this.database.devotional.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        deletedAt: null,
      },
    });

    if (!devotional) {
      throw new NotFoundException('No devotional available for today');
    }

    // Increment view count
    await this.database.devotional.update({
      where: { id: devotional.id },
        data: { viewCount: { increment: 1 } },
    });

    return devotional;
  }

  async getByDate(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const devotional = await this.database.devotional.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        deletedAt: null,
      },
    });

    if (!devotional) {
      throw new NotFoundException('No devotional available for this date');
    }

    return devotional;
  }

  async getByMonth(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const devotionals = await this.database.devotional.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
        deletedAt: null,
      },
      orderBy: { date: 'asc' },
    });

    return devotionals;
  }

  async markAsRead(userId: string, devotionalId: string) {
    const devotional = await this.database.devotional.findUnique({
      where: { id: devotionalId },
    });

    if (!devotional || devotional.deletedAt) {
      throw new NotFoundException('Devotional not found');
    }

    // Upsert read status
    const readStatus = await this.database.devotionalRead.upsert({
      where: {
        userId_devotionalId: {
          userId,
          devotionalId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        userId,
        devotionalId,
      },
    });

    return readStatus;
  }

  async getUserReadHistory(userId: string, page: number = 1, limit: number = 30) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.database.devotionalRead.findMany({
        where: { userId },
        include: {
          devotional: true,
        },
        skip,
        take: limit,
        orderBy: { readAt: 'desc' },
      }),
      this.database.devotionalRead.count({ where: { userId } }),
    ]);

    return {
      history,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStreak(userId: string) {
    const reads = await this.database.devotionalRead.findMany({
      where: { userId },
      orderBy: { readAt: 'desc' },
      take: 365, // Check last year
    });

    if (reads.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check current streak
    const lastRead = new Date(reads[0].readAt);
    lastRead.setHours(0, 0, 0, 0);
    const daysSinceLastRead = Math.floor(
      (today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastRead <= 1) {
      currentStreak = 1;

      for (let i = 1; i < reads.length; i++) {
        const currentDate = new Date(reads[i - 1].readAt);
        currentDate.setHours(0, 0, 0, 0);
        const prevDate = new Date(reads[i].readAt);
        prevDate.setHours(0, 0, 0, 0);

        const dayDiff = Math.floor(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < reads.length; i++) {
      const currentDate = new Date(reads[i - 1].readAt);
      currentDate.setHours(0, 0, 0, 0);
      const prevDate = new Date(reads[i].readAt);
      prevDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      totalDaysRead: reads.length,
    };
  }

  async update(id: string, updateDevotionalDto: UpdateDevotionalDto) {
    await this.findOne(id);

    const updateData: any = { ...updateDevotionalDto };

    if (updateDevotionalDto.title) {
      updateData.slug = SlugHelper.generate(updateDevotionalDto.title);
    }

    if (updateDevotionalDto.date) {
      // Check if another devotional exists for the new date
      const existingDevotional = await this.database.devotional.findFirst({
        where: {
          date: updateDevotionalDto.date,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existingDevotional) {
        throw new ConflictException(
          'A devotional already exists for this date',
        );
      }
    }

    const devotional = await this.database.devotional.update({
      where: { id },
      data: updateData,
    });

    return devotional;
  }

  async getStats() {
    const [totalDevotionals, totalReads, recentDevotionals] = await Promise.all(
      [
        this.database.devotional.count({ where: { deletedAt: null } }),
        this.database.devotional.aggregate({
          where: { deletedAt: null },
          _sum: {
            viewCount: true,
          },
        }),
        this.database.devotional.findMany({
          where: { deletedAt: null },
          take: 5,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            title: true,
            date: true,
            viewCount: true,
          },
        }),
      ],
    );

    return {
      totalDevotionals,
      totalReads: totalReads._sum?.viewCount ? totalReads._sum.viewCount : 0,
      recentDevotionals,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.database.devotional.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Devotional deleted successfully' };
  }
}
