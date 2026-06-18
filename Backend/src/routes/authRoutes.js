const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const {
  registerParentSchema,
  registerCaregiverSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateLocationSchema,
  updatePreferencesSchema
} = require("../validators/authValidator");

router.post(
  "/register-parent",
  validate(registerParentSchema),
  asyncHandler(authController.registerParent)
);
router.post(
  "/register-caregiver",
  validate(registerCaregiverSchema),
  asyncHandler(authController.registerCaregiver)
);
router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.post("/refresh", validate(refreshSchema), asyncHandler(authController.refresh));
router.post("/logout", authenticate, asyncHandler(authController.logout));
router.get("/me", authenticate, asyncHandler(authController.me));
router.patch(
  "/me/location",
  authenticate,
  validate(updateLocationSchema),
  asyncHandler(authController.updateLocation)
);
router.patch(
  "/me/preferences",
  authenticate,
  validate(updatePreferencesSchema),
  asyncHandler(authController.updatePreferences)
);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

module.exports = router;
