import { Router } from "express";
import { casePartsController } from "./case-parts.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.use(authMiddleware);

router.get("/:caseId/parts", roleMiddleware(["receptionist", "store_manager", "technician", "technician_manager"]), casePartsController.getCaseParts);
router.post("/:caseId/parts", roleMiddleware(["store_manager", "technician", "technician_manager"]), casePartsController.addPart);
router.delete("/:caseId/parts/:partId", roleMiddleware(["store_manager", "technician", "technician_manager"]), casePartsController.removePart);

export default router;
