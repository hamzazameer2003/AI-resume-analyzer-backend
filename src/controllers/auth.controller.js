const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { sendOtpEmail, verifyOtpCode } = require("../services/otp.service");

async function signup(req, res) {
  const { name, email, password, confirmPassword } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.isEmailVerified) {
      return res.status(400).json({ message: "Email already in use" });
    }

    existing.name = name;
    existing.passwordHash = await bcrypt.hash(password, 10);
    await existing.save();
    await sendOtpEmail(normalizedEmail);
    return res.json({ message: "Account exists but unverified. New OTP sent.", email: normalizedEmail });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email: normalizedEmail, passwordHash, isEmailVerified: false });

  await sendOtpEmail(normalizedEmail);

  return res.json({ message: "Signup successful. OTP sent.", email: normalizedEmail });
}

async function verifyOtp(req, res) {
  const { email, otp } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const ok = await verifyOtpCode(normalizedEmail, otp);
  if (!ok) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  await User.updateOne({ email: normalizedEmail }, { isEmailVerified: true });
  return res.json({ message: "Email verified" });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.passwordHash) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  if (!user.isEmailVerified) {
    return res.status(400).json({ message: "Email not verified" });
  }

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  return res.json({ token });
}

function googleCallback(req, res) {
  const user = req.user || {};
  return (async () => {
    if (!user.email) {
      return res.status(400).json({ message: "Google account missing email" });
    }

    const existing = await User.findOne({ email: user.email });
    let savedUser = existing;
    if (!existing) {
      savedUser = await User.create({
        name: user.name || "Google User",
        email: user.email,
        googleId: user.googleId,
        isEmailVerified: true,
      });
    }

    const token = jwt.sign(
      { sub: savedUser._id.toString(), email: savedUser.email },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/login?token=${token}`);
  })();
}

module.exports = {
  signup,
  verifyOtp,
  login,
  googleCallback,
};
