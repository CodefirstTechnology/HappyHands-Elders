-- ElderCare domain migration: family client profile, caregiver certs, review rating

-- FamilyClient (Parent table) profile fields
ALTER TABLE "Parent" DROP COLUMN IF EXISTS "numberOfChildren";
ALTER TABLE "Parent" DROP COLUMN IF EXISTS "childrenAges";
ALTER TABLE "Parent" DROP COLUMN IF EXISTS "specialRequirements";

ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "eldersCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "elderAgeRange" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "mobilityLevel" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "medicalNotes" TEXT;

-- Caregiver certification fields
ALTER TABLE "Caregiver" DROP COLUMN IF EXISTS "hasCprCert";
ALTER TABLE "Caregiver" DROP COLUMN IF EXISTS "hasFirstAidCert";

ALTER TABLE "Caregiver" ADD COLUMN IF NOT EXISTS "emergencyResponseCertified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Caregiver" ADD COLUMN IF NOT EXISTS "dementiaCareCertified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Caregiver" ADD COLUMN IF NOT EXISTS "fallCareCertified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Caregiver" RENAME COLUMN "childcareNote" TO "eldercareNote";

-- Review: childSafetyRating column kept in DB, mapped via Prisma @map
-- No SQL needed if column name unchanged; API uses elderSafetyRating

-- Role label update for family client
UPDATE "roles" SET code = 'FAMILY_CLIENT', label = 'Family Client' WHERE id = 4 AND code = 'PARENT';
