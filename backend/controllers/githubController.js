import { analyzeWithGroq, generateTests } from "../utils/groq.js";
import { parseGithubRepo } from "../utils/githubParser.js";
import Report from "../models/Report.js";

//  POST /api/github/analyze  
export const analyzeGithubRepo = async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: "Repo URL required" });
    }

    const code = await parseGithubRepo(repoUrl);
    const ai = await analyzeWithGroq(code);

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
      _sourceCode: code,
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

//  POST /api/github/generate-tests
export const generateTestCases = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string" || code.trim().length < 10) {
      return res.status(400).json({
        error: "Request body must contain a non-empty 'code' string.",
      });
    }

    console.log(`📥 generateTestCases — received ${code.length} chars`);

    const result = await generateTests(code);
    return res.status(200).json(result);

  } catch (err) {
    console.error("❌ generateTestCases error:", err.message);
    return res.status(500).json({ error: err.message ?? "Test generation failed." });
  }
};