import express from "express";
import { checkDbConnection } from "./config/db";
import authRoutes from "./modules/auth/auth.route";
import customerRoutes from "./modules/customers/customer.route";
import deviceRoutes from "./modules/devices/device.route";
import caseRoutes from "./modules/cases/case.route";
import inventoryRoutes from "./modules/inventory/inventory.route";
import casePartsRoutes from "./modules/case-parts/case-parts.route";
import { caseServicesRoutes } from "./modules/case-services/case-services.route";
import { invoicesRoutes } from "./modules/invoices/invoices.route";
import { dashboardRoutes } from "./modules/dashboard/dashboard.route";
import { mediaRoutes } from "./modules/media/media.route";
import { notificationsRoutes } from "./modules/notifications/notifications.route";

const app = express();

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
app.use("/api/invoices", invoicesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/notifications", notificationsRoutes);

export default app;