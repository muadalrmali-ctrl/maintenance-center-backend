import { Request, Response } from "express";
import { accountingService } from "./accounting.service";
import {
  confirmPurchaseSchema,
  createDailyCashSchema,
  createDailyExpenseSchema,
  createPurchaseSchema,
  createSupplierSchema,
  updateDailyCashSchema,
  updateDailyExpenseSchema,
  updatePurchaseSchema,
  updateSupplierSchema,
} from "./accounting.validation";

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

  async getPurchases(_req: Request, res: Response) {
    try {
      const data = await accountingService.getPurchases();
      return res.status(200).json({ success: true, message: "Purchases retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve purchases", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async createPurchase(req: Request, res: Response) {
    try {
      const createdBy = req.user?.id;
      if (!createdBy) return res.status(401).json({ success: false, message: "Unauthorized" });
      const validated = createPurchaseSchema.parse(req.body);
      const data = await accountingService.createPurchase({ ...validated, createdBy });
      return res.status(201).json({ success: true, message: "Purchase created successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to create purchase" });
    }
  },

  async getPurchaseDetails(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid purchase ID" });
      const data = await accountingService.getPurchaseDetails(id);
      if (!data) return res.status(404).json({ success: false, message: "Purchase not found" });
      return res.status(200).json({ success: true, message: "Purchase retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve purchase", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async updatePurchase(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid purchase ID" });
      const validated = updatePurchaseSchema.parse(req.body);
      const data = await accountingService.updatePurchase(id, validated);
      if (!data) return res.status(404).json({ success: false, message: "Purchase not found" });
      return res.status(200).json({ success: true, message: "Purchase updated successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to update purchase" });
    }
  },

  async confirmPurchase(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      const confirmedBy = req.user?.id;
      if (!id) return res.status(400).json({ success: false, message: "Invalid purchase ID" });
      if (!confirmedBy) return res.status(401).json({ success: false, message: "Unauthorized" });
      const validated = confirmPurchaseSchema.parse(req.body ?? {});
      const data = await accountingService.confirmPurchase(id, confirmedBy, validated.notes);
      return res.status(200).json({ success: true, message: "Purchase confirmed successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to confirm purchase" });
    }
  },

  async getDailyExpenses(_req: Request, res: Response) {
    try {
      const data = await accountingService.getDailyExpenses();
      return res.status(200).json({ success: true, message: "Daily expenses retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve daily expenses", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async createDailyExpense(req: Request, res: Response) {
    try {
      const createdBy = req.user?.id;
      if (!createdBy) return res.status(401).json({ success: false, message: "Unauthorized" });
      const validated = createDailyExpenseSchema.parse(req.body);
      const data = await accountingService.createDailyExpense({ ...validated, createdBy });
      return res.status(201).json({ success: true, message: "Daily expense created successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to create daily expense" });
    }
  },

  async getDailyExpenseDetails(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid expense ID" });
      const data = await accountingService.getDailyExpenseById(id);
      if (!data) return res.status(404).json({ success: false, message: "Daily expense not found" });
      return res.status(200).json({ success: true, message: "Daily expense retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve daily expense", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async updateDailyExpense(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid expense ID" });
      const validated = updateDailyExpenseSchema.parse(req.body);
      const data = await accountingService.updateDailyExpense(id, validated);
      if (!data) return res.status(404).json({ success: false, message: "Daily expense not found" });
      return res.status(200).json({ success: true, message: "Daily expense updated successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to update daily expense" });
    }
  },

  async getDailyCash(_req: Request, res: Response) {
    try {
      const data = await accountingService.getDailyCashRecords();
      return res.status(200).json({ success: true, message: "Daily cash records retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve daily cash records", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async createDailyCash(req: Request, res: Response) {
    try {
      const createdBy = req.user?.id;
      if (!createdBy) return res.status(401).json({ success: false, message: "Unauthorized" });
      const validated = createDailyCashSchema.parse(req.body);
      const data = await accountingService.createDailyCash({ ...validated, createdBy });
      return res.status(201).json({ success: true, message: "Daily cash record created successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to create daily cash record" });
    }
  },

  async getDailyCashDetails(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid daily cash ID" });
      const data = await accountingService.getDailyCashById(id);
      if (!data) return res.status(404).json({ success: false, message: "Daily cash record not found" });
      return res.status(200).json({ success: true, message: "Daily cash record retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve daily cash record", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async updateDailyCash(req: Request, res: Response) {
    try {
      const id = parseId(getRouteId(req));
      if (!id) return res.status(400).json({ success: false, message: "Invalid daily cash ID" });
      const validated = updateDailyCashSchema.parse(req.body);
      const data = await accountingService.updateDailyCash(id, validated);
      if (!data) return res.status(404).json({ success: false, message: "Daily cash record not found" });
      return res.status(200).json({ success: true, message: "Daily cash record updated successfully", data });
    } catch (error) {
      if (isZodError(error)) return validationError(res, error);
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to update daily cash record" });
    }
  },

  async getDailyCashSummary(_req: Request, res: Response) {
    try {
      const data = await accountingService.getDailyCashSummary();
      return res.status(200).json({ success: true, message: "Daily cash summary retrieved successfully", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve daily cash summary", error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
