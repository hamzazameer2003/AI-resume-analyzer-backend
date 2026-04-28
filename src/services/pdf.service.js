const PDFDocument = require("pdfkit");

const THEMES = {
  midnight: {
    headerBg: "#0f172a",
    headerText: "#f8fafc",
    headerSub: "#cbd5e1",
    sectionTitle: "#1e293b",
    divider: "#cbd5e1",
    bodyText: "#0f172a",
    bullet: "#475569",
    metaText: "#64748b",
  },
  ember: {
    headerBg: "#1f1300",
    headerText: "#fff7ed",
    headerSub: "#fed7aa",
    sectionTitle: "#9a3412",
    divider: "#fdba74",
    bodyText: "#431407",
    bullet: "#ea580c",
    metaText: "#9a3412",
  },
  ocean: {
    headerBg: "#0b1f2a",
    headerText: "#e0f2fe",
    headerSub: "#bae6fd",
    sectionTitle: "#0f4c5c",
    divider: "#7dd3fc",
    bodyText: "#082f49",
    bullet: "#0284c7",
    metaText: "#0369a1",
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

function splitItems(value) {
  return normalizeValue(value)
    .split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function drawSectionTitle(doc, title, theme) {
  doc
    .moveDown(0.5)
    .fontSize(11)
    .fillColor(theme.sectionTitle)
    .text(title.toUpperCase(), { letterSpacing: 1 });
  doc.moveDown(0.3);
  doc.strokeColor(theme.divider).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);
  doc.fillColor(theme.bodyText);
}

function renderBullets(doc, items, theme) {
  items.forEach((item) => {
    doc.circle(55, doc.y + 5, 2).fill(theme.bullet);
    doc.fillColor(theme.bodyText).text(item, 65, doc.y, { width: 470 });
    doc.moveDown(0.4);
  });
}

function isTimelineEntry(entry) {
  return Boolean(entry && typeof entry === "object" && !Array.isArray(entry) && (entry.title || entry.description));
}

function renderTimelineSection(doc, value, theme) {
  const entries = Array.isArray(value) ? value.filter(isTimelineEntry) : [];
  if (!entries.length) return;

  entries.forEach((entry, index) => {
    const title = String(entry.title || "").trim();
    const description = String(entry.description || "").trim();
    const dates = [entry.startDate, entry.endDate].map((item) => String(item || "").trim()).filter(Boolean).join(" - ");

    if (title) {
      doc.font("Helvetica-Bold").fillColor(theme.bodyText).text(title, { width: 470 });
      doc.font("Helvetica");
    }
    if (dates) {
      doc.moveDown(0.1);
      doc.fontSize(10).fillColor(theme.metaText).text(dates, { width: 470 });
      doc.fontSize(12);
    }
    if (description) {
      doc.moveDown(0.2);
      doc.fillColor(theme.bodyText).text(description, { width: 470, align: "left" });
    }
    if (index < entries.length - 1) {
      doc.moveDown(0.8);
    }
  });
}

function renderSection(doc, key, label, data, theme) {
  const value = data[key];
  if (!value) return;
  drawSectionTitle(doc, label, theme);

  if (key === "experience" || key === "projects") {
    renderTimelineSection(doc, value, theme);
    return;
  }

  const items = splitItems(value);
  if (["skills", "languages", "education", "certifications", "achievements"].includes(key)) {
    if (items.length) {
      renderBullets(doc, items, theme);
    }
    return;
  }

  if (key === "summary") {
    doc.fillColor(theme.bodyText).text(normalizeValue(value), { width: 470, align: "left" });
    return;
  }

  if (items.length) {
    renderBullets(doc, items, theme);
  }
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
      .text([data.title, data.location].filter(Boolean).join(" | "), 50, 65, {
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
    doc.fillColor(theme.bodyText).font("Helvetica").fontSize(12);

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
