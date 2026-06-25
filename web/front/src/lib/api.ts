const BASE = import.meta.env.VITE_API_URL;

export type DocumentMetadata = {
  id: number;
  documentIdOnChain: number;
  patientAddress: string;
  emitterAddress: string;
  // Nombre y apellido (off-chain) del paciente y del emisor, para mostrarlos
  // junto a la dirección sin exponerlos en la blockchain.
  patientName?: string | null;
  patientLastName?: string | null;
  emitterName?: string | null;
  emitterLastName?: string | null;
  emitterRole?: number | null; // 0=paciente, 1=médico, 2=lab, 3=institución
  title: string;
  description?: string;
  documentType: string;
  studyType?: string;
  studyDate?: string;
  labName?: string;
  notes?: string;
  // El archivo se guarda en la base de datos; se descarga desde /documents/:id/file
  fileName: string;
  mimeType: string;
  // Diagnósticos off-chain (uno por médico) sobre este documento
  diagnoses?: DocumentDiagnosis[];
  createdAt: string;
};

export type DocumentDiagnosis = {
  doctorAddress: string;
  doctorName?: string | null;
  text: string;
  updatedAt: string;
};

export type AppUser = {
  walletAddress: string;
  name: string;
  lastName?: string | null;
  specialty?: string | null;
};

// Documento firmado off-chain por un médico, pendiente de que el paciente lo registre
export type SignedDoc = {
  id: number;
  patientAddress: string;
  doctorAddress: string;
  doctorName?: string | null;
  documentHash: string;
  documentType: string;
  offChainRef: string;
  signature: string;
  title: string;
  studyType?: string | null;
  notes?: string | null;
  fileName: string;
  mimeType: string;
  status: string;
  createdAt: string;
};

// Texto + nombres off-chain de una receta (el estado vive on-chain)
export type PrescriptionMeta = {
  prescriptionIdOnChain: number;
  patientAddress: string;
  doctorAddress: string;
  patientName?: string | null;
  doctorName?: string | null;
  description: string;
  createdAt: string;
};

async function request(path: string, options?: RequestInit) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Error en la API");
  }
  return res.json();
}

