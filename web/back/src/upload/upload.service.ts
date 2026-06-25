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
  /**
   * Valida el archivo y calcula su hash. NO lo publica en IPFS:
   * los documentos médicos son privados y se guardan en la base de datos.
   * Devuelve el archivo en base64 para que el front lo adjunte al guardar
   * la metadata del documento, junto con el hash que se registra on-chain.
   */
  processFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No se recibió ningún archivo");
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Permitidos: PDF, JPEG, PNG, WEBP`,
      );
    }

    // Validar tamaño
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(`El archivo supera el límite de ${MAX_SIZE_MB}MB`);
    }

    // Calcular el hash del archivo para registrar la integridad on-chain
    const fileHash = "0x" + createHash("sha256").update(file.buffer).digest("hex");

    return {
      // El front usa este hash para registrar el documento en el contrato
      fileHash,
      // Contenido del archivo; el front lo reenvía al guardar la metadata
      fileBase64: file.buffer.toString("base64"),
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }
}
