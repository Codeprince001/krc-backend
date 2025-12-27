import { Module } from "@nestjs/common";
import { GivingService } from "./giving.service";
import { GivingController } from "./giving.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [GivingService],
    controllers: [GivingController],
})
export class GivingModule {}
