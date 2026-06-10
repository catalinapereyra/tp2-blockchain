import { Controller, Get, Post, Param, Body, Query, ParseIntPipe } from "@nestjs/common";
import { DocumentsService, CreateDocumentDto } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query("patient") patient?: string) {
    return this.documentsService.findAll(patient);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }
}
