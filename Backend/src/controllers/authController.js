const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRefreshTokenString
} = require("../utils/jwt");
const logger = require("../utils/logger");
const { normalizeEmail, normalizePhone } = require("../utils/normalize");
const { validateActiveSkillCodes } = require("../services/skillService");
const {
  ROLE_IDS,
  userWithRoleInclude,
  getRoleCode,
  serializeUser
} = require("../services/roleService");
const { notifyNearbyCoordinatorsOfRegistration } = require("../services/coordinatorRegistrationService");

const sanitizeUser = (user) => serializeUser(user);

const issueTokens = async (user) => {
  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    role: getRoleCode(user)
  });

  const refreshTokenStr = generateRefreshTokenString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenStr,
      userId: user.id,
      expiresAt
    }
  });

  const refreshToken = signRefreshToken({ id: user.id, token: refreshTokenStr });

  return { accessToken, refreshToken, refreshTokenStr };
};

exports.registerParent = async (req, res) => {
  const {
    name,
    password,
    address,
    city,
    latitude,
    longitude,
    preferredLanguage,
    numberOfChildren,
    childrenAges,
    specialRequirements
  } = req.body;
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] }
  });
  if (existing) throw new ApiError(400, "Email or phone already registered");

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed,
      roleId: ROLE_IDS.PARENT,
      preferredLanguage: preferredLanguage || "en",
      parent: {
        create: {
          address,
          city,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          numberOfChildren: numberOfChildren ?? undefined,
          childrenAges: childrenAges ?? [],
          specialRequirements: specialRequirements?.trim() || null
        }
      }
    },
    include: { parent: true, ...userWithRoleInclude }
  });

  const tokens = await issueTokens(user);
  logger.info("Parent registered", { userId: user.id });

  sendSuccess(
    res,
    { user: sanitizeUser(user), ...tokens },
    201
  );
};

const digitsOnlyPhone = (phone) => String(phone ?? "").replace(/\D/g, "") || null;

exports.registerCaregiver = async (req, res) => {
  const { name, address, city, latitude, longitude, preferredLanguage, skills } = req.body;
  const email = normalizeEmail(req.body.email);
  const phone = digitsOnlyPhone(normalizePhone(req.body.phone));

  const skillList = await validateActiveSkillCodes(skills);
  if (!skillList.length) {
    throw new ApiError(400, "Select at least one skill");
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ApiError(400, "Location is required. Enable GPS or pick your area on the map.");
  }

  const caregiverProfile = {
    address: address.trim(),
    city: city?.trim() || null,
    latitude: lat,
    longitude: lng,
    verificationStatus: "PENDING",
    registrationSource: "SELF",
    phoneVerified: !!phone
  };
  const skillCreates = skillList.map((skillName) => ({ skillName }));

  const byEmail = email
    ? await prisma.user.findUnique({
        where: { email },
        include: { caregiver: { include: { skills: true } }, ...userWithRoleInclude }
      })
    : null;
  const byPhone = phone
    ? await prisma.user.findFirst({
        where: { phone },
        include: { caregiver: { include: { skills: true } }, ...userWithRoleInclude }
      })
    : null;

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    throw new ApiError(
      400,
      "This phone number is linked to a different account. Use that email or another phone number."
    );
  }

  const existing = byEmail || byPhone;

  if (existing) {
    if (existing.isActive) {
      throw new ApiError(
        400,
        getRoleCode(existing) === "CAREGIVER"
          ? "This account is already active. Sign in with the email and password your coordinator shared."
          : "Email or phone is already registered on another account."
      );
    }
    if (getRoleCode(existing) !== "CAREGIVER" || !existing.caregiver) {
      throw new ApiError(400, "Email or phone is already registered on another account type.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          name,
          phone,
          preferredLanguage: preferredLanguage || existing.preferredLanguage || "en"
        }
      });
      await tx.caregiverSkill.deleteMany({ where: { caregiverId: existing.caregiver.id } });
      return tx.caregiver.update({
        where: { id: existing.caregiver.id },
        data: {
          ...caregiverProfile,
          coordinatorId: null,
          skills: { create: skillCreates }
        },
        include: { skills: true }
      });
    });

    const nearbyCoordinators = await notifyNearbyCoordinatorsOfRegistration(updated, {
      name,
      city: city?.trim(),
      address: address.trim()
    });

    logger.info("Caregiver registration updated", {
      userId: existing.id,
      caregiverId: updated.id,
      nearbyCoordinators: nearbyCoordinators.length
    });

    const areaMessage =
      nearbyCoordinators.length > 0
        ? `Your request was sent to ${nearbyCoordinators.length} nearby coordinator(s).`
        : "No coordinators cover your area yet. An admin will assign one soon.";

    return sendSuccess(
      res,
      {
        message: `Application updated. ${areaMessage}`,
        caregiverId: updated.id,
        nearbyCoordinatorCount: nearbyCoordinators.length
      },
      200
    );
  }

  const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: placeholderPassword,
      roleId: ROLE_IDS.CAREGIVER,
      isActive: false,
      preferredLanguage: preferredLanguage || "en",
      caregiver: {
        create: {
          ...caregiverProfile,
          coordinatorId: null,
          skills: { create: skillCreates }
        }
      }
    },
    include: { caregiver: { include: { skills: true } }, ...userWithRoleInclude }
  });

  const nearbyCoordinators = await notifyNearbyCoordinatorsOfRegistration(user.caregiver, {
    name,
    city: city?.trim(),
    address: address.trim()
  });

  logger.info("Caregiver registration application", {
    userId: user.id,
    caregiverId: user.caregiver?.id,
    nearbyCoordinators: nearbyCoordinators.length
  });

  const areaMessage =
    nearbyCoordinators.length > 0
      ? `Your request was sent to ${nearbyCoordinators.length} nearby coordinator(s).`
      : "No coordinators cover your area yet. An admin will assign one soon.";

  sendSuccess(
    res,
    {
      message: `Application submitted. ${areaMessage}`,
      caregiverId: user.caregiver?.id,
      nearbyCoordinatorCount: nearbyCoordinators.length
    },
    201
  );
};

