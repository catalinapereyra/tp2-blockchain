-- CreateTable
CREATE TABLE "DocumentMetadata" (
    "id" SERIAL NOT NULL,
    "documentIdOnChain" INTEGER NOT NULL,
    "patientAddress" TEXT NOT NULL,
    "emitterAddress" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentType" TEXT NOT NULL,
    "ipfsCid" TEXT NOT NULL,
    "ipfsUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentMetadata_documentIdOnChain_key" ON "DocumentMetadata"("documentIdOnChain");
