import { db } from "../../db";
import {
  dailyCashRecords,
  dailyExpenses,
  inventoryItems,
  inventoryMovements,
  purchaseItems,
  purchases,
  suppliers,
  users,
} from "../../db/schema";
import { desc, eq, sql } from "drizzle-orm";

type CreateSupplierInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  createdBy: number;
};

type UpdateSupplierInput = Partial<Omit<CreateSupplierInput, "createdBy">>;

type PurchaseItemInput = {
  itemName: string;
  itemType: "spare_part" | "consumable" | "tool" | "other";
  inventoryItemId?: number | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type CreatePurchaseInput = {
  date: Date;
  supplierId: number;
  purchaseType: "spare_part" | "consumable" | "tool" | "other";
  paymentMethod: "cash" | "credit" | "transfer";
  receivingStatus: "received" | "partial" | "pending";
  totalAmount: number;
  notes?: string | null;
  items: PurchaseItemInput[];
  createdBy: number;
};

type UpdatePurchaseInput = Partial<Omit<CreatePurchaseInput, "createdBy">>;

type CreateDailyExpenseInput = {
  date: Date;
  category: string;
  amount: number;
  paymentMethod: "cash" | "transfer" | "other";
  beneficiary: string;
  description: string;
  receiptImageUrl?: string;
  createdBy: number;
};

type UpdateDailyExpenseInput = Partial<Omit<CreateDailyExpenseInput, "createdBy">>;

type CreateDailyCashInput = {
  date: Date;
  shiftType: "morning" | "evening" | "full_day";
  collectedAmount: number;
  expensesAmount: number;
  manualAdjustment?: number;
  handedToTreasuryAmount: number;
  handoverStatus: "pending" | "partial" | "completed";
  employeeId?: number | null;
  notes?: string;
  createdBy: number;
};

type UpdateDailyCashInput = Partial<Omit<CreateDailyCashInput, "createdBy">>;

const getLastNumberFromCode = (value: string | null | undefined, prefix: string) => {
  if (!value?.startsWith(prefix)) return null;
  const numericPart = value.slice(prefix.length);
  const parsed = Number(numericPart);
  return Number.isFinite(parsed) ? parsed : null;
};

const generateCode = async (tx: any, table: typeof purchases | typeof dailyExpenses | typeof dailyCashRecords, column: any, prefix: string) => {
  const rows = await tx.select({ code: column }).from(table).where(sql`${column} like ${`${prefix}%`}`);
  const lastNumber = rows.reduce((max: number, row: { code: string | null }) => {
    const number = getLastNumberFromCode(row.code, prefix);
    return number != null ? Math.max(max, number) : max;
  }, 99);

  return `${prefix}${Math.max(lastNumber + 1, 100)}`;
};

const calculateDailyCashValues = (input: {
  collectedAmount: number;
  expensesAmount: number;
  manualAdjustment?: number;
  handedToTreasuryAmount: number;
}) => {
  const manualAdjustment = input.manualAdjustment ?? 0;
  const netAmount = input.collectedAmount - input.expensesAmount + manualAdjustment;
  const remainingWithEmployee = netAmount - input.handedToTreasuryAmount;

  return {
    manualAdjustment,
    netAmount,
    remainingWithEmployee,
  };
};

const supplierSelect = {
  id: suppliers.id,
  name: suppliers.name,
  phone: suppliers.phone,
  email: suppliers.email,
  address: suppliers.address,
  contactPerson: suppliers.contactPerson,
  notes: suppliers.notes,
  createdBy: suppliers.createdBy,
  createdAt: suppliers.createdAt,
  updatedAt: suppliers.updatedAt,
};

const purchaseListSelect = {
  id: purchases.id,
  purchaseCode: purchases.purchaseCode,
  date: purchases.date,
  supplierId: purchases.supplierId,
  supplierName: suppliers.name,
  purchaseType: purchases.purchaseType,
  paymentMethod: purchases.paymentMethod,
  receivingStatus: purchases.receivingStatus,
  totalAmount: purchases.totalAmount,
  notes: purchases.notes,
  createdBy: purchases.createdBy,
  createdByName: users.name,
  confirmedAt: purchases.confirmedAt,
  stockAppliedAt: purchases.stockAppliedAt,
  createdAt: purchases.createdAt,
  updatedAt: purchases.updatedAt,
};

export const accountingService = {
  async getSuppliers() {
    return await db.select(supplierSelect).from(suppliers).orderBy(desc(suppliers.createdAt));
  },

  async createSupplier(input: CreateSupplierInput) {
    const rows = await db
      .insert(suppliers)
      .values({
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        address: input.address,
        contactPerson: input.contactPerson,
        notes: input.notes,
        createdBy: input.createdBy,
      })
      .returning(supplierSelect);

    return rows[0];
  },

  async getSupplierById(id: number) {
    const rows = await db.select(supplierSelect).from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return rows[0];
  },

  async getSupplierDetails(id: number) {
    const supplier = await this.getSupplierById(id);
    if (!supplier) return undefined;

    const recentPurchases = await db
      .select(purchaseListSelect)
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(users, eq(purchases.createdBy, users.id))
      .where(eq(purchases.supplierId, id))
      .orderBy(desc(purchases.date), desc(purchases.createdAt))
      .limit(20);

    const totalsResult = await db
      .select({
        totalPurchaseAmount: sql<string>`coalesce(sum(${purchases.totalAmount}), 0)`,
        purchasesCount: sql<number>`count(*)::int`,
      })
      .from(purchases)
      .where(eq(purchases.supplierId, id));

    return {
      supplier,
      recentPurchases,
      totals: totalsResult[0] ?? { totalPurchaseAmount: "0", purchasesCount: 0 },
    };
  },

  async updateSupplier(id: number, input: UpdateSupplierInput) {
    const rows = await db
      .update(suppliers)
      .set({
        ...input,
        email: input.email === "" ? null : input.email,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
      .returning(supplierSelect);

    return rows[0];
  },

  async getPurchases() {
    return await db
      .select(purchaseListSelect)
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(users, eq(purchases.createdBy, users.id))
      .orderBy(desc(purchases.date), desc(purchases.createdAt));
  },

  async createPurchase(input: CreatePurchaseInput) {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE "purchases" IN EXCLUSIVE MODE`);
      const purchaseCode = await generateCode(tx, purchases, purchases.purchaseCode, "P");

      const createdPurchases = await tx
        .insert(purchases)
        .values({
          purchaseCode,
          date: input.date,
          supplierId: input.supplierId,
          purchaseType: input.purchaseType,
          paymentMethod: input.paymentMethod,
          receivingStatus: input.receivingStatus,
          totalAmount: input.totalAmount.toString(),
          notes: input.notes,
          createdBy: input.createdBy,
        })
        .returning({ id: purchases.id });

      const purchaseId = createdPurchases[0].id;

      await tx.insert(purchaseItems).values(
        input.items.map((item) => ({
          purchaseId,
          itemName: item.itemName,
          itemType: item.itemType,
          inventoryItemId: item.inventoryItemId ?? null,
          quantity: item.quantity,
          unitCost: item.unitCost.toString(),
          totalCost: item.totalCost.toString(),
        }))
      );

      return await this.getPurchaseDetailsWithExecutor(tx, purchaseId);
    });
  },

  async getPurchaseById(id: number) {
    const rows = await db
      .select(purchaseListSelect)
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(users, eq(purchases.createdBy, users.id))
      .where(eq(purchases.id, id))
      .limit(1);

    return rows[0];
  },

  async getPurchaseDetailsWithExecutor(executor: any, id: number) {
    const purchase = await executor
      .select(purchaseListSelect)
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(users, eq(purchases.createdBy, users.id))
      .where(eq(purchases.id, id))
      .limit(1);

    if (!purchase[0]) return undefined;

    const items = await executor
      .select({
        id: purchaseItems.id,
        purchaseId: purchaseItems.purchaseId,
        itemName: purchaseItems.itemName,
        itemType: purchaseItems.itemType,
        inventoryItemId: purchaseItems.inventoryItemId,
        inventoryName: inventoryItems.name,
        inventoryCode: inventoryItems.code,
        quantity: purchaseItems.quantity,
        unitCost: purchaseItems.unitCost,
        totalCost: purchaseItems.totalCost,
      })
      .from(purchaseItems)
      .leftJoin(inventoryItems, eq(purchaseItems.inventoryItemId, inventoryItems.id))
      .where(eq(purchaseItems.purchaseId, id))
      .orderBy(purchaseItems.id);

    return {
      purchase: purchase[0],
      items,
    };
  },

  async getPurchaseDetails(id: number) {
    return await this.getPurchaseDetailsWithExecutor(db, id);
  },

  async updatePurchase(id: number, input: UpdatePurchaseInput) {
    return await db.transaction(async (tx) => {
      const currentPurchase = await tx.select().from(purchases).where(eq(purchases.id, id)).limit(1);
      if (!currentPurchase[0]) return undefined;
      if (currentPurchase[0].stockAppliedAt) {
        throw new Error("Confirmed purchases cannot be edited after stock has been applied.");
      }

      await tx
        .update(purchases)
        .set({
          date: input.date,
          supplierId: input.supplierId,
          purchaseType: input.purchaseType,
          paymentMethod: input.paymentMethod,
          receivingStatus: input.receivingStatus,
          totalAmount: input.totalAmount?.toString(),
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(purchases.id, id));

      if (input.items) {
        await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
        await tx.insert(purchaseItems).values(
          input.items.map((item) => ({
            purchaseId: id,
            itemName: item.itemName,
            itemType: item.itemType,
            inventoryItemId: item.inventoryItemId ?? null,
            quantity: item.quantity,
            unitCost: item.unitCost.toString(),
            totalCost: item.totalCost.toString(),
          }))
        );
      }

      return await this.getPurchaseDetailsWithExecutor(tx, id);
    });
  },

  async confirmPurchase(id: number, confirmedBy: number, notes?: string) {
    return await db.transaction(async (tx) => {
      const purchaseRows = await tx.select().from(purchases).where(eq(purchases.id, id)).limit(1);
      const purchase = purchaseRows[0];
      if (!purchase) {
        throw new Error("Purchase not found");
      }

      if (purchase.stockAppliedAt) {
        return await this.getPurchaseDetailsWithExecutor(tx, id);
      }

      const items = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));
      const confirmedAt = new Date();

      for (const item of items) {
        if (!item.inventoryItemId) continue;

        await tx
          .update(inventoryItems)
          .set({
            quantity: sql`${inventoryItems.quantity} + ${item.quantity}`,
            updatedAt: confirmedAt,
          })
          .where(eq(inventoryItems.id, item.inventoryItemId));

        await tx.insert(inventoryMovements).values({
          inventoryItemId: item.inventoryItemId,
          movementType: "purchase_received",
          quantity: item.quantity,
          referenceType: "purchase",
          referenceId: id,
          notes: notes || `Stock added from purchase ${purchase.purchaseCode}`,
          createdBy: confirmedBy,
          createdAt: confirmedAt,
        });
      }

      await tx
        .update(purchases)
        .set({
          confirmedAt,
          confirmedBy,
          stockAppliedAt: confirmedAt,
          stockAppliedBy: confirmedBy,
          receivingStatus: purchase.receivingStatus === "pending" ? "received" : purchase.receivingStatus,
          notes: notes ? [purchase.notes, notes].filter(Boolean).join("\n") : purchase.notes,
          updatedAt: confirmedAt,
        })
        .where(eq(purchases.id, id));

      return await this.getPurchaseDetailsWithExecutor(tx, id);
    });
  },

  async getDailyExpenses() {
    return await db
      .select({
        id: dailyExpenses.id,
        expenseCode: dailyExpenses.expenseCode,
        date: dailyExpenses.date,
        category: dailyExpenses.category,
        amount: dailyExpenses.amount,
        paymentMethod: dailyExpenses.paymentMethod,
        beneficiary: dailyExpenses.beneficiary,
        description: dailyExpenses.description,
        receiptImageUrl: dailyExpenses.receiptImageUrl,
        createdBy: dailyExpenses.createdBy,
        createdByName: users.name,
        createdAt: dailyExpenses.createdAt,
        updatedAt: dailyExpenses.updatedAt,
      })
      .from(dailyExpenses)
      .leftJoin(users, eq(dailyExpenses.createdBy, users.id))
      .orderBy(desc(dailyExpenses.date), desc(dailyExpenses.createdAt));
  },

  async createDailyExpense(input: CreateDailyExpenseInput) {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE "daily_expenses" IN EXCLUSIVE MODE`);
      const expenseCode = await generateCode(tx, dailyExpenses, dailyExpenses.expenseCode, "E");

      const rows = await tx
        .insert(dailyExpenses)
        .values({
          expenseCode,
          date: input.date,
          category: input.category,
          amount: input.amount.toString(),
          paymentMethod: input.paymentMethod,
          beneficiary: input.beneficiary,
          description: input.description,
          receiptImageUrl: input.receiptImageUrl,
          createdBy: input.createdBy,
        })
        .returning({ id: dailyExpenses.id });

      return await this.getDailyExpenseById(rows[0].id);
    });
  },

  async getDailyExpenseById(id: number) {
    const rows = await db
      .select({
        id: dailyExpenses.id,
        expenseCode: dailyExpenses.expenseCode,
        date: dailyExpenses.date,
        category: dailyExpenses.category,
        amount: dailyExpenses.amount,
        paymentMethod: dailyExpenses.paymentMethod,
        beneficiary: dailyExpenses.beneficiary,
        description: dailyExpenses.description,
        receiptImageUrl: dailyExpenses.receiptImageUrl,
        createdBy: dailyExpenses.createdBy,
        createdByName: users.name,
        createdAt: dailyExpenses.createdAt,
        updatedAt: dailyExpenses.updatedAt,
      })
      .from(dailyExpenses)
      .leftJoin(users, eq(dailyExpenses.createdBy, users.id))
      .where(eq(dailyExpenses.id, id))
      .limit(1);

    return rows[0];
  },

  async updateDailyExpense(id: number, input: UpdateDailyExpenseInput) {
    await db
      .update(dailyExpenses)
      .set({
        date: input.date,
        category: input.category,
        amount: input.amount?.toString(),
        paymentMethod: input.paymentMethod,
        beneficiary: input.beneficiary,
        description: input.description,
        receiptImageUrl: input.receiptImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(dailyExpenses.id, id));

    return await this.getDailyExpenseById(id);
  },

  async getDailyCashRecords() {
    return await db
      .select({
        id: dailyCashRecords.id,
        cashCode: dailyCashRecords.cashCode,
        date: dailyCashRecords.date,
        shiftType: dailyCashRecords.shiftType,
        collectedAmount: dailyCashRecords.collectedAmount,
        expensesAmount: dailyCashRecords.expensesAmount,
        manualAdjustment: dailyCashRecords.manualAdjustment,
        netAmount: dailyCashRecords.netAmount,
        handedToTreasuryAmount: dailyCashRecords.handedToTreasuryAmount,
        remainingWithEmployee: dailyCashRecords.remainingWithEmployee,
        handoverStatus: dailyCashRecords.handoverStatus,
        employeeId: dailyCashRecords.employeeId,
        employeeName: sql<string | null>`employee_user.name`,
        createdBy: dailyCashRecords.createdBy,
        createdByName: users.name,
        notes: dailyCashRecords.notes,
        createdAt: dailyCashRecords.createdAt,
        updatedAt: dailyCashRecords.updatedAt,
      })
      .from(dailyCashRecords)
      .leftJoin(users, eq(dailyCashRecords.createdBy, users.id))
      .leftJoin(sql`users as employee_user`, sql`employee_user.id = ${dailyCashRecords.employeeId}`)
      .orderBy(desc(dailyCashRecords.date), desc(dailyCashRecords.createdAt));
  },

  async createDailyCash(input: CreateDailyCashInput) {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE "daily_cash_records" IN EXCLUSIVE MODE`);
      const cashCode = await generateCode(tx, dailyCashRecords, dailyCashRecords.cashCode, "C");
      const calculated = calculateDailyCashValues(input);

      const rows = await tx
        .insert(dailyCashRecords)
        .values({
          cashCode,
          date: input.date,
          shiftType: input.shiftType,
          collectedAmount: input.collectedAmount.toString(),
          expensesAmount: input.expensesAmount.toString(),
          manualAdjustment: calculated.manualAdjustment.toString(),
          netAmount: calculated.netAmount.toString(),
          handedToTreasuryAmount: input.handedToTreasuryAmount.toString(),
          remainingWithEmployee: calculated.remainingWithEmployee.toString(),
          handoverStatus: input.handoverStatus,
          employeeId: input.employeeId ?? null,
          createdBy: input.createdBy,
          notes: input.notes,
        })
        .returning({ id: dailyCashRecords.id });

      return await this.getDailyCashById(rows[0].id);
    });
  },

  async getDailyCashById(id: number) {
    const rows = await db
      .select({
        id: dailyCashRecords.id,
        cashCode: dailyCashRecords.cashCode,
        date: dailyCashRecords.date,
        shiftType: dailyCashRecords.shiftType,
        collectedAmount: dailyCashRecords.collectedAmount,
        expensesAmount: dailyCashRecords.expensesAmount,
        manualAdjustment: dailyCashRecords.manualAdjustment,
        netAmount: dailyCashRecords.netAmount,
        handedToTreasuryAmount: dailyCashRecords.handedToTreasuryAmount,
        remainingWithEmployee: dailyCashRecords.remainingWithEmployee,
        handoverStatus: dailyCashRecords.handoverStatus,
        employeeId: dailyCashRecords.employeeId,
        employeeName: sql<string | null>`employee_user.name`,
        createdBy: dailyCashRecords.createdBy,
        createdByName: users.name,
        notes: dailyCashRecords.notes,
        createdAt: dailyCashRecords.createdAt,
        updatedAt: dailyCashRecords.updatedAt,
      })
      .from(dailyCashRecords)
      .leftJoin(users, eq(dailyCashRecords.createdBy, users.id))
      .leftJoin(sql`users as employee_user`, sql`employee_user.id = ${dailyCashRecords.employeeId}`)
      .where(eq(dailyCashRecords.id, id))
      .limit(1);

    return rows[0];
  },

  async updateDailyCash(id: number, input: UpdateDailyCashInput) {
    const current = await db.select().from(dailyCashRecords).where(eq(dailyCashRecords.id, id)).limit(1);
    if (!current[0]) return undefined;

    const calculated = calculateDailyCashValues({
      collectedAmount: input.collectedAmount ?? Number(current[0].collectedAmount),
      expensesAmount: input.expensesAmount ?? Number(current[0].expensesAmount),
      manualAdjustment: input.manualAdjustment ?? Number(current[0].manualAdjustment),
      handedToTreasuryAmount: input.handedToTreasuryAmount ?? Number(current[0].handedToTreasuryAmount),
    });

    await db
      .update(dailyCashRecords)
      .set({
        date: input.date,
        shiftType: input.shiftType,
        collectedAmount: input.collectedAmount?.toString(),
        expensesAmount: input.expensesAmount?.toString(),
        manualAdjustment: calculated.manualAdjustment.toString(),
        netAmount: calculated.netAmount.toString(),
        handedToTreasuryAmount: input.handedToTreasuryAmount?.toString(),
        remainingWithEmployee: calculated.remainingWithEmployee.toString(),
        handoverStatus: input.handoverStatus,
        employeeId: input.employeeId,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(dailyCashRecords.id, id));

    return await this.getDailyCashById(id);
  },

  async getDailyCashSummary() {
    const rows = await db
      .select({
        totalCollected: sql<string>`coalesce(sum(${dailyCashRecords.collectedAmount}), 0)`,
        totalExpenses: sql<string>`coalesce(sum(${dailyCashRecords.expensesAmount}), 0)`,
        totalNet: sql<string>`coalesce(sum(${dailyCashRecords.netAmount}), 0)`,
        totalHanded: sql<string>`coalesce(sum(${dailyCashRecords.handedToTreasuryAmount}), 0)`,
        totalRemaining: sql<string>`coalesce(sum(${dailyCashRecords.remainingWithEmployee}), 0)`,
      })
      .from(dailyCashRecords);

    return rows[0] ?? {
      totalCollected: "0",
      totalExpenses: "0",
      totalNet: "0",
      totalHanded: "0",
      totalRemaining: "0",
    };
  },
};
