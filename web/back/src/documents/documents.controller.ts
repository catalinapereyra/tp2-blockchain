import { Controller, Get, Post, Param, Body, Query, ParseIntPipe } from "@nestjs/common";
import { DocumentsService, CreateDocumentDto } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  //devuelve todos los documentos de ese paciente guardados en la base de datos
  @Get()
  findAll(@Query("patient") patient?: string) {
    return this.documentsService.findAll(patient);
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
