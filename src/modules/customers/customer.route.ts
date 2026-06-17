import { Router } from "express";
import { customerController } from "./customer.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requireAnyPermission, requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);

router.post("/", requireAnyPermission(["create_customer", "cases.create"]), customerController.create);
router.get("/", requireAnyPermission(["accounting.customers.view", "cases.create"]), customerController.getAll);
router.get("/:id/details", requirePermission("accounting.customers.view"), customerController.getDetails);
router.get("/:id", requirePermission("accounting.customers.view"), customerController.getById);
router.patch("/:id", requirePermission("edit_customer"), customerController.update);

export default router;
