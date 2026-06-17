const BASE = import.meta.env.VITE_API_URL;

async function request(path: string, options?: RequestInit) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
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
  getDocuments: (patient?: string) =>
    request(`/api/documents${patient ? `?patient=${patient}` : ""}`),
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
    ipfsCid: string;
    ipfsUrl: string;
  }) => request("/api/documents", { method: "POST", body: JSON.stringify(data) }),
  uploadFile: (file: File) => {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then((r) => r.json());
  },
};
