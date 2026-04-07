import { Request, Response } from "express";
import { caseService } from "./case.service";
import { createCaseSchema, updateCaseSchema, changeCaseStatusSchema } from "./cases.validation";

const logCaseError = (action: string, error: unknown) => {
  console.error(
    `[cases:${action}]`,
    error instanceof Error ? error.message : error
  );
};

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
        customer: validation.data.customer,
        deviceId: validation.data.deviceId,
        device: validation.data.device,
        customerComplaint: validation.data.customerComplaint,
        priority: validation.data.priority,
        maintenanceTeam: validation.data.maintenanceTeam,
        technicianName: validation.data.technicianName,
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
      logCaseError("create", error);
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
      logCaseError("getAll", error);
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
      logCaseError("getById", error);
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
        priority: validation.data.priority,
        maintenanceTeam: validation.data.maintenanceTeam,
        technicianName: validation.data.technicianName,
        serialNumber: validation.data.serialNumber,
        notes: validation.data.notes,
        deliveryDueAt: validation.data.deliveryDueAt ? new Date(validation.data.deliveryDueAt) : null,
        waitingPartInventoryItemId: validation.data.waitingPartInventoryItemId,
        waitingPartName: validation.data.waitingPartName,
        waitingPartNotes: validation.data.waitingPartNotes,
        waitingPartImageUrl: validation.data.waitingPartImageUrl,
        diagnosisNote: validation.data.diagnosisNote,
        faultCause: validation.data.faultCause,
        latestMessage: validation.data.latestMessage,
        latestMessageChannel: validation.data.latestMessageChannel,
        latestMessageSentAt: validation.data.latestMessageSentAt ? new Date(validation.data.latestMessageSentAt) : null,
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
      logCaseError("update", error);
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
      const rawUserId = req.user?.id ?? (req.user as any)?.sub;
      const changedBy = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;

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

      if (!changedBy || Number.isNaN(changedBy)) {
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
      logCaseError("changeStatus", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to change status",
      });
    }
  },
};
