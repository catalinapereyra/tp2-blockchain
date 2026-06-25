import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { DocumentsService, CreateDocumentDto } from "./documents.service";
import { WalletAddress } from "../auth/wallet.decorator";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  //devuelve documentos guardados en la base de datos, con filtros opcionales
  @Get()
  findAll(@Query("patient") patient?: string, @Query("emitter") emitter?: string) {
    return this.documentsService.findAll({ patientAddress: patient, emitterAddress: emitter });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }

  //Descarga el archivo (PDF/imagen) guardado en la base de datos
  @Get(":id/file")
  async downloadFile(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const file = await this.documentsService.getFile(id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(Buffer.from(file.fileData));
  }

  //Guarda los metadatos off-chain de un documento desp de que el médico lo registro on-chain
  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }

  //El médico logueado guarda/edita su diagnóstico sobre un documento (off-chain)
  @Put(":id/diagnosis")
  @UseGuards(AuthGuard("jwt"))
  saveDiagnosis(
    @Param("id", ParseIntPipe) id: number,
    @WalletAddress() wallet: string,
    @Body() body: { text: string },
  ) {
    return this.documentsService.upsertDiagnosis(id, wallet, body.text);
  }
}
