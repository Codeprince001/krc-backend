import { Module } from '@nestjs/common';
import { DevotionalsService } from './devotionals.service';
import { DevotionalsController } from './devotionals.controller';

@Module({
  providers: [DevotionalsService],
  controllers: [DevotionalsController]
})
export class DevotionalsModule {}
