import { db } from "../../db";
import { mediaAssets } from "../../db/schema";
import { and, desc, eq } from "drizzle-orm";

type CreateMediaInput = {
  entityType: string;
  entityId: number;
  fileUrl: string;
  fileType: string;
};

type MediaAsset = {
  id: number;
  entityType: string;
  entityId: number;
  fileUrl: string;
  fileType: string;
  uploadedBy: number;
  createdAt: Date | null;
};

export const mediaService = {
  async uploadMedia(input: CreateMediaInput, uploadedBy: number): Promise<MediaAsset> {
    // Validate fileType
    const allowedTypes = ['image', 'pdf'];
    if (!allowedTypes.includes(input.fileType)) {
      throw new Error("Only image and pdf file types are allowed");
    }

    const newMedia = await db
      .insert(mediaAssets)
      .values({
        ...input,
        uploadedBy,
      })
      .returning();

    return newMedia[0];
  },

  async getMediaByEntity(entityType: string, entityId: number): Promise<MediaAsset[]> {
    return await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.entityType, entityType), eq(mediaAssets.entityId, entityId)))
      .orderBy(desc(mediaAssets.createdAt));
  },
};
