import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/dashboard/summary - Get dashboard summary
router.get("/summary", dashboardController.getDashboardSummary);

export const dashboardRoutes = router;