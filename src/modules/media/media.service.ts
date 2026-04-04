import { db } from "../../db";
import { mediaAssets } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

type CreateMediaInput = {
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  assetType: string;
  description?: string;
};

type MediaAsset = {
  id: number;
  caseId: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  assetType: string;
  description: string | null;
  uploadedBy: number;
  createdAt: Date | null;
};

export const mediaService = {
  async uploadMedia(caseId: number, input: CreateMediaInput, uploadedBy: number): Promise<MediaAsset> {
    // Validate mime type (images and pdf only)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(input.mimeType)) {
      throw new Error("Only image and PDF files are allowed");
    }

    const newMedia = await db
      .insert(mediaAssets)
      .values({
        caseId,
        ...input,
        uploadedBy,
      })
      .returning();

    return newMedia[0];
  },

  async getCaseMedia(caseId: number): Promise<MediaAsset[]> {
    return await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.caseId, caseId))
      .orderBy(desc(mediaAssets.createdAt));
  },
};