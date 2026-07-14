import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CreateLaboratoryStudyDto } from "./dto/create-laboratory-study.dto";
import { LaboratoryService } from "./laboratory.service";
import { WalletAddress } from "../auth/wallet.decorator";

@Controller("laboratory")
@UseGuards(AuthGuard("jwt"))
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Get("studies")
  findStudies(@Query("emitter") emitterAddress: string) {
    if (!emitterAddress) throw new BadRequestException("emitter es requerido");
    return this.laboratoryService.findStudies(emitterAddress);
  }

  @Post("studies")
  createStudy(@WalletAddress() wallet: string, @Body() dto: CreateLaboratoryStudyDto) {
    return this.laboratoryService.createStudy(wallet, dto);
  }
}
