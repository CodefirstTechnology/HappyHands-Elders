const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { createNotification } = require("../services/notificationService");
const { normalizeEmail, normalizePhone } = require("../utils/normalize");
const { validateActiveSkillCodes } = require("../services/skillService");
const {
  ROLE_IDS,
  getRoleCode,
  serializeUser,
  userWithRoleInclude
} = require("../services/roleService");
const {
  coordinatorHasLocation,
  boundingBoxForRadius,
  getCoordinatorRadiusKm,
  filterCaregiversNearCoordinator,
  findCoordinatorsNearLocation
} = require("../services/locationService");
const { assertCoordinatorCanAccessCaregiver } = require("../services/coordinatorRegistrationService");
const { getCoordinatorAnnualRevenue } = require("../services/coordinatorRevenueService");

const parseSkills = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  try {
    return JSON.parse(skills);
  } catch {
    return String(skills)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

const stringifyDays = (days) =>
  days === undefined || days === null
    ? undefined
    : Array.isArray(days)
      ? JSON.stringify(days)
      : days;

const parseBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const generateCaregiverPassword = () => {
  const part = crypto.randomBytes(4).toString("hex");
  return `St${part}1`;
};

const getCoordinator = async (userId) => {
  const coordinator = await prisma.coordinator.findUnique({ where: { userId } });
  if (!coordinator) throw new ApiError(403, "Coordinator profile required");
  return coordinator;
};

/** COORDINATOR: scoped to own caregivers. ADMIN: full access (no coordinator profile required). */
const resolveCoordinatorScope = async (user) => {
  if (getRoleCode(user) === "ADMIN") {
    return { isAdmin: true, coordinator: null, coordinatorId: null };
  }
  const coordinator = await getCoordinator(user.id);
  return { isAdmin: false, coordinator, coordinatorId: coordinator.id };
};

/** Coordinator pipeline: caregivers assigned to this coordinator (includes approved app sign-ups). */
const caregiverWhereForScope = (scope, extra = {}) => {
  if (scope.isAdmin) return { ...extra };
  return {
    AND: [
      { coordinatorId: scope.coordinatorId },
      ...(Object.keys(extra).length ? [extra] : [])
    ]
  };
};

/** On approval, link app sign-ups to the coordinator who verified them. */
const resolveApprovalCoordinatorId = async (scope, caregiver) => {
  if (caregiver.coordinatorId != null) return caregiver.coordinatorId;
  if (scope.coordinatorId) return scope.coordinatorId;
  if (
    scope.isAdmin &&
    caregiver.latitude != null &&
    caregiver.longitude != null
  ) {
    const nearby = await findCoordinatorsNearLocation(
      caregiver.latitude,
      caregiver.longitude
    );
    return nearby[0]?.id ?? null;
  }
  return null;
};

/** Pending sign-ups from the Caregiver app — separate from the caregivers pipeline. */
const registrationWhereForScope = (scope, extra = {}) => {
  const base = { registrationSource: "SELF", coordinatorId: null };
  if (scope.isAdmin) return { ...base, ...extra };
  return { ...base, ...extra };
};

/** Single-record access: assigned caregivers or unassigned app registration. */
const recordWhereForScope = (scope, extra = {}) => {
  if (scope.isAdmin) return { ...extra };
  return {
    AND: [
      {
        OR: [
          { coordinatorId: scope.coordinatorId, registrationSource: "COORDINATOR" },
          { registrationSource: "SELF", coordinatorId: null }
        ]
      },
      ...(Object.keys(extra).length ? [extra] : [])
    ]
  };
};

const assertCoordinatorLocationSet = async (coordinatorId) => {
  const coordinator = await prisma.coordinator.findUnique({ where: { id: coordinatorId } });
  if (
    !coordinator?.address?.trim() ||
    coordinator.latitude == null ||
    coordinator.longitude == null
  ) {
    throw new ApiError(
      400,
      "Set your agency location in Profile settings before onboarding caregivers"
    );
  }
};

const caregiverInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      coordinatorSetPassword: true
    }
  },
  skills: true,
  zones: true
};

