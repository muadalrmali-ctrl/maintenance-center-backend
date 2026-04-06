import { Router } from "express";
import { caseController } from "./case.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.use(authMiddleware);

// Receptionist can create and manage basic case data
router.post("/", roleMiddleware(["receptionist"]), caseController.create);
router.get("/", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.getAll);
router.get("/:id", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.getById);
router.patch("/:id", roleMiddleware(["receptionist", "technician", "technician_manager"]), caseController.update);

// Technician and Technician Manager can change status
router.patch("/:id/status", roleMiddleware(["technician", "technician_manager"]), caseController.changeStatus);

export default router;