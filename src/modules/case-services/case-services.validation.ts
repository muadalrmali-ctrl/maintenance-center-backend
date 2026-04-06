import { z } from "zod";

export const addServiceSchema = z.object({
  serviceName: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  unitPrice: z.number().positive("Unit price must be positive"),
  quantity: z.number().int().min(1).optional().default(1),
  performedBy: z.number().int().positive().optional(),
});