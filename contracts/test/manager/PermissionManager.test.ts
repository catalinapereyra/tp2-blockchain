import { expect } from "chai";
import { ethers } from "hardhat";

describe("PermissionManager", function () {

    const SAMPLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("doc1"));
    const SAMPLE_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("doc2"));
    const DOC_TYPE = "estudio";
    const OFF_CHAIN_REF = "ipfs://QmXyz";

    async function deployAll() {
        const [admin, doctor, patient, grantee, stranger] = await ethers.getSigners();

        const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
        const userRegistry: any = await UserRegistryFactory.deploy();
        await userRegistry.waitForDeployment();

        const DocRegistryFactory = await ethers.getContractFactory("MedicalDocumentRegistry");
        const docRegistry: any = await DocRegistryFactory.deploy(
            await userRegistry.getAddress()
        );
        await docRegistry.waitForDeployment();

        const PermissionManagerFactory = await ethers.getContractFactory("PermissionManager");
        const permissionManager: any = await PermissionManagerFactory.deploy(
            await docRegistry.getAddress(),
            await userRegistry.getAddress()
        );
        await permissionManager.waitForDeployment();

        await userRegistry.connect(doctor).registerAsProfessional(1n);
        await userRegistry.connect(admin).approveUser(doctor.address);

        await userRegistry.connect(patient).registerAsPatient();

        return { permissionManager, docRegistry, userRegistry, admin, doctor, patient, grantee, stranger };
    }


    describe("constructor", function () {
        it("reverts si documentRegistry es address cero", async function () {
            const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
            const userRegistry: any = await UserRegistryFactory.deploy();
            await userRegistry.waitForDeployment();

            const PermissionManagerFactory = await ethers.getContractFactory("PermissionManager");

            await expect(
                PermissionManagerFactory.deploy(ethers.ZeroAddress, await userRegistry.getAddress())
            ).to.be.revertedWith("PermissionManager: documentRegistry invalido");
        });

        it("reverts si userRegistry es address cero", async function () {
            const DocRegistryFactory = await ethers.getContractFactory("MedicalDocumentRegistry");
            const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
            const userRegistry: any = await UserRegistryFactory.deploy();
            await userRegistry.waitForDeployment();
            const docReg: any = await DocRegistryFactory.deploy(await userRegistry.getAddress());
            await docReg.waitForDeployment();

            const PermissionManagerFactory = await ethers.getContractFactory("PermissionManager");

            await expect(
                PermissionManagerFactory.deploy(await docReg.getAddress(), ethers.ZeroAddress)
            ).to.be.revertedWith("PermissionManager: userRegistry invalido");
        });
    });


    describe("grantGlobalAccess", function () {
        it("el paciente otorga acceso global a una dirección", async function () {
            const { permissionManager, patient, grantee } = await deployAll();

            await expect(permissionManager.connect(patient).grantGlobalAccess(grantee.address))
                .to.emit(permissionManager, "GlobalAccessGranted")
                .withArgs(patient.address, grantee.address);

            expect(await permissionManager.hasGlobalAccess(patient.address, grantee.address)).to.equal(true);
        });

        it("reverts si el paciente no está registrado", async function () {
            const { permissionManager, stranger, grantee } = await deployAll();

            await expect(
                permissionManager.connect(stranger).grantGlobalAccess(grantee.address)
            ).to.be.revertedWith("PermissionManager: no registrado");
        });

        it("reverts si el beneficiario es address cero", async function () {
            const { permissionManager, patient } = await deployAll();

            await expect(
                permissionManager.connect(patient).grantGlobalAccess(ethers.ZeroAddress)
            ).to.be.revertedWith("PermissionManager: beneficiario invalido");
        });

        it("reverts si el paciente intenta autorizarse a si mismo", async function () {
            const { permissionManager, patient } = await deployAll();

            await expect(
                permissionManager.connect(patient).grantGlobalAccess(patient.address)
            ).to.be.revertedWith("PermissionManager: no puede autorizarse a si mismo");
        });

        it("reverts si el acceso ya fue otorgado", async function () {
            const { permissionManager, patient, grantee } = await deployAll();

            await permissionManager.connect(patient).grantGlobalAccess(grantee.address);

            await expect(
                permissionManager.connect(patient).grantGlobalAccess(grantee.address)
            ).to.be.revertedWith("PermissionManager: acceso ya otorgado");
        });
    });


    describe("revokeGlobalAccess", function () {
        it("el paciente revoca el acceso global", async function () {
            const { permissionManager, patient, grantee } = await deployAll();

            await permissionManager.connect(patient).grantGlobalAccess(grantee.address);

            await expect(permissionManager.connect(patient).revokeGlobalAccess(grantee.address))
                .to.emit(permissionManager, "GlobalAccessRevoked")
                .withArgs(patient.address, grantee.address);

            expect(await permissionManager.hasGlobalAccess(patient.address, grantee.address)).to.equal(false);
        });

        it("reverts si no tenía acceso global", async function () {
            const { permissionManager, patient, grantee } = await deployAll();

            await expect(
                permissionManager.connect(patient).revokeGlobalAccess(grantee.address)
            ).to.be.revertedWith("PermissionManager: no tiene acceso global");
        });
    });


    describe("grantDocumentAccess", function () {
        it("el paciente otorga acceso a un documento específico", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address))
                .to.emit(permissionManager, "DocumentAccessGranted")
                .withArgs(patient.address, 0n, grantee.address);

            expect(await permissionManager.hasDocumentAccess(patient.address, 0n, grantee.address)).to.equal(true);
        });

        it("el paciente puede dar acceso a un documento que subió él mismo", async function () {
            const { permissionManager, docRegistry, patient, grantee } = await deployAll();

            await docRegistry.connect(patient).uploadOwnDocument(SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address))
                .to.emit(permissionManager, "DocumentAccessGranted");
        });

        it("reverts si el paciente no está registrado", async function () {
            const { permissionManager, docRegistry, doctor, patient, stranger } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(
                permissionManager.connect(stranger).grantDocumentAccess(0n, stranger.address)
            ).to.be.revertedWith("PermissionManager: no registrado");
        });

        it("reverts si el beneficiario es address cero", async function () {
            const { permissionManager, docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(
                permissionManager.connect(patient).grantDocumentAccess(0n, ethers.ZeroAddress)
            ).to.be.revertedWith("PermissionManager: beneficiario invalido");
        });

        it("reverts si el paciente intenta autorizarse a si mismo", async function () {
            const { permissionManager, docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(
                permissionManager.connect(patient).grantDocumentAccess(0n, patient.address)
            ).to.be.revertedWith("PermissionManager: no puede autorizarse a si mismo");
        });

        it("reverts si el documento no existe", async function () {
            const { permissionManager, patient, grantee } = await deployAll();

            await expect(
                permissionManager.connect(patient).grantDocumentAccess(999n, grantee.address)
            ).to.be.revertedWith("PermissionManager: documento no existe");
        });

        it("reverts si el documento no le pertenece al paciente", async function () {
            const { permissionManager, docRegistry, userRegistry, doctor, patient, grantee, admin } = await deployAll();

            // Registrar un segundo paciente
            const [,,,, secondPatient] = await ethers.getSigners();
            await userRegistry.connect(secondPatient).registerAsPatient();

            // El médico sube un documento al segundo paciente
            await docRegistry.connect(doctor).registerDocument(secondPatient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            // El primer paciente intenta dar acceso a un doc que no es suyo
            await expect(
                permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address)
            ).to.be.revertedWith("PermissionManager: no es dueno del documento");
        });

        it("reverts si el acceso ya fue otorgado", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address);

            await expect(
                permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address)
            ).to.be.revertedWith("PermissionManager: acceso ya otorgado");
        });
    });


    describe("revokeDocumentAccess", function () {
        it("el paciente revoca el acceso a un documento específico", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address);

            await expect(permissionManager.connect(patient).revokeDocumentAccess(0n, grantee.address))
                .to.emit(permissionManager, "DocumentAccessRevoked")
                .withArgs(patient.address, 0n, grantee.address);

            expect(await permissionManager.hasDocumentAccess(patient.address, 0n, grantee.address)).to.equal(false);
        });

        it("reverts si no tenía acceso al documento", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(
                permissionManager.connect(patient).revokeDocumentAccess(0n, grantee.address)
            ).to.be.revertedWith("PermissionManager: no tiene acceso al documento");
        });
    });


    describe("hasAccess", function () {
        it("devuelve true si tiene acceso global (aunque no tenga acceso específico)", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await permissionManager.connect(patient).grantGlobalAccess(grantee.address);

            expect(await permissionManager.hasAccess(patient.address, 0n, grantee.address)).to.equal(true);
        });

        it("devuelve true si tiene acceso específico (aunque no tenga acceso global)", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address);

            expect(await permissionManager.hasAccess(patient.address, 0n, grantee.address)).to.equal(true);
        });

        it("devuelve false si no tiene ningún tipo de acceso", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            expect(await permissionManager.hasAccess(patient.address, 0n, grantee.address)).to.equal(false);
        });

        it("devuelve false tras revocar el acceso global", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await permissionManager.connect(patient).grantGlobalAccess(grantee.address);
            await permissionManager.connect(patient).revokeGlobalAccess(grantee.address);

            expect(await permissionManager.hasAccess(patient.address, 0n, grantee.address)).to.equal(false);
        });

        it("devuelve false tras revocar el acceso específico", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address);
            await permissionManager.connect(patient).revokeDocumentAccess(0n, grantee.address);

            expect(await permissionManager.hasAccess(patient.address, 0n, grantee.address)).to.equal(false);
        });

        it("el acceso a un documento no afecta el acceso a otro", async function () {
            const { permissionManager, docRegistry, doctor, patient, grantee } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH_2, DOC_TYPE, OFF_CHAIN_REF);

            await permissionManager.connect(patient).grantDocumentAccess(0n, grantee.address);

            expect(await permissionManager.hasAccess(patient.address, 0n, grantee.address)).to.equal(true);
            expect(await permissionManager.hasAccess(patient.address, 1n, grantee.address)).to.equal(false);
        });
    });
});
