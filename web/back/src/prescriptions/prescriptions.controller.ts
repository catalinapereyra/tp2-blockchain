import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PrescriptionsService, CreatePrescriptionDto } from "./prescriptions.service";
import { WalletAddress } from "../auth/wallet.decorator";

@Controller("prescriptions")
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  // El paciente logueado guarda el texto privado de la receta solicitada
  @Post()
  @UseGuards(AuthGuard("jwt"))
  create(@WalletAddress() wallet: string, @Body() dto: CreatePrescriptionDto) {
    return this.service.create(wallet, dto);
  }

  // Recetas por médico o por paciente (texto + nombres off-chain)
  @Get()
  list(@Query("doctor") doctor?: string, @Query("patient") patient?: string) {
    if (doctor) return this.service.getByDoctor(doctor);
    if (patient) return this.service.getByPatient(patient);
    return [];
  }
}
