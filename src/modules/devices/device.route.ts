import { Router } from "express";
import { deviceController } from "./device.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", deviceController.create);
router.get("/", deviceController.getAll);
router.get("/:id", deviceController.getById);
router.patch("/:id", deviceController.update);

export default router;
