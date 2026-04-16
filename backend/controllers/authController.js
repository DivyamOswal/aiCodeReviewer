import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import PDFDocument from "pdfkit";
import Report from "../models/Report.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed });
  res.json({ success: true });
};

// User login
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
};

// Download Report
export const downloadReportPDF = async (req, res) => {
  const report = await Report.findById(req.params.id);
  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=report.pdf");

  doc.pipe(res);
  doc.fontSize(18).text("AI Code Review Report\n\n");
  doc.fontSize(12).text(JSON.stringify(report.analysis, null, 2));
  doc.end();
};