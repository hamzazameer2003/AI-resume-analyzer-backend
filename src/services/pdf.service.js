const PDFDocument = require("pdfkit");

const THEMES = {
  midnight: {
    headerBg: "#0f172a",
    headerText: "#f8fafc",
    headerSub: "#cbd5f5",
    divider: "#e2e8f0",
    bodyText: "#0f172a",
    bullet: "#94a3b8",
  },
  ember: {
    headerBg: "#1f1300",
    headerText: "#fff7ed",
    headerSub: "#fed7aa",
    divider: "#fbd6b3",
    bodyText: "#1f1300",
    bullet: "#fb923c",
  },
  ocean: {
    headerBg: "#0b1f2a",
    headerText: "#e0f2fe",
    headerSub: "#bae6fd",
    divider: "#cbd5e1",
    bodyText: "#0b1f2a",
    bullet: "#38bdf8",
  },
};

function normalizeValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const flattened = value.map(normalizeValue).filter(Boolean);
    return flattened.join("\n");
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((v) => normalizeValue(v))
      .filter(Boolean)
      .join(" | ");
  }
  return String(value);
}

function drawSectionTitle(doc, title, theme) {
  doc
    .moveDown(0.5)
    .fontSize(11)
    .fillColor(theme.headerSub)
    .text(title.toUpperCase(), { letterSpacing: 1 });
  doc.moveDown(0.3);
  doc.strokeColor(theme.divider).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);
  doc.fillColor(theme.bodyText);
}

function renderList(doc, value, theme) {
  if (!value) return;
  const items = normalizeValue(value)
    .split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!items.length) return;
  items.forEach((item) => {
    doc.circle(55, doc.y + 5, 2).fill(theme.bullet);
    doc.fillColor(theme.bodyText).text(item, 65, doc.y);
    doc.moveDown(0.4);
  });
}

function renderSection(doc, key, label, data, theme) {
  const value = data[key];
  if (!value) return;
  drawSectionTitle(doc, label, theme);
  if (["skills", "languages"].includes(key)) {
    const items = normalizeValue(value)
      .split(/\r?\n|,\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
    items.forEach((item) => {
      doc.circle(55, doc.y + 5, 2).fill(theme.bullet);
      doc.fillColor(theme.bodyText).text(item, 65, doc.y);
      doc.moveDown(0.4);
    });
    return;
  }
  renderList(doc, value, theme);
}

function generateResumePdf(data) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    const theme = THEMES[data.theme] || THEMES.midnight;

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.rect(0, 0, doc.page.width, 110).fill(theme.headerBg);
    doc.fillColor(theme.headerText).fontSize(24).text(data.fullName || "Resume", 50, 35);
    doc
      .fontSize(11)
      .fillColor(theme.headerSub)
      .text([data.title, data.location].filter(Boolean).join(" • "), 50, 65, {
        width: 500,
      });
    doc
      .fillColor(theme.headerText)
      .text(
        [data.email, data.phone, data.linkedin, data.github, data.portfolio]
          .filter(Boolean)
          .join(" | "),
        50,
        85,
        { width: 500 }
      );

    doc.moveDown(4);
    doc.fillColor(theme.bodyText);

    const defaultOrder = [
      "summary",
      "skills",
      "experience",
      "projects",
      "education",
      "certifications",
      "achievements",
      "languages",
    ];
    const order = Array.isArray(data.sectionOrder) && data.sectionOrder.length ? data.sectionOrder : defaultOrder;

    order.forEach((key) => {
      if (key === "experience" && data.experienceLevel !== "experienced") return;
      if (key === "summary") return renderSection(doc, "summary", "Professional Summary", data, theme);
      if (key === "skills") return renderSection(doc, "skills", "Core Skills", data, theme);
      if (key === "experience") return renderSection(doc, "experience", "Experience", data, theme);
      if (key === "projects") return renderSection(doc, "projects", "Projects", data, theme);
      if (key === "education") return renderSection(doc, "education", "Education", data, theme);
      if (key === "certifications") return renderSection(doc, "certifications", "Certifications", data, theme);
      if (key === "achievements") return renderSection(doc, "achievements", "Achievements", data, theme);
      if (key === "languages") return renderSection(doc, "languages", "Languages", data, theme);
      return null;
    });

    doc.end();
  });
}

module.exports = { generateResumePdf };
