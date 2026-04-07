import app, { allowedOriginsList } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
  console.log("CORS allowed origins:");
  allowedOriginsList.forEach((origin) => console.log(`- ${origin}`));
});
