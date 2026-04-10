import { Router } from "express";
import { invoicesController } from "./invoices.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const invoicesRouter = Router();
const caseInvoiceRouter = Router();

// All routes require authentication
invoicesRouter.use(authMiddleware);
caseInvoiceRouter.use(authMiddleware);

// POST /api/cases/:caseId/invoice - Create invoice from case (receptionist)
caseInvoiceRouter.post("/:caseId/invoice", roleMiddleware(["receptionist"]), invoicesController.createInvoice);

// GET /api/invoices - Get all invoices (receptionist, store_manager)
invoicesRouter.get("/", roleMiddleware(["receptionist", "store_manager"]), invoicesController.getAllInvoices);
invoicesRouter.post("/", roleMiddleware(["receptionist", "store_manager"]), invoicesController.createDirectInvoice);

// GET /api/invoices/:id - Get invoice by ID (receptionist, store_manager)
invoicesRouter.get("/:id", roleMiddleware(["receptionist", "store_manager"]), invoicesController.getInvoiceById);
invoicesRouter.patch("/:id/confirm", roleMiddleware(["store_manager"]), invoicesController.confirmDirectInvoice);

// PATCH /api/invoices/:id/status - Update invoice status (receptionist)
invoicesRouter.patch("/:id/status", roleMiddleware(["receptionist"]), invoicesController.updateInvoiceStatus);

export const invoicesRoutes = invoicesRouter;
export const caseInvoiceRoutes = caseInvoiceRouter;
