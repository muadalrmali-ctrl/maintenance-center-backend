import { z } from "zod";

export const uploadMediaSchema = z.object({
  entityType: z.enum(["case", "invoice"]),
  entityId: z.number().int().positive(),
  fileUrl: z.string().url(),
  fileType: z.enum(["image", "pdf"]),
});