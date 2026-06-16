import { Request, Response } from "express";
import { caseService } from "./case.service";
import {
  createCaseSchema,
  updateCaseSchema,
  changeCaseStatusSchema,
  startExecutionSchema,
  executionActionSchema,
  repairQualitySchema,
  readyNotificationSchema,
  receiveAtMainCenterSchema,
} from "./cases.validation";
import { requestHasPermission } from "../../middlewares/permission";
import { receptionPointsService } from "../reception-points/reception-points.service";

const logCaseError = (action: string, error: unknown) => {
  console.error(
    `[cases:${action}]`,
    error instanceof Error ? error.message : error
  );
};

const getRequestUserId = (req: Request) => {
  const rawUserId = req.user?.id ?? (req.user as any)?.sub;
  const userId = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;
  return userId && !Number.isNaN(userId) ? userId : null;
};

const getReceptionPointId = (req: Request) =>
  typeof req.user?.receptionPointId === "number" ? req.user.receptionPointId : null;

const CASE_UPDATE_PERMISSION_RULES: Array<{ keys: string[]; permission: string }> = [
  {
    keys: [
      "deliveryDueAt",
      "waitingPartInventoryItemId",
      "waitingPartName",
      "waitingPartNotes",
      "waitingPartImageUrl",
      "diagnosisNote",
      "faultCause",
      "latestMessage",
      "latestMessageChannel",
      "latestMessageSentAt",
    ],
    permission: "cases.diagnosis.edit",
  },
  {
    keys: ["assignedTechnicianId", "executionDurationDays", "executionDurationHours"],
    permission: "cases.approval.prepare_execution",
  },
  {
    keys: [
      "postRepairCompletedWork",
      "postRepairTested",
      "postRepairTestCount",
      "postRepairCleaned",
      "postRepairRecommendations",
      "postRepairImages",
      "postRepairVideos",
      "postRepairDamagedPartImages",
      "postRepairNote",
      "operationFinalizedAt",
    ],
    permission: "cases.repaired.post_repair_quality.view",
  },
  {
    keys: ["readyNotificationMessage", "readyNotificationChannel", "readyNotificationSentAt"],
    permission: "cases.repaired.ready_notification.send",
  },
  {
    keys: ["customerReceivedAt", "finalResult", "notRepairableReason"],
    permission: "cases.repaired.summary.view",
  },
];

const CASE_STATUS_PERMISSION_MAP: Record<string, string> = {
  received: "cases.diagnosis.edit",
  new: "cases.diagnosis.edit",
  waiting_part: "cases.diagnosis.edit",
  diagnosing: "cases.diagnosis.edit",
  waiting_approval: "cases.diagnosis.edit",
  in_progress: "cases.approval.prepare_execution",
  repaired: "cases.in_progress.mark_repaired",
  not_repairable: "cases.diagnosis.edit",
};

const NEW_CASE_STATUSES = new Set(["received", "new"]);
const NEW_CASE_ONLY_UPDATE_KEYS = [
  "caseType",
  "deviceId",
  "customerComplaint",
  "serialNumber",
] as const;

const collectRequiredPatchPermissions = (payload: Record<string, unknown>) => {
  const requiredPermissions = new Set<string>();

  for (const rule of CASE_UPDATE_PERMISSION_RULES) {
    if (rule.keys.some((key) => payload[key] !== undefined)) {
      requiredPermissions.add(rule.permission);
    }
  }

  return [...requiredPermissions];
};

