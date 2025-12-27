import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RecordGivingDto, QueryGivingDto } from './dto/giving.dto';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class GivingService {
  constructor(private database: DatabaseService) {}

  async recordGiving(userId: string, recordDto: RecordGivingDto) {
    const giving = await this.database.givingRecord.create({
      data: {
        userId,
        amount: new Prisma.Decimal(recordDto.amount),
        category: recordDto.category,
        paymentMethod: recordDto.paymentMethod,
        paymentRef: recordDto.paymentRef,
        notes: recordDto.notes,
        givenDate: recordDto.givenDate || new Date(),
        isAnonymous: recordDto.isAnonymous || false,
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

    return giving;
  }

  async findAll(query: QueryGivingDto, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const where: Prisma.GivingRecordWhereInput = {
      deletedAt: null,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.startDate || query.endDate) {
      where.givenDate = {};
      if (query.startDate) {
        where.givenDate.gte = query.startDate;
      }
      if (query.endDate) {
        where.givenDate.lte = query.endDate;
      }
    }

    const [records, total] = await Promise.all([
      this.database.givingRecord.findMany({
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
        orderBy: { givenDate: 'desc' },
      }),
      this.database.givingRecord.count({ where }),
    ]);

    const sanitizedRecords = records.map((record) => {
      if (record.isAnonymous) {
        return {
          ...record,
          user: { id: record.user.id, firstName: 'Anonymous', lastName: '' },
        };
      }
      return record;
    });

    return {
      records: sanitizedRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllByUser(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.database.givingRecord.findMany({
        where: { userId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { givenDate: 'desc' },
      }),
      this.database.givingRecord.count({ where: { userId, deletedAt: null } }),
    ]);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats(userId: string) {
    const [totalGiving, givingByCategory] = await Promise.all([
      this.database.givingRecord.aggregate({
        where: { userId, deletedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.database.givingRecord.groupBy({
        by: ['category'],
        where: { userId, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalAmount: totalGiving._sum.amount || 0,
      totalCount: totalGiving._count,
      givingByCategory,
    };
  }

  async getStats(query: QueryGivingDto) {
    const where: Prisma.GivingRecordWhereInput = { deletedAt: null };

    if (query.startDate || query.endDate) {
      where.givenDate = {};
      if (query.startDate) {
        where.givenDate.gte = query.startDate;
      }
      if (query.endDate) {
        where.givenDate.lte = query.endDate;
      }
    }

    const [totalGiving, givingByCategory] = await Promise.all([
      this.database.givingRecord.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.database.givingRecord.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalAmount: totalGiving._sum.amount || 0,
      totalCount: totalGiving._count,
      givingByCategory,
    };
  }

  async remove(id: string) {
    await this.database.givingRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Giving record deleted successfully' };
  }
}
