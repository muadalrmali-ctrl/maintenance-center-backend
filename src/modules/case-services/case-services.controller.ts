import { Request, Response } from "express";
import { caseServicesService } from "./case-services.service";
import { addServiceSchema } from "./case-services.validation";

export const caseServicesController = {
  async addService(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const createdBy = req.user?.id;

      if (isNaN(caseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const validatedData = addServiceSchema.parse(req.body);

      const service = await caseServicesService.addService(caseId, {
        ...validatedData,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Service added to case successfully",
        data: service,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: (error as any).errors,
        });
      }
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

  async removeService(req: Request, res: Response) {
    try {
      const caseId = parseInt(req.params.caseId as string);
      const serviceId = parseInt(req.params.serviceId as string);

      if (isNaN(caseId) || isNaN(serviceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid case or service ID",
        });
      }

      await caseServicesService.removeService(caseId, serviceId);

      return res.status(200).json({
        success: true,
        message: "Service removed from case successfully",
        data: { id: serviceId },
      });
    } catch (error) {
      console.error("[case-services:removeService]", error instanceof Error ? error.message : error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to remove service",
      });
    }
  },
};
