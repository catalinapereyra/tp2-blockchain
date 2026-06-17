-- AlterTable
ALTER TABLE "DocumentMetadata" ADD COLUMN     "labName" TEXT,
ADD COLUMN     "studyDate" TIMESTAMP(3),
ADD COLUMN     "studyType" TEXT;
