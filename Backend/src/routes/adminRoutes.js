const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const skillController = require("../controllers/skillController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createSkillSchema, updateSkillSchema } = require("../validators/skillValidator");
const { createCoordinatorSchema, updateCoordinatorSchema } = require("../validators/coordinatorValidator");

router.use(authenticate, requireRole("ADMIN"));

router.get("/stats", adminController.getStats);
router.get("/users", adminController.listUsers);
router.get("/bookings", adminController.listBookings);
router.get("/caregivers", adminController.listCaregivers);
router.get("/coordinators", adminController.listCoordinators);
router.post("/coordinators", validate(createCoordinatorSchema), adminController.createCoordinator);
router.patch("/coordinators/:id", validate(updateCoordinatorSchema), adminController.updateCoordinator);
router.patch("/users/:id/toggle", adminController.toggleUser);

router.get("/skills", skillController.adminListSkills);
router.post("/skills", validate(createSkillSchema), skillController.adminCreateSkill);
router.patch("/skills/:id", validate(updateSkillSchema), skillController.adminUpdateSkill);
router.delete("/skills/:id", skillController.adminDeleteSkill);

module.exports = router;
