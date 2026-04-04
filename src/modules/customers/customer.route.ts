import { Router } from "express";
import { customerController } from "./customer.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", customerController.create);
router.get("/", customerController.getAll);
router.get("/:id", customerController.getById);
router.patch("/:id", customerController.update);

export default router;