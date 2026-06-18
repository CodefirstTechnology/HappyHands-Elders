const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");
const { authenticate, requireRole } = require("../middleware/auth");
router.use(authenticate, requireRole("CAREGIVER"));

router.get("/me", zoneController.listMyZones);

module.exports = router;
