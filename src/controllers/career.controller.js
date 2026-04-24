const Resume = require("../models/resume.model");
const mongoose = require("mongoose");
const { generateWithFallback, parseJsonResponse } = require("../services/ai.service");

function toSuggestionsFromText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 5);
}

function fallbackSuggestionsFromResume(resume) {
  const base = resume.jobTitle || "this role";
  return [
    `Apply to entry-level and associate ${base} positions.`,
    "Strengthen projects with measurable outcomes and clear impact statements.",
    "Map resume keywords directly to job descriptions before applying.",
    "Build a targeted portfolio and include role-specific case studies.",
    "Prioritize companies with active hiring pipelines in this domain.",
  ];
}

async function suggestions(req, res) {
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

  if (!selectedResume) {
    return res.json({ suggestions: [] });
  }

  const prompt = `Based on this resume analysis and target job, suggest 5 suitable career roles. Return ONLY JSON: { \"suggestions\": [\"...\"] }.\nAnalysis: ${JSON.stringify(
    selectedResume.analysis || {}
  )}\nTarget: ${selectedResume.jobTitle || ""}`;
  try {
    const text = await generateWithFallback(prompt);
    const parsed = parseJsonResponse(text);
    if (parsed?.suggestions) {
      return res.json({
        resumeId: selectedResume._id.toString(),
        resumeJobTitle: selectedResume.jobTitle || "",
        suggestions: parsed.suggestions,
      });
    }
    const recovered = toSuggestionsFromText(text);
    return res.json({
      resumeId: selectedResume._id.toString(),
      resumeJobTitle: selectedResume.jobTitle || "",
      suggestions: recovered.length ? recovered : fallbackSuggestionsFromResume(selectedResume),
    });
  } 
  catch (err) {
    return res.json({
      resumeId: selectedResume._id.toString(),
      resumeJobTitle: selectedResume.jobTitle || "",
      suggestions: fallbackSuggestionsFromResume(selectedResume),
    });
  }
}


module.exports = { suggestions };
