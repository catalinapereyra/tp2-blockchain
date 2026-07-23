import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

const DOCUMENT_REGISTRY_ABI = [
  "function getDocument(uint256 documentId) external view returns (tuple(uint256 id, bytes32 documentHash, address patient, address issuer, string documentType, string offChainRef, uint8 status))",
  "function getPatientDocuments(address patient) external view returns (uint256[])",
];

const PERMISSION_MANAGER_ABI = [
  "function hasAccess(address patient, uint256 documentId, address grantee) external view returns (bool)",
];

const USER_REGISTRY_ABI = [
  "function isRegistered(address user) external view returns (bool)",
  "function getRole(address user) external view returns (uint8)",
  "function isApproved(address user) external view returns (bool)",
];

// mismo dominio y tipos eip-712 que MedicalDocumentRegistry.sol y el front (contracts.ts)
const MEDICAL_DOCUMENT_TYPES = {
  MedicalDocument: [
    { name: "patient", type: "address" },
    { name: "documentHash", type: "bytes32" },
    { name: "documentType", type: "string" },
    { name: "offChainRef", type: "string" },
    { name: "doctor", type: "address" },
  ],
};

export interface MedicalDocumentValue {
  patient: string;
  documentHash: string;
  documentType: string;
  offChainRef: string;
  doctor: string;
}

enum DocumentStatus {
  VERIFIED_ISSUER_DOCUMENT = 1,
}

interface OnChainDocument {
  patient: string;
  issuer: string;
  documentHash: string;
  status: number;
}

