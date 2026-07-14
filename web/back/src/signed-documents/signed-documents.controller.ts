import { Controller, Get, Post, Param, Body, Query, ParseIntPipe, Res, UseGuards, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { SignedDocumentsService, CreateSignedDocumentDto } from "./signed-documents.service";
import { WalletAddress } from "../auth/wallet.decorator";

@Controller("signed-documents")
@UseGuards(AuthGuard("jwt"))
export class SignedDocumentsController {
  constructor(private readonly service: SignedDocumentsService) {}

  //medico logueado firma off-chain y guarda el documento pendiente
  @Post()
  create(@WalletAddress() wallet: string, @Body() dto: CreateSignedDocumentDto) {
    return this.service.create(wallet, dto);
  }

  //docs firmados pendientes de registrar de un paciente (todavía no existen on-chain,
  //por eso la autorización se valida contra el dueño en la base de datos, no contra el contrato)
  @Get()
  getPending(@WalletAddress() wallet: string, @Query("patient") patient: string) {
    if (!patient || patient.toLowerCase() !== wallet.toLowerCase()) {
      throw new ForbiddenException("No podés consultar documentos firmados de otro paciente");
    }
    return this.service.getPendingByPatient(patient);
  }

  //descarga/preview del archivo firmado pendiente
  @Get(":id/file")
  async downloadFile(@WalletAddress() wallet: string, @Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const file = await this.service.getFile(id, wallet);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(Buffer.from(file.fileData));
  }

  //paciente ya registro el documento on-chain, pasamos el archivo a su historial
  @Post(":id/register")
  register(
    @WalletAddress() wallet: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { documentIdOnChain: number },
  ) {
    return this.service.register(wallet, id, body.documentIdOnChain);
  }
}
