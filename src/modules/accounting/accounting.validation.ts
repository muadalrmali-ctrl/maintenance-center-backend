import { z } from "zod";

const isoDateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().min(10))
  .transform((value) => new Date(value));

const purchaseItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  itemType: z.enum(["spare_part", "consumable", "tool", "other"]),
  inventoryItemId: z.number().int().positive().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitCost: z.number().positive("Unit cost must be positive"),
  totalCost: z.number().positive("Total cost must be positive"),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const createPurchaseSchema = z.object({
  date: isoDateSchema,
  supplierId: z.number().int().positive(),
  purchaseType: z.enum(["spare_part", "consumable", "tool", "other"]),
  paymentMethod: z.enum(["cash", "credit", "transfer"]),
  receivingStatus: z.enum(["received", "partial", "pending"]),
  totalAmount: z.number().positive(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one purchase item is required"),
});

export const updatePurchaseSchema = z.object({
  date: isoDateSchema.optional(),
  supplierId: z.number().int().positive().optional(),
  purchaseType: z.enum(["spare_part", "consumable", "tool", "other"]).optional(),
  paymentMethod: z.enum(["cash", "credit", "transfer"]).optional(),
  receivingStatus: z.enum(["received", "partial", "pending"]).optional(),
  totalAmount: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1).optional(),
});

export const confirmPurchaseSchema = z.object({
  notes: z.string().optional(),
});

export const createDailyExpenseSchema = z.object({
  date: isoDateSchema,
  category: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "transfer", "other"]),
  beneficiary: z.string().min(1),
  description: z.string().min(1),
  receiptImageUrl: z.string().optional(),
});

export const updateDailyExpenseSchema = createDailyExpenseSchema.partial();

export const createDailyCashSchema = z.object({
  date: isoDateSchema,
  shiftType: z.enum(["morning", "evening", "full_day"]),
  collectedAmount: z.number().min(0),
  expensesAmount: z.number().min(0),
  manualAdjustment: z.number().optional().default(0),
  handedToTreasuryAmount: z.number().min(0),
  handoverStatus: z.enum(["pending", "partial", "completed"]),
  employeeId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
});

export const updateDailyCashSchema = createDailyCashSchema.partial();
