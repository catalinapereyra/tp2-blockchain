-- CreateTable
CREATE TABLE "PatientDoctor" (
    "id" SERIAL NOT NULL,
    "patientAddress" TEXT NOT NULL,
    "doctorAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDoctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" SERIAL NOT NULL,
    "prescriptionIdOnChain" INTEGER NOT NULL,
    "patientAddress" TEXT NOT NULL,
    "doctorAddress" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientDoctor_patientAddress_doctorAddress_key" ON "PatientDoctor"("patientAddress", "doctorAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_prescriptionIdOnChain_key" ON "Prescription"("prescriptionIdOnChain");
