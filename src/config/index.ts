import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // App
  APP_NAME: z.string().default("Express SaaS"),
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  APP_SECRET_KEY: z.string().min(32, "APP_SECRET_KEY must be at least 32 chars"),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(30),
  REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().default(30),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),

  // Email
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().email().default("noreply@yoursaas.com"),
  EMAIL_FROM_NAME: z.string().default("Your SaaS"),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().default(""),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(""),
  PAYSTACK_PRO_PLAN_CODE: z.string().default(""),
  PAYSTACK_ENTERPRISE_PLAN_CODE: z.string().default(""),

  // Sentry
  SENTRY_DSN: z.string().default(""),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const isProduction = config.NODE_ENV === "production";
export const isDevelopment = config.NODE_ENV === "development";
