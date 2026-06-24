import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreatePrescriptionDto {
  prescriptionIdOnChain: number;
  doctorAddress: string;
  description: string;
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // El paciente guarda el texto privado de la receta tras solicitarla on-chain.
  async create(patientAddress: string, dto: CreatePrescriptionDto) {
    const existing = await this.prisma.prescription.findUnique({
      where: { prescriptionIdOnChain: dto.prescriptionIdOnChain },
    });
    if (existing) throw new ConflictException("Ya existe esa receta");

    return this.prisma.prescription.create({
      data: {
        prescriptionIdOnChain: dto.prescriptionIdOnChain,
        patientAddress: patientAddress.toLowerCase(),
        doctorAddress: dto.doctorAddress.toLowerCase(),
        description: dto.description,
      },
    });
  }

  // Nombres off-chain del paciente y del médico, para mostrar junto a la address.
  private async enrich(items: { patientAddress: string; doctorAddress: string }[]) {
    const addrs = [...new Set(items.flatMap((p) => [p.patientAddress, p.doctorAddress]))];
    const profiles = addrs.length
      ? await this.prisma.userProfile.findMany({
          where: { walletAddress: { in: addrs } },
          select: { walletAddress: true, name: true, lastName: true },
        })
      : [];
    const byAddr = new Map(profiles.map((p) => [p.walletAddress, `${p.name} ${p.lastName ?? ""}`.trim()]));
    return (p: any) => ({
      ...p,
      patientName: byAddr.get(p.patientAddress) || null,
      doctorName: byAddr.get(p.doctorAddress) || null,
    });
  }

  async getByDoctor(doctorAddress: string) {
    const items = await this.prisma.prescription.findMany({
      where: { doctorAddress: doctorAddress.toLowerCase() },
      orderBy: { createdAt: "desc" },
    });
    const withNames = await this.enrich(items);
    return items.map(withNames);
  }

  async getByPatient(patientAddress: string) {
    const items = await this.prisma.prescription.findMany({
      where: { patientAddress: patientAddress.toLowerCase() },
      orderBy: { createdAt: "desc" },
    });
    const withNames = await this.enrich(items);
    return items.map(withNames);
  }
}
