import { Router } from "express";
import { deviceController } from "./device.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.use(authMiddleware);

// Receptionist can read devices
router.get("/", roleMiddleware(["receptionist"]), deviceController.getAll);
router.get("/:id", roleMiddleware(["receptionist"]), deviceController.getById);

// Receptionists can register devices while opening new maintenance cases.
router.post("/", roleMiddleware(["admin", "receptionist"]), deviceController.create);
router.patch("/:id", roleMiddleware(["admin"]), deviceController.update);

export default router;
