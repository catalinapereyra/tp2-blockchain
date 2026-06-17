import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { api } from "../lib/api";
import { getUserRegistry, ROLE_LABELS } from "../lib/contracts";

interface WalletContextType {
  address: string | null;
  role: number | null;
  roleLabel: string | null;
  isRegistered: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
  connect: () => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadChainData(addr: string) {
    try {
      const contract = await getUserRegistry();
      const registered = await contract.isRegistered(addr);
      setIsRegistered(registered);

      const owner: string = await contract.owner();
      setIsAdmin(owner.toLowerCase() === addr.toLowerCase());

      if (registered) {
        const approved = await contract.isApproved(addr);
        setIsApproved(approved);
        const r = await contract.getRole(addr);
        setRole(Number(r));
      } else {
        setIsApproved(false);
        setRole(null);
      }
    } catch (e) {
      console.error("Error cargando datos del contrato", e);
    }
  }

  async function login(addr: string) {
    const { nonce } = await api.getNonce(addr);
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(`MediChain login: ${nonce}`);
    const { accessToken } = await api.verify(addr, signature);
    localStorage.setItem("token", accessToken);
    localStorage.setItem("wallet", addr);
  }

  async function connect() {
    if (!(window as any).ethereum) {
      throw new Error("Instalá MetaMask para continuar");
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const addr = accounts[0].toLowerCase();

      await login(addr);
      setAddress(addr);
      await loadChainData(addr);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (address) await loadChainData(address);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("wallet");
    setAddress(null);
    setRole(null);
    setIsRegistered(false);
    setIsApproved(false);
    setIsAdmin(false);
  }

  useEffect(() => {
    const saved = localStorage.getItem("wallet");
    if (saved) {
      setAddress(saved);
      loadChainData(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Si MetaMask cambia de cuenta, cerrar sesión automáticamente
    const eth = (window as any).ethereum;
    if (!eth) return;

    function handleAccountsChanged(accounts: string[]) {
      const newAddr = accounts[0]?.toLowerCase();
      const currentSaved = localStorage.getItem("wallet");
      if (!newAddr || newAddr !== currentSaved) {
        localStorage.removeItem("token");
        localStorage.removeItem("wallet");
        setAddress(null);
        setRole(null);
        setIsRegistered(false);
        setIsApproved(false);
        setIsAdmin(false);
        // Redirigir a home
        window.location.href = "/";
      }
    }

    eth.on("accountsChanged", handleAccountsChanged);
    return () => eth.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        role,
        roleLabel: role !== null ? ROLE_LABELS[role] : null,
        isRegistered,
        isApproved,
        isAdmin,
        loading,
        connect,
        logout,
        refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}
