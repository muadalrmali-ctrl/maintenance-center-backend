import { Router } from "express";
import { mediaController } from "./media.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/cases/:caseId/media - Upload media for case
router.post("/cases/:caseId/media", mediaController.uploadMedia);

// GET /api/cases/:caseId/media - Get case media
router.get("/cases/:caseId/media", mediaController.getCaseMedia);

export const mediaRoutes = router;