-- Per-agent service area radius (km) for matching nearby servant registrations
ALTER TABLE "Agent" ADD COLUMN "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 3;
