-- CreateEnum
CREATE TYPE "ServantRegistrationSource" AS ENUM ('AGENT', 'SELF');

-- AlterTable
ALTER TABLE "Servant" ADD COLUMN "registrationSource" "ServantRegistrationSource" NOT NULL DEFAULT 'AGENT';

-- App self-registrations: no agent yet
UPDATE "Servant" s
SET "registrationSource" = 'SELF'
FROM "User" u
WHERE s."userId" = u.id
  AND s."agentId" IS NULL
  AND u."role" = 'SERVANT';
