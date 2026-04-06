import express from "express";
import { Request, Response, NextFunction } from "express";
import { env } from "./config/env";
import { checkDbConnection } from "./config/db";
import authRoutes from "./modules/auth/auth.route";
import customerRoutes from "./modules/customers/customer.route";
import deviceRoutes from "./modules/devices/device.route";
import caseRoutes from "./modules/cases/case.route";
import inventoryRoutes from "./modules/inventory/inventory.route";
import casePartsRoutes from "./modules/case-parts/case-parts.route";
import { caseServicesRoutes } from "./modules/case-services/case-services.route";
import { invoicesRoutes, caseInvoiceRoutes } from "./modules/invoices/invoices.route";
import { dashboardRoutes } from "./modules/dashboard/dashboard.route";
import { mediaRoutes } from "./modules/media/media.route";
import { notificationsRoutes } from "./modules/notifications/notifications.route";

const app = express();

const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, "");

const allowedOrigins = new Set(
  [
    "https://frontend-mu-murex-18.vercel.app",
    "http://localhost:5173",
    env.FRONTEND_URL,
    ...env.FRONTEND_URLS.split(","),
  ]
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean)
);

const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(403);
  }

  return next();
};

app.use(corsMiddleware);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

app.get("/db-check", async (_req, res) => {
  try {
    const dbTime = await checkDbConnection();

    res.status(200).json({
      success: true,
      message: "Database connected successfully",
      data: dbTime,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/cases", casePartsRoutes);
app.use("/api/cases", caseServicesRoutes);
app.use("/api/cases", caseInvoiceRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/notifications", notificationsRoutes);

export default app;
