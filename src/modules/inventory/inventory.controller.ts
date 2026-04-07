import { Request, Response } from "express";
import { inventoryService } from "./inventory.service";
import {
  createCategorySchema,
  createItemSchema,
  updateItemSchema,
  adjustStockSchema,
} from "./inventory.validation";

const logInventoryError = (action: string, error: unknown) => {
  console.error(
    `[inventory:${action}]`,
    error instanceof Error ? error.message : error
  );
};

const isZodError = (error: unknown) =>
  error && typeof error === "object" && "name" in error && error.name === "ZodError";

export const inventoryController = {
  // Categories
  async createCategory(req: Request, res: Response) {
    try {
      const validatedData = createCategorySchema.parse(req.body);

      const category = await inventoryService.createCategory(validatedData);

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      logInventoryError("createCategory", error);
      if (isZodError(error)) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: (error as any).errors,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getCategories(req: Request, res: Response) {
    try {
      const categories = await inventoryService.getCategories();

      return res.status(200).json({
        success: true,
        message: "Categories retrieved successfully",
        data: categories,
      });
    } catch (error) {
      logInventoryError("getCategories", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve categories",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // Items
  async createItem(req: Request, res: Response) {
    try {
      const validatedData = createItemSchema.parse(req.body);

      const item = await inventoryService.createItem(validatedData);

      return res.status(201).json({
        success: true,
        message: "Inventory item created successfully",
        data: item,
      });
    } catch (error) {
      logInventoryError("createItem", error);
      if (isZodError(error)) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: (error as any).errors,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to create inventory item",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getItems(req: Request, res: Response) {
    try {
      const items = await inventoryService.getItems();

      return res.status(200).json({
        success: true,
        message: "Inventory items retrieved successfully",
        data: items,
      });
    } catch (error) {
      logInventoryError("getItems", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve inventory items",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getItemById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID",
        });
      }

      const item = await inventoryService.getItemById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Inventory item not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Inventory item retrieved successfully",
        data: item,
      });
    } catch (error) {
      logInventoryError("getItemById", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve inventory item",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async updateItem(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID",
        });
      }

      const validatedData = updateItemSchema.parse(req.body);

      const item = await inventoryService.updateItem(id, validatedData);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Inventory item not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Inventory item updated successfully",
        data: item,
      });
    } catch (error) {
      logInventoryError("updateItem", error);
      if (isZodError(error)) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: (error as any).errors,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to update inventory item",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async adjustStock(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const createdBy = req.user?.id;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const validatedData = adjustStockSchema.parse(req.body);

      const item = await inventoryService.adjustStock(id, {
        ...validatedData,
        createdBy,
      });

      return res.status(200).json({
        success: true,
        message: "Stock adjusted successfully",
        data: item,
      });
    } catch (error) {
      logInventoryError("adjustStock", error);
      if (isZodError(error)) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: (error as any).errors,
        });
      }
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to adjust stock",
      });
    }
  },
};