exports.login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { parent: true, caregiver: true, coordinator: true, ...userWithRoleInclude }
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    if (getRoleCode(user) === "CAREGIVER") {
      throw new ApiError(
        403,
        "Your application is under review. A coordinator will contact you with login details."
      );
    }
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  if (getRoleCode(user) === "CAREGIVER" && !user.caregiver) {
    throw new ApiError(403, "Caregiver profile not found. Contact your coordinator.");
  }

  const tokens = await issueTokens(user);

  sendSuccess(res, { user: sanitizeUser(user), ...tokens });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: decoded.token },
    include: { user: { include: userWithRoleInclude } }
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const tokens = await issueTokens(stored.user);

  sendSuccess(res, tokens);
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.deleteMany({
        where: { token: decoded.token, userId: req.user.id }
      });
    } catch {
      await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });
    }
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });
  }

  sendSuccess(res, { message: "Logged out" });
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      parent: true,
      caregiver: { include: { skills: true, zones: true } },
      coordinator: true,
      ...userWithRoleInclude
    }
  });

  if (!user) throw new ApiError(404, "User not found");

  sendSuccess(res, { user: sanitizeUser(user) });
};

exports.updateLocation = async (req, res) => {
  if (req.user.role !== "PARENT") {
    throw new ApiError(403, "Only parents can update home location");
  }

  const parent = await prisma.parent.findUnique({
    where: { userId: req.user.id }
  });
  if (!parent) throw new ApiError(404, "Parent profile not found");

  const { address, flatNo, building, area, city, latitude, longitude } = req.body;

  const updated = await prisma.parent.update({
    where: { id: parent.id },
    data: {
      ...(address !== undefined && { address }),
      ...(flatNo !== undefined && { flatNo: flatNo || null }),
      ...(building !== undefined && { building: building || null }),
      ...(area !== undefined && { area: area || null }),
      ...(city !== undefined && { city }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude })
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { parent: true, caregiver: true, coordinator: true, ...userWithRoleInclude }
  });

  sendSuccess(res, { parent: updated, user: sanitizeUser(user) });
};

exports.updatePreferences = async (req, res) => {
  const { preferredLanguage } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { preferredLanguage },
    include: {
      parent: true,
      caregiver: { include: { skills: true, zones: true } },
      coordinator: true,
      ...userWithRoleInclude
    }
  });

  sendSuccess(res, { user: sanitizeUser(user) });
};

const resetTokens = new Map();

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, { userId: user.id, expires: Date.now() + 3600000 });
    logger.info("Password reset requested", { email });
  }

  sendSuccess(res, {
    message: "If the email exists, a reset link has been sent"
  });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const entry = resetTokens.get(token);

  if (!entry || entry.expires < Date.now()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: entry.userId },
    data: { password: hashed }
  });

  resetTokens.delete(token);
  sendSuccess(res, { message: "Password updated" });
};
