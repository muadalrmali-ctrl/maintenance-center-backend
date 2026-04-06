import { Request, Response } from "express";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
  async getDashboardSummary(req: Request, res: Response) {
    try {
      const summary = await dashboardService.getDashboardSummary();

      return res.status(200).json({
        success: true,
        message: "Dashboard summary retrieved successfully",
        data: summary,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard summary",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getRevenue(req: Request, res: Response) {
    try {
      const revenue = await dashboardService.getRevenue();

      return res.status(200).json({
        success: true,
        message: "Revenue data retrieved successfully",
        data: revenue,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve revenue data",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getCasesStats(req: Request, res: Response) {
    try {
      const stats = await dashboardService.getCasesStats();

      return res.status(200).json({
        success: true,
        message: "Cases statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve cases statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};