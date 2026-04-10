import { z } from "zod";

export const uploadMediaSchema = z.object({
  entityType: z.enum(["case", "invoice"]),
  entityId: z.number().int().positive(),
  fileUrl: z.string().url(),
  fileType: z.enum(["image", "video", "audio", "pdf"]),
});

export const uploadCaseMediaFileSchema = z.object({
  entityType: z.literal("case"),
  entityId: z.number().int().positive(),
  mediaCategory: z.enum(["post_repair", "damaged_part", "waiting_part"]),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
  contentBase64: z.string().min(1),
});
