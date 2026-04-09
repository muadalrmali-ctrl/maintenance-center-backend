import { Request, Response } from "express";
import { notificationsService } from "./notifications.service";
import { createNotificationSchema, sendCustomerMessageSchema } from "./notifications.validation";

const logNotificationError = (action: string, error: unknown) => {
  console.error(
    `[notifications:${action}]`,
    error instanceof Error ? error.message : error
  );
};

export const notificationsController = {
  async createNotification(req: Request, res: Response) {
    try {
      const validation = createNotificationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const notification = await notificationsService.createNotificationLog(validation.data);

      return res.status(201).json({
        success: true,
        message: "Notification log created successfully",
        data: notification,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create notification log",
      });
    }
  },

  async getAllNotifications(req: Request, res: Response) {
    try {
      const notifications = await notificationsService.getAllNotifications();

      return res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data: notifications,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async sendCustomerMessage(req: Request, res: Response) {
    try {
      const validation = sendCustomerMessageSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const result = await notificationsService.sendCustomerMessageToN8n(validation.data);

      return res.status(200).json({
        success: true,
        message: "Customer notification queued successfully",
        data: result,
      });
    } catch (error) {
      logNotificationError("sendCustomerMessage", error);
      return res.status(502).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send customer notification",
      });
    }
  },
};
