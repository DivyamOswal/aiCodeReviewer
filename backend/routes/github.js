import express from "express";
import {
  analyzeGithubRepo,
  generateTestCases,
} from "../controllers/githubController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/github/analyze
router.post("/analyze", protect, analyzeGithubRepo);

// POST /api/github/generate-tests
router.post("/generate-tests", protect, generateTestCases);

export default router;