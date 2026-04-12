import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";
import { reportsController } from "./reports.controller";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "receptionist", "store_manager", "technician_manager", "maintenance_manager"]));

router.get("/meta", reportsController.getMeta);
router.get("/", reportsController.getReport);

export const reportsRoutes = router;
