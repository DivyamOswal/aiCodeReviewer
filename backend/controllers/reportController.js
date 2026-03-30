import PDFDocument from "pdfkit";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import Report from "../models/Report.js";

/* ====== GET HISTORY ====== */
export const getReports = async (req, res) => {
  const reports = await Report.find({ userId: req.user.id }).sort({
    createdAt: -1,
  });

  res.json({ success: true, reports });
};

/* ====== DOWNLOAD PDF ====== */
export const downloadReportPDF = async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${report.repoUrl
      .split("/")
      .pop()}-AI-Code-Audit.pdf`
  );

  doc.pipe(res);

  /* ========= TITLE ========= */
  doc
    .fillColor("#4F46E5")
    .fontSize(24)
    .text("AI Code Audit Report", { align: "center" });

  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#6B7280")
    .text(`Repository: ${report.repoUrl}`, { align: "center" });

  doc.moveDown(2);

  /* ========= SUMMARY ========= */
  sectionTitle(doc, "Executive Summary");
  doc.fontSize(11).fillColor("#000").text(report.summary || "N/A");

  doc.moveDown(1.5);

  /* ========= ARCHITECTURE ========= */
  sectionTitle(doc, "Architecture Review");
  report.architecture?.forEach((a) => {
    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(`${a.component}:`, { continued: true })
      .fillColor("#000")
      .text(` ${a.recommendation || a.description}`);
    doc.moveDown(0.5);
  });

  /* ========= SCORES ========= */
  doc.addPage();
  sectionTitle(doc, "Quality Scores");

  const scores = report.scores || {};
  drawScoreBar(doc, "Code Quality", scores.codeQuality || 0);
  drawScoreBar(doc, "Security", scores.security || 0);
  drawScoreBar(doc, "Performance", scores.performance || 0);
  drawScoreBar(doc, "Maintainability", scores.maintainability || 0);

  /* ========= CHART ========= */
  const chartImage = await generateRadarChart(scores);
  doc.moveDown(2);
  doc.image(chartImage, {
    fit: [400, 400],
    align: "center",
  });

  /* ========= BUGS ========= */
  doc.addPage();
  sectionTitle(doc, "Identified Bugs");

  if (report.bugs?.length) {
    report.bugs.forEach((b, i) => {
      doc
        .fontSize(12)
        .fillColor("#DC2626")
        .text(`${i + 1}. ${b.title} (${b.impact})`);
      doc
        .fontSize(11)
        .fillColor("#000")
        .text(`Issue: ${b.description}`);
      doc
        .fillColor("#065F46")
        .text(`Fix: ${b.fix || b.suggestedFix}`);
      doc.moveDown(0.8);
    });
  } else {
    doc.text("No major bugs detected.");
  }

  /* ========= FUTURE ROADMAP ========= */
  doc.addPage();
  sectionTitle(doc, "Future Roadmap");

  report.futureRoadmap?.forEach((f, i) => {
    doc
      .fontSize(12)
      .fillColor("#2563EB")
      .text(`${i + 1}. ${f.phase}`);
    doc
      .fontSize(11)
      .fillColor("#000")
      .text(f.details);
    doc.moveDown(0.6);
  });

  /* ========= TOOLS ========= */
  sectionTitle(doc, "Tools & Packages Used");
  report.toolsAndPackages?.forEach((t) => {
    doc.fontSize(11).text(`• ${t}`);
  });

  /* ========= FINAL ========= */
  doc.moveDown(1.5);
  sectionTitle(doc, "Final Grade");
  doc
    .fontSize(22)
    .fillColor("#4F46E5")
    .text(report.grade || "N/A");

  doc.moveDown(1);
  sectionTitle(doc, "Final Verdict");
  doc.fontSize(11).fillColor("#000").text(report.finalVerdict || "N/A");

  doc.end();
};

/* ===== HELPERS ===== */

function sectionTitle(doc, title) {
  doc
    .fontSize(16)
    .fillColor("#111827")
    .text(title);
  doc.moveDown(0.4);
}

function drawScoreBar(doc, label, value) {
  doc.fontSize(11).fillColor("#000").text(`${label}: ${value}/100`);
  doc
    .rect(50, doc.y + 5, 300, 10)
    .fill("#E5E7EB");
  doc
    .rect(50, doc.y + 5, value * 3, 10)
    .fill("#10B981");
  doc.moveDown(1.5);
}

/* ===== RADAR CHART ===== */
async function generateRadarChart(scores) {
  const canvas = new ChartJSNodeCanvas({ width: 500, height: 500 });

  const config = {
    type: "radar",
    data: {
      labels: [
        "Code Quality",
        "Security",
        "Performance",
        "Maintainability",
      ],
      datasets: [
        {
          label: "Score",
          data: [
            scores.codeQuality || 0,
            scores.security || 0,
            scores.performance || 0,
            scores.maintainability || 0,
          ],
          backgroundColor: "rgba(99,102,241,0.4)",
          borderColor: "#4F46E5",
        },
      ],
    },
    options: {
      scales: {
        r: { min: 0, max: 100 },
      },
    },
  };

  return await canvas.renderToBuffer(config);
}
