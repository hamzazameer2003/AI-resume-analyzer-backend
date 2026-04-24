const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    googleId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
