const express = require("express");
const router = express.Router();
const kycController = require("../controllers/kycController");
const { authenticate, requireRole } = require("../middleware/auth");
const { uploadAadhaarZip } = require("../middleware/uploadKyc");

router.post(
  "/aadhaar/xml/verify/:id",
  authenticate,
  requireRole("COORDINATOR", "ADMIN"),
  uploadAadhaarZip.single("aadhaarZip"),
  kycController.verifyAadhaarXmlForCaregiver
);

router.get(
  "/aadhaar/status/:id",
  authenticate,
  requireRole("COORDINATOR", "ADMIN"),
  kycController.getAadhaarStatus
);

module.exports = router;
