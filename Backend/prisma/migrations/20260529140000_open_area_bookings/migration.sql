-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "servantId" DROP NOT NULL;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "requestedSkill" TEXT;
