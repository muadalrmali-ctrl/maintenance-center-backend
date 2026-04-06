import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/dashboard/summary - Get dashboard summary (all roles)
router.get("/summary", roleMiddleware(["admin", "receptionist", "technician", "store_manager", "technician_manager"]), dashboardController.getDashboardSummary);

// GET /api/dashboard/revenue - Get revenue data (all roles)
router.get("/revenue", roleMiddleware(["admin", "receptionist", "technician", "store_manager", "technician_manager"]), dashboardController.getRevenue);

// GET /api/dashboard/cases - Get cases statistics (all roles)
router.get("/cases", roleMiddleware(["admin", "receptionist", "technician", "store_manager", "technician_manager"]), dashboardController.getCasesStats);

export const dashboardRoutes = router;