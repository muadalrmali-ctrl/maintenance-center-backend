import { Router } from "express";
import { customerController } from "./customer.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);
router.use(requirePermission("accounting.customers.view"));

router.post("/", customerController.create);
router.get("/", customerController.getAll);
router.get("/:id/details", customerController.getDetails);
router.get("/:id", customerController.getById);
router.patch("/:id", customerController.update);

export default router;
