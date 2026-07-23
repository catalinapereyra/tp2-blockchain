import { Controller, Get, Post, Body, Query, UseGuards, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PrescriptionsService, CreatePrescriptionDto } from "./prescriptions.service";
import { WalletAddress } from "../auth/wallet.decorator";

@Controller("prescriptions")
@UseGuards(AuthGuard("jwt"))
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  //el paciente logueado guarda el texto privado de la receta solicitada
  @Post()
  create(@WalletAddress() wallet: string, @Body() dto: CreatePrescriptionDto) {
    return this.service.create(wallet, dto);
  }

  //recetas por medico o por paciente (texto + nombres off-chain); el filtro tiene que ser el wallet logueado
  @Get()
  list(@WalletAddress() wallet: string, @Query("doctor") doctor?: string, @Query("patient") patient?: string) {
    if (doctor && doctor.toLowerCase() !== wallet.toLowerCase()) {
      throw new ForbiddenException("No podés consultar recetas de otro médico");
    }
    if (patient && patient.toLowerCase() !== wallet.toLowerCase()) {
      throw new ForbiddenException("No podés consultar recetas de otro paciente");
    }
    if (doctor) return this.service.getByDoctor(doctor);
    if (patient) return this.service.getByPatient(patient);
    return [];
  }
}
