import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(10000),
  LOG_LEVEL: z.string().default("info"),
  ALLOWED_ORIGINS: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_API_KEY: z.string().min(24),
  READ_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  READ_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  WRITE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  WRITE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  RESET_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RESET_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`);
}

function normalizeOrigins(value: string) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function normalizePrivateKey(value?: string) {
  return value ? value.replaceAll("\\n", "\n") : undefined;
}

const rawEnv = parsedEnv.data;

export const env = {
  ...rawEnv,
  ALLOWED_ORIGINS: normalizeOrigins(rawEnv.ALLOWED_ORIGINS),
  FCM_PRIVATE_KEY: normalizePrivateKey(rawEnv.FCM_PRIVATE_KEY),
  isProduction: rawEnv.NODE_ENV === "production",
  isFcmConfigured: Boolean(rawEnv.FCM_PROJECT_ID && rawEnv.FCM_CLIENT_EMAIL && normalizePrivateKey(rawEnv.FCM_PRIVATE_KEY)),
} as const;
