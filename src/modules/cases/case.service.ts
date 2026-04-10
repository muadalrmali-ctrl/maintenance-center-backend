import { db } from "../../db";
import { cases, caseStatusHistory, customers, devices, inventoryItems, users } from "../../db/schema";
import { eq, desc, sql, or, isNotNull, isNull, and, notInArray } from "drizzle-orm";
import { CaseStatus, CASE_STATUSES } from "./constants";
import { validateStatusTransition, validateStatusSpecificRules } from "./cases.validation";
import { notificationsService } from "../notifications/notifications.service";
import { buildCaseReadyMessage } from "../notifications/notifications.templates";

type CreateCaseInput = {
  customerId?: number;
  customer?: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  };
  deviceId?: number;
  device?: {
    applianceType: string;
    brand?: string;
    modelName: string;
    modelCode?: string;
    notes?: string;
  };
  customerComplaint: string;
  priority?: string;
  maintenanceTeam?: string;
  technicianName?: string;
  serialNumber?: string;
  notes?: string;
  deliveryDueAt?: Date;
  assignedTechnicianId?: number;
  createdBy: number;
};

type UpdateCaseInput = {
  deviceId?: number;
  customerComplaint?: string;
  priority?: string;
  maintenanceTeam?: string | null;
  technicianName?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  deliveryDueAt?: Date | null;
  waitingPartInventoryItemId?: number | null;
  waitingPartName?: string | null;
  waitingPartNotes?: string | null;
  waitingPartImageUrl?: string | null;
  diagnosisNote?: string | null;
  faultCause?: string | null;
  latestMessage?: string | null;
  latestMessageChannel?: string | null;
  latestMessageSentAt?: Date | null;
  postRepairCompletedWork?: string | null;
  postRepairTested?: boolean;
  postRepairTestCount?: number;
  postRepairCleaned?: boolean;
  postRepairRecommendations?: string | null;
  postRepairImages?: string | null;
  postRepairDamagedPartImages?: string | null;
  postRepairNote?: string | null;
  notRepairableReason?: string | null;
  readyNotificationMessage?: string | null;
  readyNotificationChannel?: string | null;
  readyNotificationSentAt?: Date | null;
  customerReceivedAt?: Date | null;
  operationFinalizedAt?: Date | null;
  assignedTechnicianId?: number | null;
  executionDurationDays?: number;
  executionDurationHours?: number;
  finalResult?: string | null;
};

type ChangeStatusInput = {
  toStatus: CaseStatus;
  notes?: string | null;
  executionDueAt?: Date | null;
  customerApprovalConfirmed?: boolean;
  executionDurationDays?: number;
  executionDurationHours?: number;
  finalResult?: string | null;
  changedBy: number;
};

type StartExecutionInput = {
  customerApprovalConfirmed: boolean;
  durationDays: number;
  durationHours: number;
  assignedTechnicianId?: number | null;
  notes?: string | null;
  changedBy: number;
};

type ExecutionActionInput = {
  notes?: string | null;
  latestMessage?: string | null;
  latestMessageChannel?: string | null;
  changedBy: number;
};

type RepairQualityInput = {
  postRepairCompletedWork: string;
  postRepairTested: boolean;
  postRepairTestCount: number;
  postRepairCleaned: boolean;
  postRepairRecommendations?: string | null;
  postRepairImages?: string | null;
  postRepairDamagedPartImages?: string | null;
  postRepairNote?: string | null;
};

type FinalizeOperationInput = Partial<RepairQualityInput> & {
  notRepairableReason?: string | null;
  finalResult?: string | null;
};

type ReadyNotificationInput = {
  readyNotificationMessage: string;
  readyNotificationChannel: string;
  mediaUrls?: string[];
};

