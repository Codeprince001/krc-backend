import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateSermonDto,
  UpdateSermonDto,
  TrackSermonProgressDto,
  SearchSermonsDto,
} from './dto/sermon.dto';
import { Prisma } from '@prisma/client';
import { SlugHelper } from '../common/utils/helpers';

@Injectable()
export class SermonsService {
  constructor(private database: DatabaseService) {}

  async create(createSermonDto: CreateSermonDto) {
    const slug = SlugHelper.generate(createSermonDto.title);

    // Find or create sermon category by type
    const category = await this.database.sermonCategory.findFirst({
      where: { slug: createSermonDto.category.toLowerCase() },
    });
    
    if (!category) {
      throw new NotFoundException(`Sermon category not found for type: ${createSermonDto.category}`);
    }

    const sermon = await this.database.sermon.create({
      data: {
        title: createSermonDto.title,
        description: createSermonDto.description,
        slug,
        categoryId: category.id,
        preacher: createSermonDto.speaker,
        scripture: createSermonDto.bibleReference,
        videoUrl: createSermonDto.videoUrl,
        audioUrl: createSermonDto.audioUrl,
        thumbnailUrl: createSermonDto.thumbnail,
        duration: createSermonDto.duration,
        isFeatured: createSermonDto.isFeatured,
      },
    });

    return sermon;
  }

  async findAll(query: SearchSermonsDto, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.SermonWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { preacher: { contains: query.search, mode: 'insensitive' } },
        { scripture: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      // Filter by category - need to find categoryId
      const category = await this.database.sermonCategory.findFirst({
        where: { slug: query.category.toLowerCase() },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (query.speaker) {
      where.preacher = { contains: query.speaker, mode: 'insensitive' };
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    const [sermons, total] = await Promise.all([
      this.database.sermon.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
      this.database.sermon.count({ where }),
    ]);

    return {
      sermons,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const sermon = await this.database.sermon.findUnique({
      where: { id },
    });

    if (!sermon || sermon.deletedAt) {
      throw new NotFoundException('Sermon not found');
    }

    // Increment view count
    await this.database.sermon.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return sermon;
  }

  async findBySlug(slug: string) {
    const sermon = await this.database.sermon.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!sermon) {
      throw new NotFoundException('Sermon not found');
    }

    // Increment view count
    await this.database.sermon.update({
      where: { id: sermon.id },
      data: { viewCount: { increment: 1 } },
    });

    return sermon;
  }

  async getFeatured(limit: number = 10) {
    const sermons = await this.database.sermon.findMany({
      where: {
        isFeatured: true,
        deletedAt: null,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return sermons;
  }

  async getLatest(limit: number = 10) {
    const sermons = await this.database.sermon.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return sermons;
  }

  async getPopular(limit: number = 10) {
    const sermons = await this.database.sermon.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy: { viewCount: 'desc' },
    });

    return sermons;
  }

  async trackProgress(userId: string, trackDto: TrackSermonProgressDto) {
    const sermon = await this.database.sermon.findUnique({
      where: { id: trackDto.sermonId },
    });

    if (!sermon) {
      throw new NotFoundException('Sermon not found');
    }

    // Upsert progress
    const progress = await this.database.sermonProgress.upsert({
      where: {
        userId_sermonId: {
          userId,
          sermonId: trackDto.sermonId,
        },
      },
      update: {
        watchedDuration: trackDto.watchedDuration,
        completed: sermon.duration
          ? trackDto.watchedDuration >= sermon.duration * 0.9
          : false, // 90% completion
      },
      create: {
        userId,
        sermonId: trackDto.sermonId,
        watchedDuration: trackDto.watchedDuration,
        completed: sermon.duration
          ? trackDto.watchedDuration >= sermon.duration * 0.9
          : false,
      },
    });

    return progress;
  }

  async getUserProgress(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [progress, total] = await Promise.all([
      this.database.sermonProgress.findMany({
        where: { userId },
        include: {
          sermon: true,
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.database.sermonProgress.count({ where: { userId } }),
    ]);

    return {
      progress,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, updateSermonDto: UpdateSermonDto) {
    await this.findOne(id);

    const updateData: any = { ...updateSermonDto };

    if (updateSermonDto.title) {
      updateData.slug = SlugHelper.generate(updateSermonDto.title);
    }

    const sermon = await this.database.sermon.update({
      where: { id },
      data: updateData,
    });

    return sermon;
  }

  async getStats() {
    const [
      totalSermons,
      featuredSermons,
      totalViews,
      sermonsByCategory,
      topSermons,
    ] = await Promise.all([
      this.database.sermon.count({ where: { deletedAt: null } }),
      this.database.sermon.count({
        where: { isFeatured: true, deletedAt: null },
      }),
      this.database.sermon.aggregate({
        where: { deletedAt: null },
        _sum: {
          viewCount: true,
        },
      }),
      this.database.sermon.groupBy({
        by: ['categoryId'],
        _count: true,
        where: { deletedAt: null },
      }),
      this.database.sermon.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          preacher: true,
          viewCount: true,
        },
      }),
    ]);

    return {
      totalSermons,
      featuredSermons,
      totalViews: totalViews._sum.viewCount || 0,
      sermonsByCategory,
      topSermons,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.database.sermon.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Sermon deleted successfully' };
  }
}
