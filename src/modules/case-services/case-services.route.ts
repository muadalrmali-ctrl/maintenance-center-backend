import { Router } from "express";
import { caseServicesController } from "./case-services.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(roleMiddleware(["technician", "technician_manager"]));

// POST /cases/:caseId/services - Add service to case
router.post("/:caseId/services", caseServicesController.addService);

// GET /cases/:caseId/services - Get all services for a case
router.get("/:caseId/services", caseServicesController.getCaseServices);

export const caseServicesRoutes = router;