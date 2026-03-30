import express from "express";
import { analyzeGithubRepo } from "../controllers/githubController.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ MATCHES /api/github/analyze
router.post("/analyze", auth, analyzeGithubRepo);

export default router;
