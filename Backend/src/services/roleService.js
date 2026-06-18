const prisma = require("../config/prisma");

/** Fixed master role IDs — must match Role table seed data. */
const ROLE_IDS = {
  ADMIN: 1,
  COORDINATOR: 2,
  CAREGIVER: 3,
  PARENT: 4
};

const ROLE_CODES = {
  1: "ADMIN",
  2: "COORDINATOR",
  3: "CAREGIVER",
  4: "PARENT"
};

const MASTER_ROLES = [
  { id: ROLE_IDS.ADMIN, code: "ADMIN", label: "Admin" },
  { id: ROLE_IDS.COORDINATOR, code: "COORDINATOR", label: "Coordinator" },
  { id: ROLE_IDS.CAREGIVER, code: "CAREGIVER", label: "Caregiver" },
  { id: ROLE_IDS.PARENT, code: "PARENT", label: "Parent" }
];

const userWithRoleInclude = { role: true };

const getRoleCode = (user) => {
  if (!user) return null;
  if (typeof user.role === "string") return user.role;
  return user.role?.code ?? ROLE_CODES[user.roleId] ?? null;
};

const resolveRoleId = (codeOrId) => {
  if (typeof codeOrId === "number") return codeOrId;
  const entry = MASTER_ROLES.find((r) => r.code === codeOrId);
  return entry?.id ?? null;
};

const roleWhereByCode = (code) =>
  code ? { role: { code } } : {};

const serializeUser = (user) => {
  if (!user) return user;
  const { password, role: roleRelation, ...rest } = user;
  const role = getRoleCode(user);
  return {
    ...rest,
    role,
    roleId: user.roleId ?? roleRelation?.id ?? resolveRoleId(role),
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
  getRoleCode,
  resolveRoleId,
  roleWhereByCode,
  serializeUser,
  seedRoles
};