type CaseRow = {
  id: number;
  caseCode: string;
  customerId: number;
  deviceId: number;
  status: string;
  customerComplaint: string;
  priority: string;
  maintenanceTeam: string | null;
  technicianName: string | null;
  serialNumber: string | null;
  notes: string | null;
  deliveryDueAt: Date | null;
  executionStartedAt: Date | null;
  executionDueAt: Date | null;
  executionDurationDays: number;
  executionDurationHours: number;
  executionTimerStartedAt: Date | null;
  executionTimerPausedAt: Date | null;
  executionTotalPausedSeconds: number;
  executionCompletedAt: Date | null;
  waitingPartInventoryItemId: number | null;
  waitingPartName: string | null;
  waitingPartNotes: string | null;
  waitingPartImageUrl: string | null;
  diagnosisNote: string | null;
  faultCause: string | null;
  latestMessage: string | null;
  latestMessageChannel: string | null;
  latestMessageSentAt: Date | null;
  postRepairCompletedWork: string | null;
  postRepairTested: boolean;
  postRepairTestCount: number;
  postRepairCleaned: boolean;
  postRepairRecommendations: string | null;
  postRepairImages: string | null;
  postRepairDamagedPartImages: string | null;
  postRepairNote: string | null;
  notRepairableReason: string | null;
  readyNotificationMessage: string | null;
  readyNotificationChannel: string | null;
  readyNotificationSentAt: Date | null;
  customerReceivedAt: Date | null;
  operationFinalizedAt: Date | null;
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
  waitingPartInventoryItem: {
    id: number;
    name: string;
    code: string;
    imageUrl: string | null;
    sellingPrice: string | null;
  } | null;
  createdByUser: {
    id: number;
    name: string;
    email: string;
  } | null;
  assignedTechnician: {
    id: number;
    name: string;
    email: string;
  } | null;
};

const returnCaseFields = {
  id: cases.id,
  caseCode: cases.caseCode,
  customerId: cases.customerId,
  deviceId: cases.deviceId,
  status: cases.status,
  customerComplaint: cases.customerComplaint,
  priority: cases.priority,
  maintenanceTeam: cases.maintenanceTeam,
  technicianName: cases.technicianName,
  serialNumber: cases.serialNumber,
  notes: cases.notes,
  deliveryDueAt: cases.deliveryDueAt,
  executionStartedAt: cases.executionStartedAt,
  executionDueAt: cases.executionDueAt,
  executionDurationDays: cases.executionDurationDays,
  executionDurationHours: cases.executionDurationHours,
  executionTimerStartedAt: cases.executionTimerStartedAt,
  executionTimerPausedAt: cases.executionTimerPausedAt,
  executionTotalPausedSeconds: cases.executionTotalPausedSeconds,
  executionCompletedAt: cases.executionCompletedAt,
  waitingPartInventoryItemId: cases.waitingPartInventoryItemId,
  waitingPartName: cases.waitingPartName,
  waitingPartNotes: cases.waitingPartNotes,
  waitingPartImageUrl: cases.waitingPartImageUrl,
  diagnosisNote: cases.diagnosisNote,
  faultCause: cases.faultCause,
  latestMessage: cases.latestMessage,
  latestMessageChannel: cases.latestMessageChannel,
  latestMessageSentAt: cases.latestMessageSentAt,
  postRepairCompletedWork: cases.postRepairCompletedWork,
  postRepairTested: cases.postRepairTested,
  postRepairTestCount: cases.postRepairTestCount,
  postRepairCleaned: cases.postRepairCleaned,
  postRepairRecommendations: cases.postRepairRecommendations,
  postRepairImages: cases.postRepairImages,
  postRepairDamagedPartImages: cases.postRepairDamagedPartImages,
  postRepairNote: cases.postRepairNote,
  notRepairableReason: cases.notRepairableReason,
  readyNotificationMessage: cases.readyNotificationMessage,
  readyNotificationChannel: cases.readyNotificationChannel,
  readyNotificationSentAt: cases.readyNotificationSentAt,
  customerReceivedAt: cases.customerReceivedAt,
  operationFinalizedAt: cases.operationFinalizedAt,
  finalResult: cases.finalResult,
  isArchived: cases.isArchived,
  createdBy: cases.createdBy,
  assignedTechnicianId: cases.assignedTechnicianId,
  createdAt: cases.createdAt,
  updatedAt: cases.updatedAt,
};

const secondsBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));

const buildExecutionDueAt = (startedAt: Date, days: number, hours: number) => {
  const dueAt = new Date(startedAt);
  dueAt.setDate(dueAt.getDate() + days);
  dueAt.setHours(dueAt.getHours() + hours);
  return dueAt;
};

export const caseService = {
  async generateCaseCode(tx: any = db): Promise<string> {
    const lastCase = await tx
      .select({ caseCode: cases.caseCode })
      .from(cases)
      .where(sql`${cases.caseCode} ~ '^C[0-9]+$'`)
      .orderBy(desc(sql`CAST(SUBSTRING(${cases.caseCode} FROM 2) AS integer)`))
      .limit(1);

    const lastNumber = lastCase[0]?.caseCode
      ? Number(lastCase[0].caseCode.replace(/^C/, ""))
      : 99;
    const nextNumber = Math.max(lastNumber + 1, 100);

    return `C${nextNumber}`;
  },

  async createCase(input: CreateCaseInput): Promise<CaseRow> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE "cases" IN EXCLUSIVE MODE`);

      const caseCode = await this.generateCaseCode(tx);
      let customerId = input.customerId;
      let deviceId = input.deviceId;

      if (!customerId && input.customer) {
        const createdCustomers = await tx
          .insert(customers)
          .values({
            name: input.customer.name,
            phone: input.customer.phone,
            address: input.customer.address,
            notes: input.customer.notes,
            createdBy: input.createdBy,
          })
          .returning({ id: customers.id });

        customerId = createdCustomers[0].id;
      }

      if (!deviceId && input.device) {
        const createdDevices = await tx
          .insert(devices)
          .values({
            applianceType: input.device.applianceType,
            brand: input.device.brand || "غير محدد",
            modelName: input.device.modelName,
            modelCode: input.device.modelCode,
            notes: input.device.notes,
            createdBy: input.createdBy,
          })
          .returning({ id: devices.id });

        deviceId = createdDevices[0].id;
      }

      if (!customerId || !deviceId) {
        throw new Error("Customer and device data are required");
      }

      const createdCases = await tx
        .insert(cases)
        .values({
          caseCode,
          customerId,
          deviceId,
          customerComplaint: input.customerComplaint,
          priority: input.priority || "متوسطة",
          maintenanceTeam: input.maintenanceTeam,
          technicianName: input.technicianName,
          serialNumber: input.serialNumber,
          notes: input.notes,
          deliveryDueAt: input.deliveryDueAt,
          assignedTechnicianId: input.assignedTechnicianId,
          createdBy: input.createdBy,
        })
        .returning(returnCaseFields);

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
        priority: cases.priority,
        maintenanceTeam: cases.maintenanceTeam,
        technicianName: cases.technicianName,
        serialNumber: cases.serialNumber,
        notes: cases.notes,
        deliveryDueAt: cases.deliveryDueAt,
        executionStartedAt: cases.executionStartedAt,
        executionDueAt: cases.executionDueAt,
        executionDurationDays: cases.executionDurationDays,
        executionDurationHours: cases.executionDurationHours,
        executionTimerStartedAt: cases.executionTimerStartedAt,
        executionTimerPausedAt: cases.executionTimerPausedAt,
        executionTotalPausedSeconds: cases.executionTotalPausedSeconds,
        executionCompletedAt: cases.executionCompletedAt,
        waitingPartInventoryItemId: cases.waitingPartInventoryItemId,
        waitingPartName: cases.waitingPartName,
        waitingPartNotes: cases.waitingPartNotes,
        waitingPartImageUrl: cases.waitingPartImageUrl,
        diagnosisNote: cases.diagnosisNote,
        faultCause: cases.faultCause,
        latestMessage: cases.latestMessage,
        latestMessageChannel: cases.latestMessageChannel,
        latestMessageSentAt: cases.latestMessageSentAt,
        postRepairCompletedWork: cases.postRepairCompletedWork,
        postRepairTested: cases.postRepairTested,
        postRepairTestCount: cases.postRepairTestCount,
        postRepairCleaned: cases.postRepairCleaned,
        postRepairRecommendations: cases.postRepairRecommendations,
        postRepairImages: cases.postRepairImages,
        postRepairDamagedPartImages: cases.postRepairDamagedPartImages,
        postRepairNote: cases.postRepairNote,
        notRepairableReason: cases.notRepairableReason,
        readyNotificationMessage: cases.readyNotificationMessage,
        readyNotificationChannel: cases.readyNotificationChannel,
        readyNotificationSentAt: cases.readyNotificationSentAt,
        customerReceivedAt: cases.customerReceivedAt,
        operationFinalizedAt: cases.operationFinalizedAt,
        finalResult: cases.finalResult,
        isArchived: cases.isArchived,
        createdBy: cases.createdBy,
        assignedTechnicianId: cases.assignedTechnicianId,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        deviceApplianceType: devices.applianceType,
        deviceBrand: devices.brand,
        deviceModelName: devices.modelName,
        deviceModelCode: devices.modelCode,
        deviceNotes: devices.notes,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .where(and(
        isNull(cases.operationFinalizedAt),
        notInArray(cases.status, [CASE_STATUSES.COMPLETED, CASE_STATUSES.DELIVERED, CASE_STATUSES.ARCHIVED])
      ))
      .orderBy(desc(cases.createdAt));
  },

  async getCaseById(id: number): Promise<CaseDetails | undefined> {
    const foundCases = await db
      .select(returnCaseFields)
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

    const waitingPartInventoryItem = caseData.waitingPartInventoryItemId
      ? (
          await db
            .select({
              id: inventoryItems.id,
              name: inventoryItems.name,
              code: inventoryItems.code,
              imageUrl: inventoryItems.imageUrl,
              sellingPrice: inventoryItems.sellingPrice,
            })
            .from(inventoryItems)
            .where(eq(inventoryItems.id, caseData.waitingPartInventoryItemId))
            .limit(1)
        )[0] || null
      : null;

    const createdByUser =
      (
        await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, caseData.createdBy))
          .limit(1)
      )[0] || null;

    const assignedTechnician = caseData.assignedTechnicianId
      ? (
          await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, caseData.assignedTechnicianId))
            .limit(1)
        )[0] || null
      : null;

    return {
      caseData,
      customer: customerResult[0] || null,
      device: deviceResult[0] || null,
      history,
      waitingPartInventoryItem,
      createdByUser,
      assignedTechnician,
    };
  },

  async updateCase(id: number, input: UpdateCaseInput): Promise<CaseRow | undefined> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      return undefined;
    }

    if (
      existingCase.caseData.executionTimerStartedAt &&
      (input.executionDurationDays !== undefined || input.executionDurationHours !== undefined)
    ) {
      throw new Error("Execution duration is locked after execution starts");
    }

    const updateData: Partial<UpdateCaseInput & { updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (input.deviceId !== undefined) updateData.deviceId = input.deviceId;
    if (input.customerComplaint !== undefined) updateData.customerComplaint = input.customerComplaint;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.maintenanceTeam !== undefined) updateData.maintenanceTeam = input.maintenanceTeam;
    if (input.technicianName !== undefined) updateData.technicianName = input.technicianName;
    if (input.serialNumber !== undefined) updateData.serialNumber = input.serialNumber;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.deliveryDueAt !== undefined) updateData.deliveryDueAt = input.deliveryDueAt;
    if (input.waitingPartInventoryItemId !== undefined) updateData.waitingPartInventoryItemId = input.waitingPartInventoryItemId;
    if (input.waitingPartName !== undefined) updateData.waitingPartName = input.waitingPartName;
    if (input.waitingPartNotes !== undefined) updateData.waitingPartNotes = input.waitingPartNotes;
    if (input.waitingPartImageUrl !== undefined) updateData.waitingPartImageUrl = input.waitingPartImageUrl;
    if (input.diagnosisNote !== undefined) updateData.diagnosisNote = input.diagnosisNote;
    if (input.faultCause !== undefined) updateData.faultCause = input.faultCause;
    if (input.latestMessage !== undefined) updateData.latestMessage = input.latestMessage;
    if (input.latestMessageChannel !== undefined) updateData.latestMessageChannel = input.latestMessageChannel;
    if (input.latestMessageSentAt !== undefined) updateData.latestMessageSentAt = input.latestMessageSentAt;
    if (input.postRepairCompletedWork !== undefined) updateData.postRepairCompletedWork = input.postRepairCompletedWork;
    if (input.postRepairTested !== undefined) updateData.postRepairTested = input.postRepairTested;
    if (input.postRepairTestCount !== undefined) updateData.postRepairTestCount = input.postRepairTestCount;
    if (input.postRepairCleaned !== undefined) updateData.postRepairCleaned = input.postRepairCleaned;
    if (input.postRepairRecommendations !== undefined) updateData.postRepairRecommendations = input.postRepairRecommendations;
    if (input.postRepairImages !== undefined) updateData.postRepairImages = input.postRepairImages;
    if (input.postRepairDamagedPartImages !== undefined) updateData.postRepairDamagedPartImages = input.postRepairDamagedPartImages;
    if (input.postRepairNote !== undefined) updateData.postRepairNote = input.postRepairNote;
    if (input.notRepairableReason !== undefined) updateData.notRepairableReason = input.notRepairableReason;
    if (input.readyNotificationMessage !== undefined) updateData.readyNotificationMessage = input.readyNotificationMessage;
    if (input.readyNotificationChannel !== undefined) updateData.readyNotificationChannel = input.readyNotificationChannel;
    if (input.readyNotificationSentAt !== undefined) updateData.readyNotificationSentAt = input.readyNotificationSentAt;
    if (input.customerReceivedAt !== undefined) updateData.customerReceivedAt = input.customerReceivedAt;
    if (input.operationFinalizedAt !== undefined) updateData.operationFinalizedAt = input.operationFinalizedAt;
    if (input.assignedTechnicianId !== undefined) updateData.assignedTechnicianId = input.assignedTechnicianId;
    if (input.executionDurationDays !== undefined) updateData.executionDurationDays = input.executionDurationDays;
    if (input.executionDurationHours !== undefined) updateData.executionDurationHours = input.executionDurationHours;
    if (input.finalResult !== undefined) updateData.finalResult = input.finalResult;

    const updatedCases = await db
      .update(cases)
      .set(updateData)
      .where(eq(cases.id, id))
      .returning(returnCaseFields);

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

    if (input.toStatus === CASE_STATUSES.IN_PROGRESS) {
      const durationDays = input.executionDurationDays ?? 0;
      const durationHours = input.executionDurationHours ?? 0;

      if (!input.customerApprovalConfirmed) {
        throw new Error("Customer approval is required before starting execution");
      }

      if (durationDays <= 0 && durationHours <= 0) {
        throw new Error("Execution duration is required before starting execution");
      }
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
        const startedAt = new Date();
        updateData.executionStartedAt = startedAt;
        updateData.executionDueAt =
          input.executionDueAt ||
          buildExecutionDueAt(startedAt, input.executionDurationDays ?? 0, input.executionDurationHours ?? 0);
        updateData.executionDurationDays = input.executionDurationDays ?? 0;
        updateData.executionDurationHours = input.executionDurationHours ?? 0;
        updateData.executionTimerStartedAt = startedAt;
        updateData.executionTimerPausedAt = null;
        updateData.executionTotalPausedSeconds = 0;
        updateData.executionCompletedAt = null;
      }

      if (input.toStatus === CASE_STATUSES.ARCHIVED) {
        updateData.isArchived = true;
      }

      if (input.finalResult !== undefined) {
        updateData.finalResult = input.finalResult;
      }

      if (input.toStatus === CASE_STATUSES.NOT_REPAIRABLE) {
        updateData.notRepairableReason = input.finalResult || input.notes;
        updateData.finalResult = input.finalResult || input.notes;
      }

      const updatedCases = await tx
        .update(cases)
        .set(updateData)
        .where(eq(cases.id, id))
        .returning(returnCaseFields);

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

  async startExecution(id: number, input: StartExecutionInput): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    const transitionValidation = validateStatusTransition(
      existingCase.caseData.status as CaseStatus,
      CASE_STATUSES.IN_PROGRESS
    );
    if (!transitionValidation.valid) {
      throw new Error(transitionValidation.error);
    }

    if (!input.customerApprovalConfirmed) {
      throw new Error("Customer approval is required before starting execution");
    }

    if (input.durationDays <= 0 && input.durationHours <= 0) {
      throw new Error("Execution duration is required before starting execution");
    }

    const startedAt = new Date();
    const dueAt = buildExecutionDueAt(startedAt, input.durationDays, input.durationHours);

    return await db.transaction(async (tx) => {
      const updateData: any = {
        status: CASE_STATUSES.IN_PROGRESS,
        executionStartedAt: startedAt,
        executionDueAt: dueAt,
        executionDurationDays: input.durationDays,
        executionDurationHours: input.durationHours,
        executionTimerStartedAt: startedAt,
        executionTimerPausedAt: null,
        executionTotalPausedSeconds: 0,
        executionCompletedAt: null,
        updatedAt: startedAt,
      };

      if (input.assignedTechnicianId !== undefined) {
        updateData.assignedTechnicianId = input.assignedTechnicianId;
      }

      const updatedCases = await tx
        .update(cases)
        .set(updateData)
        .where(eq(cases.id, id))
        .returning(returnCaseFields);

      await tx.insert(caseStatusHistory).values({
        caseId: id,
        fromStatus: existingCase.caseData.status,
        toStatus: CASE_STATUSES.IN_PROGRESS,
        changedBy: input.changedBy,
        notes: input.notes || "Execution started after customer approval",
      });

      return updatedCases[0];
    });
  },

  async pauseExecution(id: number, input: ExecutionActionInput): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    if (existingCase.caseData.status !== CASE_STATUSES.IN_PROGRESS) {
      throw new Error("Execution can only be paused while the case is in progress");
    }

    if (existingCase.caseData.executionTimerPausedAt) {
      return existingCase.caseData;
    }

    const pausedAt = new Date();
    const updateData: any = {
      executionTimerPausedAt: pausedAt,
      updatedAt: pausedAt,
    };

    if (input.latestMessage !== undefined) {
      updateData.latestMessage = input.latestMessage;
      updateData.latestMessageChannel = input.latestMessageChannel;
      updateData.latestMessageSentAt = pausedAt;
    }
    const updatedCases = await db
      .update(cases)
      .set(updateData)
      .where(eq(cases.id, id))
      .returning(returnCaseFields);

    await db.insert(caseStatusHistory).values({
      caseId: id,
      fromStatus: CASE_STATUSES.IN_PROGRESS,
      toStatus: CASE_STATUSES.IN_PROGRESS,
      changedBy: input.changedBy,
      notes: input.notes || "Execution paused while waiting for renewed customer approval",
    });

    return updatedCases[0];
  },

  async resumeExecution(id: number, input: ExecutionActionInput): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    if (existingCase.caseData.status !== CASE_STATUSES.IN_PROGRESS) {
      throw new Error("Execution can only be resumed while the case is in progress");
    }

    const pausedAt = existingCase.caseData.executionTimerPausedAt;
    if (!pausedAt) {
      return existingCase.caseData;
    }

    const resumedAt = new Date();
    const totalPausedSeconds =
      existingCase.caseData.executionTotalPausedSeconds +
      secondsBetween(pausedAt, resumedAt);

    const updatedCases = await db
      .update(cases)
      .set({
        executionTimerPausedAt: null,
        executionTotalPausedSeconds: totalPausedSeconds,
        updatedAt: resumedAt,
      })
      .where(eq(cases.id, id))
      .returning(returnCaseFields);

    await db.insert(caseStatusHistory).values({
      caseId: id,
      fromStatus: CASE_STATUSES.IN_PROGRESS,
      toStatus: CASE_STATUSES.IN_PROGRESS,
      changedBy: input.changedBy,
      notes: input.notes || "Customer approved updated details; execution resumed",
    });

    return updatedCases[0];
  },

  async completeRepair(id: number, input: ExecutionActionInput): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    const transitionValidation = validateStatusTransition(
      existingCase.caseData.status as CaseStatus,
      CASE_STATUSES.REPAIRED
    );
    if (!transitionValidation.valid) {
      throw new Error(transitionValidation.error);
    }

    const completedAt = new Date();
    const pausedAt = existingCase.caseData.executionTimerPausedAt;
    const totalPausedSeconds = pausedAt
      ? existingCase.caseData.executionTotalPausedSeconds + secondsBetween(pausedAt, completedAt)
      : existingCase.caseData.executionTotalPausedSeconds;

    return await db.transaction(async (tx) => {
      const updatedCases = await tx
        .update(cases)
        .set({
          status: CASE_STATUSES.REPAIRED,
          executionTimerPausedAt: null,
          executionTotalPausedSeconds: totalPausedSeconds,
          executionCompletedAt: completedAt,
          updatedAt: completedAt,
        })
        .where(eq(cases.id, id))
        .returning(returnCaseFields);

      await tx.insert(caseStatusHistory).values({
        caseId: id,
        fromStatus: existingCase.caseData.status,
        toStatus: CASE_STATUSES.REPAIRED,
        changedBy: input.changedBy,
        notes: input.notes || "Repair completed",
      });

      return updatedCases[0];
    });
  },

  async saveRepairQuality(id: number, input: RepairQualityInput): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    if (existingCase.caseData.status !== CASE_STATUSES.REPAIRED) {
      throw new Error("Repair quality can only be saved after repair is completed");
    }

    const updatedCases = await db
      .update(cases)
      .set({
        postRepairCompletedWork: input.postRepairCompletedWork,
        postRepairTested: input.postRepairTested,
        postRepairTestCount: input.postRepairTestCount,
        postRepairCleaned: input.postRepairCleaned,
        postRepairRecommendations: input.postRepairRecommendations,
        postRepairImages: input.postRepairImages,
        postRepairDamagedPartImages: input.postRepairDamagedPartImages,
        postRepairNote: input.postRepairNote,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, id))
      .returning(returnCaseFields);

    return updatedCases[0];
  },

  async sendReadyNotification(id: number, input: ReadyNotificationInput): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    if (existingCase.caseData.status !== CASE_STATUSES.REPAIRED) {
      throw new Error("Ready notification can only be sent after repair is completed");
    }

    const sentAt = new Date();
    const messageBody =
      input.readyNotificationMessage ||
      buildCaseReadyMessage(
        existingCase.customer?.name || "عميلنا",
        existingCase.caseData.caseCode,
      );

    if (existingCase.customer?.phone) {
      const notificationResult = await notificationsService.sendReadyMessageWithImageFollowUps({
        caseId: existingCase.caseData.caseCode,
        customerName: existingCase.customer.name,
        customerPhone: existingCase.customer.phone,
        messageBody,
        channel: input.readyNotificationChannel.toLowerCase() as "whatsapp" | "sms" | "email",
        type: "ready",
        mediaUrls: input.mediaUrls,
      });

      if (notificationResult.followUpFailures.length) {
        console.error("[cases:sendReadyNotification:followups]", notificationResult.followUpFailures);
      }
    }

    const updatedCases = await db
      .update(cases)
      .set({
        readyNotificationMessage: messageBody,
        readyNotificationChannel: input.readyNotificationChannel,
        readyNotificationSentAt: sentAt,
        latestMessage: messageBody,
        latestMessageChannel: input.readyNotificationChannel,
        latestMessageSentAt: sentAt,
        updatedAt: sentAt,
      })
      .where(eq(cases.id, id))
      .returning(returnCaseFields);

    return updatedCases[0];
  },

  async markCustomerReceived(id: number): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    if (existingCase.caseData.status !== CASE_STATUSES.REPAIRED) {
      throw new Error("Customer receipt can only be marked after repair is completed");
    }

    const now = new Date();
    const updatedCases = await db
      .update(cases)
      .set({
        customerReceivedAt: now,
        updatedAt: now,
      })
      .where(eq(cases.id, id))
      .returning(returnCaseFields);

    return updatedCases[0];
  },

  async finalizeOperation(id: number, changedBy: number, input?: FinalizeOperationInput): Promise<CaseRow> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    if (
      existingCase.caseData.status !== CASE_STATUSES.REPAIRED &&
      existingCase.caseData.status !== CASE_STATUSES.NOT_REPAIRABLE
    ) {
      throw new Error("Only repaired or not repairable cases can be finalized");
    }

    if (existingCase.caseData.status === CASE_STATUSES.REPAIRED && !existingCase.caseData.customerReceivedAt) {
      throw new Error("Customer receipt must be marked before finalizing the operation");
    }

    const notRepairableReason =
      input?.notRepairableReason?.trim() ||
      input?.finalResult?.trim() ||
      existingCase.caseData.notRepairableReason ||
      existingCase.caseData.finalResult;

    if (existingCase.caseData.status === CASE_STATUSES.NOT_REPAIRABLE && !notRepairableReason) {
      throw new Error("Not repairable reason is required before finalizing the operation");
    }

    const now = new Date();
    return await db.transaction(async (tx) => {
      const finalStatus =
        existingCase.caseData.status === CASE_STATUSES.REPAIRED
          ? CASE_STATUSES.COMPLETED
          : CASE_STATUSES.NOT_REPAIRABLE;

      const updatedCases = await tx
        .update(cases)
        .set({
          status: finalStatus,
          operationFinalizedAt: now,
          ...(existingCase.caseData.status === CASE_STATUSES.REPAIRED && input ? {
            postRepairCompletedWork: input.postRepairCompletedWork,
            postRepairTested: input.postRepairTested,
            postRepairTestCount: input.postRepairTestCount,
            postRepairCleaned: input.postRepairCleaned,
            postRepairRecommendations: input.postRepairRecommendations,
            postRepairImages: input.postRepairImages,
            postRepairDamagedPartImages: input.postRepairDamagedPartImages,
            postRepairNote: input.postRepairNote,
          } : {}),
          ...(existingCase.caseData.status === CASE_STATUSES.NOT_REPAIRABLE ? {
            notRepairableReason,
            finalResult: notRepairableReason,
          } : {}),
          updatedAt: now,
        })
        .where(eq(cases.id, id))
        .returning(returnCaseFields);

      await tx.insert(caseStatusHistory).values({
        caseId: id,
        fromStatus: existingCase.caseData.status,
        toStatus: finalStatus,
        changedBy,
        notes: "Operation finalized after customer receipt",
      });

      return updatedCases[0];
    });
  },

  async getMaintenanceOperations(): Promise<any[]> {
    return await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        status: cases.status,
        finalResult: cases.finalResult,
        notRepairableReason: cases.notRepairableReason,
        operationFinalizedAt: cases.operationFinalizedAt,
        executionCompletedAt: cases.executionCompletedAt,
        postRepairCompletedWork: cases.postRepairCompletedWork,
        customerName: customers.name,
        customerPhone: customers.phone,
        deviceApplianceType: devices.applianceType,
        deviceBrand: devices.brand,
        deviceModelName: devices.modelName,
        technicianName: cases.technicianName,
        assignedTechnicianId: cases.assignedTechnicianId,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .where(or(isNotNull(cases.operationFinalizedAt), eq(cases.status, CASE_STATUSES.COMPLETED)))
      .orderBy(desc(cases.operationFinalizedAt));
  },

  async getMaintenanceOperationById(id: number): Promise<CaseDetails | undefined> {
    const operation = await this.getCaseById(id);
    if (!operation) return undefined;

    if (!operation.caseData.operationFinalizedAt && operation.caseData.status !== CASE_STATUSES.COMPLETED) {
      return undefined;
    }

    return operation;
  },
};


