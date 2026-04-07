import { db } from "../../db";
import { caseParts, inventoryItems, inventoryMovements, cases } from "../../db/schema";
import { eq, and } from "drizzle-orm";

type AddPartInput = {
  inventoryItemId: number;
  quantity: number;
  notes?: string;
  addedBy: number;
};

type CasePart = {
  id: number;
  caseId: number;
  inventoryItemId: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes: string | null;
  addedBy: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  inventoryName?: string | null;
  inventoryCode?: string | null;
  inventoryImageUrl?: string | null;
};

export const casePartsService = {
  async addPart(caseId: number, input: AddPartInput): Promise<CasePart> {
    return await db.transaction(async (tx) => {
      // Verify case exists
      const caseExists = await tx
        .select({ id: cases.id })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);

      if (!caseExists.length) {
        throw new Error("Case not found");
      }

      // Verify inventory item exists and get pricing
      const item = await tx
        .select({
          id: inventoryItems.id,
          quantity: inventoryItems.quantity,
          unitCost: inventoryItems.unitCost,
          sellingPrice: inventoryItems.sellingPrice,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, input.inventoryItemId))
        .limit(1);

      if (!item.length) {
        throw new Error("Inventory item not found");
      }

      const inventoryItem = item[0];

      // Check quantity > 0
      if (input.quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      // Check sufficient stock
      if (inventoryItem.quantity < input.quantity) {
        throw new Error("Insufficient stock");
      }

      // Determine unit price
      const unitPrice = inventoryItem.sellingPrice || inventoryItem.unitCost;
      const totalPrice = parseFloat(unitPrice) * input.quantity;

      // Insert case part
      const createdParts = await tx
        .insert(caseParts)
        .values({
          caseId,
          inventoryItemId: input.inventoryItemId,
          quantity: input.quantity,
          unitPrice,
          totalPrice: totalPrice.toString(),
          notes: input.notes,
          addedBy: input.addedBy,
        })
        .returning({
          id: caseParts.id,
          caseId: caseParts.caseId,
          inventoryItemId: caseParts.inventoryItemId,
          quantity: caseParts.quantity,
          unitPrice: caseParts.unitPrice,
          totalPrice: caseParts.totalPrice,
          notes: caseParts.notes,
          addedBy: caseParts.addedBy,
          createdAt: caseParts.createdAt,
          updatedAt: caseParts.updatedAt,
        });

      // Decrease inventory
      await tx
        .update(inventoryItems)
        .set({
          quantity: inventoryItem.quantity - input.quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, input.inventoryItemId));

      // Insert movement
      await tx.insert(inventoryMovements).values({
        inventoryItemId: input.inventoryItemId,
        movementType: "out",
        quantity: -input.quantity, // Negative for out
        referenceType: "case_part",
        referenceId: createdParts[0].id,
        createdBy: input.addedBy,
      });

      return createdParts[0];
    });
  },

  async getCaseParts(caseId: number): Promise<CasePart[]> {
    return await db
      .select({
        id: caseParts.id,
        caseId: caseParts.caseId,
        inventoryItemId: caseParts.inventoryItemId,
        quantity: caseParts.quantity,
        unitPrice: caseParts.unitPrice,
        totalPrice: caseParts.totalPrice,
        notes: caseParts.notes,
        addedBy: caseParts.addedBy,
        createdAt: caseParts.createdAt,
        updatedAt: caseParts.updatedAt,
        inventoryName: inventoryItems.name,
        inventoryCode: inventoryItems.code,
        inventoryImageUrl: inventoryItems.imageUrl,
      })
      .from(caseParts)
      .leftJoin(inventoryItems, eq(caseParts.inventoryItemId, inventoryItems.id))
      .where(eq(caseParts.caseId, caseId));
  },
};
