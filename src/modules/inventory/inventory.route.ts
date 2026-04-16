import { Router } from "express";
import { inventoryController } from "./inventory.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

router.use(authMiddleware);

// Categories
router.post("/categories", requirePermission("inventory.admin_actions"), inventoryController.createCategory);
router.get("/categories", requirePermission("inventory.view"), inventoryController.getCategories);

// Items
router.post("/items", requirePermission("inventory.item.create"), inventoryController.createItem);
router.get("/items", requirePermission("inventory.view"), inventoryController.getItems);
router.get("/items/:id", requirePermission("inventory.view"), inventoryController.getItemById);
router.patch("/items/:id", requirePermission("inventory.item.edit"), inventoryController.updateItem);
router.post("/items/:id/adjust", requirePermission("inventory.item.quantity.update"), inventoryController.adjustStock);
router.delete("/items/:id", requirePermission("inventory.item.delete"), inventoryController.deleteItem);

export default router;
