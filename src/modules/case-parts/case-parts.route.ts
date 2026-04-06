import { Router } from "express";
import { casePartsController } from "./case-parts.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["store_manager"]));

router.post("/:caseId/parts", casePartsController.addPart);
router.get("/:caseId/parts", casePartsController.getCaseParts);

export default router;