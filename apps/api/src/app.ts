import Fastify from "fastify";

import { registerHealthRoutes } from "./modules/health/health-routes.ts";

export function buildApp() {
  const app = Fastify({
    logger: false
  });

  app.register(registerHealthRoutes);

  return app;
}
