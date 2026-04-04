import { Request, Response } from "express";
import { deviceService } from "./device.service";

export const deviceController = {
  async create(req: Request, res: Response) {
    try {
      const { applianceType, brand, modelName, modelCode, notes } = req.body;
      const createdBy = req.user?.id;

      if (!applianceType || !brand || !modelName) {
        return res.status(400).json({
          success: false,
          message: "applianceType, brand, and modelName are required",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const device = await deviceService.createDevice({
        applianceType,
        brand,
        modelName,
        modelCode,
        notes,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Device created successfully",
        data: device,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create device",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const devices = await deviceService.getDevices();

      return res.status(200).json({
        success: true,
        message: "Devices retrieved successfully",
        data: devices,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve devices",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid device ID",
        });
      }

      const device = await deviceService.getDeviceById(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Device retrieved successfully",
        data: device,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve device",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { applianceType, brand, modelName, modelCode, notes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid device ID",
        });
      }

      const device = await deviceService.updateDevice(id, {
        applianceType,
        brand,
        modelName,
        modelCode,
        notes,
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Device updated successfully",
        data: device,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update device",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};