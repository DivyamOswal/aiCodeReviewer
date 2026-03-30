import { analyzeWithGroq } from "../utils/groq.js";
import { parseGithubRepo } from "../utils/githubParser.js";
import Report from "../models/Report.js";

export const analyzeGithubRepo = async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: "Repo URL required" });
    }

    const code = await parseGithubRepo(repoUrl);
    const ai = await analyzeWithGroq(code);

    /* 🔒 NORMALIZE AI RESPONSE */
    const analysis = {
      summary: ai.summary ?? "No summary provided.",

      architecture: Array.isArray(ai.architecture) ? ai.architecture : [],

      bugs: Array.isArray(ai.bugs) ? ai.bugs : [],

      securityIssues: Array.isArray(ai.securityIssues)
        ? ai.securityIssues
        : [],

      futureRoadmap: Array.isArray(ai.futureRoadmap)
        ? ai.futureRoadmap
        : [],

      toolsAndPackages: Array.isArray(ai.toolsAndPackages)
        ? ai.toolsAndPackages
        : [],

      scores: ai.scores ?? {
        codeQuality: 0,
        security: 0,
        performance: 0,
        maintainability: 0,
      },

      grade: ai.grade ?? "N/A",

      finalVerdict:
        ai.finalVerdict ??
        "The project demonstrates solid fundamentals with scope for improvement.",
    };

    const report = await Report.create({
      userId: req.user.id,
      repoUrl,
      ...analysis,
    });

    res.json({
      success: true,
      analysis,
      reportId: report._id,
    });
  } catch (err) {
    console.error("GitHub analysis error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
