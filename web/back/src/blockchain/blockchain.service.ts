import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

const DOCUMENT_REGISTRY_ABI = [
  "function getDocument(uint256 documentId) external view returns (tuple(uint256 id, bytes32 documentHash, address patient, address issuer, string documentType, string offChainRef, uint256 issuedAt, uint8 status))",
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

  // Rol on-chain de una wallet en UserRegistry (0=PATIENT,1=DOCTOR,2=LABORATORY,3=INSTITUTION),
  // o null si esa wallet todavía no se registró en el contrato. Es la única fuente de
  // verdad del rol: el campo `role` de UserProfile en Postgres es solo un espejo para
  // listar usuarios rápido y nunca debería aceptarse directamente de lo que manda el cliente.
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

  // De una lista de wallets, devuelve el subconjunto (en minúscula) que UserRegistry
  // marca como aprobadas. Son llamadas view (sin gas, no son transacciones) y van en
  // paralelo: ethers las agrupa en un solo request HTTP al RPC en la mayoría de los casos,
  // así que consultar 50 wallets no es mucho más lento que consultar una sola.
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

  // true si `documentIdOnChain` ya existe on-chain con exactamente ese paciente y emisor.
  // Se usa antes de guardar metadata off-chain para un documento ya registrado
  // (subida directa, no firma sin gas): el frontend podría mandar cualquier
  // documentIdOnChain, así que no alcanza con confiar en que "dice" haberlo registrado él.
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

  // Busca, entre los documentos on-chain de `patient`, el que tiene este hash exacto de
  // archivo. Sirve para recuperar el documentIdOnChain cuando la transacción de registro
  // ya se confirmó en la blockchain pero el paso siguiente (guardar metadata en el backend)
  // se cortó a mitad de camino (se cerró la pestaña, cayó la red, etc.): sin esto, el
  // usuario queda trabado porque el contrato no deja re-registrar un hash ya usado.
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
