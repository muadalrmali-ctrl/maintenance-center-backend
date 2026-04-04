import { Request, Response } from "express";
import { inventoryService } from "./inventory.service";

export const inventoryController = {
  // Categories
  async createCategory(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }

      const category = await inventoryService.createCategory({
        name,
        description,
      });

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
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
      const {
        name,
        code,
        categoryId,
        brand,
        model,
        quantity,
        minimumStock,
        unitCost,
        sellingPrice,
        location,
        description,
      } = req.body;

      if (!name || !code || unitCost === undefined) {
        return res.status(400).json({
          success: false,
          message: "Name, code, and unitCost are required",
        });
      }

      const item = await inventoryService.createItem({
        name,
        code,
        categoryId,
        brand,
        model,
        quantity,
        minimumStock,
        unitCost,
        sellingPrice,
        location,
        description,
      });

      return res.status(201).json({
        success: true,
        message: "Inventory item created successfully",
        data: item,
      });
    } catch (error) {
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
      const {
        name,
        code,
        categoryId,
        brand,
        model,
        minimumStock,
        unitCost,
        sellingPrice,
        location,
        description,
        isActive,
      } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID",
        });
      }

      const item = await inventoryService.updateItem(id, {
        name,
        code,
        categoryId,
        brand,
        model,
        minimumStock,
        unitCost,
        sellingPrice,
        location,
        description,
        isActive,
      });

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
      const { quantity, notes } = req.body;
      const createdBy = req.user?.id;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID",
        });
      }

      if (quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const item = await inventoryService.adjustStock(id, {
        quantity,
        notes,
        createdBy,
      });

      return res.status(200).json({
        success: true,
        message: "Stock adjusted successfully",
        data: item,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to adjust stock",
      });
    }
  },
};