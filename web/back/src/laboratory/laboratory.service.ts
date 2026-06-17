import { ConflictException, Injectable } from "@nestjs/common";
import { CreateLaboratoryStudyDto } from "./dto/create-laboratory-study.dto";
import { LaboratoryRepository } from "./laboratory.repository";

@Injectable()
export class LaboratoryService {
  constructor(private readonly laboratoryRepository: LaboratoryRepository) {}

  findStudies(emitterAddress: string) {
    return this.laboratoryRepository.findByEmitter(emitterAddress);
  }

  async createStudy(dto: CreateLaboratoryStudyDto) {
    const existing = await this.laboratoryRepository.findByDocumentId(dto.documentIdOnChain);
    if (existing) throw new ConflictException("Ya existe metadata para ese estudio");

    return this.laboratoryRepository.createStudy(dto);
  }
}
