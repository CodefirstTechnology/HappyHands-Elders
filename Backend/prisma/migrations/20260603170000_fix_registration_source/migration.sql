-- Agent-assigned servants must not appear as app self-registration
UPDATE "Servant"
SET "registrationSource" = 'AGENT'
WHERE "agentId" IS NOT NULL
  AND "registrationSource" = 'SELF';
