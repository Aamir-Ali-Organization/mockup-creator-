import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  UPLOAD_DIR: z.string().default('../../uploads'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_IMAGE_MODEL: z.string().default('gpt-image-1'),
  OPENAI_IMAGE_SIZE: z.string().default('1024x1024'),
  AUTO_GENERATE_MOCKUP: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GHL_API_KEY: z.string().optional().default(''),
  GHL_LOCATION_ID: z.string().optional().default(''),
  GHL_API_BASE: z.string().default('https://services.leadconnectorhq.com'),
  GHL_FACEBOOK_LEAD_FIELD: z.string().default('facebook_lead_id'),
  GHL_MOCKUP_GENERATED_FIELD: z.string().default('mockup_generated'),
  GHL_MOCKUP_IMAGE_FIELD: z.string().default('mockup_image'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const uploadDir = path.isAbsolute(parsed.data.UPLOAD_DIR)
  ? parsed.data.UPLOAD_DIR
  : path.resolve(process.cwd(), parsed.data.UPLOAD_DIR);

export const env = {
  ...parsed.data,
  UPLOAD_DIR: uploadDir,
};
