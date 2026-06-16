import { Request, Response } from "express";
import { receptionPointsService } from "./reception-points.service";
import { createReceptionPointSchema, updateReceptionPointSchema } from "./reception-points.validation";
import { requestHasPermission } from "../../middlewares/permission";

const getId = (value: string | string[] | undefined) => {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(id) ? id : null;
};

export const receptionPointsController = {
  async list(req: Request, res: Response) {
    try {
      if (req.user?.role === "reception_point_user") {
        if (!req.user.receptionPointId) {
          return res.status(403).json({ success: false, message: "Reception point user is not linked to a reception point" });
        }

        const point = await receptionPointsService.getById(req.user.receptionPointId);
        return res.status(200).json({ success: true, data: point ? [point] : [] });
      }

      if (!requestHasPermission(req, "reception_points.view")) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          requiredPermission: "reception_points.view",
        });
      }

      return res.status(200).json({ success: true, data: await receptionPointsService.list() });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve reception points", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async create(req: Request, res: Response) {
    const validation = createReceptionPointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: validation.error.issues });
    }

    try {
      return res.status(201).json({ success: true, data: await receptionPointsService.create(validation.data) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to create reception point" });
    }
  },

  async getById(req: Request, res: Response) {
    const id = getId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid reception point ID" });

    try {
      const point = await receptionPointsService.getById(id);
      if (!point) return res.status(404).json({ success: false, message: "Reception point not found" });
      return res.status(200).json({ success: true, data: point });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve reception point", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async update(req: Request, res: Response) {
    const id = getId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid reception point ID" });

    const validation = updateReceptionPointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: validation.error.issues });
    }

    try {
      const point = await receptionPointsService.update(id, validation.data);
      if (!point) return res.status(404).json({ success: false, message: "Reception point not found" });
      return res.status(200).json({ success: true, data: point });
    } catch (error) {
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to update reception point" });
    }
  },
};
