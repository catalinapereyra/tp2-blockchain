import { Controller, Get, Post, Param, Body, Query, ParseIntPipe, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { SignedDocumentsService, CreateSignedDocumentDto } from "./signed-documents.service";
import { WalletAddress } from "../auth/wallet.decorator";

@Controller("signed-documents")
export class SignedDocumentsController {
  constructor(private readonly service: SignedDocumentsService) {}

  //medico logueado firma off-chain y guarda el documento pendiente
  @Post()
  @UseGuards(AuthGuard("jwt"))
  create(@WalletAddress() wallet: string, @Body() dto: CreateSignedDocumentDto) {
    return this.service.create(wallet, dto);
  }

  //docs firmados pendientes de registrar de un paciente
  @Get()
  getPending(@Query("patient") patient: string) {
    return this.service.getPendingByPatient(patient);
  }

  //descarga/preview del archivo firmado pendiente
  @Get(":id/file")
  async downloadFile(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const file = await this.service.getFile(id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(Buffer.from(file.fileData));
  }

  //paciente ya registro el documento on-chain, pasamos el archivo a su historial
  @Post(":id/register")
  @UseGuards(AuthGuard("jwt"))
  register(@Param("id", ParseIntPipe) id: number, @Body() body: { documentIdOnChain: number }) {
    return this.service.register(id, body.documentIdOnChain);
  }
}
