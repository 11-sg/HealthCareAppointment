import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load from root .env or server .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  // Server & Network
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().optional(),
  API_PREFIX: z.string().default('/api'),

  // Authentication & Cryptography
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters for security').default('careflow_dev_jwt_secret_change_in_prod_12345'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),

  // Database Persistence
  DATABASE_FILE: z.string().default(path.resolve(__dirname, '../../healthcare.db')),
  SQLITE_BUSY_TIMEOUT_MS: z.coerce.number().default(5000),

  // LLM AI Triage & Clinical Care
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  // Google Calendar Integration
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:5000/api/calendar/callback'),
  GOOGLE_REFRESH_TOKEN: z.string().default(''),

  // Email Notifications & SMTP Outbox
  EMAIL_SERVICE_MODE: z.enum(['ethereal', 'smtp', 'log']).default('ethereal'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('"CareFlow Health" <notifications@careflow.com>'),

  // Practice Rules & Background Workers
  SLOT_HOLD_DURATION_MINUTES: z.coerce.number().default(5),
  MEDICATION_REMINDER_CRON: z.string().default('*/15 * * * *'),
  EMAIL_RETRY_CRON: z.string().default('*/2 * * * *'),
  SLOT_HOLD_CLEANUP_CRON: z.string().default('* * * * *'),
  APPOINTMENT_REMINDER_CRON: z.string().default('0 * * * *'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variable configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Fatal: Invalid environment configuration in production.');
  }
}

export const env = parsed.success ? parsed.data : envSchema.parse({});

/**
 * Security Auditor: Verifies secrets posture at server bootstrap
 */
export function auditSecurityEnvironment(): { warnings: string[]; isSecure: boolean } {
  const warnings: string[] = [];

  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.includes('dev_jwt_secret')) {
      warnings.push('CRITICAL: JWT_SECRET is using default insecure value in production! Set a cryptographically secure 32+ character key.');
    }
    if (env.EMAIL_SERVICE_MODE === 'ethereal') {
      warnings.push('NOTICE: EMAIL_SERVICE_MODE is set to "ethereal". Production deployments should configure SMTP credentials.');
    }
    if (!env.GEMINI_API_KEY) {
      warnings.push('NOTICE: GEMINI_API_KEY is not set. Clinical symptom triage will run in rule-based heuristic fallback mode.');
    }
  }

  return {
    warnings,
    isSecure: warnings.filter(w => w.startsWith('CRITICAL')).length === 0,
  };
}
