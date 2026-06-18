const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");

const getCaregiverForUser = async (userId) => {
  const caregiver = await prisma.caregiver.findUnique({ where: { userId } });
  if (!caregiver) throw new ApiError(404, "Caregiver profile not found");
  return caregiver;
};

exports.listMyZones = async (req, res) => {
  const caregiver = await getCaregiverForUser(req.user.id);
  const zones = await prisma.zone.findMany({
    where: { caregiverId: caregiver.id },
    orderBy: { name: "asc" }
  });
  sendSuccess(res, { zones });
};
