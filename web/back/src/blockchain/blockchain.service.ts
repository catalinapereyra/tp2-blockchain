import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

const DOCUMENT_REGISTRY_ABI = [
  "function getDocument(uint256 documentId) external view returns (tuple(uint256 id, bytes32 documentHash, address patient, address issuer, string documentType, string offChainRef, uint256 issuedAt, uint8 status))",
];

const PERMISSION_MANAGER_ABI = [
  "function hasAccess(address patient, uint256 documentId, address grantee) external view returns (bool)",
];

// Mismo dominio y tipos EIP-712 que MedicalDocumentRegistry.sol y que firma el
// front (ver web/front/src/lib/contracts.ts) para el flujo de firma sin gas.
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

// Debe reflejar el enum DocumentStatus de MedicalDocumentRegistry.sol
enum DocumentStatus {
  PATIENT_UPLOADED = 0,
  VERIFIED_ISSUER_DOCUMENT = 1,
  REVOKED = 2,
}

interface OnChainDocument {
  patient: string;
  issuer: string;
  documentHash: string;
  status: number;
}

// Fuente de verdad de permisos: el contrato PermissionManager. La tabla
// documentAccess de Postgres es solo un espejo para listar más rápido,
// puede desincronizarse (el front llama al contrato y a la API por separado).
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private documentRegistry!: ethers.Contract;
  private permissionManager!: ethers.Contract;
  private documentRegistryAddress!: string;
  private chainId!: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.config.get<string>("RPC_URL");
    const documentRegistryAddress = this.config.get<string>("DOCUMENT_REGISTRY_ADDRESS");
    const permissionManagerAddress = this.config.get<string>("PERMISSION_MANAGER_ADDRESS");
    const chainId = this.config.get<string>("CHAIN_ID");

    if (!rpcUrl || !documentRegistryAddress || !permissionManagerAddress || !chainId) {
      throw new Error(
        "Faltan variables de entorno de blockchain: RPC_URL, DOCUMENT_REGISTRY_ADDRESS, PERMISSION_MANAGER_ADDRESS, CHAIN_ID",
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.documentRegistry = new ethers.Contract(documentRegistryAddress, DOCUMENT_REGISTRY_ABI, provider);
    this.permissionManager = new ethers.Contract(permissionManagerAddress, PERMISSION_MANAGER_ABI, provider);
    this.documentRegistryAddress = documentRegistryAddress;
    this.chainId = Number(chainId);
  }

  // Recupera qué dirección firmó realmente `value` con EIP-712 (mismo dominio que
  // usa el contrato al verificar registerSignedDocument). No hace falta red: es
  // criptografía pura (ECDSA), así que un doctorAddress falso o datos alterados
  // recuperan una dirección distinta a la que dice ser el firmante.
  recoverMedicalDocumentSigner(value: MedicalDocumentValue, signature: string): string {
    const domain = {
      name: "MedicalDocumentRegistry",
      version: "1",
      chainId: this.chainId,
      verifyingContract: this.documentRegistryAddress,
    };
    return ethers.verifyTypedData(domain, MEDICAL_DOCUMENT_TYPES, value, signature).toLowerCase();
  }

  // true si el que pide el documento es el paciente dueño, el emisor original,
  // o tiene acceso otorgado on-chain (global o a ese documento puntual)
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

  // true si el documento `documentIdOnChain` ya registrado en la blockchain corresponde
  // exactamente a esta firma pendiente (mismo paciente, mismo médico emisor, mismo hash
  // de archivo, y con status de emisor verificado). Se usa antes de promover un documento
  // firmado sin gas a metadata "registrada": el frontend podría mandar cualquier
  // documentIdOnChain, así que no alcanza con confiar en que "dice" haber sido registrado.
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
