import { Router } from "express";
import { inventoryController } from "./inventory.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

router.use(authMiddleware);

// Categories
router.post("/categories", inventoryController.createCategory);
router.get("/categories", inventoryController.getCategories);

// Items
router.post("/items", inventoryController.createItem);
router.get("/items", inventoryController.getItems);
router.get("/items/:id", inventoryController.getItemById);
router.patch("/items/:id", inventoryController.updateItem);
router.post("/items/:id/adjust", inventoryController.adjustStock);

export default router;