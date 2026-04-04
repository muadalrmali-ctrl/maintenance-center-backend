import { Router } from "express";
import { caseController } from "./case.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", caseController.create);
router.get("/", caseController.getAll);
router.get("/:id", caseController.getById);
router.patch("/:id", caseController.update);
router.patch("/:id/status", caseController.changeStatus);

export default router;