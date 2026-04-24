const express = require("express");
const controller = require("../controllers/auth.controller");
const passport = require("passport");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const router = express.Router();

router.post("/signup", controller.signup);
router.post("/verify-otp", controller.verifyOtp);
router.post("/login", controller.login);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${FRONTEND_URL}/login` }),
  controller.googleCallback
);

module.exports = router;
