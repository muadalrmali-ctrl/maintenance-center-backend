import { Router } from "express";
import { casePartsController } from "./case-parts.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);

router.get("/:caseId/parts", requirePermission("cases.view"), casePartsController.getCaseParts);
router.post("/:caseId/parts", requirePermission("cases.diagnosis.edit"), casePartsController.addPart);
router.patch("/:caseId/parts/:partId/request", requirePermission("cases.approval.part_delivery_receive"), casePartsController.requestPart);
router.patch("/:caseId/parts/:partId/deliver", requirePermission("cases.approval.part_delivery_receive"), casePartsController.deliverPart);
router.patch("/:caseId/parts/:partId/receive", requirePermission("cases.approval.part_delivery_receive"), casePartsController.receivePart);
router.patch("/:caseId/parts/:partId/use", requirePermission("cases.approval.part_delivery_receive"), casePartsController.usePart);
router.patch("/:caseId/parts/:partId/return", requirePermission("cases.approval.part_delivery_receive"), casePartsController.returnPart);
router.delete("/:caseId/parts/:partId", requirePermission("cases.diagnosis.edit"), casePartsController.removePart);

export default router;
