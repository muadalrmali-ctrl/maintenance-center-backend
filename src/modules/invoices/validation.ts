import { z } from "zod";

export const createInvoiceSchema = z.object({
  discount: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["draft", "issued", "paid", "cancelled"]),
});