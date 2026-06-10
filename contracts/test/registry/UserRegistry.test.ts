import { expect } from "chai";
import { ethers } from "hardhat";

describe("UserRegistry", function () {

    async function deployUserRegistry() {
        const [admin, patient, doctor, laboratory, institution, stranger] =
            await ethers.getSigners();

        const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
        const userRegistry: any = await UserRegistryFactory.deploy();
        await userRegistry.waitForDeployment();

        return { userRegistry, admin, patient, doctor, laboratory, institution, stranger };
    }

    const Role = { PATIENT: 0n, DOCTOR: 1n, LABORATORY: 2n, INSTITUTION: 3n };
    const Status = { PENDING: 0n, APPROVED: 1n, REJECTED: 2n, REVOKED: 3n };


    describe("registerAsPatient", function () {
        it("registra al paciente con estado APPROVED y rol PATIENT", async function () {
            const { userRegistry, patient } = await deployUserRegistry();

            await expect(userRegistry.connect(patient).registerAsPatient())
                .to.emit(userRegistry, "PatientRegistered")
                .withArgs(patient.address);

            const user = await userRegistry.getUser(patient.address);
            expect(user.role).to.equal(Role.PATIENT);
            expect(user.status).to.equal(Status.APPROVED);
        });

        it("reverts si el paciente ya está registrado", async function () {
            const { userRegistry, patient } = await deployUserRegistry();

            await userRegistry.connect(patient).registerAsPatient();

            await expect(
                userRegistry.connect(patient).registerAsPatient()
            ).to.be.revertedWith("UserRegistry: ya registrado");
        });
    });


    describe("registerAsProfessional", function () {
        it("registra al médico con estado PENDING", async function () {
            const { userRegistry, doctor } = await deployUserRegistry();

            await expect(
                userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR)
            )
                .to.emit(userRegistry, "ProfessionalRegistrationRequested")
                .withArgs(doctor.address, Role.DOCTOR);

            const user = await userRegistry.getUser(doctor.address);
            expect(user.role).to.equal(Role.DOCTOR);
            expect(user.status).to.equal(Status.PENDING);
        });

        it("registra al laboratorio con estado PENDING", async function () {
            const { userRegistry, laboratory } = await deployUserRegistry();

            await userRegistry.connect(laboratory).registerAsProfessional(Role.LABORATORY);

            const user = await userRegistry.getUser(laboratory.address);
            expect(user.role).to.equal(Role.LABORATORY);
            expect(user.status).to.equal(Status.PENDING);
        });

        it("registra a la institución con estado PENDING", async function () {
            const { userRegistry, institution } = await deployUserRegistry();

            await userRegistry.connect(institution).registerAsProfessional(Role.INSTITUTION);

            const user = await userRegistry.getUser(institution.address);
            expect(user.role).to.equal(Role.INSTITUTION);
            expect(user.status).to.equal(Status.PENDING);
        });

        it("reverts si ya está registrado", async function () {
            const { userRegistry, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);

            await expect(
                userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR)
            ).to.be.revertedWith("UserRegistry: ya registrado");
        });

        it("reverts si intenta registrarse como PATIENT", async function () {
            const { userRegistry, doctor } = await deployUserRegistry();

            await expect(
                userRegistry.connect(doctor).registerAsProfessional(Role.PATIENT)
            ).to.be.revertedWith("UserRegistry: usar registerAsPatient");
        });
    });


    describe("approveUser", function () {
        it("el admin aprueba un profesional pendiente", async function () {
            const { userRegistry, admin, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);

            await expect(userRegistry.connect(admin).approveUser(doctor.address))
                .to.emit(userRegistry, "UserApproved")
                .withArgs(doctor.address, Role.DOCTOR);

            expect(await userRegistry.isApproved(doctor.address)).to.equal(true);
            expect(await userRegistry.getStatus(doctor.address)).to.equal(Status.APPROVED);
        });

        it("reverts si no es el admin", async function () {
            const { userRegistry, doctor, stranger } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);

            await expect(
                userRegistry.connect(stranger).approveUser(doctor.address)
            ).to.be.revertedWithCustomError(userRegistry, "OwnableUnauthorizedAccount");
        });

        it("reverts si el usuario no está registrado", async function () {
            const { userRegistry, admin, stranger } = await deployUserRegistry();

            await expect(
                userRegistry.connect(admin).approveUser(stranger.address)
            ).to.be.revertedWith("UserRegistry: no registrado");
        });

        it("reverts si el usuario no está pendiente", async function () {
            const { userRegistry, admin, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);
            await userRegistry.connect(admin).approveUser(doctor.address);

            await expect(
                userRegistry.connect(admin).approveUser(doctor.address)
            ).to.be.revertedWith("UserRegistry: no esta pendiente");
        });
    });


    describe("rejectUser", function () {
        it("el admin rechaza un profesional pendiente", async function () {
            const { userRegistry, admin, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);

            await expect(userRegistry.connect(admin).rejectUser(doctor.address))
                .to.emit(userRegistry, "UserRejected")
                .withArgs(doctor.address);

            expect(await userRegistry.getStatus(doctor.address)).to.equal(Status.REJECTED);
        });

        it("reverts si no es el admin", async function () {
            const { userRegistry, doctor, stranger } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);

            await expect(
                userRegistry.connect(stranger).rejectUser(doctor.address)
            ).to.be.revertedWithCustomError(userRegistry, "OwnableUnauthorizedAccount");
        });

        it("reverts si el usuario no está pendiente", async function () {
            const { userRegistry, admin, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);
            await userRegistry.connect(admin).approveUser(doctor.address);

            await expect(
                userRegistry.connect(admin).rejectUser(doctor.address)
            ).to.be.revertedWith("UserRegistry: no esta pendiente");
        });
    });


    describe("revokeUser", function () {
        it("el admin revoca a un profesional aprobado", async function () {
            const { userRegistry, admin, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);
            await userRegistry.connect(admin).approveUser(doctor.address);

            await expect(userRegistry.connect(admin).revokeUser(doctor.address))
                .to.emit(userRegistry, "UserRevoked")
                .withArgs(doctor.address);

            expect(await userRegistry.isApproved(doctor.address)).to.equal(false);
            expect(await userRegistry.getStatus(doctor.address)).to.equal(Status.REVOKED);
        });

        it("reverts si no es el admin", async function () {
            const { userRegistry, admin, doctor, stranger } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);
            await userRegistry.connect(admin).approveUser(doctor.address);

            await expect(
                userRegistry.connect(stranger).revokeUser(doctor.address)
            ).to.be.revertedWithCustomError(userRegistry, "OwnableUnauthorizedAccount");
        });

        it("reverts si el usuario no está aprobado", async function () {
            const { userRegistry, admin, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);

            await expect(
                userRegistry.connect(admin).revokeUser(doctor.address)
            ).to.be.revertedWith("UserRegistry: no esta aprobado");
        });
    });


    describe("vistas", function () {
        it("isApproved devuelve false para usuario pendiente", async function () {
            const { userRegistry, doctor } = await deployUserRegistry();

            await userRegistry.connect(doctor).registerAsProfessional(Role.DOCTOR);

            expect(await userRegistry.isApproved(doctor.address)).to.equal(false);
        });

        it("isApproved devuelve false para usuario no registrado", async function () {
            const { userRegistry, stranger } = await deployUserRegistry();

            expect(await userRegistry.isApproved(stranger.address)).to.equal(false);
        });

        it("isRegistered devuelve true tras registrarse", async function () {
            const { userRegistry, patient } = await deployUserRegistry();

            expect(await userRegistry.isRegistered(patient.address)).to.equal(false);

            await userRegistry.connect(patient).registerAsPatient();

            expect(await userRegistry.isRegistered(patient.address)).to.equal(true);
        });

        it("getUser reverts si no está registrado", async function () {
            const { userRegistry, stranger } = await deployUserRegistry();

            await expect(
                userRegistry.getUser(stranger.address)
            ).to.be.revertedWith("UserRegistry: no registrado");
        });

        it("getRole devuelve el rol correcto", async function () {
            const { userRegistry, laboratory } = await deployUserRegistry();

            await userRegistry.connect(laboratory).registerAsProfessional(Role.LABORATORY);

            expect(await userRegistry.getRole(laboratory.address)).to.equal(Role.LABORATORY);
        });
    });
});
