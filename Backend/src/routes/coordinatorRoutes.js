const express = require("express");
const router = express.Router();
const coordinatorController = require("../controllers/coordinatorController");
const { authenticate, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const {
  createCaregiverSchema,
  verifyCaregiverSchema,
  setCaregiverPasswordSchema
} = require("../validators/caregiverValidator");
const { updateCoordinatorProfileSchema } = require("../validators/coordinatorValidator");
const {
  createZoneSchema,
  updateZoneSchema
} = require("../validators/zoneValidator");

router.use(authenticate, requireRole("COORDINATOR", "ADMIN"));

router.get("/stats", coordinatorController.getStats);

router.patch(
  "/profile",
  validate(updateCoordinatorProfileSchema),
  coordinatorController.updateProfile
);

router.post(
  "/caregivers",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idProof", maxCount: 1 }
  ]),
  validate(createCaregiverSchema),
  coordinatorController.createCaregiver
);
router.get("/caregivers", coordinatorController.listCaregivers);
router.get("/caregivers/:id", coordinatorController.getCaregiver);
router.patch(
  "/caregivers/:id/password",
  validate(setCaregiverPasswordSchema),
  coordinatorController.setCaregiverPassword
);
router.patch(
  "/caregivers/:id",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idProof", maxCount: 1 }
  ]),
  coordinatorController.updateCaregiver
);
router.patch(
  "/caregivers/:id/verify",
  validate(verifyCaregiverSchema),
  coordinatorController.verifyCaregiver
);
router.post(
  "/caregivers/:id/upload-id",
  upload.single("idProof"),
  coordinatorController.uploadIdProof
);

router.get("/caregivers/:id/zones", coordinatorController.listCaregiverZones);
router.post(
  "/caregivers/:id/zones",
  validate(createZoneSchema),
  coordinatorController.createCaregiverZone
);
router.patch(
  "/caregivers/:id/zones/:zoneId",
  validate(updateZoneSchema),
  coordinatorController.updateCaregiverZone
);
router.delete("/caregivers/:id/zones/:zoneId", coordinatorController.deleteCaregiverZone);

module.exports = router;
