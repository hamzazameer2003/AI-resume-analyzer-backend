const axios = require("axios");
const Otp = require("../models/otp.model");

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await Otp.findOneAndUpdate(
    { email },
    { code: otp, expiresAt, verified: false },
    { upsert: true, new: true }
  );

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
    return { sent: false, otp }; // fallback for local dev
  }

  try {
    await axios.post(
      process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: process.env.BREVO_FROM_EMAIL,
          name: process.env.BREVO_FROM_NAME || "Resume Analyzer",
        },
        to: [{ email }],
        subject: "Your OTP Code",
        htmlContent: `<p>Your OTP code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
  } catch (err) {
    const sendErr = new Error("Failed to send OTP email. Verify Brevo API key and sender identity.");
    sendErr.statusCode = 502;
    throw sendErr;
  }

  return { sent: true };
}

async function verifyOtpCode(email, otp) {
  const entry = await Otp.findOne({ email });
  if (!entry) return false;
  if (entry.expiresAt.getTime() < Date.now()) return false;
  if (entry.code !== otp) return false;
  entry.verified = true;
  await entry.save();
  return true;
}

module.exports = { sendOtpEmail, verifyOtpCode };
