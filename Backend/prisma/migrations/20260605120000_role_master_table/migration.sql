-- Step 1: Add roleId column and migrate from legacy role enum/text
ALTER TABLE "User" ADD COLUMN "roleId" INTEGER;

UPDATE "User" SET "roleId" = CASE
    WHEN "role"::text = 'ADMIN' THEN 1
    WHEN "role"::text = 'AGENT' THEN 2
    WHEN "role"::text = 'SERVANT' THEN 3
    WHEN "role"::text = 'HOUSE_OWNER' THEN 4
    ELSE 4
END;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "roleId" SET DEFAULT 4;

ALTER TABLE "User" DROP COLUMN "role";

-- Step 2: Drop legacy Role enum type (frees the "Role" name conflict)
DROP TYPE IF EXISTS "Role";

-- Step 3: Create Role master table (fixed IDs: 1=Admin, 2=Agent, 3=Servant, 4=House Owner)
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

INSERT INTO "roles" ("id", "code", "label", "updatedAt") VALUES
(1, 'ADMIN', 'Admin', CURRENT_TIMESTAMP),
(2, 'AGENT', 'Agent', CURRENT_TIMESTAMP),
(3, 'SERVANT', 'Servant', CURRENT_TIMESTAMP),
(4, 'HOUSE_OWNER', 'House Owner', CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "User_roleId_idx" ON "User"("roleId");
