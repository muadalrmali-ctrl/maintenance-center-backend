import { Router } from "express";
import { casePartsController } from "./case-parts.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.use(authMiddleware);

router.get("/:caseId/parts", roleMiddleware(["receptionist", "store_manager", "technician", "technician_manager"]), casePartsController.getCaseParts);
router.post("/:caseId/parts", roleMiddleware(["store_manager", "technician", "technician_manager"]), casePartsController.addPart);
router.patch("/:caseId/parts/:partId/request", roleMiddleware(["technician", "technician_manager", "admin"]), casePartsController.requestPart);
router.patch("/:caseId/parts/:partId/deliver", roleMiddleware(["store_manager", "admin"]), casePartsController.deliverPart);
router.patch("/:caseId/parts/:partId/receive", roleMiddleware(["technician", "technician_manager", "admin"]), casePartsController.receivePart);
router.patch("/:caseId/parts/:partId/use", roleMiddleware(["technician", "technician_manager", "admin"]), casePartsController.usePart);
router.patch("/:caseId/parts/:partId/return", roleMiddleware(["technician", "technician_manager", "admin"]), casePartsController.returnPart);
router.delete("/:caseId/parts/:partId", roleMiddleware(["store_manager", "technician", "technician_manager"]), casePartsController.removePart);

export default router;
