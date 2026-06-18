const BASE = import.meta.env.VITE_API_URL;

export type DocumentMetadata = {
  id: number;
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
  ipfsCid: string;
  ipfsUrl: string;
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
  updateProfile: (data: { name?: string; lastName?: string; email?: string }) =>
    request("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
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
    ipfsCid: string;
    ipfsUrl: string;
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
    ipfsCid: string;
    ipfsUrl: string;
  }) => request("/api/laboratory/studies", { method: "POST", body: JSON.stringify(data) }),
  getPermissions: (patientAddress: string) =>
    request(`/api/permissions/${patientAddress}`),
  getDoctorPatients: (doctorAddress: string) =>
    request(`/api/permissions/doctor/${doctorAddress}`),
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
        cid: string;
        url: string;
        fileHash: string;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        error?: string;
        message?: string;
      };
    });
  },
};
