import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Paystack = require('paystack');

@Injectable()
export class PaystackService {
  private readonly paystack: any;
  private readonly logger = new Logger(PaystackService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY not found in environment variables');
    }

    this.paystack = Paystack(secretKey || '');
  }

  /**
   * Initialize a payment transaction
   * @param amount Amount in kobo (smallest currency unit)
   * @param email Customer email
   * @param reference Payment reference
   * @param metadata Additional metadata
   * @returns Payment authorization URL
   */
  async initializeTransaction(
    amount: number,
    email: string,
    reference: string,
    metadata?: Record<string, any>,
  ) {
    try {
      const response = await this.paystack.transaction.initialize({
        amount: amount * 100, // Convert to kobo (Paystack uses kobo for NGN)
        email,
        reference,
        metadata,
        callback_url: this.configService.get<string>(
          'PAYSTACK_CALLBACK_URL',
          `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/api/v1/payments/verify`,
        ),
      });

      if (!response.status) {
        throw new BadRequestException(
          response.message || 'Failed to initialize payment',
        );
      }

      return {
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        reference: response.data.reference,
      };
    } catch (error: any) {
      this.logger.error('Paystack initialization error:', error);
      throw new BadRequestException(
        error.message || 'Failed to initialize payment with Paystack',
      );
    }
  }

  /**
   * Verify a payment transaction
   * @param reference Payment reference
   * @returns Payment verification result
   */
  async verifyTransaction(reference: string) {
    try {
      const response = await this.paystack.transaction.verify(reference);

      if (!response.status) {
        throw new BadRequestException(
          response.message || 'Failed to verify payment',
        );
      }

      const transaction = response.data;

      return {
        success: transaction.status === 'success',
        status: transaction.status,
        amount: transaction.amount / 100, // Convert from kobo to naira
        currency: transaction.currency,
        reference: transaction.reference,
        paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
        customer: {
          email: transaction.customer?.email,
          name: transaction.customer?.first_name
            ? `${transaction.customer.first_name} ${transaction.customer.last_name || ''}`.trim()
            : transaction.customer?.email,
        },
        metadata: transaction.metadata,
      };
    } catch (error: any) {
      this.logger.error('Paystack verification error:', error);
      throw new BadRequestException(
        error.message || 'Failed to verify payment with Paystack',
      );
    }
  }

  /**
   * Verify webhook signature
   * @param signature Paystack webhook signature
   * @param body Raw request body
   * @returns True if signature is valid
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    try {
      const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
      if (!secret) {
        this.logger.warn('PAYSTACK_SECRET_KEY not configured for webhook verification');
        return false;
      }

      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', secret)
        .update(body)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      this.logger.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle Paystack webhook event
   * @param event Webhook event data
   * @returns Processed webhook data
   */
  processWebhookEvent(event: any) {
    const eventType = event.event;
    const data = event.data;

    let status = 'pending';
    let paidAt: Date | null = null;

    switch (eventType) {
      case 'charge.success':
      case 'transaction.success':
        status = 'successful';
        paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
        break;
      case 'charge.failed':
      case 'transaction.failed':
        status = 'failed';
        break;
      default:
        this.logger.warn(`Unhandled webhook event type: ${eventType}`);
    }

    return {
      event: eventType,
      reference: data.reference || data.tx_ref,
      status,
      amount: data.amount ? data.amount / 100 : null, // Convert from kobo
      paidAt,
      customer: data.customer,
      metadata: data.metadata,
    };
  }
}

