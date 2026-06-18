const express = require("express");
const router = express.Router();
const caregiverController = require("../controllers/caregiverController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { updateCaregiverMeSchema } = require("../validators/caregiverValidator");

router.get(
  "/",
  authenticate,
  requireRole("PARENT"),
  caregiverController.listCaregivers
);

router.get(
  "/me/schedule",
  authenticate,
  requireRole("CAREGIVER"),
  caregiverController.getMySchedule
);
router.get(
  "/me/time-entries",
  authenticate,
  requireRole("CAREGIVER"),
  caregiverController.getMyTimeEntries
);
router.get(
  "/me",
  authenticate,
  requireRole("CAREGIVER"),
  caregiverController.getMyProfile
);
router.patch(
  "/me",
  authenticate,
  requireRole("CAREGIVER"),
  validate(updateCaregiverMeSchema),
  caregiverController.updateMyProfile
);

router.get("/:id", authenticate, caregiverController.getCaregiver);

module.exports = router;
