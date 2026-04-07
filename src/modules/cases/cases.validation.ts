import { z } from "zod";
import { ALLOWED_TRANSITIONS, CASE_STATUSES } from "./constants";

export const createCaseSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  deviceId: z.number().int().positive().optional(),
  device: z.object({
    applianceType: z.string().min(1),
    brand: z.string().optional(),
    modelName: z.string().min(1),
    modelCode: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  customerComplaint: z.string().min(1),
  priority: z.enum(["منخفضة", "متوسطة", "مرتفعة", "عاجلة", "حالة حادثة"]).optional(),
  maintenanceTeam: z.string().optional(),
  technicianName: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
  deliveryDueAt: z.string().optional(),
  assignedTechnicianId: z.number().int().positive().optional(),
}).refine((data) => data.customerId || data.customer, {
  message: "customerId or customer is required",
  path: ["customer"],
}).refine((data) => data.deviceId || data.device, {
  message: "deviceId or device is required",
  path: ["device"],
});

export const updateCaseSchema = z.object({
  deviceId: z.number().int().positive().optional(),
  customerComplaint: z.string().min(1).optional(),
  priority: z.enum(["منخفضة", "متوسطة", "مرتفعة", "عاجلة", "حالة حادثة"]).optional(),
  maintenanceTeam: z.string().optional().nullable(),
  technicianName: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  deliveryDueAt: z.string().optional().nullable(),
  waitingPartInventoryItemId: z.number().int().positive().optional().nullable(),
  waitingPartName: z.string().optional().nullable(),
  waitingPartNotes: z.string().optional().nullable(),
  waitingPartImageUrl: z.string().max(1_100_000).optional().nullable(),
  diagnosisNote: z.string().optional().nullable(),
  faultCause: z.string().optional().nullable(),
  latestMessage: z.string().optional().nullable(),
  latestMessageChannel: z.string().optional().nullable(),
  latestMessageSentAt: z.string().optional().nullable(),
  postRepairCompletedWork: z.string().optional().nullable(),
  postRepairTested: z.boolean().optional(),
  postRepairTestCount: z.number().int().min(1).optional(),
  postRepairCleaned: z.boolean().optional(),
  postRepairRecommendations: z.string().optional().nullable(),
  postRepairImages: z.string().max(3_000_000).optional().nullable(),
  postRepairDamagedPartImages: z.string().max(3_000_000).optional().nullable(),
  postRepairNote: z.string().optional().nullable(),
  notRepairableReason: z.string().optional().nullable(),
  readyNotificationMessage: z.string().optional().nullable(),
  readyNotificationChannel: z.string().optional().nullable(),
  readyNotificationSentAt: z.string().optional().nullable(),
  customerReceivedAt: z.string().optional().nullable(),
  operationFinalizedAt: z.string().optional().nullable(),
  assignedTechnicianId: z.number().int().positive().optional().nullable(),
  executionDurationDays: z.number().int().min(0).optional(),
  executionDurationHours: z.number().int().min(0).max(23).optional(),
  finalResult: z.string().optional().nullable(),
});

export const changeCaseStatusSchema = z.object({
  toStatus: z.nativeEnum(CASE_STATUSES),
  notes: z.string().optional().nullable(),
  executionDueAt: z.string().optional().nullable(),
  customerApprovalConfirmed: z.boolean().optional(),
  executionDurationDays: z.number().int().min(0).optional(),
  executionDurationHours: z.number().int().min(0).max(23).optional(),
  finalResult: z.string().optional().nullable(),
});

export const startExecutionSchema = z.object({
  customerApprovalConfirmed: z.boolean(),
  durationDays: z.number().int().min(0).default(0),
  durationHours: z.number().int().min(0).max(23).default(0),
  assignedTechnicianId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine((data) => data.durationDays > 0 || data.durationHours > 0, {
  message: "Execution duration must be greater than zero",
  path: ["durationDays"],
});

export const executionActionSchema = z.object({
  notes: z.string().optional().nullable(),
  latestMessage: z.string().optional().nullable(),
  latestMessageChannel: z.string().optional().nullable(),
});

export const repairQualitySchema = z.object({
  postRepairCompletedWork: z.string().min(1),
  postRepairTested: z.boolean().default(false),
  postRepairTestCount: z.number().int().min(1).default(1),
  postRepairCleaned: z.boolean().default(false),
  postRepairRecommendations: z.string().optional().nullable(),
  postRepairImages: z.string().max(3_000_000).optional().nullable(),
  postRepairDamagedPartImages: z.string().max(3_000_000).optional().nullable(),
  postRepairNote: z.string().optional().nullable(),
});

export const readyNotificationSchema = z.object({
  readyNotificationMessage: z.string().min(1),
  readyNotificationChannel: z.string().min(1),
});

type StatusValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateStatusTransition(fromStatus: string, toStatus: string): StatusValidationResult {
  if (fromStatus === toStatus) {
    return { valid: false, error: `Case is already in status ${toStatus}` };
  }

  const allowed = ALLOWED_TRANSITIONS[fromStatus as keyof typeof ALLOWED_TRANSITIONS] || [];
  if (!allowed.includes(toStatus as any)) {
    return { valid: false, error: `Invalid transition from ${fromStatus} to ${toStatus}` };
  }

  return { valid: true };
}

export function validateStatusSpecificRules(
  toStatus: string,
  input: { notes?: string | null; executionDueAt?: Date | null; finalResult?: string | null },
): StatusValidationResult {
  return { valid: true };
}
