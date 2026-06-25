-- CreateTable
CREATE TABLE "SignedDocument" (
    "id" SERIAL NOT NULL,
    "patientAddress" TEXT NOT NULL,
    "doctorAddress" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "offChainRef" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "studyType" TEXT,
    "notes" TEXT,
    "fileData" BYTEA NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignedDocument_pkey" PRIMARY KEY ("id")
);
