const { generateResumePdf } = require("../services/pdf.service");
const { rewriteLongFields, expandShortFields } = require("../services/ai.service");
const ResumeProfile = require("../models/resumeProfile.model");

async function generate(req, res) {
  const payload = req.body || {};

  if (!payload.fullName || !payload.email || !payload.phone || !payload.skills || !payload.summary) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  if (!payload.experienceLevel) {
    return res.status(400).json({ message: "experienceLevel is required" });
  }

  if (payload.experienceLevel === "experienced" && !payload.experience) {
    return res.status(400).json({ message: "experience is required" });
  }

  if (payload.experienceLevel === "fresher" && !payload.projects) {
    return res.status(400).json({ message: "projects are required" });
  }

  const expanded = await expandShortFields(payload);
  const normalized = await rewriteLongFields(expanded);

  const userId = req.user?.sub;
  if (userId) {
    await ResumeProfile.create({
      userId,
      ...payload,
      aiRewrite: normalized.aiRewrite,
    });
  }

  const pdfBuffer = await generateResumePdf(normalized);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
  return res.send(pdfBuffer);
}

module.exports = { generate };
