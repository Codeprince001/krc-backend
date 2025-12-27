import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UploadMediaDto } from './dto/media.dto';
import { MediaType } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(private database: DatabaseService) {}

  async uploadMedia(
    userId: string,
    uploadDto: UploadMediaDto,
    fileUrl: string,
    fileSize: number,
  ) {
    const media = await this.database.media.create({
      data: {
        userId,
        filename: uploadDto.filename,
        originalName: uploadDto.filename,
        mimeType: 'application/octet-stream', // Should be determined from file
        url: fileUrl,
        type: uploadDto.type,
        size: fileSize,
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

    return media;
  }

  async findAll(type?: MediaType, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (type) {
      where.type = type;
    }

    const [media, total] = await Promise.all([
      this.database.media.findMany({
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
      this.database.media.count({ where }),
    ]);

    return {
      media,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByUser(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [media, total] = await Promise.all([
      this.database.media.findMany({
        where: { userId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.media.count({ where: { userId, deletedAt: null } }),
    ]);

    return {
      media,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [totalMedia, mediaByType, totalSize] = await Promise.all([
      this.database.media.count({ where: { deletedAt: null } }),
      this.database.media.groupBy({
        by: ['type'],
        _count: true,
        where: { deletedAt: null },
      }),
      this.database.media.aggregate({
        where: { deletedAt: null },
        _sum: { size: true },
      }),
    ]);

    return {
      totalMedia,
      mediaByType,
      totalSize: totalSize._sum.size || 0,
    };
  }

  async remove(id: string) {
    await this.database.media.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // TODO: Delete from cloud storage (S3/Cloudinary)

    return { message: 'Media deleted successfully' };
  }
}
