import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";
import { reportsController } from "./reports.controller";

const router = Router();

router.use(authMiddleware);
router.use(requirePermission("reports.view"));

router.get("/meta", reportsController.getMeta);
router.get("/", reportsController.getReport);

export const reportsRoutes = router;
