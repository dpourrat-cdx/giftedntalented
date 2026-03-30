import express from "express";
import helmet from "helmet";
import pinoHttpImport from "pino-http";
import type { Request } from "express";
import { corsMiddleware } from "./config/cors.js";
import { logger } from "./config/logger.js";
import { attemptsRouter } from "./routes/attempts.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { buildRequestLogContext, resolveHttpLogLevel } from "./middleware/request-observability.js";
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
      customLogLevel(request, response, error) {
        return resolveHttpLogLevel(request as Request, response, error);
      },
      customProps(request: Request, response) {
        return buildRequestLogContext(request, response);
      },
      customSuccessObject(request: Request, response, value) {
        return {
          ...value,
          ...buildRequestLogContext(request, response, value.responseTime),
        };
      },
      customErrorObject(request: Request, response, error, value) {
        return {
          ...value,
          ...buildRequestLogContext(request, response, value.responseTime),
          errorName: error.name,
        };
      },
    }),
  );
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: "250kb" }));

  app.use("/api/v1", healthRouter);
  app.use("/api/v1", scoresRouter);
  app.use("/api/v1", attemptsRouter);
  app.use("/api/v1", devicesRouter);
  app.use("/api/v1", adminRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
