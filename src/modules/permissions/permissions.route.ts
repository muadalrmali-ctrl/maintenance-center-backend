import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { permissionsController } from "./permissions.controller";

const router = Router();

router.use(authMiddleware);
router.get("/catalog", permissionsController.getCatalog);

export const permissionsRoutes = router;
