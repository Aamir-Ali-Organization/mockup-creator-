import { z } from 'zod';
import {
  ACCESSORIES,
  AGE_GROUPS,
  GENDERS,
  LOGO_ATTACH_OPTION,
  LOGO_CREATION_OPTIONS,
  MIN_UNIFORM_QUANTITY,
  QUOTE_STATUSES,
  PUBLIC_SPORTS,
  REFERRAL_SOURCES,
} from './constants.js';

function hasFileList(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.length > 0;
  if ('length' in value && typeof (value as { length: unknown }).length === 'number') {
    return (value as { length: number }).length > 0;
  }
  return false;
}

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

/** Select placeholders submit "" — treat as missing so we never show raw Zod enum text. */
function requiredSelect<T extends readonly [string, ...string[]]>(values: T, message: string) {
  return z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.enum(values, {
      errorMap: () => ({ message }),
    }),
  );
}

function requiredText(emptyMessage: string, minLength = 1, shortMessage = emptyMessage) {
  return z.string().trim().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: emptyMessage });
      return;
    }
    if (value.length < minLength) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: shortMessage });
    }
  });
}

export const quoteFormSchema = z.object({
  customerName: requiredText('Full name is required', 2, 'Enter your full name'),
  email: z.string().trim().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email is required' });
      return;
    }
    if (!z.string().email().safeParse(value).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email' });
    }
  }),
  phone: z.string().trim().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone is required' });
      return;
    }
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length === 11) digits = digits.slice(1);
    if (digits.length !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a 10-digit US phone like (239) 555-0100',
      });
    }
  }),
  teamName: requiredText('Team name is required', 2, 'Enter a team name'),
  sport: requiredSelect(PUBLIC_SPORTS, 'Select a sport'),
  gender: requiredSelect(GENDERS, 'Select a gender'),
  ageGroup: requiredSelect(AGE_GROUPS, 'Select youth or adult'),
  primaryColor: requiredText('Primary color is required'),
  secondaryColor: requiredText('Secondary color is required'),
  alternateColor: z.string().trim().optional().default(''),
  quantity: z.coerce
    .number({
      required_error: 'Quantity is required',
      invalid_type_error: 'Quantity must be a number',
    })
    .int('Quantity must be a whole number')
    .min(MIN_UNIFORM_QUANTITY, `Minimum order is ${MIN_UNIFORM_QUANTITY} uniforms`),
  accessories: z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value) return [value];
    return [];
  }, z.array(z.enum(ACCESSORIES))),
  rosterInfo: z.string().trim().optional().default(''),
  rosterFile: z.any().optional(),
  logoCreation: z.union([z.enum(LOGO_CREATION_OPTIONS), z.literal('')]).optional(),
  logoFile: z.any().optional(),
  referralSource: requiredSelect(REFERRAL_SOURCES, 'Tell us how you heard about us'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Consent is required to submit' }),
  }),
}).superRefine((data, ctx) => {
  if (data.logoCreation === LOGO_ATTACH_OPTION && !hasFileList(data.logoFile)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Attach your logo file',
      path: ['logoFile'],
    });
  }
});

export const createQuoteBodySchema = z.object({
  customerName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  teamName: z.string().trim().min(2),
  sport: z.enum(PUBLIC_SPORTS),
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
