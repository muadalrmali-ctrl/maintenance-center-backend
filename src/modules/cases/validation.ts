import { CaseStatus, ALLOWED_TRANSITIONS, CASE_STATUSES } from "./constants";

export const validateStatusTransition = (
  fromStatus: CaseStatus | null,
  toStatus: CaseStatus
): { valid: boolean; error?: string } => {
  if (!fromStatus) {
    // New case, only allow received
    if (toStatus === CASE_STATUSES.RECEIVED) {
      return { valid: true };
    }
    return { valid: false, error: "New cases must start with 'received' status" };
  }

  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed.includes(toStatus)) {
    return { valid: false, error: `Cannot transition from '${fromStatus}' to '${toStatus}'` };
  }

  // Critical rule: after in_progress, cannot go back to diagnosing or received
  if (fromStatus === CASE_STATUSES.IN_PROGRESS) {
    if (toStatus === CASE_STATUSES.DIAGNOSING || toStatus === CASE_STATUSES.RECEIVED) {
      return { valid: false, error: "Cannot return to diagnosing or received after in_progress" };
    }
  }

  return { valid: true };
};

export const validateStatusSpecificRules = (
  toStatus: CaseStatus,
  caseData: any
): { valid: boolean; error?: string } => {
  if (toStatus === CASE_STATUSES.IN_PROGRESS) {
    if (!caseData.executionDueAt) {
      return { valid: false, error: "executionDueAt is required when moving to in_progress" };
    }
  }

  if (toStatus === CASE_STATUSES.NOT_REPAIRABLE) {
    if (!caseData.finalResult && !caseData.internalNotes) {
      return { valid: false, error: "finalResult or internalNotes is required when moving to not_repairable" };
    }
  }

  return { valid: true };
};