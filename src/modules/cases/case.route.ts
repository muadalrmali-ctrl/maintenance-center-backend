import { Router } from "express";
import { caseController } from "./case.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requireAnyPermission, requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);

// Receptionist can create and manage basic case data
router.post("/", requirePermission("cases.create"), caseController.create);
router.get("/", requirePermission("cases.view"), caseController.getAll);
router.get("/awaiting-center-receipt", requirePermission("cases.column.awaiting_center_receipt.view"), caseController.getAwaitingCenterReceipt);
router.get("/maintenance-operations", requirePermission("maintenance_operations.view"), caseController.getMaintenanceOperations);
router.get("/maintenance-operations/:id", requirePermission("maintenance_operations.view"), caseController.getMaintenanceOperationById);
router.get("/:id", requirePermission("cases.view"), caseController.getById);
router.patch("/:id", requirePermission("cases.view"), caseController.update);

// Technician and Technician Manager can change status
router.patch("/:id/status", requireAnyPermission(["cases.diagnosis.edit", "cases.approval.prepare_execution", "cases.in_progress.mark_repaired"]), caseController.changeStatus);
router.patch("/:id/approval/confirm", requirePermission("cases.approval.approve"), caseController.confirmCustomerApproval);
router.patch("/:id/execution/start", requirePermission("cases.approval.prepare_execution"), caseController.startExecution);
router.patch("/:id/execution/pause", requirePermission("cases.in_progress.execution.preview"), caseController.pauseExecution);
router.patch("/:id/execution/resume", requirePermission("cases.in_progress.execution.preview"), caseController.resumeExecution);
router.patch("/:id/execution/complete", requirePermission("cases.in_progress.mark_repaired"), caseController.completeRepair);
router.patch("/:id/center-receipt", requirePermission("cases.awaiting_center_receipt.receive"), caseController.confirmCenterReceipt);
router.patch("/:id/repair-quality", requirePermission("cases.repaired.post_repair_quality.view"), caseController.saveRepairQuality);
router.patch("/:id/ready-notification", requirePermission("cases.repaired.ready_notification.send"), caseController.sendReadyNotification);
router.patch("/:id/customer-received", requirePermission("cases.repaired.summary.view"), caseController.markCustomerReceived);
router.patch("/:id/finalize", requirePermission("cases.repaired.post_repair_quality.view"), caseController.finalizeOperation);

export default router;
