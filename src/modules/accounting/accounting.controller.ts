import { Request, Response } from "express";
import { accountingService } from "./accounting.service";
import { createSupplierSchema, updateSupplierSchema } from "./accounting.validation";

const isZodError = (error: unknown) =>
  error && typeof error === "object" && "name" in error && error.name === "ZodError";

const validationError = (res: Response, error: any) =>
  res.status(400).json({
    success: false,
    message: "Validation error",
    errors: error.errors,
  });

const parseId = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getRouteId = (req: Request) => {
  const rawId = req.params.id;
  return Array.isArray(rawId) ? rawId[0] : rawId;
};

export const accountingController = {
  async getSuppliers(_req: Request, res: Response) {
    try {
      const data = await accountingService.getSuppliers();
      return res.status(200).json({ success: true, message: "Suppliers retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve suppliers", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async createSupplier(req: Request, res: Response) {
    try {
      const createdBy = req.user?.id;
      if (!createdBy) return res.status(401).json({ success: false, message: "Unauthorized" });
      const validated = createSupplierSchema.parse(req.body);
      const data = await accountingService.createSupplier({ ...validated, createdBy });
      return res.status(201).json({ success: true, message: "Supplier created successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(500).json({ success: false, message: "Failed to create supplier", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getSupplierDetails(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid supplier ID" });
      const data = await accountingService.getSupplierDetails(id);
      if (!data) return res.status(404).json({ success: false, message: "Supplier not found" });
      return res.status(200).json({ success: true, message: "Supplier retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve supplier", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async updateSupplier(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid supplier ID" });
      const validated = updateSupplierSchema.parse(req.body);
      const data = await accountingService.updateSupplier(id, validated);
      if (!data) return res.status(404).json({ success: false, message: "Supplier not found" });
      return res.status(200).json({ success: true, message: "Supplier updated successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(500).json({ success: false, message: "Failed to update supplier", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
