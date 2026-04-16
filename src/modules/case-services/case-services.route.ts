import { Router } from "express";
import { caseServicesController } from "./case-services.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /cases/:caseId/services - Add service to case
router.post("/:caseId/services", requirePermission("cases.diagnosis.edit"), caseServicesController.addService);

// GET /cases/:caseId/services - Get all services for a case
router.get("/:caseId/services", requirePermission("cases.view"), caseServicesController.getCaseServices);
router.delete("/:caseId/services/:serviceId", requirePermission("cases.diagnosis.edit"), caseServicesController.removeService);

export const caseServicesRoutes = router;
