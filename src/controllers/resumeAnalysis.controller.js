const { analyzeResume } = require("../services/ai.service");
const { extractTextFromFile } = require("../services/resumeText.service");
const path = require("path");
const { createResume } = require("../services/data.service");

const STOPWORDS = new Set([
  "the","and","for","with","from","that","this","your","role","jobs","job","analysis","resume","skill","skills",
  "experience","using","based","target","work","working","position","positions","level","entry","associate",
  "have","has","had","into","over","under","were","was","are","our","out","all","too","can","will","not"
]);

function extractFocusKeywords(jobTitle, resumeText, result) {
  const source = [
    jobTitle,
    resumeText,
    Array.isArray(result?.pros) ? result.pros.join(" ") : "",
    Array.isArray(result?.suggestions) ? result.suggestions.join(" ") : "",
  ].join(" ");

  const counts = new Map();
  String(source || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
    .forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([token]) => token);
}

async function analyze(req, res) {
  const { jobTitle } = req.body || {};
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body?.fileUrl;

  if (!jobTitle || !fileUrl) {
    return res.status(400).json({ message: "jobTitle and fileUrl are required" });
  }

  let resumeText = "";
  if (req.file) {
    const filePath = path.join(__dirname, "../../uploads", req.file.filename);
    resumeText = await extractTextFromFile(filePath);
  }

  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({
      message:
        "Could not extract text from the uploaded file. Please upload a text-based PDF/DOCX or paste resume text.",
    });
  }

  const result = await analyzeResume({ jobTitle, fileUrl, resumeText });
  const enrichedResult = {
    ...result,
    resumeTextSnippet: resumeText.slice(0, 4000),
    focusKeywords: extractFocusKeywords(jobTitle, resumeText, result),
  };

  const userId = req.user?.sub;
  if (userId) {
    await createResume({
      userId,
      fileUrl,
      jobTitle,
      atsScore: typeof enrichedResult.atsScore === "number" ? enrichedResult.atsScore : undefined,
      analysis: enrichedResult,
    });
  }

  return res.json(enrichedResult);
}

module.exports = { analyze };
