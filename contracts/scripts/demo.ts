import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";


function pausar(mensaje = "  [ Enter para continuar... ]") {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise<void>((resolve) => {
        rl.question(`\n${mensaje}\n`, () => {
            rl.close();
            resolve();
        });
    });
}

function titulo(texto: string) {
    const linea = "─".repeat(50);
    console.log(`\n┌${linea}┐`);
    console.log(`│  ${texto.padEnd(48)}│`);
    console.log(`└${linea}┘`);
}

function paso(emoji: string, texto: string) {
    console.log(`  ${emoji}  ${texto}`);
}

function dato(label: string, valor: string) {
    console.log(`     ${label.padEnd(18)} ${valor}`);
}

function separador() {
    console.log("  " + "·".repeat(48));
}


async function main() {
    // Cargar direcciones del deploy
    const deployedPath = path.join(__dirname, "deployed.json");
    if (!fs.existsSync(deployedPath)) {
        console.error("\n  No encontré deployed.json. Corré primero el deploy:\n");
        console.error("   npx hardhat run scripts/deploy.ts --network localhost\n");
        process.exit(1);
    }
    const addresses = JSON.parse(fs.readFileSync(deployedPath, "utf8"));

    // Conectar contratos
    const userRegistry = await ethers.getContractAt("UserRegistry", addresses.userRegistry);
    const docRegistry = await ethers.getContractAt("MedicalDocumentRegistry", addresses.docRegistry);
    const permissionManager = await ethers.getContractAt("PermissionManager", addresses.permissionManager);
    const prescriptionManager = await ethers.getContractAt("PrescriptionManager", addresses.prescriptionManager);

    // Wallets de prueba (las provee hardhat node)
    const [admin, doctor, patient, specialist] = await ethers.getSigners();

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║           MediChain — Demo Interactivo             ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log("\n  Wallets:");
    dato("Admin:", admin.address);
    dato("Médico:", doctor.address);
    dato("Paciente:", patient.address);
    dato("Especialista:", specialist.address);


    titulo("1 · Registro de usuarios");


    paso("🧑‍⚕️", "El médico solicita registrarse como profesional...");
    await userRegistry.connect(doctor).registerAsProfessional(1n); // DOCTOR
    dato("Estado:", "PENDING — esperando aprobación del admin");

    paso("🏥", "El especialista solicita registrarse como institución...");
    await userRegistry.connect(specialist).registerAsProfessional(3n); // INSTITUTION
    dato("Estado:", "PENDING — esperando aprobación del admin");

    paso("🧑‍💼", "El admin aprueba al médico...");
    await userRegistry.connect(admin).approveUser(doctor.address);
    const esVerificado = await userRegistry.isVerifiedEmitter(doctor.address);
    dato("Médico verificado:", esVerificado ? "✔  sí" : "✘  no");

    paso("🧑‍💼", "El admin aprueba al especialista...");
    await userRegistry.connect(admin).approveUser(specialist.address);
    dato("Especialista verificado:", (await userRegistry.isVerifiedEmitter(specialist.address)) ? "✔  sí" : "✘  no");

    paso("🙋", "El paciente se registra (sin aprobación necesaria)...");
    await userRegistry.connect(patient).registerAsPatient();
    dato("Paciente registrado:", (await userRegistry.isRegistered(patient.address)) ? "✔  sí" : "✘  no");

    await pausar();



    titulo("2 · Documentos médicos");


    paso("📄", "El médico registra un análisis de sangre para el paciente...");
    const hashAnalisis = ethers.keccak256(ethers.toUtf8Bytes("analisis_sangre_junio_2025.pdf"));
    await docRegistry.connect(doctor).registerDocument(
        patient.address,
        hashAnalisis,
        "analisis de sangre",
        "ipfs://QmAnalisisSangre123"
    );
    dato("Doc ID:", "0");
    dato("Hash:", hashAnalisis.slice(0, 20) + "...");
    dato("Estado:", "VERIFIED_ISSUER_DOCUMENT");

    separador();

    paso("📎", "El paciente sube su propia radiografía...");
    const hashRadio = ethers.keccak256(ethers.toUtf8Bytes("radiografia_torax_2024.jpg"));
    await docRegistry.connect(patient).uploadOwnDocument(
        hashRadio,
        "radiografia",
        "ipfs://QmRadiografia456"
    );
    dato("Doc ID:", "1");
    dato("Estado:", "PATIENT_UPLOADED");

    separador();

    paso("🔍", "Verificando integridad del análisis de sangre...");
    const valido = await docRegistry.verifyDocument(0n, hashAnalisis);
    dato("¿Hash coincide?:", valido ? "✔  sí — documento íntegro" : "✘  no — fue modificado");

    paso("🔍", "Simulando documento alterado...");
    const hashFalso = ethers.keccak256(ethers.toUtf8Bytes("archivo_modificado.pdf"));
    const alterado = await docRegistry.verifyDocument(0n, hashFalso);
    dato("¿Hash coincide?:", alterado ? "✔  sí" : "✘  no — ALERTA: documento alterado");

    const docsDelPaciente = await docRegistry.getPatientDocuments(patient.address);
    separador();
    dato("Documentos del paciente:", `${docsDelPaciente.length} registrados (IDs: ${docsDelPaciente.join(", ")})`);

    await pausar();


    titulo("3 · Permisos de acceso");


    paso("🔒", "El especialista intenta ver un doc sin permiso...");
    const sinPermiso = await permissionManager.hasAccess(patient.address, 0n, specialist.address);
    dato("¿Tiene acceso?:", sinPermiso ? "✔  sí" : "✘  no — acceso denegado");

    paso("🔓", "El paciente le da acceso global al especialista...");
    await permissionManager.connect(patient).grantGlobalAccess(specialist.address);
    const conPermiso = await permissionManager.hasAccess(patient.address, 0n, specialist.address);
    dato("¿Tiene acceso al doc 0?:", conPermiso ? "✔  sí" : "✘  no");
    const conPermiso1 = await permissionManager.hasAccess(patient.address, 1n, specialist.address);
    dato("¿Tiene acceso al doc 1?:", conPermiso1 ? "✔  sí (acceso global)" : "✘  no");

    paso("🚫", "El paciente revoca el acceso global al especialista...");
    await permissionManager.connect(patient).revokeGlobalAccess(specialist.address);
    const revocado = await permissionManager.hasAccess(patient.address, 0n, specialist.address);
    dato("¿Sigue teniendo acceso?:", revocado ? "✔  sí" : "✘  no — acceso revocado");

    paso("📋", "El paciente da acceso solo al doc 0 (análisis)...");
    await permissionManager.connect(patient).grantDocumentAccess(0n, specialist.address);
    const soloDoc0 = await permissionManager.hasAccess(patient.address, 0n, specialist.address);
    const noDoc1 = await permissionManager.hasAccess(patient.address, 1n, specialist.address);
    dato("¿Acceso al análisis (doc 0)?:", soloDoc0 ? "✔  sí" : "✘  no");
    dato("¿Acceso a la radio (doc 1)?:", noDoc1 ? "✔  sí" : "✘  no — solo compartió el análisis");

    await pausar();


    titulo("4 · Recetas médicas");


    paso("💊", "El paciente solicita una receta al médico...");
    const txReceta = await prescriptionManager.connect(patient).requestPrescription(
        doctor.address,
        "antibioticos"
    );
    const receiptReceta = await txReceta.wait();
    const eventoReceta = receiptReceta!.logs.find((log: any) => log.fragment?.name === "PrescriptionRequested");
    const recetaId = eventoReceta?.args[0];
    dato("Receta ID:", recetaId?.toString());
    dato("Estado:", "PENDING");

    separador();

    paso("✅", "El médico acepta la solicitud...");
    await prescriptionManager.connect(doctor).acceptPrescription(recetaId);
    dato("Estado:", "ACCEPTED");

    separador();

    paso("📝", "El médico emite la receta con su hash...");
    const hashReceta = ethers.keccak256(ethers.toUtf8Bytes("receta_antibioticos_julio_2025.pdf"));
    await prescriptionManager.connect(doctor).issuePrescription(
        recetaId,
        hashReceta,
        "ipfs://QmRecetaAntibioticos789"
    );
    dato("Estado:", "ISSUED");
    dato("Hash receta:", hashReceta.slice(0, 20) + "...");

    separador();

    // La receta se registra automáticamente en el historial
    const docsFinales = await docRegistry.getPatientDocuments(patient.address);
    dato("Documentos del paciente:", `${docsFinales.length} (la receta se agregó al historial)`);

    const receta = await prescriptionManager.getPrescription(recetaId);
    paso("🔎", "Datos de la receta en blockchain:");
    dato("Paciente:", receta.patient);
    dato("Médico:", receta.doctor);
    dato("Tipo:", receta.prescriptionType);
    dato("Estado:", ["PENDING","ACCEPTED","REJECTED","ISSUED","CANCELLED"][Number(receta.status)]);

    // ────────────────────────────────────────────────────────────────────────
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║              Demo completada ✔                     ║");
    console.log("╚════════════════════════════════════════════════════╝\n");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
