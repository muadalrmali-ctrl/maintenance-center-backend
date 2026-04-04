import { Router } from "express";
import { invoicesController } from "./invoices.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/cases/:caseId/invoice - Create invoice from case
router.post("/cases/:caseId/invoice", invoicesController.createInvoice);

// GET /api/invoices - Get all invoices
router.get("/", invoicesController.getAllInvoices);

// GET /api/invoices/:id - Get invoice by ID
router.get("/:id", invoicesController.getInvoiceById);

// PATCH /api/invoices/:id/status - Update invoice status
router.patch("/:id/status", invoicesController.updateInvoiceStatus);

export const invoicesRoutes = router;