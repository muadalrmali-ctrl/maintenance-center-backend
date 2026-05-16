import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";
import { accountingController } from "./accounting.controller";

const router = Router();

router.use(authMiddleware);

router.get("/suppliers", requirePermission("accounting.suppliers.view"), accountingController.getSuppliers);
router.post("/suppliers", requirePermission("accounting.suppliers.manage"), accountingController.createSupplier);
router.get("/suppliers/:id", requirePermission("accounting.suppliers.view"), accountingController.getSupplierDetails);
router.patch("/suppliers/:id", requirePermission("accounting.suppliers.manage"), accountingController.updateSupplier);

export const accountingRoutes = router;
