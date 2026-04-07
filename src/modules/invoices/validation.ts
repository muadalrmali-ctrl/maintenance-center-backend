import { z } from "zod";

export const createInvoiceSchema = z.object({
  discount: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

export const createDirectInvoiceSchema = z.object({
  customerId: z.number().int().positive().optional(),
  directCustomerName: z.string().optional(),
  directCustomerPhone: z.string().optional(),
  discount: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0).optional(),
    referenceId: z.number().int().positive(),
  })).min(1),
}).refine((data) => data.customerId || data.directCustomerName, {
  message: "customerId or directCustomerName is required",
  path: ["customerId"],
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["draft", "issued", "paid", "cancelled"]),
});
