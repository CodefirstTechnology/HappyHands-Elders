const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { codeFromLabel, normalizeSkillCode } = require("../services/skillService");

exports.listActiveSkills = async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
  });

  sendSuccess(res, { skills });
};

exports.adminListSkills = async (req, res) => {
  const skills = await prisma.skill.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
  });

  sendSuccess(res, { skills });
};

exports.adminCreateSkill = async (req, res) => {
  const { label, code: rawCode, sortOrder } = req.body;
  const code = normalizeSkillCode(rawCode || codeFromLabel(label));

  if (!code) throw new ApiError(400, "Skill code is required");

  const existing = await prisma.skill.findUnique({ where: { code } });
  if (existing) throw new ApiError(400, "A skill with this code already exists");

  const skill = await prisma.skill.create({
    data: {
      code,
      label: label.trim(),
      sortOrder: sortOrder ?? 0
    }
  });

  sendSuccess(res, { skill }, 201);
};

exports.adminUpdateSkill = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { label, code: rawCode, isActive, sortOrder } = req.body;

  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Skill not found");

  const nextCode = rawCode !== undefined ? normalizeSkillCode(rawCode) : undefined;
  if (nextCode !== undefined && !nextCode) {
    throw new ApiError(400, "Skill code is required");
  }

  if (nextCode && nextCode !== existing.code) {
    const codeTaken = await prisma.skill.findUnique({ where: { code: nextCode } });
    if (codeTaken) throw new ApiError(400, "A skill with this code already exists");
  }

  const skill = await prisma.skill.update({
    where: { id },
    data: {
      ...(label !== undefined && { label: label.trim() }),
      ...(nextCode !== undefined && { code: nextCode }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder })
    }
  });

  sendSuccess(res, { skill });
};

exports.adminDeleteSkill = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Skill not found");

  const inUse = await prisma.caregiverSkill.count({
    where: { skillName: existing.code }
  });

  if (inUse > 0) {
    const skill = await prisma.skill.update({
      where: { id },
      data: { isActive: false }
    });
    return sendSuccess(res, {
      skill,
      message: "Skill is in use by caregivers and was deactivated instead of deleted"
    });
  }

  await prisma.skill.delete({ where: { id } });
  sendSuccess(res, { message: "Skill deleted" });
};
