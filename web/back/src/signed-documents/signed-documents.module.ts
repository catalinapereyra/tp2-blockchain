import { Module } from "@nestjs/common";
import { SignedDocumentsController } from "./signed-documents.controller";
import { SignedDocumentsService } from "./signed-documents.service";

@Module({
  controllers: [SignedDocumentsController],
  providers: [SignedDocumentsService],
})
export class SignedDocumentsModule {}
