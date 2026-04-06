import { db } from "../../db";
import { cases, caseStatusHistory, customers, devices } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { CaseStatus, CASE_STATUSES } from "./constants";
import { validateStatusTransition, validateStatusSpecificRules } from "./cases.validation";

type CreateCaseInput = {
  customerId: number;
  deviceId: number;
  customerComplaint: string;
  serialNumber?: string;
  notes?: string;
  deliveryDueAt?: Date;
  assignedTechnicianId?: number;
  createdBy: number;
};

type UpdateCaseInput = {
  deviceId?: number;
  customerComplaint?: string;
  serialNumber?: string | null;
  notes?: string | null;
  deliveryDueAt?: Date | null;
  assignedTechnicianId?: number | null;
  finalResult?: string | null;
};

type ChangeStatusInput = {
  toStatus: CaseStatus;
  notes?: string | null;
  executionDueAt?: Date | null;
  finalResult?: string | null;
  changedBy: number;
};

type CaseRow = {
  id: number;
  caseCode: string;
  customerId: number;
  deviceId: number;
  status: string;
  customerComplaint: string;
  serialNumber: string | null;
  notes: string | null;
  deliveryDueAt: Date | null;
  executionStartedAt: Date | null;
  executionDueAt: Date | null;
  finalResult: string | null;
  isArchived: boolean;
  createdBy: number;
  assignedTechnicianId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type CaseHistoryRow = {
  id: number;
  caseId: number | null;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  notes: string | null;
  createdAt: Date | null;
};

type CaseDetails = {
  caseData: CaseRow;
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string | null;
  } | null;
  device: {
    id: number;
    applianceType: string;
    brand: string;
    modelName: string;
    modelCode: string | null;
    notes: string | null;
  } | null;
  history: CaseHistoryRow[];
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

  async createCase(input: CreateCaseInput): Promise<CaseRow> {
    return await db.transaction(async (tx) => {
      const caseCode = await this.generateCaseCode();

      const createdCases = await tx
        .insert(cases)
        .values({
          caseCode,
          customerId: input.customerId,
          deviceId: input.deviceId,
          customerComplaint: input.customerComplaint,
          serialNumber: input.serialNumber,
          notes: input.notes,
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
          serialNumber: cases.serialNumber,
          notes: cases.notes,
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

      const createdCase = createdCases[0];

      await tx.insert(caseStatusHistory).values({
        caseId: createdCase.id,
        fromStatus: null,
        toStatus: CASE_STATUSES.RECEIVED,
        changedBy: input.createdBy,
        notes: "Case created",
      });

      return createdCase;
    });
  },

  async getCases(): Promise<any[]> {
    return await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        customerId: cases.customerId,
        deviceId: cases.deviceId,
        status: cases.status,
        customerComplaint: cases.customerComplaint,
        serialNumber: cases.serialNumber,
        notes: cases.notes,
        deliveryDueAt: cases.deliveryDueAt,
        executionStartedAt: cases.executionStartedAt,
        executionDueAt: cases.executionDueAt,
        finalResult: cases.finalResult,
        isArchived: cases.isArchived,
        createdBy: cases.createdBy,
        assignedTechnicianId: cases.assignedTechnicianId,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        deviceApplianceType: devices.applianceType,
        deviceBrand: devices.brand,
        deviceModelName: devices.modelName,
        deviceModelCode: devices.modelCode,
        deviceNotes: devices.notes,
      })
      .from(cases)
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .orderBy(desc(cases.createdAt));
  },

  async getCaseById(id: number): Promise<CaseDetails | undefined> {
    const foundCases = await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        customerId: cases.customerId,
        deviceId: cases.deviceId,
        status: cases.status,
        customerComplaint: cases.customerComplaint,
        serialNumber: cases.serialNumber,
        notes: cases.notes,
        deliveryDueAt: cases.deliveryDueAt,
        executionStartedAt: cases.executionStartedAt,
        executionDueAt: cases.executionDueAt,
        finalResult: cases.finalResult,
        isArchived: cases.isArchived,
        createdBy: cases.createdBy,
        assignedTechnicianId: cases.assignedTechnicianId,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
      })
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);

    const caseData = foundCases[0];
    if (!caseData) {
      return undefined;
    }

    const customerResult = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
      })
      .from(customers)
      .where(eq(customers.id, caseData.customerId))
      .limit(1);

    const deviceResult = await db
      .select({
        id: devices.id,
        applianceType: devices.applianceType,
        brand: devices.brand,
        modelName: devices.modelName,
        modelCode: devices.modelCode,
        notes: devices.notes,
      })
      .from(devices)
      .where(eq(devices.id, caseData.deviceId))
      .limit(1);

    const history = await db
      .select()
      .from(caseStatusHistory)
      .where(eq(caseStatusHistory.caseId, id))
      .orderBy(caseStatusHistory.createdAt);

    return {
      caseData,
      customer: customerResult[0] || null,
      device: deviceResult[0] || null,
      history,
    };
  },

  async updateCase(id: number, input: UpdateCaseInput): Promise<CaseRow | undefined> {
    const updateData: Partial<UpdateCaseInput & { updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (input.deviceId !== undefined) updateData.deviceId = input.deviceId;
    if (input.customerComplaint !== undefined) updateData.customerComplaint = input.customerComplaint;
    if (input.serialNumber !== undefined) updateData.serialNumber = input.serialNumber;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.deliveryDueAt !== undefined) updateData.deliveryDueAt = input.deliveryDueAt;
    if (input.assignedTechnicianId !== undefined) updateData.assignedTechnicianId = input.assignedTechnicianId;
    if (input.finalResult !== undefined) updateData.finalResult = input.finalResult;

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
        serialNumber: cases.serialNumber,
        notes: cases.notes,
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

  async changeStatus(id: number, input: ChangeStatusInput): Promise<{ case: CaseRow; history: CaseHistoryRow } | undefined> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    const transitionValidation = validateStatusTransition(existingCase.caseData.status as CaseStatus, input.toStatus);
    if (!transitionValidation.valid) {
      throw new Error(transitionValidation.error);
    }

    const ruleValidation = validateStatusSpecificRules(input.toStatus, {
      notes: input.notes,
      executionDueAt: input.toStatus === CASE_STATUSES.IN_PROGRESS ? input.executionDueAt : null,
      finalResult: input.finalResult,
    });
    if (!ruleValidation.valid) {
      throw new Error(ruleValidation.error);
    }

    return await db.transaction(async (tx) => {
      const updateData: any = {
        status: input.toStatus,
        updatedAt: new Date(),
      };

      if (input.toStatus === CASE_STATUSES.IN_PROGRESS) {
        updateData.executionStartedAt = new Date();
        updateData.executionDueAt = input.executionDueAt;
      }

      if (input.toStatus === CASE_STATUSES.ARCHIVED) {
        updateData.isArchived = true;
      }

      if (input.finalResult !== undefined) {
        updateData.finalResult = input.finalResult;
      }

      const updatedCases = await tx
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
          serialNumber: cases.serialNumber,
          notes: cases.notes,
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

      const historyRecords = await tx
        .insert(caseStatusHistory)
        .values({
          caseId: id,
          fromStatus: existingCase.caseData.status,
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
    });
  },
};