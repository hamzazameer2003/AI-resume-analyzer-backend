const { deleteResumeByIdForUser, listResumesByUser } = require("../services/data.service");

async function overview(req, res) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const resumes = await listResumesByUser(userId, 10);

  return res.json({
    user: userId,
    resumes: resumes.map((r) => ({
      id: r.id,
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

  const deleted = await deleteResumeByIdForUser(resumeId, userId);
  if (!deleted) {
    return res.status(404).json({ message: "Resume not found" });
  }

  return res.json({ message: "Resume deleted", resumeId });
}

module.exports = { overview, remove };
