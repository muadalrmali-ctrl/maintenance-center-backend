import { Request, Response } from "express";
import { caseService } from "./case.service";
import { createCaseSchema, updateCaseSchema, changeCaseStatusSchema } from "./cases.validation";

export const caseController = {
  async create(req: Request, res: Response) {
    try {
      const validation = createCaseSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const rawUserId = req.user?.id ?? (req.user as any)?.sub;
      const createdBy = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;
      if (!createdBy || Number.isNaN(createdBy)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const caseData = await caseService.createCase({
        customerId: validation.data.customerId,
        deviceId: validation.data.deviceId,
        customerComplaint: validation.data.customerComplaint,
        serialNumber: validation.data.serialNumber,
        notes: validation.data.notes,
        deliveryDueAt: validation.data.deliveryDueAt ? new Date(validation.data.deliveryDueAt) : undefined,
        assignedTechnicianId: validation.data.assignedTechnicianId,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Case created successfully",
        data: caseData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create case",
        ...(process.env.NODE_ENV !== "production"
          ? { error: error instanceof Error ? error.message : "Unknown error" }
          : {}),
      });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const cases = await caseService.getCases();

      return res.status(200).json({
        success: true,
        message: "Cases retrieved successfully",
        data: cases,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve cases",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const caseData = await caseService.getCaseById(id);

      if (!caseData) {
        return res.status(404).json({
          success: false,
          message: "Case not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Case retrieved successfully",
        data: caseData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve case",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = updateCaseSchema.safeParse(req.body);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const caseData = await caseService.updateCase(id, {
        deviceId: validation.data.deviceId,
        customerComplaint: validation.data.customerComplaint,
        serialNumber: validation.data.serialNumber,
        notes: validation.data.notes,
        deliveryDueAt: validation.data.deliveryDueAt ? new Date(validation.data.deliveryDueAt) : null,
        assignedTechnicianId: validation.data.assignedTechnicianId,
        finalResult: validation.data.finalResult,
      });

      if (!caseData) {
        return res.status(404).json({
          success: false,
          message: "Case not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Case updated successfully",
        data: caseData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update case",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async changeStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = changeCaseStatusSchema.safeParse(req.body);
      const changedBy = req.user?.id;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      if (!changedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await caseService.changeStatus(id, {
        toStatus: validation.data.toStatus,
        notes: validation.data.notes ?? null,
        executionDueAt: validation.data.executionDueAt ? new Date(validation.data.executionDueAt) : null,
        finalResult: validation.data.finalResult ?? null,
        changedBy,
      });

      return res.status(200).json({
        success: true,
        message: "Case status changed successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to change status",
      });
    }
  },
};