import Report from "../models/Report.js";
import {analyzeWithGroq} from "../utils/groq.js";

export const analyzeCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) return res.status(400).json({ error: "Code required" });

    const analysis = await analyzeWithGroq(code);

    const report = await Report.create({
      code,
      analysis,
      user: req.user.id,
    });

    res.json({ success: true, analysis, reportId: report._id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
