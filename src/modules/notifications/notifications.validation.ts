import { z } from "zod";

export const createNotificationSchema = z.object({
  type: z.enum(["email", "whatsapp"]),
  target: z.string().min(1),
  message: z.string().min(1),
  referenceType: z.string().optional(),
  referenceId: z.number().int().positive().optional(),
});