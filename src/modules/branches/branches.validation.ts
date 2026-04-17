import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(50),
  city: z.string().min(1),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional().nullable(),
});

export const updateBranchSchema = createBranchSchema.partial();
