import { expect } from "chai";
import { ethers } from "hardhat";

describe("MedicalRegistry", function () {

    const EmitterType = { DOCTOR: 0n, LABORATORY: 1n, INSTITUTION: 2n };

    async function deployMedicalRegistry() {
        const [admin, doctor, laboratory, institution, stranger] =
            await ethers.getSigners();

        const MedicalRegistryFactory = await ethers.getContractFactory("MedicalRegistry");
        const medicalRegistry: any = await MedicalRegistryFactory.deploy();
        await medicalRegistry.waitForDeployment();

        return { medicalRegistry, admin, doctor, laboratory, institution, stranger };
    }

    async function deployBoth() {
        const [admin, doctor, laboratory, institution, stranger] =
            await ethers.getSigners();

        const MedicalRegistryFactory = await ethers.getContractFactory("MedicalRegistry");
        const medicalRegistry: any = await MedicalRegistryFactory.deploy();
        await medicalRegistry.waitForDeployment();

        const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
        const userRegistry: any = await UserRegistryFactory.deploy();
        await userRegistry.waitForDeployment();

        await medicalRegistry.setAuthorizedCaller(await userRegistry.getAddress());
        await userRegistry.setMedicalRegistry(await medicalRegistry.getAddress());

        return { medicalRegistry, userRegistry, admin, doctor, laboratory, institution, stranger };
    }


    describe("setAuthorizedCaller", function () {
        it("el admin puede setear el caller autorizado", async function () {
            const { medicalRegistry, stranger } = await deployMedicalRegistry();

            await expect(medicalRegistry.setAuthorizedCaller(stranger.address))
                .to.emit(medicalRegistry, "AuthorizedCallerSet")
                .withArgs(stranger.address);

            expect(await medicalRegistry.getAuthorizedCaller()).to.equal(stranger.address);
        });

        it("reverts si no es el admin", async function () {
            const { medicalRegistry, stranger } = await deployMedicalRegistry();

            await expect(
                medicalRegistry.connect(stranger).setAuthorizedCaller(stranger.address)
            ).to.be.revertedWithCustomError(medicalRegistry, "OwnableUnauthorizedAccount");
        });

        it("reverts si la dirección es cero", async function () {
            const { medicalRegistry } = await deployMedicalRegistry();

            await expect(
                medicalRegistry.setAuthorizedCaller(ethers.ZeroAddress)
            ).to.be.revertedWith("MedicalRegistry: direccion invalida");
        });
    });


    describe("registerEmitter", function () {
        it("el admin puede registrar un emisor", async function () {
            const { medicalRegistry, admin, doctor } = await deployMedicalRegistry();

            await expect(
                medicalRegistry.connect(admin).registerEmitter(doctor.address, EmitterType.DOCTOR)
            )
                .to.emit(medicalRegistry, "EmitterRegistered")
                .withArgs(doctor.address, EmitterType.DOCTOR);

            const emitter = await medicalRegistry.getEmitter(doctor.address);
            expect(emitter.emitterType).to.equal(EmitterType.DOCTOR);
            expect(emitter.isActive).to.equal(true);
        });

        it("el caller autorizado puede registrar un emisor", async function () {
            const { medicalRegistry, stranger, doctor } = await deployMedicalRegistry();

            await medicalRegistry.setAuthorizedCaller(stranger.address);

            await expect(
                medicalRegistry.connect(stranger).registerEmitter(doctor.address, EmitterType.LABORATORY)
            ).to.emit(medicalRegistry, "EmitterRegistered");

            expect(await medicalRegistry.isVerifiedEmitter(doctor.address)).to.equal(true);
        });

        it("registra laboratorio correctamente", async function () {
            const { medicalRegistry, laboratory } = await deployMedicalRegistry();

            await medicalRegistry.registerEmitter(laboratory.address, EmitterType.LABORATORY);

            const emitter = await medicalRegistry.getEmitter(laboratory.address);
            expect(emitter.emitterType).to.equal(EmitterType.LABORATORY);
            expect(emitter.isActive).to.equal(true);
        });

        it("registra institución correctamente", async function () {
            const { medicalRegistry, institution } = await deployMedicalRegistry();

            await medicalRegistry.registerEmitter(institution.address, EmitterType.INSTITUTION);

            const emitter = await medicalRegistry.getEmitter(institution.address);
            expect(emitter.emitterType).to.equal(EmitterType.INSTITUTION);
        });

        it("reverts si no es admin ni caller autorizado", async function () {
            const { medicalRegistry, stranger, doctor } = await deployMedicalRegistry();

            await expect(
                medicalRegistry.connect(stranger).registerEmitter(doctor.address, EmitterType.DOCTOR)
            ).to.be.revertedWith("MedicalRegistry: no autorizado");
        });

        it("reverts si ya está registrado", async function () {
            const { medicalRegistry, doctor } = await deployMedicalRegistry();

            await medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR);

            await expect(
                medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR)
            ).to.be.revertedWith("MedicalRegistry: ya registrado");
        });

        it("reverts si la dirección es cero", async function () {
            const { medicalRegistry } = await deployMedicalRegistry();

            await expect(
                medicalRegistry.registerEmitter(ethers.ZeroAddress, EmitterType.DOCTOR)
            ).to.be.revertedWith("MedicalRegistry: direccion invalida");
        });
    });


    describe("revokeEmitter", function () {
        it("el admin puede revocar un emisor activo", async function () {
            const { medicalRegistry, doctor } = await deployMedicalRegistry();

            await medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR);

            await expect(medicalRegistry.revokeEmitter(doctor.address))
                .to.emit(medicalRegistry, "EmitterRevoked")
                .withArgs(doctor.address);

            expect(await medicalRegistry.isVerifiedEmitter(doctor.address)).to.equal(false);
        });

        it("el caller autorizado puede revocar", async function () {
            const { medicalRegistry, stranger, doctor } = await deployMedicalRegistry();

            await medicalRegistry.setAuthorizedCaller(stranger.address);
            await medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR);

            await expect(
                medicalRegistry.connect(stranger).revokeEmitter(doctor.address)
            ).to.emit(medicalRegistry, "EmitterRevoked");
        });

        it("reverts si no es admin ni caller autorizado", async function () {
            const { medicalRegistry, stranger, doctor } = await deployMedicalRegistry();

            await medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR);

            await expect(
                medicalRegistry.connect(stranger).revokeEmitter(doctor.address)
            ).to.be.revertedWith("MedicalRegistry: no autorizado");
        });

        it("reverts si el emisor no está registrado", async function () {
            const { medicalRegistry, doctor } = await deployMedicalRegistry();

            await expect(
                medicalRegistry.revokeEmitter(doctor.address)
            ).to.be.revertedWith("MedicalRegistry: no registrado");
        });

        it("reverts si el emisor ya fue revocado", async function () {
            const { medicalRegistry, doctor } = await deployMedicalRegistry();

            await medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR);
            await medicalRegistry.revokeEmitter(doctor.address);

            await expect(
                medicalRegistry.revokeEmitter(doctor.address)
            ).to.be.revertedWith("MedicalRegistry: ya revocado");
        });
    });


    describe("integración con UserRegistry", function () {
        it("approveUser registra automáticamente al médico en MedicalRegistry", async function () {
            const { medicalRegistry, userRegistry, admin, doctor } = await deployBoth();

            await userRegistry.connect(doctor).registerAsProfessional(1n); // DOCTOR

            await userRegistry.connect(admin).approveUser(doctor.address);

            expect(await medicalRegistry.isVerifiedEmitter(doctor.address)).to.equal(true);
            const emitter = await medicalRegistry.getEmitter(doctor.address);
            expect(emitter.emitterType).to.equal(EmitterType.DOCTOR);
        });

        it("approveUser registra automáticamente al laboratorio", async function () {
            const { medicalRegistry, userRegistry, admin, laboratory } = await deployBoth();

            await userRegistry.connect(laboratory).registerAsProfessional(2n); // LABORATORY

            await userRegistry.connect(admin).approveUser(laboratory.address);

            expect(await medicalRegistry.isVerifiedEmitter(laboratory.address)).to.equal(true);
            const emitter = await medicalRegistry.getEmitter(laboratory.address);
            expect(emitter.emitterType).to.equal(EmitterType.LABORATORY);
        });

        it("approveUser registra automáticamente a la institución", async function () {
            const { medicalRegistry, userRegistry, admin, institution } = await deployBoth();

            await userRegistry.connect(institution).registerAsProfessional(3n); // INSTITUTION

            await userRegistry.connect(admin).approveUser(institution.address);

            expect(await medicalRegistry.isVerifiedEmitter(institution.address)).to.equal(true);
            const emitter = await medicalRegistry.getEmitter(institution.address);
            expect(emitter.emitterType).to.equal(EmitterType.INSTITUTION);
        });

        it("approveUser NO registra al paciente en MedicalRegistry", async function () {
            const { medicalRegistry, userRegistry, doctor } = await deployBoth();

            await userRegistry.connect(doctor).registerAsPatient();

            expect(await medicalRegistry.isRegistered(doctor.address)).to.equal(false);
        });

        it("revokeUser revoca automáticamente en MedicalRegistry", async function () {
            const { medicalRegistry, userRegistry, admin, doctor } = await deployBoth();

            await userRegistry.connect(doctor).registerAsProfessional(1n);
            await userRegistry.connect(admin).approveUser(doctor.address);
            await userRegistry.connect(admin).revokeUser(doctor.address);

            expect(await medicalRegistry.isVerifiedEmitter(doctor.address)).to.equal(false);
        });

        it("approveUser funciona aunque no haya MedicalRegistry seteado", async function () {
            const [admin, doctor] = await ethers.getSigners();

            const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
            const userRegistry: any = await UserRegistryFactory.deploy();
            await userRegistry.waitForDeployment();

            await userRegistry.connect(doctor).registerAsProfessional(1n);

            await expect(
                userRegistry.connect(admin).approveUser(doctor.address)
            ).to.not.be.reverted;
        });
    });


    describe("vistas", function () {
        it("isVerifiedEmitter devuelve false para no registrado", async function () {
            const { medicalRegistry, stranger } = await deployMedicalRegistry();

            expect(await medicalRegistry.isVerifiedEmitter(stranger.address)).to.equal(false);
        });

        it("isVerifiedEmitter devuelve false para emisor revocado", async function () {
            const { medicalRegistry, doctor } = await deployMedicalRegistry();

            await medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR);
            await medicalRegistry.revokeEmitter(doctor.address);

            expect(await medicalRegistry.isVerifiedEmitter(doctor.address)).to.equal(false);
        });

        it("getEmitter reverts si no está registrado", async function () {
            const { medicalRegistry, stranger } = await deployMedicalRegistry();

            await expect(
                medicalRegistry.getEmitter(stranger.address)
            ).to.be.revertedWith("MedicalRegistry: no registrado");
        });

        it("isRegistered devuelve true tras registrar", async function () {
            const { medicalRegistry, doctor } = await deployMedicalRegistry();

            expect(await medicalRegistry.isRegistered(doctor.address)).to.equal(false);

            await medicalRegistry.registerEmitter(doctor.address, EmitterType.DOCTOR);

            expect(await medicalRegistry.isRegistered(doctor.address)).to.equal(true);
        });
    });
});
