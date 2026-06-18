-- Legacy BookingWorkStartOtp table requires updatedAt/sentAt on insert.
ALTER TABLE "BookingWorkStartOtp" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BookingWorkStartOtp" ALTER COLUMN "sentAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BookingWorkStartOtp" ALTER COLUMN "used" SET DEFAULT false;
