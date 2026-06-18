const { z } = require("zod");

const createSkillSchema = z.object({
  body: z.object({
    label: z.string().min(2).max(80),
    code: z.string().min(2).max(40).optional(),
    sortOrder: z.coerce.number().int().min(0).optional()
  })
});

const updateSkillSchema = z.object({
  body: z.object({
    label: z.string().min(2).max(80).optional(),
    code: z.string().min(2).max(40).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional()
  })
});

module.exports = {
  createSkillSchema,
  updateSkillSchema
};
