const axios = require("axios");

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash-8b";
  const url =
    process.env.GEMINI_API_URL ||
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await axios.post(
    `${url}?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    { timeout: 20000 }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini response missing text");
  }

  return text;
}

async function generateWithFallback(prompt) {
  return callGemini(prompt);
}

function parseJsonResponse(text) {
  if (!text) return null;
  const cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?([\s\S]*?)```/i);
  const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : cleaned;
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    return null;
  }
}

async function analyzeResume({ jobTitle, fileUrl, resumeText }) {
  const base = resumeText
    ? `Resume Text:\n${resumeText}\n`
    : `Resume URL: ${fileUrl}\n`;
  const prompt = `Analyze the following resume for the role ${jobTitle}.\n${base}\nReturn ONLY valid JSON with keys: pros (array), cons (array), suggestions (array), atsScore (0-100 number).`;
  try {
    const text = await generateWithFallback(prompt);
    const parsed = parseJsonResponse(text);
    return parsed ? { provider: "ai", ...parsed } : { provider: "ai", raw: text };
  } catch (err) {
    return {
      provider: "mock",
      raw: `Gemini unavailable: ${err?.message || "unknown error"}. Check GEMINI_API_KEY/model/quota.`,
    };
  }
}

async function rewriteLongFields(payload) {
  const prompt = `Rewrite the following resume fields to be concise and professional. Return ONLY valid JSON with the same keys:\n${JSON.stringify(payload)}`;
  try {
    const text = await generateWithFallback(prompt);
    const parsed = parseJsonResponse(text);
    return parsed ? parsed : { ...payload, aiRewrite: text };
  } catch (err) {
    return payload;
  }
}

async function expandShortFields(payload) {
  const prompt = `Improve and expand short resume fields to be more detailed, professional, and achievement-focused. Keep facts consistent. Return ONLY valid JSON with the same keys:\n${JSON.stringify(
    payload
  )}`;
  try {
    const text = await generateWithFallback(prompt);
    const parsed = parseJsonResponse(text);
    return parsed ? parsed : payload;
  } catch (err) {
    return payload;
  }
}

async function generateProfessionalSummary(payload) {
  const prompt = `Write a concise, professional resume summary in 2-4 sentences. Return ONLY valid JSON in this shape: {"summary":"..."}.
Target title: ${payload.title || ""}
Experience level: ${payload.experienceLevel || ""}
Skills: ${payload.skills || ""}
Soft skills: ${payload.softSkills || ""}
Experience: ${JSON.stringify(payload.experience || [])}
Projects: ${JSON.stringify(payload.projects || [])}`;
  const text = await generateWithFallback(prompt);
  const parsed = parseJsonResponse(text);
  if (parsed?.summary) {
    return parsed.summary;
  }
  return String(text || "").trim();
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

async function rankTrendingJobsForResume({ resume, jobs }) {
  const analysis = resume.analysis || {};
  const prompt = `You are ranking trending jobs for a candidate based on resume context and job-market roles.
Return ONLY valid JSON in this shape:
{"jobs":[{"title":"...","summary":"...","companies":["..."],"opportunities":"...","relevanceScore":0}]}

Candidate target role: ${resume.jobTitle || ""}
Stored focus keywords: ${JSON.stringify(analysis.focusKeywords || [])}
Resume text snippet: ${String(analysis.resumeTextSnippet || "").slice(0, 3500)}
Resume strengths: ${JSON.stringify(analysis.pros || [])}
Resume gaps: ${JSON.stringify(analysis.cons || [])}
Resume suggestions: ${JSON.stringify(analysis.suggestions || [])}

Trending jobs to evaluate:
${JSON.stringify(jobs)}

Instructions:
- Keep the same job titles from the provided trending jobs list.
- relevanceScore must be 0-100 and reflect candidate fit, not just job popularity.
- Prefer concise summaries and opportunity notes.
- Return at most 12 jobs sorted from strongest to weakest fit.`;

  const text = await generateWithFallback(prompt);
  const parsed = parseJsonResponse(text);
  if (!Array.isArray(parsed?.jobs)) {
    throw new Error("AI ranking response missing jobs array");
  }

  const sourceByTitle = new Map(
    jobs.map((job) => [String(job.title || "").toLowerCase(), job])
  );

  return parsed.jobs
    .map((job) => {
      const original = sourceByTitle.get(String(job.title || "").toLowerCase()) || {};
      return {
        ...original,
        ...job,
        title: job.title || original.title,
        summary: job.summary || original.summary,
        companies: Array.isArray(job.companies)
          ? job.companies
          : Array.isArray(original.companies)
            ? original.companies
            : [],
        opportunities: job.opportunities || original.opportunities || "",
        relevanceScore: clampScore(job.relevanceScore),
      };
    })
    .filter((job) => job.title)
    .slice(0, 12);
}

module.exports = {
  analyzeResume,
  rewriteLongFields,
  generateWithFallback,
  parseJsonResponse,
  expandShortFields,
  generateProfessionalSummary,
  rankTrendingJobsForResume,
};
