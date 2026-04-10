import { db } from "../../db";
import { caseParts, cases, customers, inventoryCategories, inventoryItems, inventoryMovements, invoiceItems, invoices, users } from "../../db/schema";
import { desc, eq, sql } from "drizzle-orm";

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
  imageUrl?: string;
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
  imageUrl?: string | null;
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
  imageUrl: string | null;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  categoryName?: string | null;
};

type AdjustStockInput = {
  quantity: number;
  notes?: string;
  createdBy: number;
};

export const inventoryService = {
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
        imageUrl: input.imageUrl,
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
        imageUrl: inventoryItems.imageUrl,
        location: inventoryItems.location,
        description: inventoryItems.description,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      });

    return createdItems[0];
  },

  async getItems(): Promise<Item[]> {
    return await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        code: inventoryItems.code,
        categoryId: inventoryItems.categoryId,
        categoryName: inventoryCategories.name,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        quantity: inventoryItems.quantity,
        minimumStock: inventoryItems.minimumStock,
        unitCost: inventoryItems.unitCost,
        sellingPrice: inventoryItems.sellingPrice,
        imageUrl: inventoryItems.imageUrl,
        location: inventoryItems.location,
        description: inventoryItems.description,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id));
  },

  async getItemById(id: number): Promise<any | undefined> {
    const foundItems = await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        code: inventoryItems.code,
        categoryId: inventoryItems.categoryId,
        categoryName: inventoryCategories.name,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        quantity: inventoryItems.quantity,
        minimumStock: inventoryItems.minimumStock,
        unitCost: inventoryItems.unitCost,
        sellingPrice: inventoryItems.sellingPrice,
        imageUrl: inventoryItems.imageUrl,
        location: inventoryItems.location,
        description: inventoryItems.description,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(eq(inventoryItems.id, id))
      .limit(1);

    const item = foundItems[0];
    if (!item) {
      return undefined;
    }

    const caseAllocationsResult = await db.execute(sql`
      select
        c.id as "caseId",
        c.case_code as "caseCode",
        cp.handoff_status as "handoffStatus",
        sum(cp.quantity)::int as quantity,
        min(cp.delivered_at) as "deliveredAt",
        max(cp.received_at) as "receivedAt"
      from case_parts cp
      inner join cases c on c.id = cp.case_id
      where cp.inventory_item_id = ${id}
        and cp.handoff_status in ('delivered', 'received')
      group by c.id, c.case_code, cp.handoff_status
      order by max(coalesce(cp.received_at, cp.delivered_at)) desc nulls last, c.case_code asc
    `);

    const directSalesResult = await db.execute(sql`
      select
        ii.reference_id as "inventoryItemId",
        ii.quantity,
        i.invoice_number as "invoiceNumber",
        i.created_at as "happenedAt",
        coalesce(cu.name, i.direct_customer_name) as "customerName",
        'direct_sale' as source
      from invoice_items ii
      inner join invoices i on i.id = ii.invoice_id
      left join customers cu on cu.id = i.customer_id
      where ii.item_type = 'direct_part'
        and ii.reference_id = ${id}
      order by i.created_at desc
    `);

    const consumedInCasesResult = await db.execute(sql`
      select
        cp.quantity,
        cp.consumed_at as "happenedAt",
        c.id as "caseId",
        c.case_code as "caseCode",
        cu.name as "customerName",
        'case_repair' as source
      from case_parts cp
      inner join cases c on c.id = cp.case_id
      left join customers cu on cu.id = c.customer_id
      where cp.inventory_item_id = ${id}
        and cp.handoff_status = 'consumed'
      order by cp.consumed_at desc
    `);

    const movementHistoryResult = await db.execute(sql`
      select
        im.id,
        im.movement_type as "movementType",
        im.quantity,
        im.reference_type as "referenceType",
        im.reference_id as "referenceId",
        im.notes,
        im.created_at as "createdAt",
        u.name as "createdByName"
      from inventory_movements im
      left join users u on u.id = im.created_by
      where im.inventory_item_id = ${id}
      order by im.created_at desc
      limit 30
    `);

    const salesHistory = [
      ...(consumedInCasesResult.rows as any[]),
      ...(directSalesResult.rows as any[]),
    ].sort(
      (left, right) =>
        new Date(String(right.happenedAt ?? 0)).getTime() -
        new Date(String(left.happenedAt ?? 0)).getTime()
    );

    return {
      ...item,
      warehouseQuantity: item.quantity,
      caseAllocations: caseAllocationsResult.rows,
      salesHistory,
      movementHistory: movementHistoryResult.rows,
    };
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
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
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
        imageUrl: inventoryItems.imageUrl,
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
        imageUrl: inventoryItems.imageUrl,
        location: inventoryItems.location,
        description: inventoryItems.description,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      });

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
