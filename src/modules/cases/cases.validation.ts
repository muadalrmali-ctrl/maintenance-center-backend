import { z } from "zod";
import { ALLOWED_TRANSITIONS, CASE_STATUSES } from "./constants";

export const createCaseSchema = z.object({
  customerId: z.number().int().positive(),
  deviceId: z.number().int().positive(),
  customerComplaint: z.string().min(1),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
  deliveryDueAt: z.string().optional(),
  assignedTechnicianId: z.number().int().positive().optional(),
});

export const updateCaseSchema = z.object({
  deviceId: z.number().int().positive().optional(),
  customerComplaint: z.string().min(1).optional(),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  deliveryDueAt: z.string().optional().nullable(),
  assignedTechnicianId: z.number().int().positive().optional().nullable(),
  finalResult: z.string().optional().nullable(),
});

export const changeCaseStatusSchema = z.object({
  toStatus: z.nativeEnum(CASE_STATUSES),
  notes: z.string().optional().nullable(),
  executionDueAt: z.string().optional().nullable(),
  finalResult: z.string().optional().nullable(),
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
  if (toStatus === CASE_STATUSES.IN_PROGRESS) {
    if (!input.executionDueAt) {
      return { valid: false, error: "executionDueAt is required when moving to in_progress" };
    }
  }

  if (toStatus === CASE_STATUSES.NOT_REPAIRABLE) {
    if (!input.notes && !input.finalResult) {
      return {
        valid: false,
        error: "notes or finalResult is required when moving to not_repairable",
      };
    }
  }

  return { valid: true };
}