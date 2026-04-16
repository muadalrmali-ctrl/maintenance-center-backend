import { Router } from "express";
import { notificationsController } from "./notifications.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";
import { requireAnyPermission, requirePermission } from "../../middlewares/permission";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/notifications - Create notification log (admin)
router.post("/", roleMiddleware(["admin"]), notificationsController.createNotification);
router.post(
  "/send-customer-message",
  requireAnyPermission(["cases.diagnosis.edit", "cases.repaired.ready_notification.send"]),
  notificationsController.sendCustomerMessage
);

// GET /api/notifications - Get all notifications (all roles can read)
router.get("/", requirePermission("dashboard.view"), notificationsController.getAllNotifications);

export const notificationsRoutes = router;
