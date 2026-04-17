import { Router } from "express";
import { branchesController } from "./branches.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("branches.view"), branchesController.list);
router.post("/", requirePermission("branches.manage"), branchesController.create);
router.get("/:id", requirePermission("branches.view"), branchesController.getById);
router.patch("/:id", requirePermission("branches.manage"), branchesController.update);

export const branchesRoutes = router;
