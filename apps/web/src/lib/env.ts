import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_IMAGE_MODEL: z.string().default('gpt-image-1'),
  OPENAI_IMAGE_SIZE: z.string().default('1024x1024'),
  AUTO_GENERATE_MOCKUP: z
    .string()
    .optional()
    .default('true')
    .transform((value) => value !== 'false'),
  GHL_API_KEY: z.string().optional().default(''),
  GHL_LOCATION_ID: z.string().optional().default(''),
  GHL_API_BASE: z.string().default('https://services.leadconnectorhq.com'),
  GHL_FACEBOOK_LEAD_FIELD: z.string().default('facebook_lead_id'),
  GHL_MOCKUP_GENERATED_FIELD: z.string().default('mockup_generated'),
  GHL_MOCKUP_IMAGE_FIELD: z.string().default('mockup_image'),
  /** Knowledge admin login (required for /admin/knowledge). */
  KNOWLEDGE_ADMIN_USER: z.string().default('admin@admin.com'),
  KNOWLEDGE_ADMIN_PASSWORD: z.string().default('Admin@123'),
  /** Optional legacy bearer secret for API clients. */
  KNOWLEDGE_ADMIN_SECRET: z.string().optional().default(''),
  /** Vercel Blob token — required for persistent submissions on Vercel. */
  BLOB_READ_WRITE_TOKEN: z.string().optional().default(''),
});

export const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL,
  OPENAI_IMAGE_SIZE: process.env.OPENAI_IMAGE_SIZE,
  AUTO_GENERATE_MOCKUP: process.env.AUTO_GENERATE_MOCKUP,
  GHL_API_KEY: process.env.GHL_API_KEY,
  GHL_LOCATION_ID: process.env.GHL_LOCATION_ID,
  GHL_API_BASE: process.env.GHL_API_BASE,
  GHL_FACEBOOK_LEAD_FIELD: process.env.GHL_FACEBOOK_LEAD_FIELD,
  GHL_MOCKUP_GENERATED_FIELD: process.env.GHL_MOCKUP_GENERATED_FIELD,
  GHL_MOCKUP_IMAGE_FIELD: process.env.GHL_MOCKUP_IMAGE_FIELD,
  KNOWLEDGE_ADMIN_USER: process.env.KNOWLEDGE_ADMIN_USER,
  KNOWLEDGE_ADMIN_PASSWORD: process.env.KNOWLEDGE_ADMIN_PASSWORD,
  KNOWLEDGE_ADMIN_SECRET: process.env.KNOWLEDGE_ADMIN_SECRET,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
});
