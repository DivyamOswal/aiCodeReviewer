import PDFDocument from "pdfkit";

export const generatePDF = (analysis, res) => {
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);
  doc.text("AI Code Review Report\n\n");
  doc.text(analysis);
  doc.end();
};
