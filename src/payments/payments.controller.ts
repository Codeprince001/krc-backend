import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
} from './dto/payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() initiateDto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(userId, initiateDto);
  }

  @Post('verify')
  verifyPayment(@Body() verifyDto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(verifyDto);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Body() webhookBody: any,
    @Headers('x-paystack-signature') signature?: string,
    @Req() req?: Request,
  ) {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(webhookBody);
    return this.paymentsService.handleWebhook(webhookBody, signature, rawBody);
  }

  @Get('my-payments')
  findMyPayments(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.paymentsService.findAllByUser(userId, page, limit);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.paymentsService.getStats();
  }
}
