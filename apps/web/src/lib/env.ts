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
});
