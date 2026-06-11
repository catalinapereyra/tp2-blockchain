import PinataSDK from "@pinata/sdk";
import * as dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

async function main() {
  const pinata = new PinataSDK({
    pinataApiKey: process.env.PINATA_API_KEY!,
    pinataSecretApiKey: process.env.PINATA_SECRET_KEY!,
  });

  // Verificar conexión
  process.stdout.write("Conectando con Pinata... ");
  await pinata.testAuthentication();
  console.log("✔");

  // Crear un archivo de prueba en memoria
  const contenido = `MediChain — test de subida
Fecha: ${new Date().toISOString()}
Este archivo fue subido desde el backend para probar la conexión con IPFS.`;

  const buffer = Buffer.from(contenido, "utf-8");
  const stream = Readable.from(buffer);

  // Subir a IPFS
  process.stdout.write("Subiendo archivo de prueba a IPFS... ");
  const result = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: { name: "medichain-test.txt" },
  });
  console.log("✔\n");

  const url = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;

  console.log("  CID:     ", result.IpfsHash);
  console.log("  URL:     ", url);
  console.log("\n  Abrí esa URL en el navegador para ver el archivo ☝️\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
