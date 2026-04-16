// backend/controllers/analyzeController.js
import { analyzeWithGroq, generateTests } from "../utils/groq.js";

//  POST /api/analyze
export const analyzeCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string" || code.trim().length < 10) {
      return res.status(400).json({
        error: "Request body must contain a non-empty 'code' string.",
      });
    }

    console.log(`📥 /api/analyze — received ${code.length} chars`);

    const result = await analyzeWithGroq(code);

    // Echo _sourceCode back so frontend can use it for test generation
    return res.status(200).json({
      ...result,
      _sourceCode: code,
    });

  } catch (err) {
    console.error("❌ analyzeCode error:", err.message);
    return res.status(500).json({ error: err.message ?? "Analysis failed." });
  }
};

//  POST /api/analyze/generate-tests
export const generateTestCases = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string" || code.trim().length < 10) {
      return res.status(400).json({
        error: "Request body must contain a non-empty 'code' string.",
      });
    }

    console.log(`📥 /api/generate-tests — received ${code.length} chars`);

    const result = await generateTests(code);

    return res.status(200).json(result);

  } catch (err) {
    console.error("❌ generateTestCases error:", err.message);
    return res.status(500).json({ error: err.message ?? "Test generation failed." });
  }
};