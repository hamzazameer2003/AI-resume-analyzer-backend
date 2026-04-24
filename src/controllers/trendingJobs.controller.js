const { getTrendingJobs } = require("../services/trendingJobs.service");
const Resume = require("../models/resume.model");
const mongoose = require("mongoose");

const STOPWORDS = new Set([
  "the","and","for","with","from","that","this","your","role","jobs","job","analysis","resume","skill","skills",
  "experience","using","based","target","work","working","position","positions","level","entry","associate"
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function buildFocusTokens(resume) {
  const roleTokens = tokenize(resume.jobTitle || "");
  const analysis = resume.analysis || {};
  const textPool = [
    Array.isArray(analysis.pros) ? analysis.pros.join(" ") : "",
    Array.isArray(analysis.suggestions) ? analysis.suggestions.join(" ") : "",
    Array.isArray(analysis.cons) ? analysis.cons.join(" ") : "",
  ].join(" ");
  const analysisTokens = tokenize(textPool).slice(0, 30);
  return new Set([...roleTokens, ...analysisTokens]);
}

function scoreJobForResume(job, resume) {
  const resumeTokens = buildFocusTokens(resume);
  const jobTokens = tokenize(`${job.title} ${job.summary || ""} ${(job.companies || []).join(" ")}`);
  let score = 0;
  jobTokens.forEach((token) => {
    if (resumeTokens.has(token)) score += 2;
  });
  // Strongly weight direct role title overlap.
  const rolePhrase = String(resume.jobTitle || "").toLowerCase();
  const jobTitle = String(job.title || "").toLowerCase();
  if (rolePhrase && jobTitle.includes(rolePhrase)) score += 12;
  const roleKeywords = tokenize(rolePhrase);
  roleKeywords.forEach((kw) => {
    if (jobTitle.includes(kw)) score += 4;
  });
  return score;
}

async function list(req, res) {
  const userId = req.user?.sub;
  const resumeId = req.query?.resumeId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let selectedResume = null;
  if (resumeId) {
    if (!mongoose.isValidObjectId(resumeId)) {
      return res.status(400).json({ message: "Invalid resumeId" });
    }
    selectedResume = await Resume.findOne({ _id: resumeId, userId }).lean();
    if (!selectedResume) {
      return res.status(404).json({ message: "Selected resume not found" });
    }
  } else {
    selectedResume = await Resume.findOne({ userId }).sort({ createdAt: -1 }).lean();
  }

  const data = await getTrendingJobs();
  if (!selectedResume) {
    return res.json({ resumeId: null, resumeJobTitle: "", jobs: data });
  }

  const rankedJobs = data
    .map((job) => ({ ...job, relevanceScore: scoreJobForResume(job, selectedResume) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore || String(a.title).localeCompare(String(b.title)))
    .slice(0, 12);

  return res.json({
    resumeId: selectedResume._id.toString(),
    resumeJobTitle: selectedResume.jobTitle || "",
    jobs: rankedJobs,
  });
}

module.exports = { list };
