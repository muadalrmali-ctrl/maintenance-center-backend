import { db } from "../../db";
import { notificationLogs } from "../../db/schema";
import { desc } from "drizzle-orm";
import { env } from "../../config/env";

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

export type CustomerMessageChannel = "whatsapp" | "sms" | "email";
export type CustomerMessageType = "diagnosis" | "ready" | "invoice" | "status_update" | "custom";

export type SendCustomerMessageInput = {
  caseId: string;
  customerName: string;
  customerPhone: string;
  messageBody: string;
  channel?: CustomerMessageChannel;
  type?: CustomerMessageType;
  mediaUrls?: string[];
};

const N8N_TIMEOUT_MS = 10_000;

const normalizePhoneNumber = (phone: string) => {
  const sanitized = phone
    .replace(/^whatsapp:/i, "")
    .replace(/[^\d+]/g, "")
    .trim();

  if (!sanitized) {
    throw new Error("Customer phone is required");
  }

  if (sanitized.startsWith("+")) {
    return sanitized;
  }

  if (sanitized.startsWith("00")) {
    return `+${sanitized.slice(2)}`;
  }

  if (sanitized.startsWith("218")) {
    return `+${sanitized}`;
  }

  if (sanitized.startsWith("0")) {
    return `+218${sanitized.slice(1)}`;
  }

  if (sanitized.length === 9) {
    return `+218${sanitized}`;
  }

  throw new Error("Customer phone must be an international number like +2189XXXXXXX");
};

const createNotificationLog = async (input: CreateNotificationInput & { status?: string }) => {
  try {
    await db.insert(notificationLogs).values({
      ...input,
      status: input.status ?? "pending",
    });
  } catch (error) {
    console.error("[notifications:log]", error instanceof Error ? error.message : error);
  }
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

  async sendCustomerMessageToN8n(input: SendCustomerMessageInput) {
    if (!env.N8N_WEBHOOK_URL) {
      throw new Error("N8N_WEBHOOK_URL is not configured");
    }

    const payload = {
      caseId: input.caseId.trim(),
      customerName: input.customerName.trim(),
      customerPhone: normalizePhoneNumber(input.customerPhone),
      messageBody: input.messageBody.trim(),
      channel: input.channel ?? "whatsapp",
      type: input.type ?? "custom",
      ...(input.mediaUrls?.length
        ? {
            mediaUrls: input.mediaUrls
              .map((url) => url.trim())
              .filter(Boolean),
          }
        : {}),
    };

    if (!payload.caseId || !payload.customerName || !payload.customerPhone || !payload.messageBody) {
      throw new Error("caseId, customerName, customerPhone, and messageBody are required");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

    try {
      const response = await fetch(env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.N8N_WEBHOOK_TOKEN ? { "x-n8n-webhook-token": env.N8N_WEBHOOK_TOKEN } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responseText = await response.text();
      let responseBody: unknown = responseText;

      try {
        responseBody = responseText ? JSON.parse(responseText) : null;
      } catch {
        responseBody = responseText;
      }

      if (!response.ok) {
        await createNotificationLog({
          type: payload.type,
          target: payload.customerPhone,
          message: payload.messageBody,
          referenceType: "case",
          status: "failed",
        });

        throw new Error(`n8n webhook request failed with status ${response.status}`);
      }

      await createNotificationLog({
        type: payload.type,
        target: payload.customerPhone,
        message: payload.messageBody,
        referenceType: "case",
        status: "sent",
      });

      return {
        delivered: true,
        payload,
        response: responseBody,
      };
    } catch (error) {
      await createNotificationLog({
        type: input.type ?? "custom",
        target: input.customerPhone,
        message: input.messageBody,
        referenceType: "case",
        status: "failed",
      });

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("n8n webhook request timed out");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },
};
