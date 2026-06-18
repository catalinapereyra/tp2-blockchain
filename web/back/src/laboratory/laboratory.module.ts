import { Module } from "@nestjs/common";
import { LaboratoryController } from "./laboratory.controller";
import { LaboratoryRepository } from "./laboratory.repository";
import { LaboratoryService } from "./laboratory.service";

@Module({
  controllers: [LaboratoryController],
  providers: [LaboratoryService, LaboratoryRepository],
})
export class LaboratoryModule {}
