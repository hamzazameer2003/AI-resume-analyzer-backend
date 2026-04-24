const axios = require("axios");
const cheerio = require("cheerio");

const FALLBACK_JOBS = [
  {
    title: "Data Analyst",
    summary: "Analyzes data to help businesses make decisions.",
    companies: ["Consulting firms", "Tech companies"],
    opportunities: "Junior analyst roles and internships",
  },
  {
    title: "Full-Stack Developer",
    summary: "Builds front-end and back-end applications.",
    companies: ["Startups", "Software agencies"],
    opportunities: "Web app development roles",
  },
];

async function fetchFromApi() {
  const apiUrl = process.env.TRENDING_JOBS_API_URL;
  if (!apiUrl) {
    throw new Error("TRENDING_JOBS_API_URL not set");
  }

  const response = await axios.get(apiUrl, { timeout: 15000 });
  return response.data;
}

async function scrapePublicSources() {
  const url = "https://www.bls.gov/ooh/fastest-growing.htm";
  const response = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(response.data);

  const rows = [];
  $("table tbody tr").each((_, row) => {
    const title = $(row).find("th").first().text().trim();
    if (title) {
      rows.push({
        title,
        summary: "Fastest-growing occupation (BLS)",
        companies: ["Industry-leading employers"],
        opportunities: "Check job boards for open roles",
      });
    }
  });

  return rows.length ? rows.slice(0, 10) : FALLBACK_JOBS;
}

async function getTrendingJobs() {
  try {
    return await fetchFromApi();
  } catch (err) {
    try {
      return await scrapePublicSources();
    } catch (scrapeErr) {
      return FALLBACK_JOBS;
    }
  }
}

module.exports = { getTrendingJobs };
