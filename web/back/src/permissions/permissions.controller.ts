import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PermissionsService } from "./permissions.service";

@Controller("permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get("doctor/:doctorAddress")
  getByDoctor(@Param("doctorAddress") doctorAddress: string) {
    return this.permissionsService.getByDoctor(doctorAddress);
  }

  @Get("shared")
  getShared(@Query("patient") patient: string, @Query("doctor") doctor: string) {
    return this.permissionsService.getShared(patient, doctor);
  }

  @Get(":patientAddress")
  getByPatient(@Param("patientAddress") patientAddress: string) {
    return this.permissionsService.getByPatient(patientAddress);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"))
  grant(@Body() body: { patientAddress: string; doctorAddress: string; documentIdOnChain: number }) {
    return this.permissionsService.grant(body.patientAddress, body.doctorAddress, body.documentIdOnChain);
  }

  //agregar un medico a "mis medicos" sin compartir documentos
  @Post("doctor")
  @UseGuards(AuthGuard("jwt"))
  addDoctor(@Body() body: { patientAddress: string; doctorAddress: string }) {
    return this.permissionsService.addDoctor(body.patientAddress, body.doctorAddress);
  }

  @Delete("doctor")
  @UseGuards(AuthGuard("jwt"))
  removeDoctor(@Body() body: { patientAddress: string; doctorAddress: string }) {
    return this.permissionsService.removeDoctor(body.patientAddress, body.doctorAddress);
  }

  @Delete()
  @UseGuards(AuthGuard("jwt"))
  revoke(@Body() body: { patientAddress: string; doctorAddress: string; documentIdOnChain: number }) {
    return this.permissionsService.revoke(body.patientAddress, body.doctorAddress, body.documentIdOnChain);
  }
}
