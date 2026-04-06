/// <reference types="node" />
import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import type { Config } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config);