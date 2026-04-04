import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../config/db";

export const db = drizzle(pool);