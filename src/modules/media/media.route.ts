import { Router } from "express";
import { mediaController } from "./media.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/media - Upload media (admin)
router.post("/", roleMiddleware(["admin"]), mediaController.uploadMedia);

// GET /api/media/:entityType/:entityId - Get media by entity (all roles can read)
router.get("/:entityType/:entityId", roleMiddleware(["admin", "receptionist", "technician", "store_manager", "technician_manager"]), mediaController.getMediaByEntity);

export const mediaRoutes = router;