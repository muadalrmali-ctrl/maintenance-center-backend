import { Request, Response } from "express";
import { invoicesService } from "./invoices.service";
import { createInvoiceSchema, updateInvoiceStatusSchema } from "./validation";

export const invoicesController = {
  async createInvoice(req: Request, res: Response) {
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

      const validation = createInvoiceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const invoice = await invoicesService.createInvoiceFromCase(caseId, validation.data, createdBy);

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create invoice",
      });
    }
  },

  async getAllInvoices(req: Request, res: Response) {
    try {
      const invoices = await invoicesService.getAllInvoices();

      return res.status(200).json({
        success: true,
        message: "Invoices retrieved successfully",
        data: invoices,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve invoices",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getInvoiceById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const result = await invoicesService.getInvoiceWithItems(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invoice retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve invoice",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async updateInvoiceStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const validation = updateInvoiceStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.issues,
        });
      }

      const invoice = await invoicesService.updateInvoiceStatus(id, validation.data.status);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invoice status updated successfully",
        data: invoice,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update invoice status",
      });
    }
  },
};