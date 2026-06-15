import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";
import { receptionPointsController } from "./reception-points.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("reception_points.view"), receptionPointsController.list);
router.post("/", requirePermission("reception_points.manage"), receptionPointsController.create);
router.get("/:id", requirePermission("reception_points.view"), receptionPointsController.getById);
router.patch("/:id", requirePermission("reception_points.manage"), receptionPointsController.update);

export const receptionPointsRoutes = router;
