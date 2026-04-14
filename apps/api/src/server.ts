import { buildApp } from "./app.ts";
import { loadEnv } from "./config/env.ts";

const env = loadEnv();
const app = buildApp();

try {
  await app.listen({
    host: env.host,
    port: env.port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
