import { Request, Response } from "express";
import { casePartsService } from "./case-parts.service";

export const casePartsController = {
  async addPart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const { inventoryItemId, quantity, notes } = req.body;
      const addedBy = req.user?.id;

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!inventoryItemId || !quantity) {
        return res.status(400).json({
          success: false,
          message: "inventoryItemId and quantity are required",
        });
      }

      if (!addedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const part = await casePartsService.addPart(caseId, {
        inventoryItemId,
        quantity,
        notes,
        addedBy,
      });

      return res.status(201).json({
        success: true,
        message: "Part added to case successfully",
        data: part,
      });
    } catch (error) {
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
};