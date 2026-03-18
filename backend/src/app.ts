import express from "express";
import helmet from "helmet";
import pinoHttpImport from "pino-http";
import type { Request } from "express";
import { corsMiddleware } from "./config/cors.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { adminRouter } from "./routes/admin.routes.js";
import { devicesRouter } from "./routes/devices.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { scoresRouter } from "./routes/scores.routes.js";

export function buildApp() {
  const app = express();
  const pinoHttp = pinoHttpImport as unknown as typeof pinoHttpImport.default;

  app.set("trust proxy", 1);
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps(request: Request) {
        return {
          requestId: request.requestId,
        };
      },
    }),
  );
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: "250kb" }));

  app.use("/api/v1", healthRouter);
  app.use("/api/v1", scoresRouter);
  app.use("/api/v1", devicesRouter);
  app.use("/api/v1", adminRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
