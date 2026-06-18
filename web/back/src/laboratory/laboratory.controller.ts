import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CreateLaboratoryStudyDto } from "./dto/create-laboratory-study.dto";
import { LaboratoryService } from "./laboratory.service";

@Controller("laboratory")
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Get("studies")
  findStudies(@Query("emitter") emitterAddress: string) {
    if (!emitterAddress) throw new BadRequestException("emitter es requerido");
    return this.laboratoryService.findStudies(emitterAddress);
  }

  @Post("studies")
  createStudy(@Body() dto: CreateLaboratoryStudyDto) {
    return this.laboratoryService.createStudy(dto);
  }
}
