import { Router } from "express";
import { deviceController } from "./device.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requireAnyPermission, requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);

router.get("/", requireAnyPermission(["accounting.devices.view", "cases.create"]), deviceController.getAll);
router.get("/:id", requireAnyPermission(["accounting.devices.view", "cases.create"]), deviceController.getById);
router.post("/", requireAnyPermission(["accounting.devices.manage", "cases.create"]), deviceController.create);
router.patch("/:id", requirePermission("accounting.devices.manage"), deviceController.update);

export default router;
