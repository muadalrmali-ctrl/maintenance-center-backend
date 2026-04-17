import { Router } from "express";
import { deviceController } from "./device.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("accounting.devices.view"), deviceController.getAll);
router.get("/:id", requirePermission("accounting.devices.view"), deviceController.getById);
router.post("/", requirePermission("accounting.devices.manage"), deviceController.create);
router.patch("/:id", requirePermission("accounting.devices.manage"), deviceController.update);

export default router;
