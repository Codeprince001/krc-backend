import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaystackService } from './paystack.service';

@Module({
  providers: [PaymentsService, PaystackService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