const applyAppRegistrationPassword = async (userId, email, plainPassword) => {
  const hash = await bcrypt.hash(plainPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash, coordinatorSetPassword: true }
  });
  return { email, password: plainPassword };
};

exports.createCaregiver = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  if (!scope.isAdmin && scope.coordinatorId) {
    await assertCoordinatorLocationSet(scope.coordinatorId);
  }
  const assignCoordinatorId = scope.isAdmin
    ? req.body.coordinatorId
      ? parseInt(req.body.coordinatorId, 10)
      : null
    : scope.coordinatorId;
  const {
    name,
    email: rawEmail,
    phone: rawPhone,
    password,
    bio,
    experience,
    hourlyRate,
    monthlyRate,
    availableFrom,
    availableTo,
    workingDays,
    weekOffDays,
    hoursPerDay,
    availabilityNotes,
    offersSession,
    offersMonthly,
    idProofType,
    skills,
    address,
    city,
    latitude,
    longitude,
    bankAccountHolder,
    bankAccountNumber,
    bankName,
    bankIfsc,
    bankUpiId,
    ageRangesServed,
    maxChildren,
    hasCprCert,
    hasFirstAidCert,
    childcareNote
  } = req.body;

  const email = normalizeEmail(rawEmail);
  const phone = normalizePhone(rawPhone);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(400, "Email already registered");

  if (phone) {
    const phoneTaken = await prisma.user.findFirst({ where: { phone } });
    if (phoneTaken) throw new ApiError(400, "Phone number already registered");
  }

  if (!req.files?.profilePhoto?.[0]) {
    throw new ApiError(400, "Profile photo is required");
  }
  if (!req.files?.idProof?.[0]) {
    throw new ApiError(400, "ID proof document is required");
  }

  const profilePhoto = `/uploads/${req.files.profilePhoto[0].filename}`;
  const idProofUrl = `/uploads/${req.files.idProof[0].filename}`;

  const skillList = await validateActiveSkillCodes(parseSkills(skills));
  const hashed = await bcrypt.hash(password, 12);

  const wd = stringifyDays(workingDays);
  const wod = stringifyDays(weekOffDays);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed,
      roleId: ROLE_IDS.CAREGIVER,
      isActive: false,
      caregiver: {
        create: {
          coordinatorId: assignCoordinatorId,
          bio,
          experience: experience ? parseInt(experience, 10) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
          availableFrom,
          availableTo,
          workingDays: wd,
          weekOffDays: wod,
          hoursPerDay: hoursPerDay ? parseFloat(hoursPerDay) : null,
          availabilityNotes: availabilityNotes || null,
          offersSession: parseBool(offersSession, true),
          offersMonthly: parseBool(offersMonthly, true),
          idProofType,
          idProofUrl,
          profilePhoto,
          verificationStatus: "PENDING",
          registrationSource: "COORDINATOR",
          phoneVerified: !!phone,
          address: address?.trim() || null,
          city: city?.trim() || null,
          latitude: latitude !== undefined && latitude !== "" ? parseFloat(latitude) : null,
          longitude: longitude !== undefined && longitude !== "" ? parseFloat(longitude) : null,
          bankAccountHolder: bankAccountHolder?.trim() || null,
          bankAccountNumber: bankAccountNumber?.trim() || null,
          bankName: bankName?.trim() || null,
          bankIfsc: bankIfsc?.trim()?.toUpperCase() || null,
          bankUpiId: bankUpiId?.trim() || null,
          ageRangesServed: Array.isArray(ageRangesServed)
            ? ageRangesServed
            : ageRangesServed
              ? [String(ageRangesServed)]
              : [],
          maxChildren:
            maxChildren !== undefined && maxChildren !== ""
              ? parseInt(maxChildren, 10)
              : Number(process.env.MAX_CHILDREN_DEFAULT) || 4,
          hasCprCert: parseBool(hasCprCert, false),
          hasFirstAidCert: parseBool(hasFirstAidCert, false),
          childcareNote: childcareNote?.trim() || null,
          skills: {
            create: skillList.map((skillName) => ({ skillName }))
          }
        }
      }
    },
    include: { caregiver: { include: caregiverInclude } }
  });

  sendSuccess(res, { caregiver: user.caregiver }, 201);
};

