const mongoose = require("mongoose");

const ResumeProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    experienceLevel: { type: String, enum: ["experienced", "fresher"], required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    location: { type: String },
    title: { type: String },
    linkedin: { type: String },
    github: { type: String },
    portfolio: { type: String },
    summary: { type: String },
    experience: { type: String },
    projects: { type: String },
    skills: { type: String },
    education: { type: String },
    certifications: { type: String },
    achievements: { type: String },
    languages: { type: String },
    theme: { type: String },
    sectionOrder: { type: [String], default: [] },
    aiRewrite: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResumeProfile", ResumeProfileSchema);