export const api = {
  getNonce: (wallet: string) => request(`/api/auth/nonce/${wallet}`),
  verify: (wallet: string, signature: string) =>
    request("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ walletAddress: wallet, signature }),
    }),
  getMe: () => request("/api/auth/me"),
  updateProfile: (data: { name?: string; lastName?: string; email?: string; role?: number; specialty?: string }) =>
    request("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
  // Lista usuarios por rol (0=paciente, 1=médico, 2=lab, 3=institución) con nombre + address
  getUsers: (role: number) =>
    request(`/api/auth/users?role=${role}`) as Promise<AppUser[]>,
  // Nombre/apellido off-chain de una wallet (null si no tiene perfil cargado)
  getProfileByWallet: (wallet: string) =>
    request(`/api/auth/profile/${wallet}`) as Promise<AppUser | null>,

  // ── Documentos firmados (EIP-712) ──────────────────────────────────────
  // El médico firma off-chain y guarda el documento pendiente
  createSignedDocument: (data: {
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
  }) => request("/api/signed-documents", { method: "POST", body: JSON.stringify(data) }),
  // Documentos firmados pendientes de registrar de un paciente
  getSignedDocuments: (patient: string) =>
    request(`/api/signed-documents?patient=${encodeURIComponent(patient)}`) as Promise<SignedDoc[]>,
  // URL para ver/descargar el archivo firmado pendiente
  signedDocFileUrl: (id: number) => `${BASE}/api/signed-documents/${id}/file`,
  // El paciente ya lo registró on-chain → pasamos el archivo a su historial
  registerSignedDocument: (id: number, documentIdOnChain: number) =>
    request(`/api/signed-documents/${id}/register`, {
      method: "POST",
      body: JSON.stringify({ documentIdOnChain }),
    }),
  getDocuments: (filters?: string | { patient?: string; emitter?: string }) => {
    const params = new URLSearchParams();
    if (typeof filters === "string") params.set("patient", filters);
    if (typeof filters === "object" && filters?.patient) params.set("patient", filters.patient);
    if (typeof filters === "object" && filters?.emitter) params.set("emitter", filters.emitter);
    const query = params.toString();
    return request(`/api/documents${query ? `?${query}` : ""}`) as Promise<DocumentMetadata[]>;
  },
  getLaboratoryStudies: (emitter: string) =>
    request(`/api/laboratory/studies?emitter=${encodeURIComponent(emitter)}`) as Promise<DocumentMetadata[]>,
  getDocument: (id: number) => request(`/api/documents/${id}`),
  // El médico logueado guarda/edita su diagnóstico sobre un documento (off-chain)
  saveDiagnosis: (documentIdOnChain: number, text: string) =>
    request(`/api/documents/${documentIdOnChain}/diagnosis`, {
      method: "PUT",
      body: JSON.stringify({ text }),
    }),
  // URL para ver/descargar el archivo guardado en la base de datos
  fileUrl: (documentIdOnChain: number) => `${BASE}/api/documents/${documentIdOnChain}/file`,
  createDocument: (data: {
    documentIdOnChain: number;
    patientAddress: string;
    emitterAddress: string;
    title: string;
    description?: string;
    documentType: string;
    studyType?: string;
    studyDate?: string;
    labName?: string;
    notes?: string;
    fileBase64: string;
    fileName: string;
    mimeType: string;
  }) => request("/api/documents", { method: "POST", body: JSON.stringify(data) }),
  createLaboratoryStudy: (data: {
    documentIdOnChain: number;
    patientAddress: string;
    emitterAddress: string;
    title: string;
    documentType: string;
    studyType?: string;
    labName?: string;
    notes?: string;
    fileBase64: string;
    fileName: string;
    mimeType: string;
  }) => request("/api/laboratory/studies", { method: "POST", body: JSON.stringify(data) }),
  getPermissions: (patientAddress: string) =>
    request(`/api/permissions/${patientAddress}`),
  getDoctorPatients: (doctorAddress: string) =>
    request(`/api/permissions/doctor/${doctorAddress}`),
  // Agregar/quitar un médico de "mis médicos" sin compartir documentos
  addMyDoctor: (patientAddress: string, doctorAddress: string) =>
    request("/api/permissions/doctor", { method: "POST", body: JSON.stringify({ patientAddress, doctorAddress }) }),
  removeMyDoctor: (patientAddress: string, doctorAddress: string) =>
    request("/api/permissions/doctor", { method: "DELETE", body: JSON.stringify({ patientAddress, doctorAddress }) }),
  // ── Recetas ────────────────────────────────────────────────────────────
  // El paciente guarda el texto privado tras solicitar la receta on-chain
  createPrescription: (data: { prescriptionIdOnChain: number; doctorAddress: string; description: string }) =>
    request("/api/prescriptions", { method: "POST", body: JSON.stringify(data) }),
  // Recetas (texto + nombres) por médico o por paciente
  getPrescriptions: (filter: { doctor?: string; patient?: string }) => {
    const q = filter.doctor ? `doctor=${filter.doctor}` : `patient=${filter.patient}`;
    return request(`/api/prescriptions?${q}`) as Promise<PrescriptionMeta[]>;
  },
  getSharedDocs: (patientAddress: string, doctorAddress: string) =>
    request(`/api/permissions/shared?patient=${patientAddress}&doctor=${doctorAddress}`),
  grantPermission: (data: { patientAddress: string; doctorAddress: string; documentIdOnChain: number }) =>
    request("/api/permissions", { method: "POST", body: JSON.stringify(data) }),
  revokePermission: (data: { patientAddress: string; doctorAddress: string; documentIdOnChain: number }) =>
    request("/api/permissions", { method: "DELETE", body: JSON.stringify(data) }),
  uploadFile: (file: File) => {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      const data = await r.json().catch(() => ({ message: r.statusText }));
      if (!r.ok) throw new Error(data.message || "Error subiendo archivo");
      return data as {
        fileHash: string;
        fileBase64: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        error?: string;
        message?: string;
      };
    });
  },
};
