// backend/routes/analyze.js

import express from "express";
import { analyzeCode, generateTestCases } from "../controllers/analyzeController.js";

const router = express.Router();

// POST /api/analyze               
router.post("/", analyzeCode);

// POST /api/analyze/generate-tests
router.post("/generate-tests", generateTestCases);

export default router;