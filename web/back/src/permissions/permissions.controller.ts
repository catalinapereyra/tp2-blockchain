import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PermissionsService } from "./permissions.service";
import { WalletAddress } from "../auth/wallet.decorator";

@Controller("permissions")
@UseGuards(AuthGuard("jwt"))
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get("doctor/:doctorAddress")
  getByDoctor(@WalletAddress() wallet: string, @Param("doctorAddress") doctorAddress: string) {
    if (wallet !== doctorAddress.toLowerCase()) {
      throw new ForbiddenException("No podés consultar permisos de otro médico");
    }
    return this.permissionsService.getByDoctor(doctorAddress);
  }

  @Get("shared")
  getShared(@WalletAddress() wallet: string, @Query("patient") patient: string, @Query("doctor") doctor: string) {
    if (wallet !== patient.toLowerCase() && wallet !== doctor.toLowerCase()) {
      throw new ForbiddenException("No podés consultar esta relación");
    }
    return this.permissionsService.getShared(patient, doctor);
  }

  @Get(":patientAddress")
  getByPatient(@WalletAddress() wallet: string, @Param("patientAddress") patientAddress: string) {
    if (wallet !== patientAddress.toLowerCase()) {
      throw new ForbiddenException("No podés consultar permisos de otro paciente");
    }
    return this.permissionsService.getByPatient(patientAddress);
  }

  @Post()
  grant(@WalletAddress() wallet: string, @Body() body: { doctorAddress: string; documentIdOnChain: number }) {
    return this.permissionsService.grant(wallet, body.doctorAddress, body.documentIdOnChain);
  }

  //agregar un medico a "mis medicos" sin compartir documentos
  @Post("doctor")
  addDoctor(@WalletAddress() wallet: string, @Body() body: { doctorAddress: string }) {
    return this.permissionsService.addDoctor(wallet, body.doctorAddress);
  }

  @Delete("doctor")
  removeDoctor(@WalletAddress() wallet: string, @Body() body: { doctorAddress: string }) {
    return this.permissionsService.removeDoctor(wallet, body.doctorAddress);
  }

  @Delete()
  revoke(@WalletAddress() wallet: string, @Body() body: { doctorAddress: string; documentIdOnChain: number }) {
    return this.permissionsService.revoke(wallet, body.doctorAddress, body.documentIdOnChain);
  }
}
