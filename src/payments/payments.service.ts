import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  WebhookPayloadDto,
} from './dto/payment.dto';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PaystackService } from './paystack.service';

@Injectable()
export class PaymentsService {
  constructor(
    private database: DatabaseService,
    private paystackService: PaystackService,
  ) {}

  async initiatePayment(userId: string, initiateDto: InitiatePaymentDto) {
    // Only process Paystack payments
    if (initiateDto.paymentMethod !== 'PAYSTACK') {
      throw new BadRequestException(
        'Only Paystack payment method is currently supported',
      );
    }

    // Get user details for payment
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate payment reference
    const paymentRef = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = await this.database.payment.create({
      data: {
        userId,
        amount: new Prisma.Decimal(initiateDto.amount),
        paymentMethod: initiateDto.paymentMethod,
        paymentRef,
        purpose: initiateDto.purpose,
        referenceId: initiateDto.referenceId,
        metadata: initiateDto.metadata,
        status: PaymentStatus.PENDING,
      },
    });

    // Initialize Paystack transaction
    const metadata: Record<string, any> = {
      userId,
      paymentId: payment.id,
      purpose: initiateDto.purpose,
    };

    if (initiateDto.referenceId) {
      metadata.referenceId = initiateDto.referenceId;
    }

    if (initiateDto.metadata) {
      try {
        const customMetadata = JSON.parse(initiateDto.metadata);
        Object.assign(metadata, customMetadata);
      } catch (error) {
        // If metadata is not valid JSON, ignore it
      }
    }

    const paystackResponse = await this.paystackService.initializeTransaction(
      initiateDto.amount,
      user.email,
      paymentRef,
      metadata,
    );

    return {
      payment,
      authorizationUrl: paystackResponse.authorizationUrl,
      accessCode: paystackResponse.accessCode,
      reference: paystackResponse.reference,
      message: 'Payment initiated successfully',
    };
  }

  async verifyPayment(verifyDto: VerifyPaymentDto) {
    const payment = await this.database.payment.findFirst({
      where: { paymentRef: verifyDto.paymentRef },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify with Paystack
    const verificationResult = await this.paystackService.verifyTransaction(
      verifyDto.paymentRef,
    );

    // Map Paystack status to our PaymentStatus
    let status: PaymentStatus;
    if (verificationResult.success) {
      status = PaymentStatus.SUCCESSFUL;
    } else if (verificationResult.status === 'failed') {
      status = PaymentStatus.FAILED;
    } else {
      status = PaymentStatus.PENDING;
    }

    // Update payment status
    const updatedPayment = await this.database.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...(verificationResult.success && verificationResult.paidAt
          ? { paidAt: verificationResult.paidAt }
          : {}),
      },
    });

    return {
      payment: updatedPayment,
      verification: verificationResult,
    };
  }

  async handleWebhook(
    webhookBody: any,
    signature?: string,
    rawBody?: string,
  ) {
    // Validate webhook signature if provided
    if (signature && rawBody) {
      const isValid = this.paystackService.verifyWebhookSignature(
        signature,
        rawBody,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Process webhook event using Paystack service
    const processedEvent = this.paystackService.processWebhookEvent(webhookBody);

    if (!processedEvent.reference) {
      throw new BadRequestException('Payment reference not found in webhook');
    }

    const payment = await this.database.payment.findFirst({
      where: { paymentRef: processedEvent.reference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Map processed status to PaymentStatus
    let status: PaymentStatus;
    if (processedEvent.status === 'successful') {
      status = PaymentStatus.SUCCESSFUL;
    } else if (processedEvent.status === 'failed') {
      status = PaymentStatus.FAILED;
    } else {
      status = PaymentStatus.PENDING;
    }

    // Update payment status
    const updatedPayment = await this.database.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...(status === PaymentStatus.SUCCESSFUL && processedEvent.paidAt
          ? { paidAt: processedEvent.paidAt }
          : {}),
      },
    });

    // TODO: Handle post-payment actions (e.g., update order status, send confirmation)

    return { status: 'success', payment: updatedPayment };
  }

  async findAllByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.database.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.payment.count({ where: { userId } }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [totalPayments, successfulPayments, totalRevenue, recentPayments] =
      await Promise.all([
        this.database.payment.count(),
        this.database.payment.count({
          where: { status: PaymentStatus.SUCCESSFUL },
        }),
        this.database.payment.aggregate({
          where: { status: PaymentStatus.SUCCESSFUL },
          _sum: { amount: true },
        }),
        this.database.payment.findMany({
          where: { status: PaymentStatus.SUCCESSFUL },
          take: 10,
          orderBy: { paidAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

    return {
      totalPayments,
      successfulPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentPayments,
    };
  }
}
