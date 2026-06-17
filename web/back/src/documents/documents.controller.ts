import { Controller, Get, Post, Param, Body, Query, ParseIntPipe } from "@nestjs/common";
import { DocumentsService, CreateDocumentDto } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  //devuelve documentos guardados en la base de datos, con filtros opcionales
  @Get()
  findAll(@Query("patient") patient?: string, @Query("emitter") emitter?: string) {
    return this.documentsService.findAll({ patientAddress: patient, emitterAddress: emitter });
  }

  //Devuelve los metadatos de UN documento específico por su id de base de datos
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }

  //Guarda los metadatos off-chain de un documento desp de que el médico lo registro on-chain
  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }
}
