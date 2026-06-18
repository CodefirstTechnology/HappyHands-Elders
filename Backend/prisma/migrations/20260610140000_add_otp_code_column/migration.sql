-- BookingWorkStartOtp was created earlier without "code"; add it for home-owner display.
ALTER TABLE "BookingWorkStartOtp" ADD COLUMN IF NOT EXISTS "code" TEXT;

UPDATE "BookingWorkStartOtp"
SET "code" = '0000'
WHERE "code" IS NULL;

ALTER TABLE "BookingWorkStartOtp" ALTER COLUMN "code" SET NOT NULL;
