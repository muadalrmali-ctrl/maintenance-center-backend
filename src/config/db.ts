import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const checkDbConnection = async () => {
  const client = await pool.connect();

  try {
    const result = await client.query("SELECT NOW()");
    return result.rows[0];
  } finally {
    client.release();
  }
};