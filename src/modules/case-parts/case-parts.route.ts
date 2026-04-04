import { Router } from "express";
import { casePartsController } from "./case-parts.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", casePartsController.addPart);
router.get("/", casePartsController.getCaseParts);

export default router;