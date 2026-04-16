import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/dashboard/summary - Get dashboard summary (all roles)
router.get("/summary", requirePermission("dashboard.view"), dashboardController.getDashboardSummary);

// GET /api/dashboard/revenue - Get revenue data (all roles)
router.get("/revenue", requirePermission("dashboard.view"), dashboardController.getRevenue);

// GET /api/dashboard/cases - Get cases statistics (all roles)
router.get("/cases", requirePermission("dashboard.view"), dashboardController.getCasesStats);

export const dashboardRoutes = router;
