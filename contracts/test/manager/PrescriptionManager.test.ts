import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrescriptionManager", function () {

    const PrescriptionStatus = {
        PENDING: 0n,
        ACCEPTED: 1n,
        REJECTED: 2n,
        ISSUED: 3n,
        CANCELLED: 4n,
    };

    const PRESCRIPTION_TYPE = "antibioticos";
    const SAMPLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("receta pdf"));
    const OFF_CHAIN_REF = "ipfs://QmReceta";

    async function deployAll() {
        const [admin, doctor, patient, stranger] = await ethers.getSigners();

        const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
        const userRegistry: any = await UserRegistryFactory.deploy();
        await userRegistry.waitForDeployment();

        const DocRegistryFactory = await ethers.getContractFactory("MedicalDocumentRegistry");
        const docRegistry: any = await DocRegistryFactory.deploy(
            await userRegistry.getAddress()
        );
        await docRegistry.waitForDeployment();

        const PrescriptionManagerFactory = await ethers.getContractFactory("PrescriptionManager");
        const prescriptionManager: any = await PrescriptionManagerFactory.deploy(
            await userRegistry.getAddress(),
            await docRegistry.getAddress()
        );
        await prescriptionManager.waitForDeployment();

        // PrescriptionManager registra documentos en nombre del médico,
        // así que el owner de docRegistry lo autoriza como caller de confianza.
        await docRegistry.setAuthorizedCaller(await prescriptionManager.getAddress());

        // Registrar y aprobar al médico
        await userRegistry.connect(doctor).registerAsProfessional(1n); // DOCTOR
        await userRegistry.connect(admin).approveUser(doctor.address);

        // Registrar al paciente
        await userRegistry.connect(patient).registerAsPatient();

        return { prescriptionManager, docRegistry, userRegistry, admin, doctor, patient, stranger };
    }

    // Helper: crea una solicitud pendiente
    async function createPending(prescriptionManager: any, patient: any, doctor: any) {
        const tx = await prescriptionManager.connect(patient).requestPrescription(doctor.address, PRESCRIPTION_TYPE);
        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => log.fragment?.name === "PrescriptionRequested");
        return event.args[0]; // id
    }

    // Helper: crea una solicitud aceptada
    async function createAccepted(prescriptionManager: any, patient: any, doctor: any) {
        const id = await createPending(prescriptionManager, patient, doctor);
        await prescriptionManager.connect(doctor).acceptPrescription(id);
        return id;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    describe("constructor", function () {
        it("reverts si userRegistry es address cero", async function () {
            const [, , , , extra] = await ethers.getSigners();
            const PrescriptionManagerFactory = await ethers.getContractFactory("PrescriptionManager");

            await expect(
                PrescriptionManagerFactory.deploy(ethers.ZeroAddress, extra.address)
            ).to.be.revertedWith("PrescriptionManager: userRegistry invalido");
        });

        it("reverts si documentRegistry es address cero", async function () {
            const [, , , , extra] = await ethers.getSigners();
            const PrescriptionManagerFactory = await ethers.getContractFactory("PrescriptionManager");

            await expect(
                PrescriptionManagerFactory.deploy(extra.address, ethers.ZeroAddress)
            ).to.be.revertedWith("PrescriptionManager: documentRegistry invalido");
        });
    });

    // ─── requestPrescription ──────────────────────────────────────────────────

    describe("requestPrescription", function () {
        it("el paciente solicita una receta al médico verificado", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();

            await expect(
                prescriptionManager.connect(patient).requestPrescription(doctor.address, PRESCRIPTION_TYPE)
            )
                .to.emit(prescriptionManager, "PrescriptionRequested")
                .withArgs(0n, patient.address, doctor.address, PRESCRIPTION_TYPE);

            const p = await prescriptionManager.getPrescription(0n);
            expect(p.patient).to.equal(patient.address);
            expect(p.doctor).to.equal(doctor.address);
            expect(p.prescriptionType).to.equal(PRESCRIPTION_TYPE);
            expect(p.status).to.equal(PrescriptionStatus.PENDING);
        });

        it("la receta queda en el historial del paciente y del médico", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();

            await prescriptionManager.connect(patient).requestPrescription(doctor.address, PRESCRIPTION_TYPE);

            expect((await prescriptionManager.getPatientPrescriptions(patient.address)).length).to.equal(1);
            expect((await prescriptionManager.getDoctorPrescriptions(doctor.address)).length).to.equal(1);
        });

        it("devuelve el id de la nueva receta", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();

            const tx = await prescriptionManager.connect(patient).requestPrescription(doctor.address, PRESCRIPTION_TYPE);
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => log.fragment?.name === "PrescriptionRequested");
            expect(event.args[0]).to.equal(0n);
        });

        it("reverts si el paciente no está registrado", async function () {
            const { prescriptionManager, doctor, stranger } = await deployAll();

            await expect(
                prescriptionManager.connect(stranger).requestPrescription(doctor.address, PRESCRIPTION_TYPE)
            ).to.be.revertedWith("PrescriptionManager: paciente no registrado");
        });

        it("reverts si el médico no está verificado", async function () {
            const { prescriptionManager, patient, stranger } = await deployAll();

            await expect(
                prescriptionManager.connect(patient).requestPrescription(stranger.address, PRESCRIPTION_TYPE)
            ).to.be.revertedWith("PrescriptionManager: medico no verificado");
        });

        it("reverts si el médico se solicita una receta a si mismo", async function () {
            const { prescriptionManager, doctor } = await deployAll();

            // El médico ya está registrado y verificado; al pedirse a sí mismo
            // pasa las validaciones de registro/verificación pero choca con la
            // restricción de no poder solicitarse a sí mismo.
            await expect(
                prescriptionManager.connect(doctor).requestPrescription(doctor.address, PRESCRIPTION_TYPE)
            ).to.be.revertedWith("PrescriptionManager: no puede solicitarse a si mismo");
        });
    });

    // ─── cancelPrescription ───────────────────────────────────────────────────

    describe("cancelPrescription", function () {
        it("el paciente cancela una solicitud PENDING", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);

            await expect(prescriptionManager.connect(patient).cancelPrescription(id))
                .to.emit(prescriptionManager, "PrescriptionCancelled")
                .withArgs(id, patient.address);

            const p = await prescriptionManager.getPrescription(id);
            expect(p.status).to.equal(PrescriptionStatus.CANCELLED);
        });

        it("el paciente cancela una solicitud ACCEPTED", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);

            await expect(prescriptionManager.connect(patient).cancelPrescription(id))
                .to.emit(prescriptionManager, "PrescriptionCancelled");

            const p = await prescriptionManager.getPrescription(id);
            expect(p.status).to.equal(PrescriptionStatus.CANCELLED);
        });

        it("reverts si no es el paciente", async function () {
            const { prescriptionManager, doctor, patient, stranger } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);

            await expect(
                prescriptionManager.connect(stranger).cancelPrescription(id)
            ).to.be.revertedWith("PrescriptionManager: no es el paciente");
        });

        it("reverts si la receta ya fue emitida", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);
            await prescriptionManager.connect(doctor).issuePrescription(id, SAMPLE_HASH, OFF_CHAIN_REF);

            await expect(
                prescriptionManager.connect(patient).cancelPrescription(id)
            ).to.be.revertedWith("PrescriptionManager: no se puede cancelar");
        });

        it("reverts si la receta fue rechazada", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);
            await prescriptionManager.connect(doctor).rejectPrescription(id);

            await expect(
                prescriptionManager.connect(patient).cancelPrescription(id)
            ).to.be.revertedWith("PrescriptionManager: no se puede cancelar");
        });

        it("reverts si la receta no existe", async function () {
            const { prescriptionManager, patient } = await deployAll();

            await expect(
                prescriptionManager.connect(patient).cancelPrescription(999n)
            ).to.be.revertedWith("PrescriptionManager: receta no existe");
        });
    });

    // ─── acceptPrescription ───────────────────────────────────────────────────

    describe("acceptPrescription", function () {
        it("el médico acepta la solicitud PENDING", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);

            await expect(prescriptionManager.connect(doctor).acceptPrescription(id))
                .to.emit(prescriptionManager, "PrescriptionAccepted")
                .withArgs(id, doctor.address);

            const p = await prescriptionManager.getPrescription(id);
            expect(p.status).to.equal(PrescriptionStatus.ACCEPTED);
        });

        it("reverts si no es el médico asignado", async function () {
            const { prescriptionManager, doctor, patient, stranger } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);

            await expect(
                prescriptionManager.connect(stranger).acceptPrescription(id)
            ).to.be.revertedWith("PrescriptionManager: no es el medico asignado");
        });

        it("reverts si la receta no está PENDING", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);

            await expect(
                prescriptionManager.connect(doctor).acceptPrescription(id)
            ).to.be.revertedWith("PrescriptionManager: no esta pendiente");
        });

        it("reverts si la receta no existe", async function () {
            const { prescriptionManager, doctor } = await deployAll();

            await expect(
                prescriptionManager.connect(doctor).acceptPrescription(999n)
            ).to.be.revertedWith("PrescriptionManager: receta no existe");
        });
    });

    // ─── rejectPrescription ───────────────────────────────────────────────────

    describe("rejectPrescription", function () {
        it("el médico rechaza la solicitud PENDING", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);

            await expect(prescriptionManager.connect(doctor).rejectPrescription(id))
                .to.emit(prescriptionManager, "PrescriptionRejected")
                .withArgs(id, doctor.address);

            const p = await prescriptionManager.getPrescription(id);
            expect(p.status).to.equal(PrescriptionStatus.REJECTED);
        });

        it("reverts si no es el médico asignado", async function () {
            const { prescriptionManager, doctor, patient, stranger } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);

            await expect(
                prescriptionManager.connect(stranger).rejectPrescription(id)
            ).to.be.revertedWith("PrescriptionManager: no es el medico asignado");
        });

        it("reverts si la receta no está PENDING", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);
            await prescriptionManager.connect(doctor).rejectPrescription(id);

            await expect(
                prescriptionManager.connect(doctor).rejectPrescription(id)
            ).to.be.revertedWith("PrescriptionManager: no esta pendiente");
        });

        it("reverts si la receta no existe", async function () {
            const { prescriptionManager, doctor } = await deployAll();

            await expect(
                prescriptionManager.connect(doctor).rejectPrescription(999n)
            ).to.be.revertedWith("PrescriptionManager: receta no existe");
        });
    });

    // ─── issuePrescription ────────────────────────────────────────────────────

    describe("issuePrescription", function () {
        it("el médico emite la receta con su hash", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);

            await expect(prescriptionManager.connect(doctor).issuePrescription(id, SAMPLE_HASH, OFF_CHAIN_REF))
                .to.emit(prescriptionManager, "PrescriptionIssued")
                .withArgs(id, doctor.address, SAMPLE_HASH);

            const p = await prescriptionManager.getPrescription(id);
            expect(p.status).to.equal(PrescriptionStatus.ISSUED);
            expect(p.documentHash).to.equal(SAMPLE_HASH);
            expect(p.offChainRef).to.equal(OFF_CHAIN_REF);
        });

        it("la receta emitida queda registrada en MedicalDocumentRegistry", async function () {
            const { prescriptionManager, docRegistry, doctor, patient } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);

            await prescriptionManager.connect(doctor).issuePrescription(id, SAMPLE_HASH, OFF_CHAIN_REF);

            // El documento debe existir en docRegistry
            expect(await docRegistry.documentExists(0n)).to.equal(true);
            expect(await docRegistry.isHashRegistered(SAMPLE_HASH)).to.equal(true);

            const doc = await docRegistry.getDocument(0n);
            expect(doc.patient).to.equal(patient.address);
            expect(doc.documentHash).to.equal(SAMPLE_HASH);
        });

        it("los documentos del paciente incluyen la receta emitida", async function () {
            const { prescriptionManager, docRegistry, doctor, patient } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);

            await prescriptionManager.connect(doctor).issuePrescription(id, SAMPLE_HASH, OFF_CHAIN_REF);

            const docIds = await docRegistry.getPatientDocuments(patient.address);
            expect(docIds.length).to.equal(1);
        });

        it("reverts si no es el médico asignado", async function () {
            const { prescriptionManager, doctor, patient, stranger } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);

            await expect(
                prescriptionManager.connect(stranger).issuePrescription(id, SAMPLE_HASH, OFF_CHAIN_REF)
            ).to.be.revertedWith("PrescriptionManager: no es el medico asignado");
        });

        it("reverts si la receta no está ACCEPTED", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createPending(prescriptionManager, patient, doctor);

            await expect(
                prescriptionManager.connect(doctor).issuePrescription(id, SAMPLE_HASH, OFF_CHAIN_REF)
            ).to.be.revertedWith("PrescriptionManager: no esta aceptada");
        });

        it("reverts si el hash es cero", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            const id = await createAccepted(prescriptionManager, patient, doctor);

            await expect(
                prescriptionManager.connect(doctor).issuePrescription(id, ethers.ZeroHash, OFF_CHAIN_REF)
            ).to.be.revertedWith("PrescriptionManager: hash invalido");
        });

        it("reverts si la receta no existe", async function () {
            const { prescriptionManager, doctor } = await deployAll();

            await expect(
                prescriptionManager.connect(doctor).issuePrescription(999n, SAMPLE_HASH, OFF_CHAIN_REF)
            ).to.be.revertedWith("PrescriptionManager: receta no existe");
        });
    });

    // ─── Vistas ───────────────────────────────────────────────────────────────

    describe("vistas", function () {
        it("prescriptionExists devuelve false para id inexistente", async function () {
            const { prescriptionManager } = await deployAll();

            expect(await prescriptionManager.prescriptionExists(0n)).to.equal(false);
        });

        it("prescriptionExists devuelve true tras solicitar", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();
            await createPending(prescriptionManager, patient, doctor);

            expect(await prescriptionManager.prescriptionExists(0n)).to.equal(true);
        });

        it("getPrescription reverts si no existe", async function () {
            const { prescriptionManager } = await deployAll();

            await expect(
                prescriptionManager.getPrescription(999n)
            ).to.be.revertedWith("PrescriptionManager: receta no existe");
        });

        it("getPatientPrescriptions devuelve ids correctos para múltiples solicitudes", async function () {
            const { prescriptionManager, doctor, patient } = await deployAll();

            await prescriptionManager.connect(patient).requestPrescription(doctor.address, PRESCRIPTION_TYPE);
            await prescriptionManager.connect(patient).requestPrescription(doctor.address, "vitaminas");

            const ids = await prescriptionManager.getPatientPrescriptions(patient.address);
            expect(ids.length).to.equal(2);
            expect(ids[0]).to.equal(0n);
            expect(ids[1]).to.equal(1n);
        });

        it("getDoctorPrescriptions devuelve ids correctos", async function () {
            const { prescriptionManager, userRegistry, doctor, patient, admin } = await deployAll();

            // Registrar un segundo paciente
            const [,,,, patient2] = await ethers.getSigners();
            await userRegistry.connect(patient2).registerAsPatient();

            await prescriptionManager.connect(patient).requestPrescription(doctor.address, PRESCRIPTION_TYPE);
            await prescriptionManager.connect(patient2).requestPrescription(doctor.address, "vitaminas");

            const ids = await prescriptionManager.getDoctorPrescriptions(doctor.address);
            expect(ids.length).to.equal(2);
        });
    });
});
