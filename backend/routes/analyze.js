// backend/routes/analyze.js

import express from "express";
import { analyzeCode, generateTestCases } from "../controllers/analyzeController.js";

const router = express.Router();

// POST /api/analyze               → audit analysis
router.post("/", analyzeCode);

// POST /api/analyze/generate-tests → test generation
router.post("/generate-tests", generateTestCases);

export default router;