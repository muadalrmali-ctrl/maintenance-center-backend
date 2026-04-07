import { Router } from "express";
import { invitationController } from "./invitation.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.get("/:token", invitationController.getByToken);
router.post("/:token/accept", invitationController.accept);

router.use(authMiddleware);
router.get("/", roleMiddleware(["admin"]), invitationController.list);
router.post("/", roleMiddleware(["admin"]), invitationController.create);

export default router;
