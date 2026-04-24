const express = require("express");
const controller = require("../controllers/career.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/suggestions", requireAuth, controller.suggestions);

module.exports = router;
