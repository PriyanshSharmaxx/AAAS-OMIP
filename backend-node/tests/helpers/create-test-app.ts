import express from "express";
import { errorHandler, notFoundHandler } from "../../src/middleware/errorHandler";

export function createTestApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
