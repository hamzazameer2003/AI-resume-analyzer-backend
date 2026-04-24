const express = require("express");
const controller = require("../controllers/resumeAnalysis.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { upload } = require("../utils/upload");

const router = express.Router();

router.post("/analyze", requireAuth, upload.single("resume"), controller.analyze);

module.exports = router;
