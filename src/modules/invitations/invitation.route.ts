import { Router } from "express";
import { invitationController } from "./invitation.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.get("/:token", invitationController.getByToken);
router.post("/:token/accept", invitationController.accept);

router.use(authMiddleware);
router.get("/", roleMiddleware(["admin", "receptionist", "technician_manager", "maintenance_manager"]), invitationController.list);
router.post("/", roleMiddleware(["admin", "technician_manager", "maintenance_manager"]), invitationController.create);
router.patch("/:id/revoke", roleMiddleware(["admin", "technician_manager", "maintenance_manager"]), invitationController.revoke);

export default router;
