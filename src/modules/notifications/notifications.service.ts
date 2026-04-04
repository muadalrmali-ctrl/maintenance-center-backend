import { db } from "../../db";
import { notificationLogs } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

type CreateNotificationInput = {
  caseId?: number;
  channel: string;
  recipient: string;
  message: string;
};

type NotificationLog = {
  id: number;
  caseId: number | null;
  channel: string;
  recipient: string;
  message: string;
  status: string;
  providerResponse: string | null;
  sentBy: number | null;
  sentAt: Date | null;
  createdAt: Date | null;
};

export const notificationsService = {
  async createNotificationLog(input: CreateNotificationInput, sentBy?: number): Promise<NotificationLog> {
    const newLog = await db
      .insert(notificationLogs)
      .values({
        ...input,
        sentBy,
      })
      .returning();

    return newLog[0];
  },

  async getCaseNotifications(caseId: number): Promise<NotificationLog[]> {
    return await db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.caseId, caseId))
      .orderBy(desc(notificationLogs.createdAt));
  },

  async updateNotificationStatus(id: number, status: string, providerResponse?: string): Promise<NotificationLog | undefined> {
    const updateData: any = {
      status,
    };

    if (providerResponse) {
      updateData.providerResponse = providerResponse;
    }

    if (status === "sent") {
      updateData.sentAt = new Date();
    }

    const updated = await db
      .update(notificationLogs)
      .set(updateData)
      .where(eq(notificationLogs.id, id))
      .returning();

    return updated[0];
  },
};