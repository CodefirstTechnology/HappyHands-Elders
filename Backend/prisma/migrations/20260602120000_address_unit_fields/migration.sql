-- Flat / building / area for apartments and large complexes
ALTER TABLE "HouseOwner" ADD COLUMN IF NOT EXISTS "flatNo" TEXT;
ALTER TABLE "HouseOwner" ADD COLUMN IF NOT EXISTS "building" TEXT;
ALTER TABLE "HouseOwner" ADD COLUMN IF NOT EXISTS "area" TEXT;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "flatNo" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "building" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "area" TEXT;
