import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().default('http://localhost:54321'),
  SUPABASE_ANON_KEY: z.string().min(1).default('test-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('test-service-role-key'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  OSRM_BASE_URL: z.string().url().default('https://router.project-osrm.org'),
  DUPLICATE_RADIUS_METERS: z.coerce.number().positive().default(100),
  DUPLICATE_LOOKBACK_HOURS: z.coerce.number().positive().default(72),
});

export const env = EnvSchema.parse(process.env);
