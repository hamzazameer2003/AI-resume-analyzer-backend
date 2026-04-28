const { getTrendingJobs } = require("../services/trendingJobs.service");
const { isUuid } = require("../lib/validators");
const { findLatestResumeByUser, findResumeByIdForUser } = require("../services/data.service");
const { rankTrendingJobsForResume } = require("../services/ai.service");

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
  const keywordTokens = Array.isArray(analysis.focusKeywords) ? analysis.focusKeywords : [];
  const textPool = [
    Array.isArray(analysis.pros) ? analysis.pros.join(" ") : "",
    Array.isArray(analysis.suggestions) ? analysis.suggestions.join(" ") : "",
    Array.isArray(analysis.cons) ? analysis.cons.join(" ") : "",
    analysis.resumeTextSnippet || "",
  ].join(" ");
  const analysisTokens = tokenize(textPool).slice(0, 40);
  return new Set([...roleTokens, ...keywordTokens, ...analysisTokens]);
}

function scoreJobForResume(job, resume) {
  const resumeTokens = buildFocusTokens(resume);
  const jobTokens = tokenize(`${job.title} ${job.summary || ""} ${(job.companies || []).join(" ")}`);
  let score = 0;
  jobTokens.forEach((token) => {
    if (resumeTokens.has(token)) score += 2;
  });
  const rolePhrase = String(resume.jobTitle || "").toLowerCase();
  const jobTitle = String(job.title || "").toLowerCase();
  if (rolePhrase && jobTitle.includes(rolePhrase)) score += 12;
  tokenize(rolePhrase).forEach((kw) => {
    if (jobTitle.includes(kw)) score += 4;
  });
  return Math.max(0, Math.min(100, score));
}

function rankJobsWithFallback(jobs, resume) {
  return jobs
    .map((job) => ({ ...job, relevanceScore: scoreJobForResume(job, resume) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore || String(a.title).localeCompare(String(b.title)))
    .slice(0, 12);
}

async function list(req, res) {
  const userId = req.user?.sub;
  const resumeId = req.query?.resumeId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let selectedResume = null;
  if (resumeId) {
    if (!isUuid(resumeId)) {
      return res.status(400).json({ message: "Invalid resumeId" });
    }
    selectedResume = await findResumeByIdForUser(resumeId, userId);
    if (!selectedResume) {
      return res.status(404).json({ message: "Selected resume not found" });
    }
  } else {
    selectedResume = await findLatestResumeByUser(userId);
  }

  const data = await getTrendingJobs();
  if (!selectedResume) {
    return res.json({ resumeId: null, resumeJobTitle: "", jobs: data });
  }

  let rankedJobs = [];
  try {
    rankedJobs = await rankTrendingJobsForResume({ resume: selectedResume, jobs: data });
  } catch (err) {
    rankedJobs = rankJobsWithFallback(data, selectedResume);
  }

  if (!rankedJobs.length) {
    rankedJobs = rankJobsWithFallback(data, selectedResume);
  }

  return res.json({
    resumeId: selectedResume.id,
    resumeJobTitle: selectedResume.jobTitle || "",
    jobs: rankedJobs,
  });
}

module.exports = { list };
