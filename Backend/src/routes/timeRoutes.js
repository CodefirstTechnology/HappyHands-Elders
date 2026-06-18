const express = require("express");
const router = express.Router();
const timeController = require("../controllers/timeController");
const { authenticate, requireRole } = require("../middleware/auth");

router.post(
  "/clock-in",
  authenticate,
  requireRole("CAREGIVER"),
  timeController.clockIn
);
router.post(
  "/clock-out",
  authenticate,
  requireRole("CAREGIVER"),
  timeController.clockOut
);
router.get(
  "/today",
  authenticate,
  requireRole("CAREGIVER"),
  timeController.getToday
);
router.get(
  "/month",
  authenticate,
  requireRole("CAREGIVER"),
  timeController.getMonth
);
router.get(
  "/history",
  authenticate,
  requireRole("CAREGIVER"),
  timeController.getHistory
);

module.exports = router;
