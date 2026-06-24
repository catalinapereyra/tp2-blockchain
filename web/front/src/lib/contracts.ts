import { ethers } from "ethers";

export const ADDRESSES = {
  userRegistry: import.meta.env.VITE_USER_REGISTRY_ADDRESS as string,
  documentRegistry: import.meta.env.VITE_DOCUMENT_REGISTRY_ADDRESS as string,
  permissionManager: import.meta.env.VITE_PERMISSION_MANAGER_ADDRESS as string,
  prescriptionManager: import.meta.env.VITE_PRESCRIPTION_MANAGER_ADDRESS as string,
};

export const USER_REGISTRY_ABI = [
  "function registerAsPatient() external",
  "function registerAsProfessional(uint8 role) external",
  "function approveUser(address user) external",
  "function rejectUser(address user) external",
  "function revokeUser(address user) external",
  "function isRegistered(address user) external view returns (bool)",
  "function isApproved(address user) external view returns (bool)",
  "function isVerifiedEmitter(address user) external view returns (bool)",
  "function getRole(address user) external view returns (uint8)",
  "function getUser(address user) external view returns (tuple(uint8 role, uint8 status, uint256 registeredAt, uint256 updatedAt))",
  "function getStatus(address user) external view returns (uint8)",
  "function owner() external view returns (address)",
  "event PatientRegistered(address indexed patient)",
  "event ProfessionalRegistrationRequested(address indexed professional, uint8 role)",
  "event UserApproved(address indexed user, uint8 role)",
  "event UserRejected(address indexed user)",
  "event UserRevoked(address indexed user)",
];

export const DOCUMENT_REGISTRY_ABI = [
  "function uploadOwnDocument(bytes32 documentHash, string calldata documentType, string calldata offChainRef) external returns (uint256)",
  "function registerDocument(address patient, bytes32 documentHash, string calldata documentType, string calldata offChainRef) external returns (uint256)",
  "function registerSignedDocument(address patient, bytes32 documentHash, string calldata documentType, string calldata offChainRef, address doctor, bytes calldata signature) external returns (uint256)",
  "function getDocument(uint256 documentId) external view returns (tuple(uint256 id, bytes32 documentHash, address patient, address issuer, string documentType, string offChainRef, uint256 issuedAt, uint8 status))",
  "function getPatientDocuments(address patient) external view returns (uint256[])",
  "function verifyDocument(uint256 documentId, bytes32 hashToVerify) external view returns (bool)",
  "function revokeDocument(uint256 documentId) external",
  "function documentExists(uint256 documentId) external view returns (bool)",
  "function isHashRegistered(bytes32 documentHash) external view returns (bool)",
  "event DocumentRegistered(uint256 indexed documentId, address indexed patient, address indexed issuer, uint8 status)",
];

export const PERMISSION_MANAGER_ABI = [
  "function grantDocumentAccess(uint256 documentId, address grantee) external",
  "function revokeDocumentAccess(uint256 documentId, address grantee) external",
  "function grantGlobalAccess(address grantee) external",
  "function revokeGlobalAccess(address grantee) external",
  "function hasAccess(address patient, uint256 documentId, address grantee) external view returns (bool)",
  "function hasGlobalAccess(address patient, address grantee) external view returns (bool)",
  "function hasDocumentAccess(address patient, uint256 documentId, address grantee) external view returns (bool)",
  "event DocumentAccessGranted(address indexed patient, uint256 indexed documentId, address indexed grantee)",
  "event DocumentAccessRevoked(address indexed patient, uint256 indexed documentId, address indexed grantee)",
];

export const PRESCRIPTION_MANAGER_ABI = [
  "function requestPrescription(address doctor, string calldata prescriptionType) external returns (uint256)",
  "function acceptPrescription(uint256 id) external",
  "function rejectPrescription(uint256 id) external",
  "function issuePrescription(uint256 id, bytes32 documentHash, string calldata offChainRef) external",
  "function cancelPrescription(uint256 id) external",
  "function getPrescription(uint256 id) external view returns (tuple(uint256 id, address patient, address doctor, string prescriptionType, uint8 status, bytes32 documentHash, string offChainRef, uint256 requestedAt, uint256 updatedAt))",
  "function getPatientPrescriptions(address patient) external view returns (uint256[])",
  "function getDoctorPrescriptions(address doctor) external view returns (uint256[])",
];

export function getProvider() {
  return new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
}

export function getSigner() {
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  return provider.getSigner();
}

export async function getUserRegistry() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.userRegistry, USER_REGISTRY_ABI, signer);
}

export function getUserRegistryReadOnly() {
  return new ethers.Contract(ADDRESSES.userRegistry, USER_REGISTRY_ABI, getProvider());
}

export async function getDocumentRegistry() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.documentRegistry, DOCUMENT_REGISTRY_ABI, signer);
}

// Datos que el médico firma off-chain con EIP-712 (sin pagar gas).
// Tiene que coincidir EXACTO con el TYPEHASH y el dominio del contrato.
export type MedicalDocumentValue = {
  patient: string;
  documentHash: string;
  documentType: string;
  offChainRef: string;
  doctor: string;
};

export async function signMedicalDocument(value: MedicalDocumentValue): Promise<string> {
  const signer = await getSigner();
  const domain = {
    name: "MedicalDocumentRegistry",
    version: "1",
    chainId: Number(import.meta.env.VITE_CHAIN_ID),
    verifyingContract: ADDRESSES.documentRegistry,
  };
  const types = {
    MedicalDocument: [
      { name: "patient", type: "address" },
      { name: "documentHash", type: "bytes32" },
      { name: "documentType", type: "string" },
      { name: "offChainRef", type: "string" },
      { name: "doctor", type: "address" },
    ],
  };
  return signer.signTypedData(domain, types, value);
}

export async function getPermissionManager() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.permissionManager, PERMISSION_MANAGER_ABI, signer);
}

export async function getPrescriptionManager() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.prescriptionManager, PRESCRIPTION_MANAGER_ABI, signer);
}

export const ROLE_LABELS: Record<number, string> = {
  0: "Paciente",
  1: "Médico",
  2: "Laboratorio",
  3: "Institución",
};

export const STATUS_LABELS: Record<number, string> = {
  0: "Pendiente",
  1: "Aprobado",
  2: "Rechazado",
  3: "Revocado",
};

export const PRESCRIPTION_STATUS_LABELS: Record<number, string> = {
  0: "Pendiente",
  1: "Aceptada",
  2: "Rechazada",
  3: "Emitida",
  4: "Cancelada",
};

export const DOC_STATUS_LABELS: Record<number, string> = {
  0: "Subido por paciente",
  1: "Verificado por emisor",
  2: "Revocado",
};
