import { db } from "../../db";
import { cases, caseStatusHistory } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { CaseStatus } from "./constants";
import { validateStatusTransition, validateStatusSpecificRules } from "./validation";

type CreateCaseInput = {
  customerId: number;
  deviceId: number;
  customerComplaint: string;
  initialCheckNotes?: string;
  internalNotes?: string;
  deliveryDueAt?: Date;
  assignedTechnicianId?: number;
  createdBy: number;
};

type UpdateCaseInput = {
  customerComplaint?: string;
  initialCheckNotes?: string;
  diagnosisNotes?: string;
  internalNotes?: string;
  deliveryDueAt?: Date | null;
  executionStartedAt?: Date | null;
  executionDueAt?: Date | null;
  finalResult?: string | null;
  assignedTechnicianId?: number | null;
};

type ChangeStatusInput = {
  toStatus: CaseStatus;
  notes?: string;
  changedBy: number;
};

type Case = {
  id: number;
  caseCode: string;
  customerId: number | null;
  deviceId: number | null;
  status: string;
  customerComplaint: string;
  initialCheckNotes: string | null;
  diagnosisNotes: string | null;
  internalNotes: string | null;
  deliveryDueAt: Date | null;
  executionStartedAt: Date | null;
  executionDueAt: Date | null;
  finalResult: string | null;
  isArchived: boolean;
  createdBy: number | null;
  assignedTechnicianId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const caseService = {
  async generateCaseCode(): Promise<string> {
    const lastCase = await db
      .select({ id: cases.id })
      .from(cases)
      .orderBy(desc(cases.id))
      .limit(1);

    const nextId = lastCase.length > 0 ? lastCase[0].id + 1 : 1;
    return `C${nextId.toString().padStart(3, "0")}`;
  },

  async createCase(input: CreateCaseInput): Promise<Case> {
    const caseCode = await this.generateCaseCode();

    const createdCases = await db
      .insert(cases)
      .values({
        caseCode,
        customerId: input.customerId,
        deviceId: input.deviceId,
        customerComplaint: input.customerComplaint,
        initialCheckNotes: input.initialCheckNotes,
        internalNotes: input.internalNotes,
        deliveryDueAt: input.deliveryDueAt,
        assignedTechnicianId: input.assignedTechnicianId,
        createdBy: input.createdBy,
      })
      .returning({
        id: cases.id,
        caseCode: cases.caseCode,
        customerId: cases.customerId,
        deviceId: cases.deviceId,
        status: cases.status,
        customerComplaint: cases.customerComplaint,
        initialCheckNotes: cases.initialCheckNotes,
        diagnosisNotes: cases.diagnosisNotes,
        internalNotes: cases.internalNotes,
        deliveryDueAt: cases.deliveryDueAt,
        executionStartedAt: cases.executionStartedAt,
        executionDueAt: cases.executionDueAt,
        finalResult: cases.finalResult,
        isArchived: cases.isArchived,
        createdBy: cases.createdBy,
        assignedTechnicianId: cases.assignedTechnicianId,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
      });

    return createdCases[0];
  },

  async getCases(): Promise<Case[]> {
    return await db.select().from(cases);
  },

  async getCaseById(id: number): Promise<Case | undefined> {
    const foundCases = await db
      .select()
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);

    return foundCases[0];
  },

  async updateCase(id: number, input: UpdateCaseInput): Promise<Case | undefined> {
    const updateData: Partial<UpdateCaseInput & { updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (input.customerComplaint !== undefined) updateData.customerComplaint = input.customerComplaint;
    if (input.initialCheckNotes !== undefined) updateData.initialCheckNotes = input.initialCheckNotes;
    if (input.diagnosisNotes !== undefined) updateData.diagnosisNotes = input.diagnosisNotes;
    if (input.internalNotes !== undefined) updateData.internalNotes = input.internalNotes;
    if (input.deliveryDueAt !== undefined) updateData.deliveryDueAt = input.deliveryDueAt;
    if (input.executionStartedAt !== undefined) updateData.executionStartedAt = input.executionStartedAt;
    if (input.executionDueAt !== undefined) updateData.executionDueAt = input.executionDueAt;
    if (input.finalResult !== undefined) updateData.finalResult = input.finalResult;
    if (input.assignedTechnicianId !== undefined) updateData.assignedTechnicianId = input.assignedTechnicianId;

    const updatedCases = await db
      .update(cases)
      .set(updateData)
      .where(eq(cases.id, id))
      .returning({
        id: cases.id,
        caseCode: cases.caseCode,
        customerId: cases.customerId,
        deviceId: cases.deviceId,
        status: cases.status,
        customerComplaint: cases.customerComplaint,
        initialCheckNotes: cases.initialCheckNotes,
        diagnosisNotes: cases.diagnosisNotes,
        internalNotes: cases.internalNotes,
        deliveryDueAt: cases.deliveryDueAt,
        executionStartedAt: cases.executionStartedAt,
        executionDueAt: cases.executionDueAt,
        finalResult: cases.finalResult,
        isArchived: cases.isArchived,
        createdBy: cases.createdBy,
        assignedTechnicianId: cases.assignedTechnicianId,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
      });

    return updatedCases[0];
  },

  async changeStatus(id: number, input: ChangeStatusInput): Promise<{ case: Case; history: any } | undefined> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    // Validate transition
    const transitionValidation = validateStatusTransition(existingCase.status as CaseStatus, input.toStatus);
    if (!transitionValidation.valid) {
      throw new Error(transitionValidation.error);
    }

    // Validate status-specific rules
    const ruleValidation = validateStatusSpecificRules(input.toStatus, existingCase);
    if (!ruleValidation.valid) {
      throw new Error(ruleValidation.error);
    }

    // Update case status
    const updatedCases = await db
      .update(cases)
      .set({
        status: input.toStatus,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, id))
      .returning({
        id: cases.id,
        caseCode: cases.caseCode,
        customerId: cases.customerId,
        deviceId: cases.deviceId,
        status: cases.status,
        customerComplaint: cases.customerComplaint,
        initialCheckNotes: cases.initialCheckNotes,
        diagnosisNotes: cases.diagnosisNotes,
        internalNotes: cases.internalNotes,
        deliveryDueAt: cases.deliveryDueAt,
        executionStartedAt: cases.executionStartedAt,
        executionDueAt: cases.executionDueAt,
        finalResult: cases.finalResult,
        isArchived: cases.isArchived,
        createdBy: cases.createdBy,
        assignedTechnicianId: cases.assignedTechnicianId,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
      });

    const updatedCase = updatedCases[0];

    // Insert history record
    const historyRecords = await db
      .insert(caseStatusHistory)
      .values({
        caseId: id,
        fromStatus: existingCase.status,
        toStatus: input.toStatus,
        changedBy: input.changedBy,
        notes: input.notes,
      })
      .returning({
        id: caseStatusHistory.id,
        caseId: caseStatusHistory.caseId,
        fromStatus: caseStatusHistory.fromStatus,
        toStatus: caseStatusHistory.toStatus,
        changedBy: caseStatusHistory.changedBy,
        notes: caseStatusHistory.notes,
        createdAt: caseStatusHistory.createdAt,
      });

    return { case: updatedCase, history: historyRecords[0] };
  },
};