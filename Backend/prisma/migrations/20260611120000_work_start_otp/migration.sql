-- AlterTable (column may exist from a prior partial apply)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "workStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BookingWorkStartOtp" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingWorkStartOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingWorkStartOtp_bookingId_verifiedAt_idx" ON "BookingWorkStartOtp"("bookingId", "verifiedAt");

-- AddForeignKey (skip if already present)
DO $$ BEGIN
  ALTER TABLE "BookingWorkStartOtp" ADD CONSTRAINT "BookingWorkStartOtp_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
