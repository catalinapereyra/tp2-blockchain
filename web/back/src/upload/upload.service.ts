import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash } from "crypto";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_MB = 10;

@Injectable()
export class UploadService {
  processFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No se recibió ningún archivo");
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Permitidos: PDF, JPEG, PNG, WEBP`,
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(`El archivo supera el límite de ${MAX_SIZE_MB}MB`);
    }

    //calcular hash del file para registrar la integridad on-chain
    const fileHash = "0x" + createHash("sha256").update(file.buffer).digest("hex");

    return {
      //front usa este hash para registrar el documento en el contrato
      fileHash,
      //content del archivo, el front lo reenvía al guardar la metadata
      fileBase64: file.buffer.toString("base64"),
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }
}