// fuente de verdad de permisos es el contrato, postgres es solo un espejo para listar
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private documentRegistry!: ethers.Contract;
  private permissionManager!: ethers.Contract;
  private userRegistry!: ethers.Contract;
  private documentRegistryAddress!: string;
  private chainId!: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.config.get<string>("RPC_URL");
    const documentRegistryAddress = this.config.get<string>("DOCUMENT_REGISTRY_ADDRESS");
    const permissionManagerAddress = this.config.get<string>("PERMISSION_MANAGER_ADDRESS");
    const userRegistryAddress = this.config.get<string>("USER_REGISTRY_ADDRESS");
    const chainId = this.config.get<string>("CHAIN_ID");

    if (!rpcUrl || !documentRegistryAddress || !permissionManagerAddress || !userRegistryAddress || !chainId) {
      throw new Error(
        "Faltan variables de entorno de blockchain: RPC_URL, DOCUMENT_REGISTRY_ADDRESS, PERMISSION_MANAGER_ADDRESS, USER_REGISTRY_ADDRESS, CHAIN_ID",
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.documentRegistry = new ethers.Contract(documentRegistryAddress, DOCUMENT_REGISTRY_ABI, provider);
    this.permissionManager = new ethers.Contract(permissionManagerAddress, PERMISSION_MANAGER_ABI, provider);
    this.userRegistry = new ethers.Contract(userRegistryAddress, USER_REGISTRY_ABI, provider);
    this.documentRegistryAddress = documentRegistryAddress;
    this.chainId = Number(chainId);
  }

  // devuelve el rol on-chain de la wallet (0=patient,1=doctor,2=laboratory,3=institution) o null si no esta registrada
  async getOnChainRole(address: string): Promise<number | null> {
    try {
      const registered = (await this.userRegistry.isRegistered(address)) as boolean;
      if (!registered) return null;
      const role = await this.userRegistry.getRole(address);
      return Number(role);
    } catch (err) {
      this.logger.error(`No se pudo leer el rol on-chain de ${address}`, err as Error);
      throw new InternalServerErrorException("No se pudo validar el rol contra la blockchain");
    }
  }

  // de una lista de wallets, devuelve las que estan aprobadas en el contrato
  async filterApprovedAddresses(addresses: string[]): Promise<Set<string>> {
    if (addresses.length === 0) return new Set();
    try {
      const results = await Promise.all(addresses.map((addr) => this.userRegistry.isApproved(addr)));
      const approved = new Set<string>();
      addresses.forEach((addr, i) => {
        if (results[i]) approved.add(addr.toLowerCase());
      });
      return approved;
    } catch (err) {
      this.logger.error("No se pudo consultar isApproved() en UserRegistry", err as Error);
      throw new InternalServerErrorException("No se pudo validar los usuarios contra la blockchain");
    }
  }

  // recupera que direccion firmo realmente value con eip-712 (no necesita red, es solo criptografia)
  recoverMedicalDocumentSigner(value: MedicalDocumentValue, signature: string): string {
    const domain = {
      name: "MedicalDocumentRegistry",
      version: "1",
      chainId: this.chainId,
      verifyingContract: this.documentRegistryAddress,
    };
    return ethers.verifyTypedData(domain, MEDICAL_DOCUMENT_TYPES, value, signature).toLowerCase();
  }

  // true si quien pide el documento es el paciente, el emisor, o tiene acceso otorgado on-chain
  async canAccessDocument(documentIdOnChain: number, requester: string): Promise<boolean> {
    const address = requester.toLowerCase();

    const doc = await this.getDocumentOnChain(documentIdOnChain);
    const patient = doc.patient.toLowerCase();
    const issuer = doc.issuer.toLowerCase();

    if (address === patient || address === issuer) return true;

    try {
      return (await this.permissionManager.hasAccess(patient, documentIdOnChain, address)) as boolean;
    } catch (err) {
      this.logger.error(`No se pudo consultar hasAccess() para el documento ${documentIdOnChain}`, err as Error);
      throw new InternalServerErrorException("No se pudo validar el permiso contra la blockchain");
    }
  }

  // true si el documento on-chain coincide con esta firma pendiente (mismo paciente, doctor y hash)
  async documentMatchesSignedRecord(
    documentIdOnChain: number,
    expected: { patient: string; doctor: string; documentHash: string },
  ): Promise<boolean> {
    const doc = await this.getDocumentOnChain(documentIdOnChain);

    return (
      doc.patient.toLowerCase() === expected.patient.toLowerCase() &&
      doc.issuer.toLowerCase() === expected.doctor.toLowerCase() &&
      doc.documentHash.toLowerCase() === expected.documentHash.toLowerCase() &&
      doc.status === DocumentStatus.VERIFIED_ISSUER_DOCUMENT
    );
  }

  // true si el documento on-chain ya existe con exactamente ese paciente y emisor
  async documentMatchesOwner(
    documentIdOnChain: number,
    expected: { patient: string; emitter: string },
  ): Promise<boolean> {
    const doc = await this.getDocumentOnChain(documentIdOnChain);
    return (
      doc.patient.toLowerCase() === expected.patient.toLowerCase() &&
      doc.issuer.toLowerCase() === expected.emitter.toLowerCase()
    );
  }

  // busca entre los documentos on-chain del paciente el que tiene este hash, para recuperar
  // el documentId si el registro se confirmo pero guardar la metadata se corto a mitad de camino
  async findDocumentIdByHash(patient: string, documentHash: string): Promise<number | null> {
    let ids: bigint[];
    try {
      ids = (await this.documentRegistry.getPatientDocuments(patient)) as bigint[];
    } catch (err) {
      this.logger.error(`No se pudo leer los documentos on-chain de ${patient}`, err as Error);
      throw new InternalServerErrorException("No se pudo consultar los documentos contra la blockchain");
    }
    if (ids.length === 0) return null;

    const docs = await Promise.all(ids.map((id) => this.getDocumentOnChain(Number(id))));
    const hash = documentHash.toLowerCase();
    const index = docs.findIndex((doc) => doc.documentHash.toLowerCase() === hash);
    return index === -1 ? null : Number(ids[index]);
  }

  private async getDocumentOnChain(documentIdOnChain: number): Promise<OnChainDocument> {
    try {
      const doc = await this.documentRegistry.getDocument(documentIdOnChain);
      return {
        patient: doc.patient as string,
        issuer: doc.issuer as string,
        documentHash: doc.documentHash as string,
        status: Number(doc.status),
      };
    } catch (err) {
      this.logger.error(`No se pudo leer el documento ${documentIdOnChain} on-chain`, err as Error);
      throw new InternalServerErrorException("No se pudo validar el documento contra la blockchain");
    }
  }
}
