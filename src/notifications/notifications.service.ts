import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateNotificationDto,
  SendBulkNotificationDto,
  QueryNotificationsDto,
} from './dto/notification.dto';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private database: DatabaseService) {}

  async create(createDto: CreateNotificationDto) {
    const notification = await this.database.notification.create({
      data: {
        ...createDto,
        message: createDto.body || createDto.title, // Use body as message, fallback to title
      },
    });

    // TODO: Send FCM push notification to user's device
    await this.sendPushNotification(createDto.userId, notification);

    return notification;
  }

  async sendBulkNotification(bulkDto: SendBulkNotificationDto) {
    // Get all active users
    const users = await this.database.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Create notification for each user
    const notifications = await this.database.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title: bulkDto.title,
        body: bulkDto.body,
        message: bulkDto.body || bulkDto.title,
        type: bulkDto.type,
        data: bulkDto.data,
        actionUrl: bulkDto.actionUrl,
      })),
    });

    // TODO: Send FCM push notifications in batches

    return {
      message: `Notification sent to ${users.length} users`,
      count: users.length,
    };
  }

  async findAllByUser(
    userId: string,
    query: QueryNotificationsDto,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
    };

    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.database.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.notification.count({ where }),
      this.database.notification.count({
        where: { userId, readAt: null, deletedAt: null },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.database.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.database.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.database.notification.updateMany({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });

    return { message: 'All notifications marked as read' };
  }

  async remove(id: string, userId: string) {
    const notification = await this.database.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.database.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Notification deleted successfully' };
  }

  private async sendPushNotification(userId: string, notification: any) {
    // Get user's FCM tokens
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });

    if (!user?.fcmTokens || user.fcmTokens.length === 0) {
      return;
    }

    // TODO: Implement FCM push notification
    // const message = {
    //   notification: {
    //     title: notification.title,
    //     body: notification.body,
    //   },
    //   data: notification.data ? JSON.parse(notification.data) : {},
    //   token: user.fcmToken,
    // };
    // await admin.messaging().send(message);
  }
}
