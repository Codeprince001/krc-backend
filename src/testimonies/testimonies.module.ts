import { Module } from '@nestjs/common';
import { TestimoniesService } from './testimonies.service';
import { TestimoniesController } from './testimonies.controller';

@Module({
  providers: [TestimoniesService],
  controllers: [TestimoniesController]
})
export class TestimoniesModule {}
