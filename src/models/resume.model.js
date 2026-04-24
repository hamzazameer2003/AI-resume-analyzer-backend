const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileUrl: { type: String },
    jobTitle: { type: String },
    atsScore: { type: Number },
    analysis: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resume", ResumeSchema);
