import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default("https://pvtfrnd.com"),
  /** Browser origins allowed to call the API (the website and the web app). */
  WEB_ORIGINS: z.string().default("https://pvtfrnd.com,https://www.pvtfrnd.com,https://triverse-web.onrender.com"),
  /** Supabase Postgres (Session pooler URI). Tests use "pglite:memory" (in-memory, never on disk). */
  DATABASE_URL: z.string().default("postgres://triverse:triverse@localhost:5432/triverse"),
  /** Supabase Storage for avatars, banners and posters. */
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("triverse"),
  JWT_SECRET: z.string().min(32).default("dev-only-secret-change-me-dev-only-secret"),
  OTP_PEPPER: z.string().min(16).default("dev-only-otp-pepper"),
  /** When true, OTPs are logged instead of sent (local development only). */
  OTP_DEV_ECHO: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),

  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-opus-5-5"),
  /** Free alternatives (used when ANTHROPIC_API_KEY is empty): Gemini free tier, Groq, or any OpenAI-compatible URL (e.g. Ollama). */
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  /** Comma-separated models to try when the main one is overloaded or out of free quota. */
  LLM_FALLBACK_MODELS: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("TriVerse <hello@pvtfrnd.com>"),
  /** Alternative to Resend, e.g. smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465 */
  SMTP_URL: z.string().optional(),
  /** Simpler Gmail setup: your address + a 16-character App Password (spaces are ignored). */
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** Brevo (free 300/day) and SendGrid; the sender must be verified with the provider. */
  BREVO_API_KEY: z.string().optional(),
  /** Gmail over HTTPS via your own Google Apps Script web app (for hosts that block SMTP); see docs/gmail-relay.gs. */
  GMAIL_RELAY_URL: z.string().url().optional(),
  GMAIL_RELAY_SECRET: z.string().min(24).optional(),
  SENDGRID_API_KEY: z.string().optional(),
  /** MSG91 (DLT-registered) for SMS OTP in India. */
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  /** Real SMS only when explicitly switched on; otherwise phone OTPs stay in local test mode (code shown in the app). */
  SMS_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  /** 2Factor.in: Indian numbers on its pre-approved OTP template (no own DLT needed). */
  TWOFACTOR_API_KEY: z.string().optional(),
  TWOFACTOR_TEMPLATE: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  /** Google sign-in audiences (comma-separated). The Web client ID is public, so it is the default. */
  GOOGLE_CLIENT_IDS: z.string().default("829702507871-r8ivtemv1gsrlpr1h20n5mqd1sqknrd2.apps.googleusercontent.com,829702507871-miprdam0motdrkfaj3n32psh2mn9bmo3.apps.googleusercontent.com"),
  APPLE_BUNDLE_ID: z.string().default("com.pvtfrnd.triverse"),

  /** Voice messages: Sarvam (hosted, Indian languages) if set, else local Whisper. */
  SARVAM_API_KEY: z.string().optional(),
  SARVAM_STT_MODEL: z.string().default("saarika:v2.5"),
  WHISPER_MODEL: z.string().default("onnx-community/whisper-small"),

  GOOGLE_MAPS_API_KEY: z.string().optional(),
  /** data.gov.in key for live mandi prices (optional; a shared sample key is used otherwise). */
  DATA_GOV_API_KEY: z.string().optional(),
  TRIPADVISOR_API_KEY: z.string().optional(),

  KYC_PROVIDER: z.enum(["mock", "surepass"]).default("mock"),
  SUREPASS_TOKEN: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

export const env = Env.parse(process.env);
export const isProd = env.NODE_ENV === "production";

if (isProd && (env.JWT_SECRET.startsWith("dev-only") || env.OTP_PEPPER.startsWith("dev-only") || env.OTP_DEV_ECHO)) {
  throw new Error("Refusing to start in production with development secrets or OTP_DEV_ECHO");
}
