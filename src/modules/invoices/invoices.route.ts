import { Router } from "express";
import { invoicesController } from "./invoices.controller";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permission";

const invoicesRouter = Router();
const caseInvoiceRouter = Router();

// All routes require authentication
invoicesRouter.use(authMiddleware);
caseInvoiceRouter.use(authMiddleware);

// POST /api/cases/:caseId/invoice - Create invoice from case (receptionist)
caseInvoiceRouter.post("/:caseId/invoice", requirePermission("cases.diagnosis.edit"), invoicesController.createInvoice);

// GET /api/invoices - Get all invoices (receptionist, store_manager)
invoicesRouter.get("/", requirePermission("sales.view"), invoicesController.getAllInvoices);
invoicesRouter.post("/", requirePermission("sales.create"), invoicesController.createDirectInvoice);

// GET /api/invoices/:id - Get invoice by ID (receptionist, store_manager)
invoicesRouter.get("/:id", requirePermission("sales.view"), invoicesController.getInvoiceById);
invoicesRouter.patch("/:id/confirm", requirePermission("sales.confirm"), invoicesController.confirmDirectInvoice);

// PATCH /api/invoices/:id/status - Update invoice status (receptionist)
invoicesRouter.patch("/:id/status", requirePermission("sales.confirm"), invoicesController.updateInvoiceStatus);

export const invoicesRoutes = invoicesRouter;
export const caseInvoiceRoutes = caseInvoiceRouter;
