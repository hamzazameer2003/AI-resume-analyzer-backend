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

module.exports = {
  analyzeResume,
  rewriteLongFields,
  generateWithFallback,
  parseJsonResponse,
  expandShortFields,
};
