import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Retorna todos los médicos a los que el paciente dio acceso, con sus documentos
  async getByPatient(patientAddress: string) {
    const accesses = await this.prisma.documentAccess.findMany({
      where: { patientAddress: patientAddress.toLowerCase() },
      orderBy: { grantedAt: "asc" },
    });

    // Agrupar por médico
    const byDoctor = new Map<string, number[]>();
    for (const a of accesses) {
      if (!byDoctor.has(a.doctorAddress)) byDoctor.set(a.doctorAddress, []);
      byDoctor.get(a.doctorAddress)!.push(a.documentIdOnChain);
    }

    // Para cada médico, traer los detalles de los docs
    const result = [];
    for (const [doctorAddress, docIds] of byDoctor.entries()) {
      const documents = await this.prisma.documentMetadata.findMany({
        where: { documentIdOnChain: { in: docIds } },
        orderBy: { createdAt: "desc" },
      });
      result.push({ doctorAddress, documents });
    }

    return result;
  }

  // Retorna todos los pacientes que le dieron acceso a este médico, con sus documentos
  async getByDoctor(doctorAddress: string) {
    const accesses = await this.prisma.documentAccess.findMany({
      where: { doctorAddress: doctorAddress.toLowerCase() },
      orderBy: { grantedAt: "asc" },
    });

    const byPatient = new Map<string, number[]>();
    for (const a of accesses) {
      if (!byPatient.has(a.patientAddress)) byPatient.set(a.patientAddress, []);
      byPatient.get(a.patientAddress)!.push(a.documentIdOnChain);
    }

    const result = [];
    for (const [patientAddress, docIds] of byPatient.entries()) {
      const documents = await this.prisma.documentMetadata.findMany({
        where: { documentIdOnChain: { in: docIds } },
        orderBy: { createdAt: "desc" },
      });
      result.push({ patientAddress, documents });
    }

    return result;
  }

  // Documentos que un paciente específico compartió con un médico específico
  async getShared(patientAddress: string, doctorAddress: string) {
    const accesses = await this.prisma.documentAccess.findMany({
      where: {
        patientAddress: patientAddress.toLowerCase(),
        doctorAddress: doctorAddress.toLowerCase(),
      },
    });

    const docIds = accesses.map((a) => a.documentIdOnChain);
    if (docIds.length === 0) return [];

    return this.prisma.documentMetadata.findMany({
      where: { documentIdOnChain: { in: docIds } },
      orderBy: { createdAt: "desc" },
    });
  }

  async grant(patientAddress: string, doctorAddress: string, documentIdOnChain: number) {
    // upsert: si ya existe el registro (on-chain grant previo sin DB), lo deja igual
    return this.prisma.documentAccess.upsert({
      where: {
        patientAddress_doctorAddress_documentIdOnChain: {
          patientAddress: patientAddress.toLowerCase(),
          doctorAddress: doctorAddress.toLowerCase(),
          documentIdOnChain,
        },
      },
      create: {
        patientAddress: patientAddress.toLowerCase(),
        doctorAddress: doctorAddress.toLowerCase(),
        documentIdOnChain,
      },
      update: {}, // ya existe, no cambia nada
    });
  }

  async revoke(patientAddress: string, doctorAddress: string, documentIdOnChain: number) {
    const record = await this.prisma.documentAccess.findUnique({
      where: {
        patientAddress_doctorAddress_documentIdOnChain: {
          patientAddress: patientAddress.toLowerCase(),
          doctorAddress: doctorAddress.toLowerCase(),
          documentIdOnChain,
        },
      },
    });
    if (!record) throw new NotFoundException("No existe ese permiso");

    return this.prisma.documentAccess.delete({
      where: { id: record.id },
    });
  }
}
