import { z } from "zod";

export const receptionPointStatusSchema = z.enum(["active", "inactive"]);

export const createReceptionPointSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  area: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  status: receptionPointStatusSchema.optional().default("active"),
  notes: z.string().optional().nullable(),
});

export const updateReceptionPointSchema = createReceptionPointSchema.partial();
