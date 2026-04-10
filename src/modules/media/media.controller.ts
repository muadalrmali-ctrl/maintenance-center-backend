import { Request, Response } from "express";
import { mediaService } from "./media.service";
import { uploadCaseMediaFileSchema, uploadMediaSchema } from "./media.validation";

export const mediaController = {
  async uploadCaseMediaFile(req: Request, res: Response) {
    try {
      const rawUploadedBy = req.user?.id ?? (req.user as any)?.sub;
      const uploadedBy = typeof rawUploadedBy === "string" ? Number(rawUploadedBy) : rawUploadedBy;

      if (!uploadedBy || Number.isNaN(uploadedBy)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const validation = uploadCaseMediaFileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const media = await mediaService.uploadCaseMediaFile(validation.data, uploadedBy);

      return res.status(201).json({
        success: true,
        message: "Case media uploaded successfully",
        data: media,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload case media",
      });
    }
  },

  async uploadMedia(req: Request, res: Response) {
    try {
      const uploadedBy = req.user?.id;

      if (!uploadedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const validation = uploadMediaSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const media = await mediaService.uploadMedia(validation.data, uploadedBy);

      return res.status(201).json({
        success: true,
        message: "Media uploaded successfully",
        data: media,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload media",
      });
    }
  },

  async getMediaByEntity(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;

      if (!entityType || !entityId) {
        return res.status(400).json({
          success: false,
          message: "entityType and entityId are required",
        });
      }

      const entityIdStr = Array.isArray(entityId) ? entityId[0] : entityId;
      const entityIdNum = parseInt(entityIdStr);
      if (isNaN(entityIdNum)) {
        return res.status(400).json({
          success: false,
          message: "Invalid entityId",
        });
      }

      const entityTypeStr = Array.isArray(entityType) ? entityType[0] : entityType;
      const media = await mediaService.getMediaByEntity(entityTypeStr, entityIdNum);

      return res.status(200).json({
        success: true,
        message: "Media retrieved successfully",
        data: media,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve media",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
