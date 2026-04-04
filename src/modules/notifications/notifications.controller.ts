import { Request, Response } from "express";
import { notificationsService } from "./notifications.service";

export const notificationsController = {
  async createNotification(req: Request, res: Response) {
    try {
      const sentBy = req.user?.id;

      const { caseId, channel, recipient, message } = req.body;

      if (!channel || !recipient || !message) {
        return res.status(400).json({
          success: false,
          message: "channel, recipient, and message are required",
        });
      }

      const notification = await notificationsService.createNotificationLog({
        caseId: caseId ? parseInt(caseId) : undefined,
        channel,
        recipient,
        message,
      }, sentBy);

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

  async getCaseNotifications(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const notifications = await notificationsService.getCaseNotifications(caseId);

      return res.status(200).json({
        success: true,
        message: "Case notifications retrieved successfully",
        data: notifications,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve case notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async updateNotificationStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification ID",
        });
      }

      const { status, providerResponse } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "status is required",
        });
      }

      const notification = await notificationsService.updateNotificationStatus(id, status, providerResponse);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Notification status updated successfully",
        data: notification,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update notification status",
      });
    }
  },
};