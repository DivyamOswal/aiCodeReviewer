import express from "express";
import auth from "../middleware/authMiddleware.js";
import { getReports, downloadReportPDF } from "../controllers/reportController.js";

const router = express.Router();

router.get("/", auth, getReports);
router.get("/:id/pdf", auth, downloadReportPDF);

export default router;
