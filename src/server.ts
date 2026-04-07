import app, { allowedOriginsList } from "./app";
import { env } from "./config/env";
import { checkDbConnection } from "./config/db";

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

const logStartupConfig = () => {
  console.log("Starting maintenance-center backend");
  console.log(`NODE_ENV: ${env.NODE_ENV}`);
  console.log(`PORT: ${PORT}`);
  console.log(`DATABASE_URL configured: ${env.DATABASE_URL ? "yes" : "no"}`);
  console.log("CORS allowed origins:");
  if (allowedOriginsList.length === 0) {
    console.log("- none configured");
  } else {
    allowedOriginsList.forEach((origin) => console.log(`- ${origin}`));
  }
};

logStartupConfig();

const server = app.listen(PORT, HOST, () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});

checkDbConnection()
  .then(() => {
    console.log("Database connection check succeeded");
  })
  .catch((error) => {
    console.error(
      "Database connection check failed:",
      error instanceof Error ? error.message : error
    );
  });
