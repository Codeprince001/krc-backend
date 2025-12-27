import { Module } from '@nestjs/common';
import { SermonsService } from './sermons.service';
import { SermonsController } from './sermons.controller';

@Module({
  providers: [SermonsService],
  controllers: [SermonsController]
})
export class SermonsModule {}
