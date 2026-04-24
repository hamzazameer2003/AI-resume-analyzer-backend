const Resume = require("../models/resume.model");

async function overview(req, res) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const resumes = await Resume.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return res.json({
    user: userId,
    resumes: resumes.map((r) => ({
      id: r._id.toString(),
      jobTitle: r.jobTitle,
      atsScore: r.atsScore,
    })),
  });
}

async function remove(req, res) {
  const userId = req.user?.sub;
  const resumeId = req.params?.resumeId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!resumeId) {
    return res.status(400).json({ message: "resumeId is required" });
  }

  const deleted = await Resume.findOneAndDelete({ _id: resumeId, userId }).lean();
  if (!deleted) {
    return res.status(404).json({ message: "Resume not found" });
  }

  return res.json({ message: "Resume deleted", resumeId });
}

module.exports = { overview, remove };
