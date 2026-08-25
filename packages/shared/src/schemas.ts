import { z } from 'zod';
import {
  ACCESSORIES,
  AGE_GROUPS,
  GENDERS,
  LOGO_ATTACH_OPTION,
  LOGO_COLOR_SOURCE_OPTIONS,
  LOGO_COMPOSITION_OPTIONS,
  LOGO_CREATE_OPTION,
  LOGO_CREATION_OPTIONS,
  LOGO_VIBE_OPTIONS,
  MIN_UNIFORM_QUANTITY,
  PUBLIC_SPORTS,
  QUOTE_STATUSES,
  REFERRAL_SOURCES,
  SHIRT_STYLES,
  SHIRT_TYPES,
  SHORT_TYPES,
  genderLocksAdult,
  logoCompositionNeedsIcon,
  logoCompositionNeedsText,
  sportNeedsGarmentDetails,
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

function optionalSelect<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? '' : value),
    z.union([z.enum(values), z.literal('')]),
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

export const quoteFormSchema = z
  .object({
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
    shirtStyle: optionalSelect(SHIRT_STYLES),
    shirtType: optionalSelect(SHIRT_TYPES),
    shortType: optionalSelect(SHORT_TYPES),
    accessories: z.preprocess((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value) return [value];
      return [];
    }, z.array(z.enum(ACCESSORIES))),
    rosterInfo: z.string().trim().optional().default(''),
    rosterFile: z.any().optional(),
    logoCreation: z.union([z.enum(LOGO_CREATION_OPTIONS), z.literal('')]).optional(),
    logoFile: z.any().optional(),
    logoComposition: optionalSelect(LOGO_COMPOSITION_OPTIONS),
    logoText: z.string().trim().optional().default(''),
    logoIcon: z.string().trim().optional().default(''),
    logoColorSource: optionalSelect(LOGO_COLOR_SOURCE_OPTIONS),
    logoPrimaryColor: z.string().trim().optional().default(''),
    logoSecondaryColor: z.string().trim().optional().default(''),
    logoAlternateColor: z.string().trim().optional().default(''),
    logoVibe: optionalSelect(LOGO_VIBE_OPTIONS),
    logoNotes: z.string().trim().optional().default(''),
    referralSource: requiredSelect(REFERRAL_SOURCES, 'Tell us how you heard about us'),
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Consent is required to submit' }),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.logoCreation === LOGO_ATTACH_OPTION && !hasFileList(data.logoFile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Attach your logo file',
        path: ['logoFile'],
      });
    }

    if (data.logoCreation === LOGO_CREATE_OPTION) {
      if (!data.logoComposition) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a logo type',
          path: ['logoComposition'],
        });
      }
      if (!data.logoVibe) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a logo style',
          path: ['logoVibe'],
        });
      }
      if (!data.logoColorSource) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select logo colors',
          path: ['logoColorSource'],
        });
      }
      if (data.logoColorSource === 'I want specific logo colors') {
        if (!data.logoPrimaryColor?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pick a primary logo color',
            path: ['logoPrimaryColor'],
          });
        }
        if (!data.logoSecondaryColor?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pick a secondary logo color',
            path: ['logoSecondaryColor'],
          });
        }
      }
      if (data.logoComposition && logoCompositionNeedsText(data.logoComposition)) {
        if (!data.logoText?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'What text should appear on the logo?',
            path: ['logoText'],
          });
        }
      }
      if (data.logoComposition && logoCompositionNeedsIcon(data.logoComposition)) {
        if (!data.logoIcon?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Describe the icon or mascot',
            path: ['logoIcon'],
          });
        }
      }
    }

    if (genderLocksAdult(data.gender) && data.ageGroup !== 'Adult') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mens and Womens use Adult sizing',
        path: ['ageGroup'],
      });
    }

    if (sportNeedsGarmentDetails(data.sport)) {
      if (!data.shirtStyle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a shirt style',
          path: ['shirtStyle'],
        });
      }
      if (!data.shirtType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a shirt type',
          path: ['shirtType'],
        });
      }
      if (!data.shortType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a short type',
          path: ['shortType'],
        });
      }
    }
  });

