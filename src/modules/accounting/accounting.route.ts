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

router.get("/purchases", requirePermission("accounting.purchases.view"), accountingController.getPurchases);
router.post("/purchases", requirePermission("accounting.purchases.manage"), accountingController.createPurchase);
router.get("/purchases/:id", requirePermission("accounting.purchases.view"), accountingController.getPurchaseDetails);
router.patch("/purchases/:id", requirePermission("accounting.purchases.manage"), accountingController.updatePurchase);
router.post("/purchases/:id/confirm", requirePermission("accounting.purchases.manage"), accountingController.confirmPurchase);

router.get("/daily-expenses", requirePermission("accounting.expenses.view"), accountingController.getDailyExpenses);
router.post("/daily-expenses", requirePermission("accounting.expenses.manage"), accountingController.createDailyExpense);
router.get("/daily-expenses/:id", requirePermission("accounting.expenses.view"), accountingController.getDailyExpenseDetails);
router.patch("/daily-expenses/:id", requirePermission("accounting.expenses.manage"), accountingController.updateDailyExpense);

router.get("/daily-cash", requirePermission("accounting.daily_cash.view"), accountingController.getDailyCash);
router.post("/daily-cash", requirePermission("accounting.daily_cash.manage"), accountingController.createDailyCash);
router.get("/daily-cash-summary", requirePermission("accounting.daily_cash.view"), accountingController.getDailyCashSummary);
router.get("/daily-cash/:id", requirePermission("accounting.daily_cash.view"), accountingController.getDailyCashDetails);
router.patch("/daily-cash/:id", requirePermission("accounting.daily_cash.manage"), accountingController.updateDailyCash);

export const accountingRoutes = router;
