const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { parseJsonArray, normalizeBookingRow } = require("../services/bookingService");
const {
  findCaregiversNearLocation,
  caregiverCoversLocation,
  bookingMatchesCaregiverSkill,
  DEFAULT_RADIUS_KM
} = require("../services/locationService");

const caregiverInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  skills: true,
  zones: true,
  coordinator: { include: { user: { select: { name: true } } } }
};

const resolveParentCoords = async (userId, queryLat, queryLng) => {
  let lat = queryLat != null ? Number(queryLat) : null;
  let lng = queryLng != null ? Number(queryLng) : null;

  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    const parent = await prisma.parent.findUnique({ where: { userId } });
    if (parent?.latitude != null && parent?.longitude != null) {
      lat = parent.latitude;
      lng = parent.longitude;
    }
  }

  return { lat, lng };
};

const parseBoolQuery = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).toLowerCase() === "true";
};

exports.listCaregivers = async (req, res) => {
  const {
    skill,
    city,
    zone,
    latitude,
    longitude,
    radiusKm,
    ageRange,
    hasCprCert,
    hasFirstAidCert,
    maxChildren
  } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const { lat, lng } = await resolveParentCoords(req.user.id, latitude, longitude);
  const radius = radiusKm != null ? Number(radiusKm) : DEFAULT_RADIUS_KM;

  const requireAadhaar =
    process.env.REQUIRE_AADHAAR_VERIFICATION !== "false";

  const cprFilter = parseBoolQuery(hasCprCert);
  const firstAidFilter = parseBoolQuery(hasFirstAidCert);
  const maxChildrenFilter =
    maxChildren != null && maxChildren !== "" ? parseInt(maxChildren, 10) : null;

  const where = {
    verificationStatus: "VERIFIED",
    user: { isActive: true },
    ...(requireAadhaar ? { aadhaarVerified: true } : {}),
    ...(skill
      ? { skills: { some: { skillName: { equals: skill, mode: "insensitive" } } } }
      : {}),
    ...(ageRange
      ? { ageRangesServed: { has: String(ageRange) } }
      : {}),
    ...(cprFilter === true ? { hasCprCert: true } : {}),
    ...(firstAidFilter === true ? { hasFirstAidCert: true } : {}),
    ...(maxChildrenFilter != null && !Number.isNaN(maxChildrenFilter)
      ? {
          OR: [
            { maxChildren: { gte: maxChildrenFilter } },
            { maxChildren: null }
          ]
        }
      : {}),
    ...(city
      ? {
          OR: [
            { coordinator: { city: { contains: city, mode: "insensitive" } } },
            { zones: { some: { city: { contains: city, mode: "insensitive" } } } }
          ]
        }
      : {}),
    ...(zone
      ? {
          zones: {
            some: {
              OR: [
                { name: { contains: zone, mode: "insensitive" } },
                { city: { contains: zone, mode: "insensitive" } }
              ]
            }
          }
        }
      : {})
  };

  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return sendSuccess(res, {
      caregivers: [],
      pagination: { page, limit, total: 0 },
      locationRequired: true
    });
  }

  let caregivers = await prisma.caregiver.findMany({
    where,
    include: caregiverInclude,
    orderBy: { rating: "desc" }
  });

  caregivers = caregivers.filter((c) => caregiverCoversLocation(c, lat, lng, radius));

  const total = caregivers.length;
  const paged = caregivers.slice(skip, skip + limit);

  sendSuccess(res, { caregivers: paged, pagination: { page, limit, total } });
};

exports.getCaregiver = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const caregiver = await prisma.caregiver.findUnique({
    where: { id },
    include: {
      ...caregiverInclude,
      bookings: {
        where: { status: "COMPLETED", review: { isNot: null } },
        include: { review: true, parent: { include: { user: { select: { name: true } } } } },
        take: 5,
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!caregiver) throw new ApiError(404, "Caregiver not found");
  if (req.user.role === "PARENT") {
    if (caregiver.verificationStatus !== "VERIFIED") {
      throw new ApiError(404, "Caregiver not found");
    }
    if (
      process.env.REQUIRE_AADHAAR_VERIFICATION !== "false" &&
      !caregiver.aadhaarVerified
    ) {
      throw new ApiError(404, "Caregiver not found");
    }

    const { lat, lng } = await resolveParentCoords(
      req.user.id,
      req.query.latitude,
      req.query.longitude
    );
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (!caregiverCoversLocation(caregiver, lat, lng)) {
        throw new ApiError(404, "Caregiver not found");
      }
    }
  }

  sendSuccess(res, { caregiver });
};

exports.getMyProfile = async (req, res) => {
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: req.user.id },
    include: caregiverInclude
  });
  if (!caregiver) throw new ApiError(404, "Caregiver profile not found");
  sendSuccess(res, { caregiver });
};

exports.updateMyProfile = async (req, res) => {
  const {
    bio,
    profilePhoto,
    availableFrom,
    availableTo,
    workingDays,
    bankAccountHolder,
    bankAccountNumber,
    bankName,
    bankIfsc,
    bankUpiId
  } = req.body;

  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: req.user.id }
  });
  if (!caregiver) throw new ApiError(404, "Caregiver profile not found");

  const updated = await prisma.caregiver.update({
    where: { id: caregiver.id },
    data: {
      ...(bio !== undefined && { bio }),
      ...(profilePhoto !== undefined && { profilePhoto }),
      ...(availableFrom !== undefined && { availableFrom }),
      ...(availableTo !== undefined && { availableTo }),
      ...(workingDays !== undefined && {
        workingDays: Array.isArray(workingDays)
          ? JSON.stringify(workingDays)
          : workingDays
      }),
      ...(bankAccountHolder !== undefined && {
        bankAccountHolder: bankAccountHolder?.trim() || null
      }),
      ...(bankAccountNumber !== undefined && {
        bankAccountNumber: bankAccountNumber?.trim() || null
      }),
      ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
      ...(bankIfsc !== undefined && {
        bankIfsc: bankIfsc?.trim() ? bankIfsc.trim().toUpperCase() : null
      }),
      ...(bankUpiId !== undefined && { bankUpiId: bankUpiId?.trim() || null })
    },
    include: caregiverInclude
  });

  sendSuccess(res, { caregiver: updated });
};

exports.getMySchedule = async (req, res) => {
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: req.user.id }
  });
  if (!caregiver) throw new ApiError(404, "Caregiver profile not found");

  const bookings = await prisma.booking.findMany({
    where: {
      caregiverId: caregiver.id,
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] }
    },
    include: {
      parent: { include: { user: { select: { name: true, phone: true } } } }
    },
    orderBy: { createdAt: "asc" }
  });

  const grouped = {};
  for (const b of bookings) {
    const key =
      b.bookingType === "SESSION" && b.sessionDate
        ? new Date(b.sessionDate).toISOString().split("T")[0]
        : b.monthlyStartDate
          ? new Date(b.monthlyStartDate).toISOString().split("T")[0]
          : "unscheduled";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  }

  sendSuccess(res, {
    schedule: grouped,
    bookings: bookings.map(normalizeBookingRow)
  });
};

exports.getMyTimeEntries = async (req, res) => {
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: req.user.id }
  });
  if (!caregiver) throw new ApiError(404, "Caregiver profile not found");

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { caregiverId: caregiver.id },
      include: { booking: { select: { id: true, bookingType: true, address: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.timeEntry.count({ where: { caregiverId: caregiver.id } })
  ]);

  sendSuccess(res, { entries, pagination: { page, limit, total } });
};
