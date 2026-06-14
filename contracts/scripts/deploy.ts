import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [admin] = await ethers.getSigners();

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║         MediChain — Deploy Local         ║");
    console.log("╚══════════════════════════════════════════╝\n");
    console.log(`Admin: ${admin.address}\n`);

    // ── 1. MedicalRegistry ──────────────────────────────────────────────────
    process.stdout.write("Deployando MedicalRegistry...  ");
    const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
    const medicalRegistry = await MedicalRegistry.deploy();
    await medicalRegistry.waitForDeployment();
    console.log(`✔  ${await medicalRegistry.getAddress()}`);

    // ── 2. UserRegistry ─────────────────────────────────────────────────────
    process.stdout.write("Deployando UserRegistry...     ");
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();
    console.log(`✔  ${await userRegistry.getAddress()}`);

    // ── 3. MedicalDocumentRegistry ──────────────────────────────────────────
    process.stdout.write("Deployando DocRegistry...      ");
    const DocRegistry = await ethers.getContractFactory("MedicalDocumentRegistry");
    const docRegistry = await DocRegistry.deploy(
        await medicalRegistry.getAddress(),
        await userRegistry.getAddress()
    );
    await docRegistry.waitForDeployment();
    console.log(`✔  ${await docRegistry.getAddress()}`);

    // ── 4. PermissionManager ────────────────────────────────────────────────
    process.stdout.write("Deployando PermissionManager...  ");
    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    const permissionManager = await PermissionManager.deploy(
        await docRegistry.getAddress(),
        await userRegistry.getAddress()
    );
    await permissionManager.waitForDeployment();
    console.log(`✔  ${await permissionManager.getAddress()}`);

    // ── 5. PrescriptionManager ──────────────────────────────────────────────
    process.stdout.write("Deployando PrescriptionManager...");
    const PrescriptionManager = await ethers.getContractFactory("PrescriptionManager");
    const prescriptionManager = await PrescriptionManager.deploy(
        await medicalRegistry.getAddress(),
        await userRegistry.getAddress(),
        await docRegistry.getAddress()
    );
    await prescriptionManager.waitForDeployment();
    console.log(`✔  ${await prescriptionManager.getAddress()}`);

    // ── Conexiones entre contratos ──────────────────────────────────────────
    console.log("\nConectando contratos...");

    await medicalRegistry.setAuthorizedCaller(await userRegistry.getAddress());
    console.log("  ✔  MedicalRegistry ← UserRegistry (authorizedCaller)");

    await userRegistry.setMedicalRegistry(await medicalRegistry.getAddress());
    console.log("  ✔  UserRegistry ← MedicalRegistry");

    // PrescriptionManager necesita poder registrar documentos en nombre del médico
    await medicalRegistry.registerEmitter(await prescriptionManager.getAddress(), 0n);
    console.log("  ✔  PrescriptionManager registrado como emisor en MedicalRegistry");

    // ── Guardar direcciones ─────────────────────────────────────────────────
    const addresses = {
        medicalRegistry: await medicalRegistry.getAddress(),
        userRegistry: await userRegistry.getAddress(),
        docRegistry: await docRegistry.getAddress(),
        permissionManager: await permissionManager.getAddress(),
        prescriptionManager: await prescriptionManager.getAddress(),
    };

    const outputPath = path.join(__dirname, "deployed.json");
    fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));

    const network = await ethers.provider.getNetwork();
    const isTestnet = network.chainId !== 31337n;

    console.log("\n✔  Direcciones guardadas en scripts/deployed.json");
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║           Deploy completado ✔            ║");
    console.log("╚══════════════════════════════════════════╝\n");

    if (isTestnet) {
        console.log("Para verificar los contratos en Etherscan, corré:");
        console.log(`  npx hardhat verify --network sepolia ${addresses.medicalRegistry}`);
        console.log(`  npx hardhat verify --network sepolia ${addresses.userRegistry}`);
        console.log(`  npx hardhat verify --network sepolia ${addresses.docRegistry} ${addresses.medicalRegistry} ${addresses.userRegistry}`);
        console.log(`  npx hardhat verify --network sepolia ${addresses.permissionManager} ${addresses.docRegistry} ${addresses.userRegistry}`);
        console.log(`  npx hardhat verify --network sepolia ${addresses.prescriptionManager} ${addresses.medicalRegistry} ${addresses.userRegistry} ${addresses.docRegistry}`);
        console.log("");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
