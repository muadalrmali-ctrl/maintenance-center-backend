import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  categoryId: z.number().int().positive().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  quantity: z.number().int().min(0).optional().default(0),
  minimumStock: z.number().int().min(0).optional(),
  unitCost: z.number().positive("Unit cost must be positive"),
  sellingPrice: z.number().positive().optional(),
  imageUrl: z.string().max(1_100_000).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  minimumStock: z.number().int().min(0).optional().nullable(),
  unitCost: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional().nullable(),
  imageUrl: z.string().max(1_100_000).optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
  quantity: z.number().int("Quantity must be an integer"),
  notes: z.string().optional(),
});
