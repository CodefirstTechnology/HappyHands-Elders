-- Allow Prisma to read legacy rows, then normalize them to CONFIRMED.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'OTP_PENDING';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'ARRIVED';

UPDATE "Booking"
SET status = 'CONFIRMED'
WHERE status::text IN ('OTP_PENDING', 'ARRIVED');
