import { Request, Response } from "express";
import { casePartsService } from "./case-parts.service";
import { addPartSchema } from "./case-parts.validation";
import { caseService } from "../cases/case.service";

export const casePartsController = {
  async requestPart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const partId = parseInt(req.params.partId as string);
      const requestedBy = req.user?.id;

      if (isNaN(caseId) || isNaN(partId)) {
        return res.status(400).json({ success: false, message: "Invalid case or part ID" });
      }

      if (!requestedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const part = await casePartsService.requestPart(caseId, partId, requestedBy);

      return res.status(200).json({
        success: true,
        message: "Part requested successfully",
        data: part,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to request part",
      });
    }
  },

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

      const caseData = await caseService.getCaseById(caseId, {
        role: req.user?.role,
        userId: req.user?.id ?? null,
        branchId: req.user?.branchId,
      });

      if (!caseData) {
        return res.status(404).json({
          success: false,
          message: "Case not found",
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
      const changedBy = req.user?.id;

      if (isNaN(caseId) || isNaN(partId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case or part ID",
        });
      }

      if (!changedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      await casePartsService.removePart(caseId, partId, changedBy);

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

  async deliverPart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const partId = parseInt(req.params.partId as string);
      const deliveredBy = req.user?.id;

      if (isNaN(caseId) || isNaN(partId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case or part ID",
        });
      }

      if (!deliveredBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const part = await casePartsService.deliverPart(caseId, partId, deliveredBy);

      return res.status(200).json({
        success: true,
        message: "Part delivered successfully",
        data: part,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to deliver part",
      });
    }
  },

  async receivePart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const partId = parseInt(req.params.partId as string);
      const receivedBy = req.user?.id;

      if (isNaN(caseId) || isNaN(partId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case or part ID",
        });
      }

      if (!receivedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const part = await casePartsService.receivePart(caseId, partId, receivedBy);

      return res.status(200).json({
        success: true,
        message: "Part received successfully",
        data: part,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to receive part",
      });
    }
  },

  async usePart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const partId = parseInt(req.params.partId as string);
      const changedBy = req.user?.id;

      if (isNaN(caseId) || isNaN(partId)) {
        return res.status(400).json({ success: false, message: "Invalid case or part ID" });
      }

      if (!changedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const part = await casePartsService.usePart(caseId, partId, changedBy);

      return res.status(200).json({
        success: true,
        message: "Part marked as used successfully",
        data: part,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark part as used",
      });
    }
  },

  async returnPart(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const partId = parseInt(req.params.partId as string);
      const changedBy = req.user?.id;

      if (isNaN(caseId) || isNaN(partId)) {
        return res.status(400).json({ success: false, message: "Invalid case or part ID" });
      }

      if (!changedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const part = await casePartsService.returnPart(caseId, partId, changedBy);

      return res.status(200).json({
        success: true,
        message: "Part returned successfully",
        data: part,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to return part",
      });
    }
  },
};
