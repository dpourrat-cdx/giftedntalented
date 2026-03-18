import cors from "cors";
import type { CorsOptions } from "cors";
import { env } from "./env.js";
import { AppError } from "../utils/errors.js";

const allowedOrigins = new Set(env.ALLOWED_ORIGINS);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(403, "CORS_ORIGIN_BLOCKED", "Origin not allowed by CORS."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Admin-Key"],
};

export const corsMiddleware = cors(corsOptions);
