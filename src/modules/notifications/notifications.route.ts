import { Router } from "express";
import { notificationsController } from "./notifications.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/notifications - Create notification log
router.post("/", notificationsController.createNotification);

// GET /api/cases/:caseId/notifications - Get case notifications
router.get("/cases/:caseId/notifications", notificationsController.getCaseNotifications);

// PATCH /api/notifications/:id/status - Update notification status
router.patch("/:id/status", notificationsController.updateNotificationStatus);

export const notificationsRoutes = router;