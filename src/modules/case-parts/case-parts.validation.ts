import { z } from "zod";

export const addPartSchema = z.object({
  inventoryItemId: z.number().int().positive("Inventory item ID is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  notes: z.string().optional(),
});