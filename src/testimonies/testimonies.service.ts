import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateTestimonyDto,
  UpdateTestimonyDto,
  SearchTestimoniesDto,
} from './dto/testimony.dto';
import { TestimonyStatus, Prisma, UserRole } from '@prisma/client';
import { SlugHelper } from '../common/utils/helpers';

@Injectable()
export class TestimoniesService {
  constructor(private database: DatabaseService) {}

  async create(userId: string, createDto: CreateTestimonyDto) {
    const slug = SlugHelper.generate(createDto.title);

    const testimony = await this.database.testimony.create({
      data: {
        userId,
        title: createDto.title,
        content: createDto.content,
        imageUrl: createDto.image,
        videoUrl: createDto.videoUrl,
        slug,
        status: TestimonyStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return testimony;
  }

  async findAll(query: SearchTestimoniesDto, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.TestimonyWhereInput = {
      deletedAt: null,
      status: TestimonyStatus.APPROVED, // Only show approved testimonies
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [testimonies, total] = await Promise.all([
      this.database.testimony.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.testimony.count({ where }),
    ]);

    return {
      testimonies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForReview(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [testimonies, total] = await Promise.all([
      this.database.testimony.findMany({
        where: {
          status: TestimonyStatus.PENDING,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.testimony.count({
        where: { status: TestimonyStatus.PENDING, deletedAt: null },
      }),
    ]);

    return {
      testimonies,
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

    const [testimonies, total] = await Promise.all([
      this.database.testimony.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.testimony.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      testimonies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const testimony = await this.database.testimony.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!testimony || testimony.deletedAt) {
      throw new NotFoundException('Testimony not found');
    }

    // Increment view count
    await this.database.testimony.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return testimony;
  }

  async findBySlug(slug: string) {
    const testimony = await this.database.testimony.findFirst({
      where: { slug, deletedAt: null, status: TestimonyStatus.APPROVED },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!testimony) {
      throw new NotFoundException('Testimony not found');
    }

    // Increment view count
    await this.database.testimony.update({
      where: { id: testimony.id },
      data: { viewCount: { increment: 1 } },
    });

    return testimony;
  }

  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    updateDto: UpdateTestimonyDto,
  ) {
    const testimony = await this.database.testimony.findUnique({
      where: { id },
    });

    if (!testimony || testimony.deletedAt) {
      throw new NotFoundException('Testimony not found');
    }

    // Check permissions
    const isPastor = userRole === UserRole.PASTOR || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isOwner = testimony.userId === userId;

    if (!isOwner && !isPastor) {
      throw new ForbiddenException(
        'You do not have permission to update this testimony',
      );
    }

    // Only pastors can approve/reject
    if (updateDto.status && !isPastor) {
      throw new ForbiddenException('Only pastors can approve/reject testimonies');
    }

    const updateData: any = { ...updateDto };

    if (updateDto.title) {
      updateData.slug = SlugHelper.generate(updateDto.title);
    }

    if (updateDto.status === TestimonyStatus.APPROVED) {
      updateData.approvedAt = new Date();
    }

    const updatedTestimony = await this.database.testimony.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // TODO: Send notification to user about approval/rejection

    return updatedTestimony;
  }

  async getStats() {
    const [
      totalTestimonies,
      pendingTestimonies,
      approvedTestimonies,
      rejectedTestimonies,
    ] = await Promise.all([
      this.database.testimony.count({ where: { deletedAt: null } }),
      this.database.testimony.count({
        where: { status: TestimonyStatus.PENDING, deletedAt: null },
      }),
      this.database.testimony.count({
        where: { status: TestimonyStatus.APPROVED, deletedAt: null },
      }),
      this.database.testimony.count({
        where: { status: TestimonyStatus.REJECTED, deletedAt: null },
      }),
    ]);

    return {
      totalTestimonies,
      pendingTestimonies,
      approvedTestimonies,
      rejectedTestimonies,
    };
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const testimony = await this.database.testimony.findUnique({
      where: { id },
    });

    if (!testimony || testimony.deletedAt) {
      throw new NotFoundException('Testimony not found');
    }

    // Check permissions
    const isPastor = userRole === UserRole.PASTOR || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isOwner = testimony.userId === userId;

    if (!isOwner && !isPastor) {
      throw new ForbiddenException(
        'You do not have permission to delete this testimony',
      );
    }

    await this.database.testimony.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Testimony deleted successfully' };
  }
}