exports.listCaregivers = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const { status, search, category } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

  const categoryKey = String(category || "").toLowerCase();
  const isRegistrationList =
    categoryKey === "registered" || categoryKey === "app" || categoryKey === "self";

  const sharedFilters = {
    ...(status ? { verificationStatus: status } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } }
            ]
          }
        }
      : {})
  };

  let where = isRegistrationList
    ? registrationWhereForScope(scope, sharedFilters)
    : caregiverWhereForScope(scope, {
        ...(categoryKey === "mine" && scope.coordinatorId ? { coordinatorId: scope.coordinatorId } : {}),
        ...sharedFilters
      });

  let locationNotice = null;

  if (isRegistrationList && !scope.isAdmin && scope.coordinatorId) {
    const coordinator = scope.coordinator || (await prisma.coordinator.findUnique({ where: { id: scope.coordinatorId } }));
    const coordinatorRadiusKm = getCoordinatorRadiusKm(coordinator);

    if (!coordinatorHasLocation(coordinator)) {
      return sendSuccess(res, {
        caregivers: [],
        pagination: { page, limit, total: 0 },
        locationNotice:
          `Set your agency location in Profile to receive registrations within ${coordinatorRadiusKm} km.`
      });
    }

    const box = boundingBoxForRadius(coordinator.latitude, coordinator.longitude, coordinatorRadiusKm);
    where = registrationWhereForScope(scope, {
      ...sharedFilters,
      ...box
    });

    const candidates = await prisma.caregiver.findMany({
      where,
      include: caregiverInclude,
      orderBy: { createdAt: "desc" }
    });

    const filtered = filterCaregiversNearCoordinator(candidates, coordinator, coordinatorRadiusKm);
    const total = filtered.length;
    const caregivers = filtered.slice((page - 1) * limit, page * limit);

    return sendSuccess(res, {
      caregivers,
      pagination: { page, limit, total },
      locationNotice: `Showing registrations within ${coordinatorRadiusKm} km of your agency.`
    });
  }

  const [caregivers, total] = await Promise.all([
    prisma.caregiver.findMany({
      where,
      include: caregiverInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.caregiver.count({ where })
  ]);

  sendSuccess(res, {
    caregivers,
    pagination: { page, limit, total },
    ...(locationNotice ? { locationNotice } : {})
  });
};

const assertScopedCaregiverAccess = async (scope, caregiver) => {
  if (!caregiver) throw new ApiError(404, "Caregiver not found");
  if (!scope.isAdmin && scope.coordinatorId) {
    const coordinator =
      scope.coordinator || (await prisma.coordinator.findUnique({ where: { id: scope.coordinatorId } }));
    assertCoordinatorCanAccessCaregiver(scope, caregiver, coordinator);
  }
};

exports.getCaregiver = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const id = parseInt(req.params.id, 10);

  const caregiver = await prisma.caregiver.findFirst({
    where: recordWhereForScope(scope, { id }),
    include: {
      ...caregiverInclude,
      bookings: {
        include: {
          parent: { include: { user: { select: { name: true } } } }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  await assertScopedCaregiverAccess(scope, caregiver);
  sendSuccess(res, { caregiver });
};

exports.updateCaregiver = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.caregiver.findFirst({
    where: recordWhereForScope(scope, { id }),
    include: { user: true }
  });
  await assertScopedCaregiverAccess(scope, existing);

  const {
    name,
    phone: rawPhone,
    bio,
    experience,
    hourlyRate,
    monthlyRate,
    availableFrom,
    availableTo,
    workingDays,
    weekOffDays,
    hoursPerDay,
    availabilityNotes,
    offersSession,
    offersMonthly,
    skills,
    address,
    city,
    latitude,
    longitude,
    bankAccountHolder,
    bankAccountNumber,
    bankName,
    bankIfsc,
    bankUpiId,
    password,
    generatePassword
  } = req.body;

  const phone = rawPhone !== undefined ? normalizePhone(rawPhone) : undefined;

  if (phone) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone, id: { not: existing.userId } }
    });
    if (phoneTaken) throw new ApiError(400, "Phone number already registered");
  }

  const skillList = skills ? await validateActiveSkillCodes(parseSkills(skills)) : null;

  const profilePhoto = req.files?.profilePhoto?.[0]
    ? `/uploads/${req.files.profilePhoto[0].filename}`
    : undefined;

  const idProofUrl = req.files?.idProof?.[0]
    ? `/uploads/${req.files.idProof[0].filename}`
    : undefined;

  const isAppRegistration =
    existing.registrationSource === "SELF" || existing.user.isActive === false;

  let loginPassword =
    password && String(password).trim().length >= 6 ? String(password).trim() : null;
  if (isAppRegistration && generatePassword && !loginPassword) {
    loginPassword = generateCaregiverPassword();
  }
  if (password && String(password).trim().length > 0 && String(password).trim().length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  let credentials = null;

  const caregiver = await prisma.$transaction(async (tx) => {
    const userPatch = {
      ...(name && { name }),
      ...(phone !== undefined && { phone })
    };
    if (loginPassword && isAppRegistration) {
      userPatch.password = await bcrypt.hash(loginPassword, 12);
      userPatch.coordinatorSetPassword = true;
      credentials = {
        email: existing.user.email,
        password: loginPassword
      };
    }
    if (Object.keys(userPatch).length > 0) {
      await tx.user.update({
        where: { id: existing.userId },
        data: userPatch
      });
    }

    if (skillList) {
      await tx.caregiverSkill.deleteMany({ where: { caregiverId: id } });
      await tx.caregiverSkill.createMany({
        data: skillList.map((skillName) => ({ caregiverId: id, skillName }))
      });
    }

    return tx.caregiver.update({
      where: { id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(experience !== undefined && { experience: parseInt(experience, 10) }),
        ...(hourlyRate !== undefined && { hourlyRate: parseFloat(hourlyRate) }),
        ...(monthlyRate !== undefined && { monthlyRate: parseFloat(monthlyRate) }),
        ...(availableFrom !== undefined && { availableFrom }),
        ...(availableTo !== undefined && { availableTo }),
        ...(workingDays !== undefined && {
          workingDays: stringifyDays(workingDays)
        }),
        ...(weekOffDays !== undefined && {
          weekOffDays: stringifyDays(weekOffDays)
        }),
        ...(hoursPerDay !== undefined && {
          hoursPerDay: hoursPerDay === '' ? null : parseFloat(hoursPerDay)
        }),
        ...(availabilityNotes !== undefined && {
          availabilityNotes: availabilityNotes || null
        }),
        ...(offersSession !== undefined && {
          offersSession: parseBool(offersSession, true)
        }),
        ...(offersMonthly !== undefined && {
          offersMonthly: parseBool(offersMonthly, true)
        }),
        ...(profilePhoto && { profilePhoto }),
        ...(idProofUrl && { idProofUrl }),
        ...(req.body.idProofType && { idProofType: req.body.idProofType }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(latitude !== undefined && {
          latitude: latitude === "" ? null : parseFloat(latitude)
        }),
        ...(longitude !== undefined && {
          longitude: longitude === "" ? null : parseFloat(longitude)
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
  });

  sendSuccess(res, { caregiver, ...(credentials ? { credentials } : {}) });
};

exports.setCaregiverPassword = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const id = parseInt(req.params.id, 10);
  const { password, generatePassword } = req.body;

  const existing = await prisma.caregiver.findFirst({
    where: recordWhereForScope(scope, { id }),
    include: { user: true }
  });
  await assertScopedCaregiverAccess(scope, existing);

  const isAppRegistration =
    existing.registrationSource === "SELF" || existing.user.isActive === false;

  if (!isAppRegistration) {
    throw new ApiError(400, "Login password can only be set for app registrations");
  }

  let loginPassword =
    password && String(password).trim().length >= 6 ? String(password).trim() : null;
  if (generatePassword && !loginPassword) {
    loginPassword = generateCaregiverPassword();
  }
  if (!loginPassword) {
    throw new ApiError(400, "Provide a password (min 6 characters) or use generate password");
  }

  const credentials = await applyAppRegistrationPassword(
    existing.userId,
    existing.user.email,
    loginPassword
  );

  const caregiver = await prisma.caregiver.findFirst({
    where: { id },
    include: caregiverInclude
  });

  sendSuccess(res, {
    caregiver,
    credentials,
    message: "Login password saved. Share these details with the caregiver, then approve their profile."
  });
};

exports.verifyCaregiver = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const id = parseInt(req.params.id, 10);
  const { status, reason, password, generatePassword } = req.body;

  const existing = await prisma.caregiver.findFirst({
    where: recordWhereForScope(scope, { id }),
    include: { user: true }
  });
  await assertScopedCaregiverAccess(scope, existing);

  const isAppRegistration =
    existing.registrationSource === "SELF" || existing.user.isActive === false;

  let loginPassword =
    password && String(password).trim().length >= 6 ? String(password).trim() : null;

  if (
    status === "VERIFIED" &&
    !existing.aadhaarVerified &&
    process.env.REQUIRE_AADHAAR_VERIFICATION !== "false"
  ) {
    throw new ApiError(
      400,
      "Aadhaar Offline XML verification is required before approving this caregiver"
    );
  }

  if (status === "VERIFIED" && isAppRegistration) {
    if (!loginPassword && generatePassword) {
      loginPassword = generateCaregiverPassword();
    }
    if (!loginPassword && !existing.user.coordinatorSetPassword) {
      throw new ApiError(
        400,
        "Set a login password first (min 6 characters), or use generate password when approving"
      );
    }
  } else if (status === "VERIFIED" && password && String(password).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters when setting login");
  }

  const approvalCoordinatorId =
    status === "VERIFIED"
      ? await resolveApprovalCoordinatorId(scope, existing)
      : null;

  const caregiver = await prisma.caregiver.update({
    where: { id },
    data: {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      rejectionReason: status === "REJECTED" ? reason : null,
      ...(approvalCoordinatorId
        ? {
            coordinatorId: approvalCoordinatorId,
            registrationSource: "COORDINATOR"
          }
        : {})
    },
    include: caregiverInclude
  });

  let credentials = null;

  if (status === "VERIFIED") {
    const userData = { isActive: true };
    if (loginPassword) {
      userData.password = await bcrypt.hash(loginPassword, 12);
      userData.coordinatorSetPassword = true;
      credentials = {
        email: existing.user.email,
        password: loginPassword
      };
    }
    await prisma.user.update({
      where: { id: existing.userId },
      data: userData
    });
    await createNotification({
      userId: existing.userId,
      title: "Profile verified",
      body: loginPassword
        ? "Your profile is verified. Use the email and password your coordinator shared to sign in."
        : "Your caregiver profile has been verified",
      type: "CAREGIVER_VERIFIED",
      data: { caregiverId: id }
    });
  }

  sendSuccess(res, { caregiver, ...(credentials ? { credentials } : {}) });
};

exports.uploadIdProof = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const id = parseInt(req.params.id, 10);

  if (!req.file) throw new ApiError(400, "No file uploaded");

  const existing = await prisma.caregiver.findFirst({
    where: recordWhereForScope(scope, { id })
  });
  await assertScopedCaregiverAccess(scope, existing);

  const idProofUrl = `/uploads/${req.file.filename}`;
  const caregiver = await prisma.caregiver.update({
    where: { id },
    data: { idProofUrl },
    include: caregiverInclude
  });

  sendSuccess(res, { caregiver });
};

exports.getStats = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  if (scope.isAdmin) {
    throw new ApiError(403, "Sign in as a field coordinator to view agency revenue");
  }

  const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
  const stats = await getCoordinatorAnnualRevenue(scope.coordinatorId, year);
  sendSuccess(res, stats);
};

exports.updateProfile = async (req, res) => {
  const { agencyName, address, city, latitude, longitude, serviceRadiusKm } = req.body;

  let coordinator = await prisma.coordinator.findUnique({
    where: { userId: req.user.id }
  });

  if (!coordinator) {
    const role = getRoleCode(req.user);
    if (role !== "COORDINATOR") {
      throw new ApiError(404, "Coordinator profile not found. Contact support to link your agency.");
    }
    coordinator = await prisma.coordinator.create({
      data: {
        userId: req.user.id,
        agencyName: agencyName?.trim() || null,
        address: address.trim(),
        city: city?.trim() || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        serviceRadiusKm:
          serviceRadiusKm != null && serviceRadiusKm !== ""
            ? parseFloat(serviceRadiusKm)
            : 3
      }
    });
  } else {
    coordinator = await prisma.coordinator.update({
      where: { id: coordinator.id },
      data: {
        ...(agencyName !== undefined && { agencyName: agencyName?.trim() || null }),
        address: address.trim(),
        city: city?.trim() || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        ...(serviceRadiusKm !== undefined && {
          serviceRadiusKm: parseFloat(serviceRadiusKm)
        })
      }
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      parent: true,
      caregiver: { include: { skills: true, zones: true } },
      coordinator: true,
      ...userWithRoleInclude
    }
  });

  sendSuccess(res, { coordinator, user: serializeUser(user) });
};

const getScopedCaregiver = async (scope, caregiverId) => {
  const caregiver = await prisma.caregiver.findFirst({
    where: recordWhereForScope(scope, { id: caregiverId })
  });
  await assertScopedCaregiverAccess(scope, caregiver);
  return caregiver;
};

const getScopedCaregiverZone = async (scope, caregiverId, zoneId) => {
  const caregiver = await getScopedCaregiver(scope, caregiverId);
  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, caregiverId: caregiver.id }
  });
  if (!zone) throw new ApiError(404, "Zone not found");
  return { caregiver, zone };
};

