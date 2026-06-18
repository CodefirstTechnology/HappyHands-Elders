const prisma = require("../config/prisma");
const { ROLE_IDS } = require("./roleService");

const DEFAULT_RADIUS_KM = Number(process.env.CAREGIVER_COORDINATOR_RADIUS_KM) || 3;
const KM_PER_DEGREE_LAT = 111;

const getCoordinatorRadiusKm = (coordinator) => {
  const radius = coordinator?.serviceRadiusKm;
  if (radius != null && !Number.isNaN(Number(radius)) && Number(radius) > 0) {
    return Number(radius);
  }
  return DEFAULT_RADIUS_KM;
};

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isNearPoint = (lat, lng, pointLat, pointLng, radiusKm = DEFAULT_RADIUS_KM) => {
  if (lat == null || lng == null || pointLat == null || pointLng == null) return false;
  return haversineKm(lat, lng, pointLat, pointLng) <= radiusKm;
};

const caregiverCoversLocation = (caregiver, latitude, longitude, radiusKm = DEFAULT_RADIUS_KM) => {
  const zones = caregiver.zones || [];
  if (!zones.length) return false;
  return zones.some((zone) =>
    isNearPoint(latitude, longitude, zone.latitude, zone.longitude, radiusKm)
  );
};

const bookingMatchesCaregiverSkill = (booking, caregiver) => {
  if (!booking.requestedSkill) return true;
  const wanted = String(booking.requestedSkill).toUpperCase();
  return (caregiver.skills || []).some((s) => String(s.skillName).toUpperCase() === wanted);
};

const findCaregiversNearLocation = async (
  latitude,
  longitude,
  { skill, radiusKm = DEFAULT_RADIUS_KM } = {}
) => {
  const caregivers = await prisma.caregiver.findMany({
    where: {
      verificationStatus: "VERIFIED",
      user: { isActive: true },
      ...(skill
        ? { skills: { some: { skillName: { equals: skill, mode: "insensitive" } } } }
        : {})
    },
    include: {
      user: { select: { id: true, name: true } },
      skills: true,
      zones: true
    }
  });

  return caregivers.filter((caregiver) =>
    caregiverCoversLocation(caregiver, latitude, longitude, radiusKm)
  );
};

const coordinatorHasLocation = (coordinator) =>
  coordinator?.latitude != null &&
  coordinator?.longitude != null &&
  !Number.isNaN(coordinator.latitude) &&
  !Number.isNaN(coordinator.longitude);

const isCaregiverNearCoordinator = (caregiver, coordinator, radiusKm) => {
  if (!coordinatorHasLocation(coordinator)) return false;
  if (caregiver?.latitude == null || caregiver?.longitude == null) return false;
  const km = radiusKm ?? getCoordinatorRadiusKm(coordinator);
  return isNearPoint(
    caregiver.latitude,
    caregiver.longitude,
    coordinator.latitude,
    coordinator.longitude,
    km
  );
};

const boundingBoxForRadius = (latitude, longitude, radiusKm = DEFAULT_RADIUS_KM) => {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const lngDelta =
    radiusKm / (KM_PER_DEGREE_LAT * Math.cos(toRad(latitude)) || 1);
  return {
    latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
    longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta }
  };
};

const filterCaregiversNearCoordinator = (caregivers, coordinator, radiusKm) => {
  const km = radiusKm ?? getCoordinatorRadiusKm(coordinator);
  return caregivers.filter((caregiver) => isCaregiverNearCoordinator(caregiver, coordinator, km));
};

const findCoordinatorsNearLocation = async (
  latitude,
  longitude,
  { activeOnly = true } = {}
) => {
  if (latitude == null || longitude == null) return [];

  const coordinators = await prisma.coordinator.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      ...(activeOnly
        ? { user: { isActive: true, roleId: ROLE_IDS.COORDINATOR } }
        : { user: { roleId: ROLE_IDS.COORDINATOR } })
    },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } }
    }
  });

  return coordinators
    .filter((coordinator) =>
      isNearPoint(
        latitude,
        longitude,
        coordinator.latitude,
        coordinator.longitude,
        getCoordinatorRadiusKm(coordinator)
      )
    )
    .sort(
      (a, b) =>
        haversineKm(latitude, longitude, a.latitude, a.longitude) -
        haversineKm(latitude, longitude, b.latitude, b.longitude)
    );
};

module.exports = {
  DEFAULT_RADIUS_KM,
  getCoordinatorRadiusKm,
  haversineKm,
  isNearPoint,
  coordinatorHasLocation,
  isCaregiverNearCoordinator,
  boundingBoxForRadius,
  filterCaregiversNearCoordinator,
  caregiverCoversLocation,
  bookingMatchesCaregiverSkill,
  findCaregiversNearLocation,
  findCoordinatorsNearLocation
};
