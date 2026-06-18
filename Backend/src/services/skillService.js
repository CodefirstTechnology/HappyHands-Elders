const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const normalizeSkillCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const codeFromLabel = (label) => normalizeSkillCode(label);

const validateActiveSkillCodes = async (skills) => {
  if (!skills?.length) return [];

  const normalized = [...new Set(skills.map(normalizeSkillCode).filter(Boolean))];
  const active = await prisma.skill.findMany({
    where: { code: { in: normalized }, isActive: true },
    select: { code: true }
  });
  const activeCodes = new Set(active.map((s) => s.code));
  const invalid = normalized.filter((code) => !activeCodes.has(code));

  if (invalid.length) {
    throw new ApiError(400, `Invalid or inactive skills: ${invalid.join(", ")}`);
  }

  return normalized;
};

module.exports = {
  normalizeSkillCode,
  codeFromLabel,
  validateActiveSkillCodes
};
