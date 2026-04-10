import { Router } from "express";
import { caseController } from "./case.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.use(authMiddleware);

// Receptionist can create and manage basic case data
router.post("/", roleMiddleware(["receptionist"]), caseController.create);
router.get("/", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.getAll);
router.get("/maintenance-operations", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.getMaintenanceOperations);
router.get("/maintenance-operations/:id", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.getMaintenanceOperationById);
router.get("/:id", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.getById);
router.patch("/:id", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.update);

// Technician and Technician Manager can change status
router.patch("/:id/status", roleMiddleware(["technician", "technician_manager"]), caseController.changeStatus);
router.patch("/:id/approval/confirm", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.confirmCustomerApproval);
router.patch("/:id/execution/start", roleMiddleware(["technician", "technician_manager"]), caseController.startExecution);
router.patch("/:id/execution/pause", roleMiddleware(["technician", "technician_manager"]), caseController.pauseExecution);
router.patch("/:id/execution/resume", roleMiddleware(["technician", "technician_manager"]), caseController.resumeExecution);
router.patch("/:id/execution/complete", roleMiddleware(["technician", "technician_manager"]), caseController.completeRepair);
router.patch("/:id/repair-quality", roleMiddleware(["technician", "technician_manager"]), caseController.saveRepairQuality);
router.patch("/:id/ready-notification", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.sendReadyNotification);
router.patch("/:id/customer-received", roleMiddleware(["receptionist", "technician_manager"]), caseController.markCustomerReceived);
router.patch("/:id/finalize", roleMiddleware(["receptionist", "technician_manager"]), caseController.finalizeOperation);

export default router;
