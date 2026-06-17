-- Add laboratory-specific off-chain metadata.
ALTER TABLE "DocumentMetadata"
ADD COLUMN "studyType" TEXT,
ADD COLUMN "labName" TEXT,
ADD COLUMN "notes" TEXT;
