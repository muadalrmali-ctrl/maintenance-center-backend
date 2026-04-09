import { Router } from "express";
import { notificationsController } from "./notifications.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/notifications - Create notification log (admin)
router.post("/", roleMiddleware(["admin"]), notificationsController.createNotification);
router.post(
  "/send-customer-message",
  roleMiddleware(["admin", "receptionist", "technician_manager", "technician"]),
  notificationsController.sendCustomerMessage
);

// GET /api/notifications - Get all notifications (all roles can read)
router.get("/", roleMiddleware(["admin", "receptionist", "technician", "store_manager", "technician_manager"]), notificationsController.getAllNotifications);

export const notificationsRoutes = router;
