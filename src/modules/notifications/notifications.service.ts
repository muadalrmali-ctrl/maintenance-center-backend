import { db } from "../../db";
import { notificationLogs } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

type CreateNotificationInput = {
  type: string;
  target: string;
  message: string;
  referenceType?: string;
  referenceId?: number;
};

type NotificationLog = {
  id: number;
  type: string;
  target: string;
  message: string;
  status: string;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: Date | null;
};

export const notificationsService = {
  async createNotificationLog(input: CreateNotificationInput): Promise<NotificationLog> {
    const newLog = await db
      .insert(notificationLogs)
      .values(input)
      .returning();

    return newLog[0];
  },

  async getAllNotifications(): Promise<NotificationLog[]> {
    return await db
      .select()
      .from(notificationLogs)
      .orderBy(desc(notificationLogs.createdAt));
  },
};