export const createQuoteBodySchema = z
  .object({
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
    shirtStyle: z.string().optional().nullable().default(''),
    shirtType: z.string().optional().nullable().default(''),
    shortType: z.string().optional().nullable().default(''),
    accessories: z.array(z.string()).default([]),
    rosterInfo: z.string().trim().optional().default(''),
    logoCreation: z.string().optional().nullable(),
    logoComposition: z.string().optional().nullable().default(''),
    logoText: z.string().optional().nullable().default(''),
    logoIcon: z.string().optional().nullable().default(''),
    logoColorSource: z.string().optional().nullable().default(''),
    logoPrimaryColor: z.string().optional().nullable().default(''),
    logoSecondaryColor: z.string().optional().nullable().default(''),
    logoAlternateColor: z.string().optional().nullable().default(''),
    logoVibe: z.string().optional().nullable().default(''),
    logoNotes: z.string().optional().nullable().default(''),
    referralSource: z.enum(REFERRAL_SOURCES),
    rosterFile: z.string().optional().nullable(),
    logoFile: z.string().optional().nullable(),
    fleadid: z.string().optional().nullable(),
    ghlContactId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (genderLocksAdult(data.gender) && data.ageGroup !== 'Adult') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mens and Womens use Adult sizing',
        path: ['ageGroup'],
      });
    }
    if (sportNeedsGarmentDetails(data.sport)) {
      if (!(SHIRT_STYLES as readonly string[]).includes(data.shirtStyle || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a shirt style',
          path: ['shirtStyle'],
        });
      }
      if (!(SHIRT_TYPES as readonly string[]).includes(data.shirtType || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a shirt type',
          path: ['shirtType'],
        });
      }
      if (!(SHORT_TYPES as readonly string[]).includes(data.shortType || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a short type',
          path: ['shortType'],
        });
      }
    }
    if (data.logoCreation === LOGO_CREATE_OPTION) {
      if (!(LOGO_COMPOSITION_OPTIONS as readonly string[]).includes(data.logoComposition || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a logo type',
          path: ['logoComposition'],
        });
      }
      if (!(LOGO_VIBE_OPTIONS as readonly string[]).includes(data.logoVibe || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a logo style',
          path: ['logoVibe'],
        });
      }
      if (
        !(LOGO_COLOR_SOURCE_OPTIONS as readonly string[]).includes(data.logoColorSource || '')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select logo colors',
          path: ['logoColorSource'],
        });
      }
      if (data.logoColorSource === 'I want specific logo colors') {
        if (!String(data.logoPrimaryColor || '').trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pick a primary logo color',
            path: ['logoPrimaryColor'],
          });
        }
        if (!String(data.logoSecondaryColor || '').trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pick a secondary logo color',
            path: ['logoSecondaryColor'],
          });
        }
      }
      if (
        data.logoComposition &&
        logoCompositionNeedsText(data.logoComposition) &&
        !String(data.logoText || '').trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'What text should appear on the logo?',
          path: ['logoText'],
        });
      }
      if (
        data.logoComposition &&
        logoCompositionNeedsIcon(data.logoComposition) &&
        !String(data.logoIcon || '').trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Describe the icon or mascot',
          path: ['logoIcon'],
        });
      }
    }
  });

export const quoteResponseSchema = z.object({
  id: z.string(),
  status: quoteStatusSchema,
  aiPrompt: z.string().nullable(),
  mockupImages: z.array(z.string()),
  createdAt: z.string(),
  customerName: z.string(),
  email: z.string(),
  phone: z.string(),
  teamName: z.string(),
  sport: z.string(),
  gender: z.string(),
  ageGroup: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  alternateColor: z.string().optional(),
  quantity: z.number(),
  shirtStyle: z.string().optional().nullable(),
  shirtType: z.string().optional().nullable(),
  shortType: z.string().optional().nullable(),
  accessories: z.array(z.string()).default([]),
  rosterInfo: z.string().optional(),
  logoCreation: z.string().optional().nullable(),
  referralSource: z.string(),
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
  logoCreation: z.string().optional().nullable(),
  hasLogoFile: z.boolean().optional().default(false),
  rosterInfo: z.string().optional(),
  shirtStyle: z.string().optional().default(''),
  shirtType: z.string().optional().default(''),
  shortType: z.string().optional().default(''),
  logoComposition: z.string().optional().default(''),
  logoText: z.string().optional().default(''),
  logoIcon: z.string().optional().default(''),
  logoColorSource: z.string().optional().default(''),
  logoPrimaryColor: z.string().optional().default(''),
  logoSecondaryColor: z.string().optional().default(''),
  logoAlternateColor: z.string().optional().default(''),
  logoVibe: z.string().optional().default(''),
  logoNotes: z.string().optional().default(''),
});

export type AiPromptPayload = z.infer<typeof aiPromptPayloadSchema>;
