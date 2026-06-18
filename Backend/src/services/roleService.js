const prisma = require("../config/prisma");

/** Fixed master role IDs — must match Role table seed data. */
const ROLE_IDS = {
  ADMIN: 1,
  COORDINATOR: 2,
  CAREGIVER: 3,
  FAMILY_CLIENT: 4
};

const ROLE_CODES = {
  1: "ADMIN",
  2: "COORDINATOR",
  3: "CAREGIVER",
  4: "FAMILY_CLIENT"
};

const MASTER_ROLES = [
  { id: ROLE_IDS.ADMIN, code: "ADMIN", label: "Admin" },
  { id: ROLE_IDS.COORDINATOR, code: "COORDINATOR", label: "Coordinator" },
  { id: ROLE_IDS.CAREGIVER, code: "CAREGIVER", label: "Caregiver" },
  { id: ROLE_IDS.FAMILY_CLIENT, code: "FAMILY_CLIENT", label: "Family Client" }
];

const userWithRoleInclude = { role: true };

const normalizeRoleCode = (role) => {
  if (role === "PARENT") return "FAMILY_CLIENT";
  return role;
};

const getRoleCode = (user) => {
  if (!user) return null;
  if (typeof user.role === "string") return normalizeRoleCode(user.role);
  return normalizeRoleCode(user.role?.code ?? ROLE_CODES[user.roleId] ?? null);
};

const resolveRoleId = (codeOrId) => {
  if (typeof codeOrId === "number") return codeOrId;
  const normalized = normalizeRoleCode(codeOrId);
  const entry = MASTER_ROLES.find((r) => r.code === normalized);
  return entry?.id ?? null;
};

const roleWhereByCode = (code) =>
  code ? { role: { code: normalizeRoleCode(code) } } : {};

const serializeUser = (user) => {
  if (!user) return user;
  const { password, role: roleRelation, parent, familyClient, ...rest } = user;
  const profile = familyClient ?? parent ?? null;
  const role = getRoleCode(user);
  return {
    ...rest,
    role,
    roleId: user.roleId ?? roleRelation?.id ?? resolveRoleId(role),
    ...(profile ? { familyClient: profile } : {}),
    ...(roleRelation
      ? {
          roleDetail: {
            id: roleRelation.id,
            code: roleRelation.code,
            label: roleRelation.label
          }
        }
      : {})
  };
};

const seedRoles = async (client = prisma) => {
  for (const role of MASTER_ROLES) {
    await client.role.upsert({
      where: { id: role.id },
      update: { code: role.code, label: role.label },
      create: role
    });
  }
};

module.exports = {
  ROLE_IDS,
  ROLE_CODES,
  MASTER_ROLES,
  userWithRoleInclude,
  normalizeRoleCode,
  getRoleCode,
  resolveRoleId,
  roleWhereByCode,
  serializeUser,
  seedRoles
};
