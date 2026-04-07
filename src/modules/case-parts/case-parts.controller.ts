import { Request, Response } from "express";
import { casePartsService } from "./case-parts.service";
import { addPartSchema } from "./case-parts.validation";

export const casePartsController = {
  async addPart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const addedBy = req.user?.id;

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!addedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const validatedData = addPartSchema.parse(req.body);

      const part = await casePartsService.addPart(caseId, {
        ...validatedData,
        addedBy,
      });

      return res.status(201).json({
        success: true,
        message: "Part added to case successfully",
        data: part,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: (error as any).errors,
        });
      }
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to add part",
      });
    }
  },

  async getCaseParts(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const parts = await casePartsService.getCaseParts(caseId);

      return res.status(200).json({
        success: true,
        message: "Case parts retrieved successfully",
        data: parts,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve case parts",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async removePart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const partId = parseInt(req.params.partId as string);

      if (isNaN(caseId) || isNaN(partId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case or part ID",
        });
      }

      await casePartsService.removePart(caseId, partId);

      return res.status(200).json({
        success: true,
        message: "Part removed from case successfully",
        data: { id: partId },
      });
    } catch (error) {
      console.error("[case-parts:removePart]", error instanceof Error ? error.message : error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to remove part",
      });
    }
  },
};
