-- AlterTable
ALTER TABLE "Servant" ADD COLUMN     "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aadhaarVerificationType" TEXT,
ADD COLUMN     "aadhaarVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "aadhaarVerifiedName" TEXT,
ADD COLUMN     "aadhaarVerifiedDob" TEXT,
ADD COLUMN     "aadhaarVerifiedGender" TEXT,
ADD COLUMN     "aadhaarVerifiedAddress" TEXT,
ADD COLUMN     "aadhaarPhotoUrl" TEXT,
ADD COLUMN     "aadhaarReferenceId" TEXT,
ADD COLUMN     "aadhaarNameMatch" BOOLEAN,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
