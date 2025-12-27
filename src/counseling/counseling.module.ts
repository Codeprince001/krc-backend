import { Module } from '@nestjs/common';
import { CounselingService } from './counseling.service';
import { CounselingController } from './counseling.controller';

@Module({
  providers: [CounselingService],
  controllers: [CounselingController]
})
export class CounselingModule {}
