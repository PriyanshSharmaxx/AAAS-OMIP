import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// ---------------------------------------------------------------------------
// Environment schema — validated at startup; process exits on bad config
// ---------------------------------------------------------------------------

const envSchema = z.object({
  NODE_ENV:   z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT:       z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL:    z.string().default("redis://localhost:6379"),

  JWT_SECRET:     z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // LLM Keys
  OPENAI_API_KEY:    z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY:      z.string().optional(),
  
  // OAuth / Integration Credentials
  GITHUB_CLIENT_ID:     z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  SLACK_CLIENT_ID:      z.string().optional(),
  SLACK_CLIENT_SECRET:  z.string().optional(),
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Billing Keys (e.g. Stripe)
  STRIPE_SECRET_KEY:     z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // App Domain & Callbacks
  APP_URL: z.string().default("http://localhost:3000"),
  API_URL: z.string().default("http://localhost:4000"),

  PYTHON_SERVICE_URL:   z.string().optional(),
  N8N_DEFAULT_WEBHOOK:  z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX:       z.coerce.number().default(100),

  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Worker config
  WORKER_CONCURRENCY: z.coerce.number().default(5),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),

  // Reverse proxy (Railway, Render, AWS ALB) — trust X-Forwarded-For
  TRUST_PROXY: z.coerce.number().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:\n", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export const isDev  = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
