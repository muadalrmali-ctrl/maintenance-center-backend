import { Request, Response } from "express";
import { reportsService } from "./reports.service";
import { REPORT_CATEGORY_PERMISSION_MAP } from "../../lib/permissions";
import { requestHasPermission } from "../../middlewares/permission";

const parseOptionalDate = (value: unknown) => {
  if (!value || typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseOptionalInt = (value: unknown) => {
  if (!value || typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const reportsController = {
  async getMeta(_req: Request, res: Response) {
    try {
      const data = await reportsService.getMeta();

      return res.status(200).json({
        success: true,
        message: "Report metadata retrieved successfully",
        data,
      });
    } catch (error) {
      console.error("[reports:getMeta]", error instanceof Error ? error.message : error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve report metadata",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getReport(req: Request, res: Response) {
    try {
      const category = String(req.query.category || "cases") as
        | "cases"
        | "technicians"
        | "inventory"
        | "sales"
        | "customers"
        | "operations";

      const requiredPermission = REPORT_CATEGORY_PERMISSION_MAP[category];
      if (!requiredPermission || !requestHasPermission(req, requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions for this report category",
        });
      }

      const data = await reportsService.getReport({
        category,
        reportType: typeof req.query.reportType === "string" ? req.query.reportType : undefined,
        dateFrom: parseOptionalDate(req.query.dateFrom),
        dateTo: parseOptionalDate(req.query.dateTo),
        status: typeof req.query.status === "string" ? req.query.status : null,
        technicianId: parseOptionalInt(req.query.technicianId),
        productId: parseOptionalInt(req.query.productId),
        customerId: parseOptionalInt(req.query.customerId),
      });

      return res.status(200).json({
        success: true,
        message: "Report generated successfully",
        data,
      });
    } catch (error) {
      console.error("[reports:getReport]", error instanceof Error ? error.message : error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