const parseCaregiverIdParam = (req) => {
  const caregiverId = parseInt(req.params.id, 10);
  if (!Number.isFinite(caregiverId)) {
    throw new ApiError(400, "Invalid caregiver id");
  }
  return caregiverId;
};

exports.listCaregiverZones = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const caregiverId = parseCaregiverIdParam(req);
  await getScopedCaregiver(scope, caregiverId);

  const zones = await prisma.zone.findMany({
    where: { caregiverId },
    orderBy: { name: "asc" }
  });

  sendSuccess(res, { zones });
};

exports.createCaregiverZone = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const caregiverId = parseCaregiverIdParam(req);
  await getScopedCaregiver(scope, caregiverId);

  const { name, description, city, latitude, longitude } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Zone name is required");

  const zone = await prisma.zone.create({
    data: {
      caregiverId,
      name: name.trim(),
      description: description?.trim() || null,
      city: city?.trim() || null,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined
    }
  });

  sendSuccess(res, { zone }, 201);
};

exports.updateCaregiverZone = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const caregiverId = parseCaregiverIdParam(req);
  const zoneId = parseInt(req.params.zoneId, 10);
  await getScopedCaregiverZone(scope, caregiverId, zoneId);

  const { name, description, city, latitude, longitude } = req.body;
  const zone = await prisma.zone.update({
    where: { id: zoneId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description?.trim() || null
      }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude })
    }
  });

  sendSuccess(res, { zone });
};

exports.deleteCaregiverZone = async (req, res) => {
  const scope = await resolveCoordinatorScope(req.user);
  const caregiverId = parseCaregiverIdParam(req);
  const zoneId = parseInt(req.params.zoneId, 10);
  await getScopedCaregiverZone(scope, caregiverId, zoneId);

  await prisma.zone.delete({ where: { id: zoneId } });
  sendSuccess(res, { message: "Zone deleted" });
};
