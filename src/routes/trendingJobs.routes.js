const express = require("express");
const controller = require("../controllers/trendingJobs.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, controller.list);

module.exports = router;
