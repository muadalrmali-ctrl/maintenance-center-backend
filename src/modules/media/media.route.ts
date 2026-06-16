import { Router } from "express";
import { mediaController } from "./media.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post(
  "/upload-case-file",
  requirePermission("cases.create"),
  mediaController.uploadCaseMediaFile
);

// POST /api/media - Upload media (admin)
router.post("/", roleMiddleware(["admin"]), mediaController.uploadMedia);

// GET /api/media/:entityType/:entityId - Get media by entity (all roles can read)
router.get("/:entityType/:entityId", requirePermission("cases.view"), mediaController.getMediaByEntity);

export const mediaRoutes = router;