const findMissingPermissions = (req: Request, permissionKeys: string[]) =>
  permissionKeys.filter((permissionKey) => !requestHasPermission(req, permissionKey));

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

      const isReceptionPointUser = req.user?.role === "reception_point_user";
      const scopedReceptionPointId = getReceptionPointId(req);
      if (isReceptionPointUser && !scopedReceptionPointId) {
        return res.status(403).json({
          success: false,
          message: "Reception point user is not linked to a reception point",
        });
      }

      const requestedReceptionPointId = validation.data.receptionPointId ?? null;
      const requestsReceptionPointCase =
        validation.data.sourceType === "reception_point" || Boolean(requestedReceptionPointId);
      let sourceType: "main_center" | "reception_point" = "main_center";
      let receptionPointId: number | null = null;

      if (isReceptionPointUser) {
        if (requestedReceptionPointId && requestedReceptionPointId !== scopedReceptionPointId) {
          return res.status(403).json({
            success: false,
            message: "Reception point users can only create cases for their assigned reception point",
          });
        }

        if (validation.data.sourceType === "main_center") {
          return res.status(403).json({
            success: false,
            message: "Reception point users cannot create main center cases",
          });
        }

        sourceType = "reception_point";
        receptionPointId = scopedReceptionPointId;
      } else if (requestsReceptionPointCase) {
        if (!requestHasPermission(req, "reception_points.manage")) {
          return res.status(403).json({
            success: false,
            message: "You are not allowed to create cases for reception points",
          });
        }

        if (!requestedReceptionPointId) {
          return res.status(400).json({
            success: false,
            message: "receptionPointId is required when creating a reception point case",
          });
        }

        sourceType = "reception_point";
        receptionPointId = requestedReceptionPointId;
      }

      if (receptionPointId) {
        try {
          await receptionPointsService.assertActiveReceptionPoint(receptionPointId);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Reception point is not active or does not exist",
          });
        }
      }

      const caseData = await caseService.createCase({
        caseType: validation.data.caseType,
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
        sourceType,
        receptionPointId,
        createdAtReceptionPointBy: sourceType === "reception_point" ? createdBy : null,
        processingMode: sourceType === "reception_point" ? validation.data.processingMode : "main_center_repair",
        transferStatus: sourceType === "reception_point" ? validation.data.transferStatus : "not_required",
        localTechnicianName: validation.data.localTechnicianName,
        localTechnicianPhone: validation.data.localTechnicianPhone,
        localRepairNotes: validation.data.localRepairNotes,
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
      const cases = await caseService.getCases({
        role: req.user?.role,
        userId: getRequestUserId(req),
        receptionPointId: getReceptionPointId(req),
      });

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

  async getIncomingReceptionPointCases(req: Request, res: Response) {
    try {
      const incomingCases = await caseService.getIncomingReceptionPointCases({
        role: req.user?.role,
        userId: getRequestUserId(req),
        receptionPointId: getReceptionPointId(req),
      });

      return res.status(200).json({
        success: true,
        message: "Incoming reception point cases retrieved successfully",
        data: incomingCases,
      });
    } catch (error) {
      logCaseError("getIncomingReceptionPointCases", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve incoming reception point cases",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async receiveAtMainCenter(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = receiveAtMainCenterSchema.safeParse(req.body);
      const receivedBy = getRequestUserId(req);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      if (!receivedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const caseData = await caseService.markReceivedAtMainCenter(id, {
        receivedBy,
        notes: validation.data.notes ?? null,
      });

      return res.status(200).json({
        success: true,
        message: "Case received at main center successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("receiveAtMainCenter", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to receive case at main center",
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

      const caseData = await caseService.getCaseById(id, {
        role: req.user?.role,
        userId: getRequestUserId(req),
        receptionPointId: getReceptionPointId(req),
      });

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

      if (req.user?.role === "reception_point_user") {
        const accessibleCase = await caseService.getCaseById(id, {
          role: req.user?.role,
          userId: getRequestUserId(req),
          receptionPointId: getReceptionPointId(req),
        });

        if (!accessibleCase) {
          return res.status(404).json({
            success: false,
            message: "Case not found",
          });
        }
      }

      const updatesNewCaseOnlyData = NEW_CASE_ONLY_UPDATE_KEYS.some((key) => validation.data[key] !== undefined);

      if (updatesNewCaseOnlyData) {
        const existingCase = await caseService.getCaseById(id, {
          role: req.user?.role,
          userId: getRequestUserId(req),
          receptionPointId: getReceptionPointId(req),
        });

        if (!existingCase) {
          return res.status(404).json({
            success: false,
            message: "Case not found",
          });
        }

        if (!NEW_CASE_STATUSES.has(existingCase.caseData.status)) {
          return res.status(400).json({
            success: false,
            message: "Only new cases can be edited",
          });
        }
      }

      const missingPermissions = findMissingPermissions(
        req,
        collectRequiredPatchPermissions(validation.data as Record<string, unknown>)
      );

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          requiredPermissions: missingPermissions,
        });
      }

      const caseData = await caseService.updateCase(id, {
        caseType: validation.data.caseType,
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
        postRepairCompletedWork: validation.data.postRepairCompletedWork,
        postRepairTested: validation.data.postRepairTested,
        postRepairTestCount: validation.data.postRepairTestCount,
        postRepairCleaned: validation.data.postRepairCleaned,
        postRepairRecommendations: validation.data.postRepairRecommendations,
        postRepairImages: validation.data.postRepairImages,
        postRepairVideos: validation.data.postRepairVideos,
        postRepairDamagedPartImages: validation.data.postRepairDamagedPartImages,
        postRepairNote: validation.data.postRepairNote,
        notRepairableReason: validation.data.notRepairableReason,
        readyNotificationMessage: validation.data.readyNotificationMessage,
        readyNotificationChannel: validation.data.readyNotificationChannel,
        readyNotificationSentAt: validation.data.readyNotificationSentAt ? new Date(validation.data.readyNotificationSentAt) : null,
        customerReceivedAt: validation.data.customerReceivedAt ? new Date(validation.data.customerReceivedAt) : null,
        operationFinalizedAt: validation.data.operationFinalizedAt ? new Date(validation.data.operationFinalizedAt) : null,
        assignedTechnicianId: validation.data.assignedTechnicianId,
        executionDurationDays: validation.data.executionDurationDays,
        executionDurationHours: validation.data.executionDurationHours,
        finalResult: validation.data.finalResult,
        localTechnicianName: validation.data.localTechnicianName,
        localTechnicianPhone: validation.data.localTechnicianPhone,
        localRepairNotes: validation.data.localRepairNotes,
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

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const deletedCase = await caseService.deleteNewCase(id);

      return res.status(200).json({
        success: true,
        message: "Case deleted successfully",
        data: deletedCase,
      });
    } catch (error) {
      logCaseError("delete", error);
      const message = error instanceof Error ? error.message : "Failed to delete case";
      const statusCode = message === "Case not found" ? 404 : 400;

      return res.status(statusCode).json({
        success: false,
        message,
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

      const requiredPermission = CASE_STATUS_PERMISSION_MAP[validation.data.toStatus];
      if (requiredPermission && !requestHasPermission(req, requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          requiredPermission,
        });
      }

      const result = await caseService.changeStatus(id, {
        toStatus: validation.data.toStatus,
        notes: validation.data.notes ?? null,
        executionDueAt: validation.data.executionDueAt ? new Date(validation.data.executionDueAt) : null,
        customerApprovalConfirmed: validation.data.customerApprovalConfirmed,
        executionDurationDays: validation.data.executionDurationDays,
        executionDurationHours: validation.data.executionDurationHours,
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

  async confirmCustomerApproval(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const changedBy = getRequestUserId(req);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!changedBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const caseData = await caseService.confirmCustomerApproval(id, changedBy);

      return res.status(200).json({
        success: true,
        message: "Customer approval confirmed successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("confirmCustomerApproval", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to confirm customer approval",
      });
    }
  },

  async getMaintenanceOperations(req: Request, res: Response) {
    try {
      const operations = await caseService.getMaintenanceOperations({
        role: req.user?.role,
        userId: getRequestUserId(req),
      });

      return res.status(200).json({
        success: true,
        message: "Maintenance operations retrieved successfully",
        data: operations,
      });
    } catch (error) {
      logCaseError("getMaintenanceOperations", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve maintenance operations",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getMaintenanceOperationById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid operation ID" });
      }

      const operation = await caseService.getMaintenanceOperationById(id, {
        role: req.user?.role,
        userId: getRequestUserId(req),
      });

      if (!operation) {
        return res.status(404).json({ success: false, message: "Maintenance operation not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Maintenance operation retrieved successfully",
        data: operation,
      });
    } catch (error) {
      logCaseError("getMaintenanceOperationById", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve maintenance operation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async startExecution(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = startExecutionSchema.safeParse(req.body);
      const changedBy = getRequestUserId(req);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      if (!changedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const caseData = await caseService.startExecution(id, {
        customerApprovalConfirmed: validation.data.customerApprovalConfirmed,
        durationDays: validation.data.durationDays,
        durationHours: validation.data.durationHours,
        assignedTechnicianId: validation.data.assignedTechnicianId,
        notes: validation.data.notes ?? null,
        changedBy,
      });

      return res.status(200).json({
        success: true,
        message: "Execution started successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("startExecution", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to start execution",
      });
    }
  },

  async pauseExecution(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = executionActionSchema.safeParse(req.body);
      const changedBy = getRequestUserId(req);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      if (!changedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const caseData = await caseService.pauseExecution(id, {
        notes: validation.data.notes ?? null,
        latestMessage: validation.data.latestMessage ?? null,
        latestMessageChannel: validation.data.latestMessageChannel ?? null,
        changedBy,
      });

      return res.status(200).json({
        success: true,
        message: "Execution paused successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("pauseExecution", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to pause execution",
      });
    }
  },

  async resumeExecution(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = executionActionSchema.safeParse(req.body);
      const changedBy = getRequestUserId(req);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      if (!changedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const caseData = await caseService.resumeExecution(id, {
        notes: validation.data.notes ?? null,
        changedBy,
      });

      return res.status(200).json({
        success: true,
        message: "Execution resumed successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("resumeExecution", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to resume execution",
      });
    }
  },

  async completeRepair(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = executionActionSchema.safeParse(req.body);
      const changedBy = getRequestUserId(req);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      if (!changedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const caseData = await caseService.completeRepair(id, {
        notes: validation.data.notes ?? null,
        changedBy,
      });

      return res.status(200).json({
        success: true,
        message: "Repair completed successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("completeRepair", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to complete repair",
      });
    }
  },

  async saveRepairQuality(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = repairQualitySchema.safeParse(req.body);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const caseData = await caseService.saveRepairQuality(id, validation.data);

      return res.status(200).json({
        success: true,
        message: "Repair quality saved successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("saveRepairQuality", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save repair quality",
      });
    }
  },

  async sendReadyNotification(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const validation = readyNotificationSchema.safeParse(req.body);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const caseData = await caseService.sendReadyNotification(id, validation.data);

      return res.status(200).json({
        success: true,
        message: "Ready notification saved successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("sendReadyNotification", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send ready notification",
      });
    }
  },

  async markCustomerReceived(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      const caseData = await caseService.markCustomerReceived(id);

      return res.status(200).json({
        success: true,
        message: "Customer receipt marked successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("markCustomerReceived", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark customer receipt",
      });
    }
  },

  async finalizeOperation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const changedBy = getRequestUserId(req);

      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid case ID" });
      }

      if (!changedBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const caseData = await caseService.finalizeOperation(id, changedBy, req.body);

      return res.status(200).json({
        success: true,
        message: "Operation finalized successfully",
        data: caseData,
      });
    } catch (error) {
      logCaseError("finalizeOperation", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to finalize operation",
      });
    }
  },

};
