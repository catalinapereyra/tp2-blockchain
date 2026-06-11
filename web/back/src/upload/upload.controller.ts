import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UploadService } from "./upload.service";

@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/upload
   * Sube un archivo a IPFS via Pinata.
   * Devuelve el CID, la URL y el hash del archivo para registrar en el contrato.
   * Requiere JWT válido.
   */
  @Post()
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadToIpfs(file);
  }
}
