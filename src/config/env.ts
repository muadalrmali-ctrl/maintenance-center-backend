import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "CHANGE_ME_SECRET",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
  FRONTEND_URL: process.env.FRONTEND_URL || "",
  FRONTEND_URLS: process.env.FRONTEND_URLS || "",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "",
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || "",
  N8N_WEBHOOK_TOKEN: process.env.N8N_WEBHOOK_TOKEN || "",
};
