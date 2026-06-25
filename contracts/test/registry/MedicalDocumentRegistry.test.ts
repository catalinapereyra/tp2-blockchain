import { expect } from "chai";
import { ethers } from "hardhat";

describe("MedicalDocumentRegistry", function () {

    const DocumentStatus = {
        PATIENT_UPLOADED: 0n,
        VERIFIED_ISSUER_DOCUMENT: 1n,
        REVOKED: 2n,
    };

    const SAMPLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("documento medico"));
    const SAMPLE_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("otro documento"));
    const DOC_TYPE = "estudio de sangre";
    const OFF_CHAIN_REF = "ipfs://QmXyz123";

    async function signMedicalDocument(
        docRegistry: any,
        signer: any,
        patient: string,
        documentHash: string,
        documentType: string,
        offChainRef: string,
        doctor: string
    ) {
        const network = await ethers.provider.getNetwork();
        const domain = {
            name: "MedicalDocumentRegistry",
            version: "1",
            chainId: network.chainId,
            verifyingContract: await docRegistry.getAddress(),
        };
        const types = {
            MedicalDocument: [
                { name: "patient", type: "address" },
                { name: "documentHash", type: "bytes32" },
                { name: "documentType", type: "string" },
                { name: "offChainRef", type: "string" },
                { name: "doctor", type: "address" },
            ],
        };
        const value = {
            patient,
            documentHash,
            documentType,
            offChainRef,
            doctor,
        };

        return signer.signTypedData(domain, types, value);
    }

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

        await userRegistry.connect(doctor).registerAsProfessional(1n); // DOCTOR
        await userRegistry.connect(admin).approveUser(doctor.address);

        await userRegistry.connect(patient).registerAsPatient();

        return { docRegistry, userRegistry, admin, doctor, patient, stranger };
    }



    describe("constructor", function () {
        it("reverts si userRegistry es address cero", async function () {
            const DocRegistryFactory = await ethers.getContractFactory("MedicalDocumentRegistry");

            await expect(
                DocRegistryFactory.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("MedicalDocumentRegistry: userRegistry invalido");
        });
    });



    describe("registerDocument", function () {
        it("el médico verificado registra un documento para el paciente", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await expect(
                docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF)
            )
                .to.emit(docRegistry, "DocumentRegistered")
                .withArgs(0n, patient.address, doctor.address, DocumentStatus.VERIFIED_ISSUER_DOCUMENT);

            const doc = await docRegistry.getDocument(0n);
            expect(doc.documentHash).to.equal(SAMPLE_HASH);
            expect(doc.patient).to.equal(patient.address);
            expect(doc.issuer).to.equal(doctor.address);
            expect(doc.documentType).to.equal(DOC_TYPE);
            expect(doc.offChainRef).to.equal(OFF_CHAIN_REF);
            expect(doc.status).to.equal(DocumentStatus.VERIFIED_ISSUER_DOCUMENT);
        });

        it("el documento queda asociado al paciente", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH_2, DOC_TYPE, OFF_CHAIN_REF);

            const ids = await docRegistry.getPatientDocuments(patient.address);
            expect(ids.length).to.equal(2);
            expect(ids[0]).to.equal(0n);
            expect(ids[1]).to.equal(1n);
        });

        it("devuelve el ID del documento creado", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            const tx = await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => log.fragment?.name === "DocumentRegistered");
            expect(event.args[0]).to.equal(0n);
        });

        it("reverts si el emisor no está verificado", async function () {
            const { docRegistry, stranger, patient } = await deployAll();

            await expect(
                docRegistry.connect(stranger).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF)
            ).to.be.revertedWith("MedicalDocumentRegistry: emisor no verificado");
        });

        it("reverts si el paciente no está registrado", async function () {
            const { docRegistry, doctor, stranger } = await deployAll();

            await expect(
                docRegistry.connect(doctor).registerDocument(stranger.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF)
            ).to.be.revertedWith("MedicalDocumentRegistry: paciente no registrado");
        });

        it("reverts si el hash es cero", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await expect(
                docRegistry.connect(doctor).registerDocument(patient.address, ethers.ZeroHash, DOC_TYPE, OFF_CHAIN_REF)
            ).to.be.revertedWith("MedicalDocumentRegistry: hash invalido");
        });

        it("reverts si el hash ya fue registrado", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(
                docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF)
            ).to.be.revertedWith("MedicalDocumentRegistry: hash ya registrado");
        });
    });


    describe("registerSignedDocument", function () {
        it("registra un documento con firma EIP-712 del medico", async function () {
            const { docRegistry, doctor, patient, stranger } = await deployAll();
            const signature = await signMedicalDocument(
                docRegistry,
                doctor,
                patient.address,
                SAMPLE_HASH,
                DOC_TYPE,
                OFF_CHAIN_REF,
                doctor.address
            );

            await expect(
                docRegistry
                    .connect(stranger)
                    .registerSignedDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF, doctor.address, signature)
            )
                .to.emit(docRegistry, "DocumentRegistered")
                .withArgs(0n, patient.address, doctor.address, DocumentStatus.VERIFIED_ISSUER_DOCUMENT);

            const doc = await docRegistry.getDocument(0n);
            expect(doc.documentHash).to.equal(SAMPLE_HASH);
            expect(doc.patient).to.equal(patient.address);
            expect(doc.issuer).to.equal(doctor.address);
            expect(doc.documentType).to.equal(DOC_TYPE);
            expect(doc.offChainRef).to.equal(OFF_CHAIN_REF);
            expect(doc.status).to.equal(DocumentStatus.VERIFIED_ISSUER_DOCUMENT);
        });

        it("reverts si firma una wallet distinta al medico esperado", async function () {
            const { docRegistry, doctor, patient, stranger } = await deployAll();
            const signature = await signMedicalDocument(
                docRegistry,
                stranger,
                patient.address,
                SAMPLE_HASH,
                DOC_TYPE,
                OFF_CHAIN_REF,
                doctor.address
            );

            await expect(
                docRegistry
                    .connect(stranger)
                    .registerSignedDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF, doctor.address, signature)
            ).to.be.revertedWith("MedicalDocumentRegistry: firma no corresponde al medico");
        });

        it("reverts si el medico firmante no esta verificado", async function () {
            const { docRegistry, patient, stranger } = await deployAll();
            const signature = await signMedicalDocument(
                docRegistry,
                stranger,
                patient.address,
                SAMPLE_HASH,
                DOC_TYPE,
                OFF_CHAIN_REF,
                stranger.address
            );

            await expect(
                docRegistry
                    .connect(patient)
                    .registerSignedDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF, stranger.address, signature)
            ).to.be.revertedWith("MedicalDocumentRegistry: medico no verificado");
        });

        it("reverts si cambia un dato despues de firmar", async function () {
            const { docRegistry, doctor, patient, stranger } = await deployAll();
            const signature = await signMedicalDocument(
                docRegistry,
                doctor,
                patient.address,
                SAMPLE_HASH,
                DOC_TYPE,
                OFF_CHAIN_REF,
                doctor.address
            );

            await expect(
                docRegistry
                    .connect(stranger)
                    .registerSignedDocument(patient.address, SAMPLE_HASH_2, DOC_TYPE, OFF_CHAIN_REF, doctor.address, signature)
            ).to.be.revertedWith("MedicalDocumentRegistry: firma no corresponde al medico");
        });

        it("reverts si el hash firmado ya fue registrado", async function () {
            const { docRegistry, doctor, patient, stranger } = await deployAll();
            const signature = await signMedicalDocument(
                docRegistry,
                doctor,
                patient.address,
                SAMPLE_HASH,
                DOC_TYPE,
                OFF_CHAIN_REF,
                doctor.address
            );

            await docRegistry
                .connect(stranger)
                .registerSignedDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF, doctor.address, signature);

            await expect(
                docRegistry
                    .connect(stranger)
                    .registerSignedDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF, doctor.address, signature)
            ).to.be.revertedWith("MedicalDocumentRegistry: hash ya registrado");
        });
    });



    describe("uploadOwnDocument", function () {
        it("el paciente sube su propio documento con estado PATIENT_UPLOADED", async function () {
            const { docRegistry, patient } = await deployAll();

            await expect(
                docRegistry.connect(patient).uploadOwnDocument(SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF)
            )
                .to.emit(docRegistry, "DocumentRegistered")
                .withArgs(0n, patient.address, patient.address, DocumentStatus.PATIENT_UPLOADED);

            const doc = await docRegistry.getDocument(0n);
            expect(doc.patient).to.equal(patient.address);
            expect(doc.issuer).to.equal(patient.address);
            expect(doc.status).to.equal(DocumentStatus.PATIENT_UPLOADED);
        });

        it("reverts si el usuario no está registrado", async function () {
            const { docRegistry, stranger } = await deployAll();

            await expect(
                docRegistry.connect(stranger).uploadOwnDocument(SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF)
            ).to.be.revertedWith("MedicalDocumentRegistry: usuario no registrado");
        });

        it("reverts si el hash es cero", async function () {
            const { docRegistry, patient } = await deployAll();

            await expect(
                docRegistry.connect(patient).uploadOwnDocument(ethers.ZeroHash, DOC_TYPE, OFF_CHAIN_REF)
            ).to.be.revertedWith("MedicalDocumentRegistry: hash invalido");
        });

        it("reverts si el hash ya fue registrado", async function () {
            const { docRegistry, patient } = await deployAll();

            await docRegistry.connect(patient).uploadOwnDocument(SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(
                docRegistry.connect(patient).uploadOwnDocument(SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF)
            ).to.be.revertedWith("MedicalDocumentRegistry: hash ya registrado");
        });
    });



    describe("revokeDocument", function () {
        it("el emisor puede revocar su documento", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(docRegistry.connect(doctor).revokeDocument(0n))
                .to.emit(docRegistry, "DocumentRevoked")
                .withArgs(0n, doctor.address);

            const doc = await docRegistry.getDocument(0n);
            expect(doc.status).to.equal(DocumentStatus.REVOKED);
        });

        it("el paciente puede revocar un documento registrado por un profesional", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(docRegistry.connect(patient).revokeDocument(0n))
                .to.emit(docRegistry, "DocumentRevoked")
                .withArgs(0n, patient.address);
        });

        it("el paciente puede revocar su propio upload", async function () {
            const { docRegistry, patient } = await deployAll();

            await docRegistry.connect(patient).uploadOwnDocument(SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(docRegistry.connect(patient).revokeDocument(0n))
                .to.emit(docRegistry, "DocumentRevoked");
        });

        it("reverts si no es el emisor ni el paciente", async function () {
            const { docRegistry, doctor, patient, stranger } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            await expect(
                docRegistry.connect(stranger).revokeDocument(0n)
            ).to.be.revertedWith("MedicalDocumentRegistry: no autorizado");
        });

        it("reverts si el documento ya está revocado", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await docRegistry.connect(doctor).revokeDocument(0n);

            await expect(
                docRegistry.connect(doctor).revokeDocument(0n)
            ).to.be.revertedWith("MedicalDocumentRegistry: ya revocado");
        });

        it("reverts si el documento no existe", async function () {
            const { docRegistry, doctor } = await deployAll();

            await expect(
                docRegistry.connect(doctor).revokeDocument(999n)
            ).to.be.revertedWith("MedicalDocumentRegistry: documento no existe");
        });
    });



    describe("verifyDocument", function () {
        it("devuelve true si el hash coincide y el documento está activo", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            expect(await docRegistry.verifyDocument(0n, SAMPLE_HASH)).to.equal(true);
        });

        it("devuelve false si el hash no coincide (documento alterado)", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("archivo modificado"));
            expect(await docRegistry.verifyDocument(0n, wrongHash)).to.equal(false);
        });

        it("devuelve false si el documento fue revocado", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);
            await docRegistry.connect(doctor).revokeDocument(0n);

            expect(await docRegistry.verifyDocument(0n, SAMPLE_HASH)).to.equal(false);
        });

        it("reverts si el documento no existe", async function () {
            const { docRegistry } = await deployAll();

            await expect(
                docRegistry.verifyDocument(999n, SAMPLE_HASH)
            ).to.be.revertedWith("MedicalDocumentRegistry: documento no existe");
        });
    });



    describe("vistas", function () {
        it("documentExists devuelve false si no existe", async function () {
            const { docRegistry } = await deployAll();

            expect(await docRegistry.documentExists(0n)).to.equal(false);
        });

        it("documentExists devuelve true tras registrar", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            expect(await docRegistry.documentExists(0n)).to.equal(true);
        });

        it("isHashRegistered devuelve false antes de registrar", async function () {
            const { docRegistry } = await deployAll();

            expect(await docRegistry.isHashRegistered(SAMPLE_HASH)).to.equal(false);
        });

        it("isHashRegistered devuelve true tras registrar", async function () {
            const { docRegistry, doctor, patient } = await deployAll();

            await docRegistry.connect(doctor).registerDocument(patient.address, SAMPLE_HASH, DOC_TYPE, OFF_CHAIN_REF);

            expect(await docRegistry.isHashRegistered(SAMPLE_HASH)).to.equal(true);
        });

        it("getPatientDocuments devuelve array vacío si no tiene documentos", async function () {
            const { docRegistry, patient } = await deployAll();

            const ids = await docRegistry.getPatientDocuments(patient.address);
            expect(ids.length).to.equal(0);
        });

        it("getDocument reverts si no existe", async function () {
            const { docRegistry } = await deployAll();

            await expect(
                docRegistry.getDocument(999n)
            ).to.be.revertedWith("MedicalDocumentRegistry: documento no existe");
        });
    });
});
