const express = require("express");
const controller = require("../controllers/resumeGenerator.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/generate", requireAuth, controller.generate);

module.exports = router;
