import { db } from "../../db";
import { inventoryCategories, inventoryItems, inventoryMovements } from "../../db/schema";
import { eq } from "drizzle-orm";

type CreateCategoryInput = {
  name: string;
  description?: string;
};

type Category = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type CreateItemInput = {
  name: string;
  code: string;
  categoryId?: number;
  brand?: string;
  model?: string;
  quantity?: number;
  minimumStock?: number;
  unitCost: number;
  sellingPrice?: number;
  location?: string;
  description?: string;
};

type UpdateItemInput = {
  name?: string;
  code?: string;
  categoryId?: number | null;
  brand?: string | null;
  model?: string | null;
  minimumStock?: number | null;
  unitCost?: number;
  sellingPrice?: number | null;
  location?: string | null;
  description?: string | null;
  isActive?: boolean;
};

type Item = {
  id: number;
  name: string;
  code: string;
  categoryId: number | null;
  brand: string | null;
  model: string | null;
  quantity: number;
  minimumStock: number | null;
  unitCost: string;
  sellingPrice: string | null;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type AdjustStockInput = {
  quantity: number;
  notes?: string;
  createdBy: number;
};

export const inventoryService = {
  // Categories
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const createdCategories = await db
      .insert(inventoryCategories)
      .values({
        name: input.name,
        description: input.description,
      })
      .returning({
        id: inventoryCategories.id,
        name: inventoryCategories.name,
        description: inventoryCategories.description,
        createdAt: inventoryCategories.createdAt,
        updatedAt: inventoryCategories.updatedAt,
      });

    return createdCategories[0];
  },

  async getCategories(): Promise<Category[]> {
    return await db.select().from(inventoryCategories);
  },

  // Items
  async createItem(input: CreateItemInput): Promise<Item> {
    const createdItems = await db
      .insert(inventoryItems)
      .values({
        name: input.name,
        code: input.code,
        categoryId: input.categoryId,
        brand: input.brand,
        model: input.model,
        quantity: input.quantity || 0,
        minimumStock: input.minimumStock,
        unitCost: input.unitCost.toString(),
        sellingPrice: input.sellingPrice?.toString(),
        location: input.location,
        description: input.description,
      })
      .returning({
        id: inventoryItems.id,
        name: inventoryItems.name,
        code: inventoryItems.code,
        categoryId: inventoryItems.categoryId,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        quantity: inventoryItems.quantity,
        minimumStock: inventoryItems.minimumStock,
        unitCost: inventoryItems.unitCost,
        sellingPrice: inventoryItems.sellingPrice,
        location: inventoryItems.location,
        description: inventoryItems.description,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      });

    return createdItems[0];
  },

  async getItems(): Promise<Item[]> {
    return await db.select().from(inventoryItems);
  },

  async getItemById(id: number): Promise<Item | undefined> {
    const foundItems = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .limit(1);

    return foundItems[0];
  },

  async updateItem(id: number, input: UpdateItemInput): Promise<Item | undefined> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.minimumStock !== undefined) updateData.minimumStock = input.minimumStock;
    if (input.unitCost !== undefined) updateData.unitCost = input.unitCost.toString();
    if (input.sellingPrice !== undefined) updateData.sellingPrice = input.sellingPrice?.toString();
    if (input.location !== undefined) updateData.location = input.location;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updatedItems = await db
      .update(inventoryItems)
      .set(updateData)
      .where(eq(inventoryItems.id, id))
      .returning({
        id: inventoryItems.id,
        name: inventoryItems.name,
        code: inventoryItems.code,
        categoryId: inventoryItems.categoryId,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        quantity: inventoryItems.quantity,
        minimumStock: inventoryItems.minimumStock,
        unitCost: inventoryItems.unitCost,
        sellingPrice: inventoryItems.sellingPrice,
        location: inventoryItems.location,
        description: inventoryItems.description,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      });

    return updatedItems[0];
  },

  async adjustStock(id: number, input: AdjustStockInput): Promise<Item | undefined> {
    const item = await this.getItemById(id);
    if (!item) {
      throw new Error("Inventory item not found");
    }

    const newQuantity = item.quantity + input.quantity;

    if (newQuantity < 0) {
      throw new Error("Stock cannot be negative");
    }

    // Update quantity
    const updatedItems = await db
      .update(inventoryItems)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, id))
      .returning({
        id: inventoryItems.id,
        name: inventoryItems.name,
        code: inventoryItems.code,
        categoryId: inventoryItems.categoryId,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        quantity: inventoryItems.quantity,
        minimumStock: inventoryItems.minimumStock,
        unitCost: inventoryItems.unitCost,
        sellingPrice: inventoryItems.sellingPrice,
        location: inventoryItems.location,
        description: inventoryItems.description,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      });

    // Insert movement
    await db.insert(inventoryMovements).values({
      inventoryItemId: id,
      movementType: "adjustment",
      quantity: input.quantity,
      notes: input.notes,
      createdBy: input.createdBy,
    });

    return updatedItems[0];
  },
};