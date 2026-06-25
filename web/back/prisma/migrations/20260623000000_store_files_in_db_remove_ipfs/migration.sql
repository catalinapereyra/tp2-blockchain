-- Los documentos médicos ahora se guardan privados en la base de datos
-- en vez de publicarse en IPFS.

-- DropColumns (IPFS)
ALTER TABLE "DocumentMetadata" DROP COLUMN "ipfsCid";
ALTER TABLE "DocumentMetadata" DROP COLUMN "ipfsUrl";

-- AddColumns (archivo guardado en la base de datos)
ALTER TABLE "DocumentMetadata" ADD COLUMN "fileData" BYTEA NOT NULL;
ALTER TABLE "DocumentMetadata" ADD COLUMN "fileName" TEXT NOT NULL;
ALTER TABLE "DocumentMetadata" ADD COLUMN "mimeType" TEXT NOT NULL;
