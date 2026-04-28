const { generateResumePdf } = require("../services/pdf.service");
const {
  rewriteLongFields,
  expandShortFields,
  generateProfessionalSummary,
} = require("../services/ai.service");
const { createResumeProfile } = require("../services/data.service");

function hasContent(value) {
  return String(value || "").trim().length > 0;
}

function isFilledTimelineEntry(entry) {
  return Boolean(entry && hasContent(entry.title) && hasContent(entry.description));
}

function formatTimelineEntries(entries) {
  if (!Array.isArray(entries)) return null;
  return entries
    .filter(isFilledTimelineEntry)
    .map((entry) => {
      const dates = [entry.startDate, entry.endDate].filter(hasContent).join(" - ");
      const lines = [entry.title.trim()];
      if (dates) lines.push(dates);
      lines.push(entry.description.trim());
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildFallbackSummary(payload) {
  const details = [];
  if (hasContent(payload.skills)) {
    details.push(`bringing strength in ${payload.skills}`);
  }
  if (payload.experienceLevel === "experienced") {
    details.push("with hands-on experience delivering measurable results");
  } else {
    details.push("with practical project experience and a strong learning mindset");
  }

  return `${payload.title} candidate ${details.join(" ")}. Focused on clear execution, collaboration, and building solutions that align with business goals.`;
}

async function generate(req, res) {
  const payload = req.body || {};
  const hasExperienceEntries = Array.isArray(payload.experience) && payload.experience.some(isFilledTimelineEntry);
  const hasProjectEntries = Array.isArray(payload.projects) && payload.projects.some(isFilledTimelineEntry);

  if (!payload.fullName || !payload.email || !payload.phone || !payload.skills || !payload.summary) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  if (!payload.experienceLevel) {
    return res.status(400).json({ message: "experienceLevel is required" });
  }

  if (payload.experienceLevel === "experienced" && !hasExperienceEntries) {
    return res.status(400).json({ message: "experience is required" });
  }

  if (payload.experienceLevel === "fresher" && !hasProjectEntries) {
    return res.status(400).json({ message: "projects are required" });
  }

  const expanded = await expandShortFields(payload);
  const normalized = await rewriteLongFields(expanded);
  const pdfPayload = {
    ...normalized,
    experienceLevel: payload.experienceLevel,
    experience: payload.experienceLevel === "experienced" ? payload.experience : [],
    projects: payload.experienceLevel === "fresher" ? payload.projects : [],
    softSkills: payload.softSkills,
    sectionOrder: payload.sectionOrder,
    theme: payload.theme,
  };

  const userId = req.user?.sub;
  if (userId) {
    await createResumeProfile({
      userId,
      ...payload,
      experience: formatTimelineEntries(payload.experience),
      projects: formatTimelineEntries(payload.projects),
      aiRewrite: normalized.aiRewrite,
    });
  }

  const pdfBuffer = await generateResumePdf(pdfPayload);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
  return res.send(pdfBuffer);
}

async function summary(req, res) {
  const payload = req.body || {};
  if (!hasContent(payload.title)) {
    return res.status(400).json({ message: "title is required" });
  }

  try {
    const summaryText = await generateProfessionalSummary(payload);
    return res.json({ summary: summaryText });
  } catch (err) {
    return res.json({ summary: buildFallbackSummary(payload) });
  }
}

module.exports = { generate, summary };
