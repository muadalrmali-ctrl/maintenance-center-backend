import { Request, Response } from "express";
import { caseServicesService } from "./case-services.service";

export const caseServicesController = {
  async addService(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const { serviceName, description, unitPrice, quantity, performedBy } = req.body;
      const createdBy = req.user?.id;

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!serviceName || unitPrice === undefined) {
        return res.status(400).json({
          success: false,
          message: "serviceName and unitPrice are required",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const service = await caseServicesService.addService(caseId, {
        serviceName,
        description,
        unitPrice,
        quantity,
        performedBy,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Service added to case successfully",
        data: service,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to add service",
      });
    }
  },

  async getCaseServices(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const services = await caseServicesService.getCaseServices(caseId);

      return res.status(200).json({
        success: true,
        message: "Case services retrieved successfully",
        data: services,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve case services",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};