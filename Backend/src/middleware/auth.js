const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");
const { userWithRoleInclude, getRoleCode } = require("../services/roleService");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication required"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        ...userWithRoleInclude,
        parent: true,
        caregiver: true,
        coordinator: true
      }
    });

    if (!user || !user.isActive) {
      return next(new ApiError(401, "User not found or inactive"));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: getRoleCode(user),
      roleId: user.roleId,
      name: user.name,
      parent: user.parent,
      caregiver: user.caregiver,
      coordinator: user.coordinator
    };

    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };

module.exports = { authenticate, requireRole };
