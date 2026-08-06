import { z } from 'zod';
import {
  ACCESSORIES,
  AGE_GROUPS,
  GENDERS,
  LOGO_CREATION_OPTIONS,
  MIN_UNIFORM_QUANTITY,
  QUOTE_STATUSES,
  REFERRAL_SOURCES,
  SPORTS,
} from './constants.js';

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

export const quoteFormSchema = z.object({
  customerName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().min(7, 'Enter a valid phone number'),
  teamName: z.string().trim().min(2, 'Team name is required'),
  sport: z.enum(SPORTS, { required_error: 'Select a sport' }),
  gender: z.enum(GENDERS, { required_error: 'Select a gender' }),
  ageGroup: z.enum(AGE_GROUPS, { required_error: 'Select youth or adult' }),
  primaryColor: z.string().trim().min(1, 'Primary color is required'),
  secondaryColor: z.string().trim().min(1, 'Secondary color is required'),
  alternateColor: z.string().trim().optional().default(''),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int()
    .min(MIN_UNIFORM_QUANTITY, `Minimum order is ${MIN_UNIFORM_QUANTITY} uniforms`),
  accessories: z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value) return [value];
    return [];
  }, z.array(z.enum(ACCESSORIES))),
  rosterInfo: z.string().trim().optional().default(''),
  logoCreation: z.union([z.enum(LOGO_CREATION_OPTIONS), z.literal('')]).optional(),
  referralSource: z.enum(REFERRAL_SOURCES, {
    required_error: 'Tell us how you heard about us',
  }),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Consent is required to submit' }),
  }),
});

export const createQuoteBodySchema = z.object({
  customerName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  teamName: z.string().trim().min(2),
  sport: z.enum(SPORTS),
  gender: z.enum(GENDERS),
  ageGroup: z.enum(AGE_GROUPS),
  primaryColor: z.string().trim().min(1),
  secondaryColor: z.string().trim().min(1),
  alternateColor: z.string().trim().optional().default(''),
  quantity: z.coerce.number().int().min(MIN_UNIFORM_QUANTITY),
  accessories: z.array(z.string()).default([]),
  rosterInfo: z.string().trim().optional().default(''),
  logoCreation: z.string().optional().nullable(),
  referralSource: z.enum(REFERRAL_SOURCES),
  rosterFile: z.string().optional().nullable(),
  logoFile: z.string().optional().nullable(),
  fleadid: z.string().optional().nullable(),
  ghlContactId: z.string().optional().nullable(),
});

export const quoteResponseSchema = createQuoteBodySchema.extend({
  id: z.string(),
  status: quoteStatusSchema,
  aiPrompt: z.string().nullable(),
  mockupImages: z.array(z.string()),
  createdAt: z.string(),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
export type CreateQuoteBody = z.infer<typeof createQuoteBodySchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;

export const aiPromptPayloadSchema = z.object({
  team: z.object({
    name: z.string(),
    sport: z.string(),
    gender: z.string(),
    ageGroup: z.string(),
  }),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    alternate: z.string(),
  }),
  quantity: z.number(),
  accessories: z.array(z.string()),
  logo: z.boolean(),
  logoCreation: z.string().optional(),
  rosterInfo: z.string().optional(),
});

export type AiPromptPayload = z.infer<typeof aiPromptPayloadSchema>;
