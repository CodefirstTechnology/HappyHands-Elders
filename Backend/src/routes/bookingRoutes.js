const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createBookingSchema,
  reviewSchema,
  rejectBookingSchema,
  updateTrackingSchema,
  verifyWorkOtpSchema
} = require("../validators/bookingValidator");

router.post(
  "/",
  authenticate,
  requireRole("PARENT"),
  validate(createBookingSchema),
  bookingController.createBooking
);
router.get("/", authenticate, bookingController.listBookings);
router.get(
  "/open-requests",
  authenticate,
  requireRole("CAREGIVER"),
  bookingController.listOpenRequests
);
router.get("/:id", authenticate, bookingController.getBooking);
router.get("/:id/tracking", authenticate, bookingController.getBookingTracking);
router.post(
  "/:id/tracking",
  authenticate,
  requireRole("CAREGIVER"),
  validate(updateTrackingSchema),
  bookingController.updateBookingTracking
);
router.patch(
  "/:id/confirm",
  authenticate,
  requireRole("CAREGIVER"),
  bookingController.confirmBooking
);
router.patch(
  "/:id/reject",
  authenticate,
  requireRole("CAREGIVER"),
  validate(rejectBookingSchema),
  bookingController.rejectBooking
);
router.patch(
  "/:id/arrived",
  authenticate,
  requireRole("CAREGIVER"),
  bookingController.markArrived
);
router.post(
  "/:id/verify-work-otp",
  authenticate,
  requireRole("CAREGIVER"),
  validate(verifyWorkOtpSchema),
  bookingController.verifyWorkOtp
);
router.post(
  "/:id/resend-work-otp",
  authenticate,
  requireRole("CAREGIVER"),
  bookingController.resendWorkOtp
);
router.patch(
  "/:id/cancel",
  authenticate,
  requireRole("PARENT"),
  bookingController.cancelBooking
);
router.patch("/:id/complete", authenticate, bookingController.completeBooking);
router.post(
  "/:id/review",
  authenticate,
  requireRole("PARENT"),
  validate(reviewSchema),
  bookingController.createReview
);

module.exports = router;
