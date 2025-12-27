import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  UserRole,
  OrderStatus,
  PaymentStatus,
  PrayerRequestStatus,
  TestimonyStatus,
  CounselingStatus,
} from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private database: DatabaseService) {}

  async getDashboardStats() {
    const [
      // Users
      totalUsers,
      activeUsers,
      usersByRole,
      recentUsers,
      
      // Orders & Books
      totalOrders,
      pendingOrders,
      totalRevenue,
      recentOrders,
      totalBooks,
      lowStockBooks,
      
      // Content
      totalSermons,
      totalDevotionals,
      totalAnnouncements,
      upcomingEvents,
      
      // Community
      totalPrayerRequests,
      pendingPrayerRequests,
      totalTestimonies,
      pendingTestimonies,
      totalGroups,
      
      // Counseling
      scheduledCounseling,
      completedCounseling,
      
      // Giving
      totalGiving,
      monthlyGiving,
      
      // Payments
      successfulPayments,
      paymentRevenue,
    ] = await Promise.all([
      // Users
      this.database.user.count(),
      this.database.user.count({ where: { isActive: true } }),
      this.database.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.database.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      
      // Orders & Books
      this.database.order.count({ where: { deletedAt: null } }),
      this.database.order.count({
        where: { status: OrderStatus.PENDING, deletedAt: null },
      }),
      this.database.order.aggregate({
        where: { paymentStatus: PaymentStatus.SUCCESSFUL, deletedAt: null },
        _sum: { total: true },
      }),
      this.database.order.findMany({
        take: 5,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.database.book.count({ where: { deletedAt: null } }),
      this.database.book.count({
        where: { stockQuantity: { lt: 10 }, deletedAt: null },
      }),
      
      // Content
      this.database.sermon.count({ where: { deletedAt: null } }),
      this.database.devotional.count({ where: { deletedAt: null } }),
      this.database.announcement.count({ where: { deletedAt: null } }),
      this.database.event.count({
        where: { startDate: { gte: new Date() }, deletedAt: null },
      }),
      
      // Community
      this.database.prayerRequest.count({ where: { deletedAt: null } }),
      this.database.prayerRequest.count({
        where: { status: PrayerRequestStatus.SUBMITTED, deletedAt: null },
      }),
      this.database.testimony.count({ where: { deletedAt: null } }),
      this.database.testimony.count({
        where: { status: TestimonyStatus.PENDING, deletedAt: null },
      }),
      this.database.group.count({ where: { deletedAt: null } }),
      
      // Counseling
      this.database.counselingBooking.count({
        where: { status: CounselingStatus.SCHEDULED },
      }),
      this.database.counselingBooking.count({
        where: { status: CounselingStatus.COMPLETED },
      }),
      
      // Giving
      this.database.givingRecord.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.database.givingRecord.aggregate({
        where: {
          givenDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      
      // Payments
      this.database.payment.count({
        where: { status: PaymentStatus.SUCCESSFUL },
      }),
      this.database.payment.aggregate({
        where: { status: PaymentStatus.SUCCESSFUL },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: usersByRole,
        recent: recentUsers,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        revenue: totalRevenue._sum?.total ? totalRevenue._sum.total.toNumber() : 0,
        recent: recentOrders,
      },
      books: {
        total: totalBooks,
        lowStock: lowStockBooks,
      },
      content: {
        sermons: totalSermons,
        devotionals: totalDevotionals,
        announcements: totalAnnouncements,
        upcomingEvents,
      },
      community: {
        prayerRequests: {
          total: totalPrayerRequests,
          pending: pendingPrayerRequests,
        },
        testimonies: {
          total: totalTestimonies,
          pending: pendingTestimonies,
        },
        groups: totalGroups,
      },
      counseling: {
        scheduled: scheduledCounseling,
        completed: completedCounseling,
      },
      giving: {
        total: totalGiving._sum.amount || 0,
        count: totalGiving._count,
        monthly: monthlyGiving._sum.amount || 0,
      },
      payments: {
        successful: successfulPayments,
        revenue: paymentRevenue._sum.amount || 0,
      },
    };
  }

  async getUserAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalUsers, usersByRole, usersByMonth, activeUsers] =
      await Promise.all([
        this.database.user.count({ where }),
        this.database.user.groupBy({
          by: ['role'],
          where,
          _count: true,
        }),
        this.database.user.groupBy({
          by: ['createdAt'],
          where,
          _count: true,
        }),
        this.database.user.count({
          where: { ...where, isActive: true },
        }),
      ]);

    return {
      total: totalUsers,
      active: activeUsers,
      byRole: usersByRole,
      growth: usersByMonth,
    };
  }

  async getRevenueAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = { deletedAt: null };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      orderRevenue,
      orderCount,
      givingRevenue,
      givingCount,
      paymentRevenue,
      revenueByMonth,
    ] = await Promise.all([
      this.database.order.aggregate({
        where: { ...where, paymentStatus: PaymentStatus.SUCCESSFUL },
        _sum: { total: true },
      }),
      this.database.order.count({
        where: { ...where, paymentStatus: PaymentStatus.SUCCESSFUL },
      }),
      this.database.givingRecord.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.database.givingRecord.count({ where }),
      this.database.payment.aggregate({
        where: { status: PaymentStatus.SUCCESSFUL },
        _sum: { amount: true },
      }),
      this.database.order.groupBy({
        by: ['createdAt'],
        where: { ...where, paymentStatus: PaymentStatus.SUCCESSFUL },
        _sum: { total: true },
      }),
    ]);

    return {
      orders: {
        revenue: orderRevenue._sum?.total ? orderRevenue._sum.total.toNumber() : 0,
        count: orderCount,
      },
      giving: {
        revenue: givingRevenue._sum.amount || 0,
        count: givingCount,
      },
      payments: {
        revenue: paymentRevenue._sum.amount || 0,
      },
      total:
        Number(orderRevenue._sum?.total ? orderRevenue._sum.total.toNumber() : 0) +
        Number(givingRevenue._sum.amount || 0),
      byMonth: revenueByMonth,
    };
  }

  async getContentAnalytics() {
    const [
      sermonStats,
      devotionalStats,
      announcementStats,
      eventStats,
      topSermons,
      topDevotionals,
    ] = await Promise.all([
      this.database.sermon.aggregate({
        where: { deletedAt: null },
        _count: true,
        _sum: { viewCount: true },
      }),
      this.database.devotional.aggregate({
        where: { deletedAt: null },
        _count: true,
        _sum: { readCount: true },
      }),
      this.database.announcement.aggregate({
        where: { deletedAt: null },
        _count: true,
        _sum: { viewCount: true },
      }),
      this.database.event.aggregate({
        where: { deletedAt: null },
        _count: true,
      }),
      this.database.sermon.findMany({
        take: 5,
        where: { deletedAt: null },
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          preacher: true,
          viewCount: true,
        },
      }),
      this.database.devotional.findMany({
        take: 5,
        where: { deletedAt: null },
        orderBy: { readCount: 'desc' },
        select: {
          id: true,
          title: true,
          author: true,
          readCount: true,
          date: true,
        },
      }),
    ]);

    return {
      sermons: {
        total: sermonStats._count,
        totalViews: sermonStats._sum.viewCount || 0,
        top: topSermons,
      },
      devotionals: {
        total: devotionalStats._count,
        totalReads: devotionalStats._sum.readCount || 0,
        top: topDevotionals,
      },
      announcements: {
        total: announcementStats._count,
        totalViews: announcementStats._sum.viewCount || 0,
      },
      events: {
        total: eventStats._count,
      },
    };
  }

  async getCommunityAnalytics() {
    const [
      prayerStats,
      testimonyStats,
      groupStats,
      topGroups,
      recentTestimonies,
    ] = await Promise.all([
      this.database.prayerRequest.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.database.testimony.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.database.group.aggregate({
        where: { deletedAt: null },
        _count: true,
      }),
      this.database.group.findMany({
        take: 5,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
      }),
      this.database.testimony.findMany({
        take: 5,
        where: { status: TestimonyStatus.PENDING, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      prayerRequests: {
        byStatus: prayerStats,
      },
      testimonies: {
        byStatus: testimonyStats,
        pendingReview: recentTestimonies,
      },
      groups: {
        total: groupStats._count,
        top: topGroups,
      },
    };
  }

  async getSystemHealth() {
    const [
      databaseSize,
      totalRecords,
      recentErrors,
    ] = await Promise.all([
      // Database metrics
      this.database.$queryRaw`SELECT pg_database_size(current_database()) as size`,
      
      // Count all records across main tables
      Promise.all([
        this.database.user.count(),
        this.database.book.count(),
        this.database.order.count(),
        this.database.sermon.count(),
        this.database.devotional.count(),
        this.database.event.count(),
      ]).then((counts) => counts.reduce((sum, count) => sum + count, 0)),
      
      // Recent activity
      this.database.user.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          email: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      database: {
        size: databaseSize,
        totalRecords,
      },
      recentActivity: recentErrors,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  async getActivityLog(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    // Combine recent activities from multiple tables
    const [
      recentUsers,
      recentOrders,
      recentPrayerRequests,
      recentTestimonies,
    ] = await Promise.all([
      this.database.user.findMany({
        take: limit / 4,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
      }),
      this.database.order.findMany({
        take: limit / 4,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.database.prayerRequest.findMany({
        take: limit / 4,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.database.testimony.findMany({
        take: limit / 4,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const activities = [
      ...recentUsers.map((u) => ({
        type: 'USER_REGISTERED',
        description: `${u.firstName} ${u.lastName} registered`,
        timestamp: u.createdAt,
        metadata: { email: u.email },
      })),
      ...recentOrders.map((o) => ({
        type: 'ORDER_CREATED',
        description: `Order ${o.orderNumber} by ${o.user.firstName} ${o.user.lastName}`,
        timestamp: o.createdAt,
        metadata: { total: o.total.toNumber() },
      })),
      ...recentPrayerRequests.map((p) => ({
        type: 'PRAYER_REQUEST',
        description: `Prayer request: ${p.title}`,
        timestamp: p.createdAt,
        metadata: { status: p.status },
      })),
      ...recentTestimonies.map((t) => ({
        type: 'TESTIMONY_SUBMITTED',
        description: `Testimony: ${t.title}`,
        timestamp: t.createdAt,
        metadata: { status: t.status },
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(skip, skip + limit);

    return {
      activities,
      pagination: {
        page,
        limit,
        total: activities.length,
      },
    };
  }
}
