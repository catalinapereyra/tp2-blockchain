/**
 * Prueba el flujo completo de auth + upload:
 * 1. Pide nonce al back
 * 2. Firma el nonce con una wallet de Hardhat (solo para testing)
 * 3. Verifica la firma → obtiene JWT
 * 4. Sube un archivo de prueba a IPFS
 * 5. Muestra la URL para verlo en el navegador
 */

import * as dotenv from "dotenv";
import { ethers } from "ethers";
import * as fs from "fs";
import FormData = require("form-data");
import fetch from "node-fetch";
import * as path from "path";

dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 3001}/api`;

// Wallet #0 de Hardhat — clave pública conocida, solo para testing local
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  const wallet = new ethers.Wallet(TEST_PRIVATE_KEY);
  const address = wallet.address.toLowerCase();

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     MediChain — Test Auth + Upload       ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`  Wallet: ${address}\n`);

  // ── 1. Pedir nonce ──────────────────────────────────────────────────────
  process.stdout.write("  1. Pidiendo nonce...          ");
  const nonceRes = await fetch(`${BASE_URL}/auth/nonce/${address}`);
  const { nonce } = (await nonceRes.json()) as { nonce: string };
  console.log(`✔  "${nonce}"`);

  // ── 2. Firmar el nonce ──────────────────────────────────────────────────
  process.stdout.write("  2. Firmando con MetaMask...   ");
  const message = `MediChain login: ${nonce}`;
  const signature = await wallet.signMessage(message);
  console.log(`✔  ${signature.slice(0, 20)}...`);

  // ── 3. Verificar firma → JWT ────────────────────────────────────────────
  process.stdout.write("  3. Verificando firma...       ");
  const verifyRes = await fetch(`${BASE_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: address, signature }),
  });
  const { accessToken } = (await verifyRes.json()) as { accessToken: string };
  console.log(`✔  JWT obtenido`);

  // ── 4. Subir archivo ────────────────────────────────────────────────────
  process.stdout.write("  4. Subiendo archivo a IPFS... ");

  // Crear archivo de prueba temporal
  const testFilePath = path.join(__dirname, "test-doc.txt");
  fs.writeFileSync(
    testFilePath,
    `MediChain — documento de prueba\nWallet: ${address}\nFecha: ${new Date().toISOString()}\n`,
  );

  const form = new FormData();
  form.append("file", fs.createReadStream(testFilePath), {
    filename: "test-doc.pdf",
    contentType: "application/pdf",
  });

  const uploadRes = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, ...form.getHeaders() },
    body: form,
  });
  const result = (await uploadRes.json()) as {
    cid: string;
    url: string;
    fileHash: string;
  };

  // Limpiar archivo temporal
  fs.unlinkSync(testFilePath);

  console.log(`✔\n`);

  // ── 5. Resultado ────────────────────────────────────────────────────────
  console.log("  ┌─────────────────────────────────────────────────┐");
  console.log(`  │  CID:      ${result.cid}`);
  console.log(`  │  Hash:     ${result.fileHash.slice(0, 30)}...`);
  console.log("  │");
  console.log(`  │  URL:      ${result.url}`);
  console.log("  │");
  console.log("  │  Abrí esa URL en el navegador para ver el archivo");
  console.log("  └─────────────────────────────────────────────────┘\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
