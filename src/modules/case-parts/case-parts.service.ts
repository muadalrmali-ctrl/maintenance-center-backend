import { db } from "../../db";
import { caseParts, caseStatusHistory, cases, inventoryItems, inventoryMovements, users } from "../../db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { CASE_STATUSES } from "../cases/constants";

const ACTIVE_CASE_PART_HANDOFF_STATUSES = ["delivered", "received"] as const;

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
  handoffStatus: string;
  deliveredAt: Date | null;
  deliveredBy: number | null;
  deliveredByName: string | null;
  receivedAt: Date | null;
  receivedBy: number | null;
  receivedByName: string | null;
  returnedAt: Date | null;
  returnedBy: number | null;
  consumedAt: Date | null;
  consumedBy: number | null;
  addedBy: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  inventoryName?: string | null;
  inventoryCode?: string | null;
  inventoryImageUrl?: string | null;
};

const appendCaseHistory = async (
  tx: any,
  input: {
    caseId: number;
    status: string;
    changedBy: number;
    notes: string;
  }
) => {
  await tx.insert(caseStatusHistory).values({
    caseId: input.caseId,
    fromStatus: input.status,
    toStatus: input.status,
    changedBy: input.changedBy,
    notes: input.notes,
  });
};

export const casePartsService = {
  async addPart(caseId: number, input: AddPartInput): Promise<CasePart> {
    return await db.transaction(async (tx) => {
      const caseExists = await tx
        .select({ id: cases.id })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);

      if (!caseExists.length) {
        throw new Error("Case not found");
      }

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

      if (input.quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      const unitPrice = inventoryItem.sellingPrice || inventoryItem.unitCost;
      const totalPrice = parseFloat(unitPrice) * input.quantity;

      const createdParts = await tx
        .insert(caseParts)
        .values({
          caseId,
          inventoryItemId: input.inventoryItemId,
          quantity: input.quantity,
          unitPrice,
          totalPrice: totalPrice.toString(),
          notes: input.notes,
          handoffStatus: "pending",
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
          handoffStatus: caseParts.handoffStatus,
          deliveredAt: caseParts.deliveredAt,
          deliveredBy: caseParts.deliveredBy,
          deliveredByName: sql<string | null>`null`,
          receivedAt: caseParts.receivedAt,
          receivedBy: caseParts.receivedBy,
          receivedByName: sql<string | null>`null`,
          returnedAt: caseParts.returnedAt,
          returnedBy: caseParts.returnedBy,
          consumedAt: caseParts.consumedAt,
          consumedBy: caseParts.consumedBy,
          addedBy: caseParts.addedBy,
          createdAt: caseParts.createdAt,
          updatedAt: caseParts.updatedAt,
        });

      return createdParts[0];
    });
  },

  async getCaseParts(caseId: number): Promise<CasePart[]> {
    return await db.execute(sql`
      select
        cp.id,
        cp.case_id as "caseId",
        cp.inventory_item_id as "inventoryItemId",
        cp.quantity,
        cp.unit_price as "unitPrice",
        cp.total_price as "totalPrice",
        cp.notes,
        cp.handoff_status as "handoffStatus",
        cp.delivered_at as "deliveredAt",
        cp.delivered_by as "deliveredBy",
        du.name as "deliveredByName",
        cp.received_at as "receivedAt",
        cp.received_by as "receivedBy",
        ru.name as "receivedByName",
        cp.returned_at as "returnedAt",
        cp.returned_by as "returnedBy",
        cp.consumed_at as "consumedAt",
        cp.consumed_by as "consumedBy",
        cp.added_by as "addedBy",
        cp.created_at as "createdAt",
        cp.updated_at as "updatedAt",
        ii.name as "inventoryName",
        ii.code as "inventoryCode",
        ii.image_url as "inventoryImageUrl"
      from case_parts cp
      left join inventory_items ii on ii.id = cp.inventory_item_id
      left join users du on du.id = cp.delivered_by
      left join users ru on ru.id = cp.received_by
      where cp.case_id = ${caseId}
      order by cp.created_at asc
    `).then((result) => result.rows as CasePart[]);
  },

  async deliverPart(caseId: number, partId: number, deliveredBy: number): Promise<CasePart> {
    return await db.transaction(async (tx) => {
      const foundCase = await tx
        .select({
          id: cases.id,
          caseCode: cases.caseCode,
          status: cases.status,
          customerApprovedAt: cases.customerApprovedAt,
        })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);

      const caseRow = foundCase[0];
      if (!caseRow) {
        throw new Error("Case not found");
      }

      if (caseRow.status !== CASE_STATUSES.WAITING_APPROVAL) {
        throw new Error("Parts can only be delivered while the case is waiting approval and part handoff");
      }

      if (!caseRow.customerApprovedAt) {
        throw new Error("Customer approval must be confirmed before delivering parts");
      }

      const foundParts = await tx
        .select({
          id: caseParts.id,
          inventoryItemId: caseParts.inventoryItemId,
          quantity: caseParts.quantity,
          handoffStatus: caseParts.handoffStatus,
          inventoryName: inventoryItems.name,
        })
        .from(caseParts)
        .innerJoin(inventoryItems, eq(caseParts.inventoryItemId, inventoryItems.id))
        .where(and(eq(caseParts.id, partId), eq(caseParts.caseId, caseId)))
        .limit(1);

      const part = foundParts[0];
      if (!part) {
        throw new Error("Case part not found");
      }

      if (part.handoffStatus !== "pending") {
        throw new Error("This part has already entered the handoff workflow");
      }

      const foundItems = await tx
        .select({ quantity: inventoryItems.quantity })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, part.inventoryItemId))
        .limit(1);

      if (!foundItems[0] || foundItems[0].quantity < part.quantity) {
        throw new Error("Insufficient warehouse stock for this handoff");
      }

      const deliveredAt = new Date();

      await tx
        .update(inventoryItems)
        .set({
          quantity: foundItems[0].quantity - part.quantity,
          updatedAt: deliveredAt,
        })
        .where(eq(inventoryItems.id, part.inventoryItemId));

      await tx
        .update(caseParts)
        .set({
          handoffStatus: "delivered",
          deliveredAt,
          deliveredBy,
          updatedAt: deliveredAt,
        })
        .where(eq(caseParts.id, partId));

      await tx.insert(inventoryMovements).values({
        inventoryItemId: part.inventoryItemId,
        movementType: "delivered_to_case",
        quantity: -part.quantity,
        referenceType: "case_part",
        referenceId: part.id,
        notes: `Delivered to case ${caseRow.caseCode}`,
        createdBy: deliveredBy,
        createdAt: deliveredAt,
      });

      await appendCaseHistory(tx, {
        caseId,
        status: caseRow.status,
        changedBy: deliveredBy,
        notes: `Part delivered: ${part.inventoryName} x${part.quantity}`,
      });

      const updatedPart = await this.getCaseParts(caseId);
      const matched = updatedPart.find((item) => item.id === partId);
      if (!matched) {
        throw new Error("Failed to load delivered part");
      }
      return matched;
    });
  },

  async receivePart(caseId: number, partId: number, receivedBy: number): Promise<CasePart> {
    return await db.transaction(async (tx) => {
      const foundCase = await tx
        .select({
          id: cases.id,
          status: cases.status,
          customerApprovedAt: cases.customerApprovedAt,
        })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);

      const caseRow = foundCase[0];
      if (!caseRow) {
        throw new Error("Case not found");
      }

      if (caseRow.status !== CASE_STATUSES.WAITING_APPROVAL) {
        throw new Error("Parts can only be received while the case is waiting approval and part handoff");
      }

      if (!caseRow.customerApprovedAt) {
        throw new Error("Customer approval must be confirmed before receiving parts");
      }

      const foundParts = await tx
        .select({
          id: caseParts.id,
          quantity: caseParts.quantity,
          handoffStatus: caseParts.handoffStatus,
          inventoryName: inventoryItems.name,
        })
        .from(caseParts)
        .innerJoin(inventoryItems, eq(caseParts.inventoryItemId, inventoryItems.id))
        .where(and(eq(caseParts.id, partId), eq(caseParts.caseId, caseId)))
        .limit(1);

      const part = foundParts[0];
      if (!part) {
        throw new Error("Case part not found");
      }

      if (part.handoffStatus !== "delivered") {
        throw new Error("Part must be delivered before the technician can receive it");
      }

      const receivedAt = new Date();

      await tx
        .update(caseParts)
        .set({
          handoffStatus: "received",
          receivedAt,
          receivedBy,
          updatedAt: receivedAt,
        })
        .where(eq(caseParts.id, partId));

      await appendCaseHistory(tx, {
        caseId,
        status: caseRow.status,
        changedBy: receivedBy,
        notes: `Part received: ${part.inventoryName} x${part.quantity}`,
      });

      const updatedPart = await this.getCaseParts(caseId);
      const matched = updatedPart.find((item) => item.id === partId);
      if (!matched) {
        throw new Error("Failed to load received part");
      }
      return matched;
    });
  },

  async removePart(caseId: number, partId: number, changedBy: number): Promise<void> {
    await db.transaction(async (tx) => {
      const foundParts = await tx
        .select({
          id: caseParts.id,
          inventoryItemId: caseParts.inventoryItemId,
          quantity: caseParts.quantity,
          handoffStatus: caseParts.handoffStatus,
        })
        .from(caseParts)
        .where(and(eq(caseParts.id, partId), eq(caseParts.caseId, caseId)))
        .limit(1);

      const part = foundParts[0];
      if (!part) {
        throw new Error("Case part not found");
      }

      if (part.handoffStatus === "consumed") {
        throw new Error("Consumed parts cannot be removed from the case");
      }

      if (ACTIVE_CASE_PART_HANDOFF_STATUSES.includes(part.handoffStatus as (typeof ACTIVE_CASE_PART_HANDOFF_STATUSES)[number])) {
        await tx
          .update(inventoryItems)
          .set({
            quantity: sql`${inventoryItems.quantity} + ${part.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, part.inventoryItemId));

        await tx.insert(inventoryMovements).values({
          inventoryItemId: part.inventoryItemId,
          movementType: "returned_from_case",
          quantity: part.quantity,
          referenceType: "case_part",
          referenceId: part.id,
          notes: "Returned to warehouse after removing case part",
          createdBy: changedBy,
        });
      }

      await tx
        .delete(caseParts)
        .where(and(eq(caseParts.id, partId), eq(caseParts.caseId, caseId)));
    });
  },
};
