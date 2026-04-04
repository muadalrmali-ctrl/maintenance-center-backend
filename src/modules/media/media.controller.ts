import { Request, Response } from "express";
import { mediaService } from "./media.service";

export const mediaController = {
  async uploadMedia(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const uploadedBy = req.user?.id;

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!uploadedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Assume file upload middleware provides file info
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const media = await mediaService.uploadMedia(caseId, {
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileUrl: `/uploads/${file.filename}`, // Assuming file is saved in uploads folder
        assetType: file.mimetype.startsWith('image/') ? 'image' : 'document',
        description: req.body.description,
      }, uploadedBy);

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

  async getCaseMedia(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const media = await mediaService.getCaseMedia(caseId);

      return res.status(200).json({
        success: true,
        message: "Case media retrieved successfully",
        data: media,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve case media",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};