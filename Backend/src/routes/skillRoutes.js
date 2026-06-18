const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skillController");
const { authenticate } = require("../middleware/auth");

router.get("/public", skillController.listActiveSkills);
router.get("/", authenticate, skillController.listActiveSkills);

module.exports = router;
