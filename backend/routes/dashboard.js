import express from "express";
import auth from "../middleware/authMiddleware.js";
import { getDashboardData } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", auth, getDashboardData);

export default router;
