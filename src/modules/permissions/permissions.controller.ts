import { Request, Response } from "express";
import { permissionsService } from "./permissions.service";

export const permissionsController = {
  async getCatalog(_req: Request, res: Response) {
    try {
      const catalog = await permissionsService.getCatalog();

      return res.status(200).json({
        success: true,
        message: "Permissions catalog retrieved successfully",
        data: catalog,
      });
    } catch (error) {
      console.error("[permissions:getCatalog]", error instanceof Error ? error.message : error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve permissions catalog",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
