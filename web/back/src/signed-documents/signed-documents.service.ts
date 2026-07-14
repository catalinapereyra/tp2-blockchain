import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BlockchainService } from "../blockchain/blockchain.service";

export interface CreateSignedDocumentDto {
  patientAddress: string;
  documentHash: string;
  documentType: string;
  offChainRef: string;
  signature: string;
  title: string;
  studyType?: string;
  notes?: string;
  fileBase64: string;
  fileName: string;
  mimeType: string;
}

//campos que se devuelven en los listados: sin fileData (los bytes del archivo)
const SELECT = {
  id: true,
  patientAddress: true,
  doctorAddress: true,
  documentHash: true,
  documentType: true,
  offChainRef: true,
  signature: true,
  title: true,
  studyType: true,
  notes: true,
  fileName: true,
  mimeType: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class SignedDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  //medico firma off-chain y guarda el documento pendiente (no paga gas)
  async create(doctorAddress: string, dto: CreateSignedDocumentDto) {
    if (!dto.fileBase64) throw new BadRequestException("Falta el contenido del archivo");

    //verifica criptográficamente (EIP-712) que la firma corresponda al médico logueado
    //y a estos datos exactos, antes de confiar en lo que mandó el frontend
    let signer: string;
    try {
      signer = this.blockchainService.recoverMedicalDocumentSigner(
        {
          patient: dto.patientAddress,
          documentHash: dto.documentHash,
          documentType: dto.documentType,
          offChainRef: dto.offChainRef,
          doctor: doctorAddress,
        },
        dto.signature,
      );
    } catch {
      throw new BadRequestException("Firma inválida");
    }
    if (signer !== doctorAddress.toLowerCase()) {
      throw new ForbiddenException("La firma no corresponde al médico logueado ni a los datos enviados");
    }

    return this.prisma.signedDocument.create({
      data: {
        patientAddress: dto.patientAddress.toLowerCase(),
        doctorAddress: doctorAddress.toLowerCase(),
        documentHash: dto.documentHash,
        documentType: dto.documentType,
        offChainRef: dto.offChainRef,
        signature: dto.signature,
        title: dto.title,
        studyType: dto.studyType ?? null,
        notes: dto.notes ?? null,
        fileData: Buffer.from(dto.fileBase64, "base64"),
        fileName: dto.fileName,
        mimeType: dto.mimeType,
      },
      select: SELECT,
    });
  }

  //docs firmados pendientes de registrar de un paciente, con el nombre del medico
  async getPendingByPatient(patientAddress: string) {
    const docs = await this.prisma.signedDocument.findMany({
      where: { patientAddress: patientAddress.toLowerCase(), status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: SELECT,
    });

    const doctorAddrs = [...new Set(docs.map((d) => d.doctorAddress))];
    const profiles = doctorAddrs.length
      ? await this.prisma.userProfile.findMany({
          where: { walletAddress: { in: doctorAddrs } },
          select: { walletAddress: true, name: true, lastName: true },
        })
      : [];
    const nameByAddr = new Map(
      profiles.map((p) => [p.walletAddress, `${p.name} ${p.lastName ?? ""}`.trim()]),
    );

    return docs.map((d) => ({ ...d, doctorName: nameByAddr.get(d.doctorAddress) || null }));
  }

  //devuelve el archivo (para preview antes de registrar), solo al paciente o al médico firmante
  async getFile(id: number, wallet: string) {
    const doc = await this.prisma.signedDocument.findUnique({
      where: { id },
      select: { fileData: true, fileName: true, mimeType: true, patientAddress: true, doctorAddress: true },
    });
    if (!doc) throw new NotFoundException("Documento firmado no encontrado");

    const address = wallet.toLowerCase();
    if (doc.patientAddress !== address && doc.doctorAddress !== address) {
      throw new ForbiddenException("No tenés acceso a este documento firmado");
    }

    return doc;
  }

  //paciente ya registro el doc on-chain: muevo el archivo a
  //documentMetadata y marco la firma como registrada
  async register(wallet: string, id: number, documentIdOnChain: number) {
    const signed = await this.prisma.signedDocument.findUnique({ where: { id } });
    if (!signed) throw new NotFoundException("Documento firmado no encontrado");
    if (signed.patientAddress !== wallet.toLowerCase()) {
      throw new ForbiddenException("No podés registrar el documento de otro paciente");
    }
    if (signed.status === "REGISTERED") throw new ConflictException("Ya fue registrado");

    const exists = await this.prisma.documentMetadata.findUnique({
      where: { documentIdOnChain },
    });
    if (exists) throw new ConflictException("Ya existe metadata para ese documento");

    //el frontend podría mandar cualquier documentIdOnChain: confirmamos contra la
    //blockchain que ESE id corresponde exactamente a esta firma (mismo paciente,
    //mismo médico emisor, mismo hash de archivo) antes de promoverla
    const matches = await this.blockchainService.documentMatchesSignedRecord(documentIdOnChain, {
      patient: signed.patientAddress,
      doctor: signed.doctorAddress,
      documentHash: signed.documentHash,
    });
    if (!matches) {
      throw new ConflictException(
        "El documento on-chain no corresponde a esta firma (paciente, médico o hash distintos)",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const meta = await tx.documentMetadata.create({
        data: {
          documentIdOnChain,
          patientAddress: signed.patientAddress,
          emitterAddress: signed.doctorAddress,
          title: signed.title,
          documentType: signed.documentType,
          studyType: signed.studyType,
          notes: signed.notes,
          fileData: signed.fileData,
          fileName: signed.fileName,
          mimeType: signed.mimeType,
        },
        select: { documentIdOnChain: true },
      });
      await tx.signedDocument.update({
        where: { id },
        data: { status: "REGISTERED" },
      });
      return meta;
    });
  }
}
