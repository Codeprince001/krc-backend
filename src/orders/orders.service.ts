import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  ProcessPaymentDto,
  QueryOrdersDto,
} from './dto/order.dto';
import { OrderStatus, DeliveryType, PaymentStatus, Prisma } from '@prisma/client';
import { OrderNumberHelper } from '../common/utils/helpers';

@Injectable()
export class OrdersService {
  constructor(private database: DatabaseService) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Validate items and calculate totals
    const bookIds = createOrderDto.items.map((item) => item.bookId);
    const books = await this.database.book.findMany({
      where: {
        id: { in: bookIds },
        isActive: true,
      },
    });

    if (books.length !== bookIds.length) {
      throw new BadRequestException('Some books are not available');
    }

    // Check stock availability
    for (const item of createOrderDto.items) {
      const book = books.find((b) => b.id === item.bookId);
      if (!book) {
        throw new BadRequestException(`Book ${item.bookId} not found`);
      }
      if (book.stockQuantity <= 0) {
        throw new BadRequestException(`${book.title} is out of stock`);
      }
      if (book.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${book.title}. Available: ${book.stockQuantity}`,
        );
      }
    }

    // Calculate amounts
    let subtotal = 0;
    const orderItems = createOrderDto.items.map((item) => {
      const book = books.find((b) => b.id === item.bookId);
      if (!book) {
        throw new BadRequestException(`Book ${item.bookId} not found`);
      }
      const price = book.price.toNumber();
      const total = price * item.quantity;
      subtotal += total;

      return {
        bookId: item.bookId,
        quantity: item.quantity,
        price: book.price,
        subtotal: new Prisma.Decimal(total),
      };
    });

    // Calculate delivery fee based on delivery type
    let deliveryFee = 0;
    if (createOrderDto.deliveryType === DeliveryType.HOME_DELIVERY) {
      deliveryFee = 1500; // Fixed delivery fee
    }

    const totalAmount = subtotal + deliveryFee;

    // Generate order number
    const orderNumber = OrderNumberHelper.generate();

    // Create order with items
    const order = await this.database.order.create({
      data: {
        orderNumber,
        userId,
        status: OrderStatus.PENDING,
        subtotal: new Prisma.Decimal(subtotal),
        deliveryFee: new Prisma.Decimal(deliveryFee),
        total: new Prisma.Decimal(totalAmount),
        deliveryType: createOrderDto.deliveryType,
        deliveryAddress: createOrderDto.deliveryAddress,
        deliveryCity: createOrderDto.deliveryCity,
        deliveryState: createOrderDto.deliveryState,
        recipientName: createOrderDto.recipientName,
        recipientPhone: createOrderDto.recipientPhone,
        customerNotes: createOrderDto.customerNotes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
                isDigital: true,
              },
            },
          },
        },
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

    return order;
  }

  async findAll(query: QueryOrdersDto, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.deliveryType) {
      where.deliveryType = query.deliveryType;
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      this.database.order.findMany({
        where,
        include: {
          items: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  author: true,
                  coverImage: true,
                  isDigital: true,
                },
              },
            },
          },
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
      this.database.order.count({ where }),
    ]);

    return {
      orders,
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
    const where: Prisma.OrderWhereInput = {
      userId,
      deletedAt: null,
    };

    const [orders, total] = await Promise.all([
      this.database.order.findMany({
        where,
        include: {
          items: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  author: true,
                  coverImage: true,
                  isDigital: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const where: Prisma.OrderWhereUniqueInput = { id };
    const order = await this.database.order.findUnique({
      where,
      include: {
        items: {
          include: {
            book: true,
          },
        },
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

    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    // If userId provided, verify ownership
    if (userId && order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);

    // Validate status transitions
    this.validateStatusTransition(order.status, updateStatusDto.status);

    const updatedOrder = await this.database.order.update({
      where: { id },
      data: {
        status: updateStatusDto.status,
        adminNotes: updateStatusDto.adminNotes,
        ...(updateStatusDto.status === OrderStatus.PROCESSING && {
          // Processing status
        }),
        ...(updateStatusDto.status === OrderStatus.COMPLETED && {
          completedAt: new Date(),
        }),
        ...(updateStatusDto.status === OrderStatus.CANCELLED && {
          cancelledAt: new Date(),
        }),
      },
      include: {
        items: {
          include: {
            book: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If order is processing, reduce stock
    if (updateStatusDto.status === OrderStatus.PROCESSING) {
      const orderWithItems = await this.database.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (orderWithItems) {
        await this.reduceStock(orderWithItems.items);
      }
    }

    // If order is cancelled, restore stock (if it was previously processing)
    if (
      updateStatusDto.status === OrderStatus.CANCELLED &&
      order.status === OrderStatus.PROCESSING
    ) {
      const orderWithItems = await this.database.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (orderWithItems) {
        await this.restoreStock(orderWithItems.items);
      }
    }

    // TODO: Send notification to user about status change

    return updatedOrder;
  }

  async processPayment(id: string, processPaymentDto: ProcessPaymentDto) {
    const order = await this.findOne(id);

    if (order.paymentStatus === PaymentStatus.SUCCESSFUL) {
      throw new ConflictException('Order is already paid');
    }

    const updatedOrder = await this.database.order.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.SUCCESSFUL,
        paymentMethod: processPaymentDto.paymentMethod,
        paymentRef: processPaymentDto.paymentRef,
        paidAt: new Date(),
      },
      include: {
        items: {
          include: {
            book: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send payment confirmation notification
    // TODO: If all items are digital, grant access immediately

    return updatedOrder;
  }

  async cancel(id: string, userId: string) {
    const order = await this.findOne(id, userId);

    if (
      ![OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(order.status as any)
    ) {
      throw new BadRequestException(
        'Only pending or confirmed orders can be cancelled',
      );
    }

    if (order.paymentStatus === PaymentStatus.SUCCESSFUL) {
      throw new BadRequestException(
        'Cannot cancel paid order. Please request a refund.',
      );
    }

    const updatedOrder = await this.database.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        items: {
          include: {
            book: true,
          },
        },
      },
    });

    // Restore stock if order was confirmed
    if (order.status === OrderStatus.CONFIRMED) {
      await this.restoreStock(order.items);
    }

    return updatedOrder;
  }

  async getStats() {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      paidOrders,
    ] = await Promise.all([
      this.database.order.count({ where: { deletedAt: null } }),
      this.database.order.count({
        where: { status: OrderStatus.PENDING, deletedAt: null },
      }),
      this.database.order.count({
        where: { status: OrderStatus.PROCESSING, deletedAt: null },
      }),
      this.database.order.count({
        where: { status: OrderStatus.COMPLETED, deletedAt: null },
      }),
      this.database.order.count({
        where: { status: OrderStatus.CANCELLED, deletedAt: null },
      }),
      this.database.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.SUCCESSFUL,
          deletedAt: null,
        },
        _sum: {
          total: true,
        },
      }),
      this.database.order.count({
        where: { paymentStatus: PaymentStatus.PAID, deletedAt: null },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      cancelledOrders,
      paidOrders,
      totalRevenue: totalRevenue._sum?.total ? totalRevenue._sum.total.toNumber() : 0,
    };
  }

  async remove(id: string) {
    const order = await this.findOne(id);

    if (order.paymentStatus === PaymentStatus.SUCCESSFUL) {
      throw new BadRequestException('Cannot delete paid order');
    }

    await this.database.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Order deleted successfully' };
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PROCESSING]: [
        OrderStatus.SHIPPED,
        OrderStatus.READY,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.SHIPPED]: [
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY]: [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.DELIVERED]: [
        OrderStatus.COMPLETED,
      ],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async reduceStock(items: any[]) {
    for (const item of items) {
      await this.database.book.update({
        where: { id: item.bookId },
        data: {
          stockQuantity: { decrement: item.quantity },
        },
      });
    }
  }

  private async restoreStock(items: any[]) {
    for (const item of items) {
      await this.database.book.update({
        where: { id: item.bookId },
        data: {
          stockQuantity: { increment: item.quantity },
        },
      });
    }
  }
}
