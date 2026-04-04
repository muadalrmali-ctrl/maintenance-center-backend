import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { env } from "../config/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
});