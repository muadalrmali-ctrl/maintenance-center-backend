import { Request, Response } from "express";
import { caseService } from "./case.service";
import { CaseStatus } from "./constants";

export const caseController = {
  async create(req: Request, res: Response) {
    try {
      const {
        customerId,
        deviceId,
        customerComplaint,
        initialCheckNotes,
        internalNotes,
        deliveryDueAt,
        assignedTechnicianId,
      } = req.body;
      const createdBy = req.user?.id;

      if (!customerId || !deviceId || !customerComplaint) {
        return res.status(400).json({
          success: false,
          message: "customerId, deviceId, and customerComplaint are required",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const caseData = await caseService.createCase({
        customerId,
        deviceId,
        customerComplaint,
        initialCheckNotes,
        internalNotes,
        deliveryDueAt: deliveryDueAt ? new Date(deliveryDueAt) : undefined,
        assignedTechnicianId,
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
        error: error instanceof Error ? error.message : "Unknown error",
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
      const {
        customerComplaint,
        initialCheckNotes,
        diagnosisNotes,
        internalNotes,
        deliveryDueAt,
        executionStartedAt,
        executionDueAt,
        finalResult,
        assignedTechnicianId,
      } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const caseData = await caseService.updateCase(id, {
        customerComplaint,
        initialCheckNotes,
        diagnosisNotes,
        internalNotes,
        deliveryDueAt: deliveryDueAt ? new Date(deliveryDueAt) : null,
        executionStartedAt: executionStartedAt ? new Date(executionStartedAt) : null,
        executionDueAt: executionDueAt ? new Date(executionDueAt) : null,
        finalResult,
        assignedTechnicianId,
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
      const { toStatus, notes } = req.body;
      const changedBy = req.user?.id;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!toStatus) {
        return res.status(400).json({
          success: false,
          message: "toStatus is required",
        });
      }

      if (!changedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await caseService.changeStatus(id, {
        toStatus: toStatus as CaseStatus,
        notes,
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