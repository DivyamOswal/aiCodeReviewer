import express from "express";
import { analyzeCode } from "../controllers/analyzeController.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/", auth, analyzeCode);

export default router;
