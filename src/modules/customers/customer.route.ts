import { Router } from "express";
import { customerController } from "./customer.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["receptionist"]));

router.post("/", customerController.create);
router.get("/", customerController.getAll);
router.get("/:id/details", customerController.getDetails);
router.get("/:id", customerController.getById);
router.patch("/:id", customerController.update);

export default router;
