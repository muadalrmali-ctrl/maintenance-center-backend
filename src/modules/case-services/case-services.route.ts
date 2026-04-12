import { Router } from "express";
import { caseServicesController } from "./case-services.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /cases/:caseId/services - Add service to case
router.post("/:caseId/services", roleMiddleware(["technician", "technician_manager", "maintenance_manager"]), caseServicesController.addService);

// GET /cases/:caseId/services - Get all services for a case
router.get("/:caseId/services", roleMiddleware(["receptionist", "technician", "technician_manager", "maintenance_manager"]), caseServicesController.getCaseServices);
router.delete("/:caseId/services/:serviceId", roleMiddleware(["technician", "technician_manager", "maintenance_manager"]), caseServicesController.removeService);

export const caseServicesRoutes = router;
