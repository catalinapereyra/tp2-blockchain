import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, Res, UseGuards, ForbiddenException, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { DocumentsService, CreateDocumentDto } from "./documents.service";
import { WalletAddress } from "../auth/wallet.decorator";
import { BlockchainService } from "../blockchain/blockchain.service";

@Controller("documents")
@UseGuards(AuthGuard("jwt"))
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly blockchainService: BlockchainService,
  ) {}

  //devuelve documentos guardados en la base de datos; el filtro tiene que ser el wallet logueado
  @Get()
  findAll(@WalletAddress() wallet: string, @Query("patient") patient?: string, @Query("emitter") emitter?: string) {
    if (!patient && !emitter) {
      throw new ForbiddenException("Falta indicar patient o emitter");
    }
    if (patient && patient.toLowerCase() !== wallet.toLowerCase()) {
      throw new ForbiddenException("No podés consultar documentos de otro paciente");
    }
    if (emitter && emitter.toLowerCase() !== wallet.toLowerCase()) {
      throw new ForbiddenException("No podés consultar documentos de otro emisor");
    }
    return this.documentsService.findAll({ patientAddress: patient, emitterAddress: emitter });
  }

  //recupera un flujo de subida cortado a mitad de camino: si el hash ya está registrado
  //on-chain para ese paciente, devuelve el documentIdOnChain y si su metadata ya se guardó,
  //para que el frontend pueda completar el paso que falló sin repetir la transacción
  @Get("lookup")
  async lookupByHash(@Query("patient") patient: string, @Query("hash") hash: string) {
    if (!patient || !hash) {
      throw new BadRequestException("Faltan patient o hash");
    }
    return this.documentsService.findByHash(patient, hash);
  }

  @Get(":id")
  async findOne(@WalletAddress() wallet: string, @Param("id", ParseIntPipe) id: number) {
    await this.assertOnChainAccess(id, wallet);
    return this.documentsService.findOne(id);
  }

  //Descarga el archivo (PDF/imagen) guardado en la base de datos
  @Get(":id/file")
  async downloadFile(@WalletAddress() wallet: string, @Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    await this.assertOnChainAccess(id, wallet);
    const file = await this.documentsService.getFile(id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(Buffer.from(file.fileData));
  }

  //Guarda los metadatos off-chain de un documento desp de que el médico lo registro on-chain
  @Post()
  create(@WalletAddress() wallet: string, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(wallet, dto);
  }

  //El médico logueado guarda/edita su diagnóstico sobre un documento (off-chain)
  @Put(":id/diagnosis")
  async saveDiagnosis(
    @Param("id", ParseIntPipe) id: number,
    @WalletAddress() wallet: string,
    @Body() body: { text: string },
  ) {
    await this.assertOnChainAccess(id, wallet);
    return this.documentsService.upsertDiagnosis(id, wallet, body.text);
  }

  //valida contra el contrato PermissionManager que el wallet logueado tenga
  //autorización real (paciente dueño, emisor original, o acceso otorgado on-chain)
  //antes de devolver el documento guardado en la base de datos
  private async assertOnChainAccess(documentIdOnChain: number, wallet: string) {
    const allowed = await this.blockchainService.canAccessDocument(documentIdOnChain, wallet);
    if (!allowed) {
      throw new ForbiddenException("No tenés autorización on-chain para acceder a este documento");
    }
  }
}
