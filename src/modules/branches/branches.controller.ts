import { Request, Response } from "express";
import { branchesService } from "./branches.service";
import { createBranchSchema, updateBranchSchema } from "./branches.validation";

export const branchesController = {
  async list(req: Request, res: Response) {
    try {
      const data = await branchesService.listBranches();
      return res.status(200).json({
        success: true,
        message: "Branches retrieved successfully",
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve branches",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async create(req: Request, res: Response) {
    const validation = createBranchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues,
      });
    }

    try {
      const data = await branchesService.createBranch(validation.data);
      return res.status(201).json({
        success: true,
        message: "Branch created successfully",
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create branch",
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: "Invalid branch ID" });
      }

      const data = await branchesService.getBranchById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Branch not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Branch retrieved successfully",
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve branch",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async update(req: Request, res: Response) {
    const validation = updateBranchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues,
      });
    }

    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: "Invalid branch ID" });
      }

      const data = await branchesService.updateBranch(id, validation.data);
      if (!data) {
        return res.status(404).json({ success: false, message: "Branch not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Branch updated successfully",
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update branch",
      });
    }
  },
};
