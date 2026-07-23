import { ethers } from "ethers";
import { api } from "./api";
import { DOCUMENT_REGISTRY_ABI } from "./contracts";

export interface RecoveredDocument {
  documentIdOnChain: number;
  alreadySaved: boolean;
}

export async function findExistingDocument(
  documentRegistry: ethers.Contract,
  patientAddress: string,
  documentHash: string,
): Promise<RecoveredDocument | null> {
  const isRegistered = await documentRegistry.isHashRegistered(documentHash);
  if (!isRegistered) return null;

  const lookup = await api.lookupDocumentByHash(patientAddress, documentHash);
  if (lookup.documentIdOnChain === null) {
    throw new Error(
      "Este archivo ya fue registrado anteriormente en la blockchain para otro paciente. Subí un archivo distinto.",
    );
  }
  return { documentIdOnChain: lookup.documentIdOnChain, alreadySaved: lookup.alreadySaved };
}

export function extractDocumentIdFromReceipt(receipt: ethers.TransactionReceipt): number {
  const iface = new ethers.Interface(DOCUMENT_REGISTRY_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log as any);
      if (parsed?.name === "DocumentRegistered") {
        return Number(parsed.args.documentId);
      }
    } catch { /* log de otro contrato, ignorar */ }
  }
  throw new Error("No se pudo obtener el id del documento registrado");
}
