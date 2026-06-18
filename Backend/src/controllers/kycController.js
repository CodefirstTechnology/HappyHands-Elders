const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { processOfflineAadhaarZip } = require("../services/aadhaarXmlService");
const { assertCoordinatorCanAccessCaregiver } = require("../services/coordinatorRegistrationService");
const { getRoleCode } = require("../services/roleService");

const caregiverKycSelect = {
  id: true,
  aadhaarVerified: true,
  aadhaarVerificationType: true,
  aadhaarVerifiedAt: true,
  aadhaarVerifiedName: true,
  aadhaarVerifiedDob: true,
  aadhaarVerifiedGender: true,
  aadhaarVerifiedAddress: true,
  aadhaarPhotoUrl: true,
  aadhaarReferenceId: true,
  aadhaarNameMatch: true,
  phoneVerified: true,
  verificationStatus: true,
  user: { select: { id: true, name: true, phone: true } }
};

const resolveCoordinatorScope = async (user) => {
  if (getRoleCode(user) === "ADMIN") {
    return { isAdmin: true, coordinatorId: null, coordinator: null };
  }
  const coordinator = await prisma.coordinator.findUnique({ where: { userId: user.id } });
  if (!coordinator) throw new ApiError(403, "Coordinator profile required");
  return { isAdmin: false, coordinatorId: coordinator.id, coordinator };
};

const assertCaregiverAccess = async (req, caregiver) => {
  if (!caregiver) throw new ApiError(404, "Caregiver profile not found");
  const role = getRoleCode(req.user);
  if (role === "COORDINATOR" || role === "ADMIN") {
    const scope = await resolveCoordinatorScope(req.user);
    if (!scope.isAdmin && scope.coordinatorId) {
      const coordinator =
        scope.coordinator || (await prisma.coordinator.findUnique({ where: { id: scope.coordinatorId } }));
      assertCoordinatorCanAccessCaregiver(scope, caregiver, coordinator);
    }
    return;
  }
  throw new ApiError(403, "Only coordinators can verify caregiver Aadhaar");
};

const applyAadhaarVerification = async (caregiver, result) => {
  const updated = await prisma.caregiver.update({
    where: { id: caregiver.id },
    data: {
      aadhaarVerified: true,
      aadhaarVerificationType: "UIDAI_XML",
      aadhaarVerifiedAt: new Date(),
      aadhaarVerifiedName: result.name,
      aadhaarVerifiedDob: result.dob,
      aadhaarVerifiedGender: result.genderLabel || result.gender,
      aadhaarVerifiedAddress: result.address,
      aadhaarPhotoUrl: result.photoUrl,
      aadhaarReferenceId: result.referenceId,
      aadhaarNameMatch: result.nameMatch,
      idProofType: "AADHAR",
      ...(result.photoUrl ? { profilePhoto: result.photoUrl } : {})
    },
    select: caregiverKycSelect
  });
  return updated;
};

exports.verifyAadhaarXmlForCaregiver = async (req, res) => {
  const caregiverId = parseInt(req.params.id, 10);
  const shareCode = String(req.body.shareCode || "").trim();
  if (!req.file?.buffer) throw new ApiError(400, "Aadhaar ZIP file is required");

  const caregiver = await prisma.caregiver.findUnique({
    where: { id: caregiverId },
    include: { user: true }
  });
  await assertCaregiverAccess(req, caregiver);

  let result;
  try {
    result = await processOfflineAadhaarZip({
      zipBuffer: req.file.buffer,
      shareCode,
      expectedName: caregiver.user.name
    });
  } catch (err) {
    throw new ApiError(400, err.message || "Invalid Aadhaar XML");
  }

  const caregiverUpdated = await applyAadhaarVerification(caregiver, result);

  sendSuccess(res, {
    message: "Aadhaar verified successfully",
    verification: {
      verified: true,
      type: "UIDAI_XML",
      name: result.name,
      dob: result.dob,
      gender: result.genderLabel,
      address: result.address,
      referenceId: result.referenceId,
      nameMatch: result.nameMatch,
      nameMatchScore: result.nameMatchScore
    },
    caregiver: caregiverUpdated
  });
};

exports.getAadhaarStatus = async (req, res) => {
  const caregiverId = parseInt(req.params.id, 10);
  const caregiver = await prisma.caregiver.findUnique({
    where: { id: caregiverId },
    select: caregiverKycSelect
  });
  await assertCaregiverAccess(req, caregiver);

  sendSuccess(res, {
    aadhaar: {
      verified: caregiver.aadhaarVerified,
      type: caregiver.aadhaarVerificationType,
      verifiedAt: caregiver.aadhaarVerifiedAt,
      name: caregiver.aadhaarVerifiedName,
      dob: caregiver.aadhaarVerifiedDob,
      gender: caregiver.aadhaarVerifiedGender,
      address: caregiver.aadhaarVerifiedAddress,
      photoUrl: caregiver.aadhaarPhotoUrl,
      referenceId: caregiver.aadhaarReferenceId,
      nameMatch: caregiver.aadhaarNameMatch
    },
    phoneVerified: caregiver.phoneVerified,
    verificationStatus: caregiver.verificationStatus
  });
};
