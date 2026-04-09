import { z } from "zod";

export const createNotificationSchema = z.object({
  type: z.enum(["email", "whatsapp"]),
  target: z.string().min(1),
  message: z.string().min(1),
  referenceType: z.string().optional(),
  referenceId: z.number().int().positive().optional(),
});

export const sendCustomerMessageSchema = z.object({
  caseId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  messageBody: z.string().min(1),
  channel: z.enum(["whatsapp", "sms", "email"]).optional().default("whatsapp"),
  type: z.enum(["diagnosis", "ready", "invoice", "status_update", "custom"]).optional().default("custom"),
  mediaUrls: z.array(z.string().url()).max(5).optional(),
});
