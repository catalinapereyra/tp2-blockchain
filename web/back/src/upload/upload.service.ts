import { BadRequestException, Injectable } from "@nestjs/common";
import PinataSDK from "@pinata/sdk";
import { createHash } from "crypto";
import { Readable } from "stream";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_MB = 10;

@Injectable()
export class UploadService {
  private pinata = new PinataSDK({
    pinataApiKey: process.env.PINATA_API_KEY!,
    pinataSecretApiKey: process.env.PINATA_SECRET_KEY!,
  });

  async uploadToIpfs(file: Express.Multer.File) {
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

    // Calcular el hash del archivo (keccak256 para que coincida con el contrato)
    const fileHash = "0x" + createHash("sha256").update(file.buffer).digest("hex");

    // Subir a IPFS via Pinata
    const stream = Readable.from(file.buffer);
    const result = await this.pinata.pinFileToIPFS(stream, {
      pinataMetadata: { name: file.originalname },
    });

    return {
      cid: result.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      // El front usa este hash para registrar el documento en el contrato
      fileHash,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }
}
