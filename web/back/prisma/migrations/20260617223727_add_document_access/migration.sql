-- CreateTable
CREATE TABLE "DocumentAccess" (
    "id" SERIAL NOT NULL,
    "patientAddress" TEXT NOT NULL,
    "doctorAddress" TEXT NOT NULL,
    "documentIdOnChain" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAccess_patientAddress_doctorAddress_documentIdOnCha_key" ON "DocumentAccess"("patientAddress", "doctorAddress", "documentIdOnChain");
