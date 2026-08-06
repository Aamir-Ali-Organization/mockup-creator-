import { createQuoteBodySchema } from '@mockup/shared';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { buildPromptFromQuote } from './ai-prompt-builder.js';
import {
  canGenerateMockups,
  generateMockupForQuote,
} from './openai-mockup.service.js';
import { env } from '../config/env.js';
import { isGhlReady, resolveLeadByFleadid, upsertLeadInGhl } from './ghl.service.js';

function serializeQuote(quote: {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  teamName: string;
  sport: string;
  gender: string;
  ageGroup: string;
  primaryColor: string;
  secondaryColor: string;
  alternateColor: string;
  quantity: number;
  accessories: string[];
  rosterInfo: string;
  rosterFile: string | null;
  logoFile: string | null;
  logoCreation: string | null;
  referralSource: string;
  status: string;
  aiPrompt: string | null;
  mockupImages: string[];
  createdAt: Date;
}) {
  return {
    ...quote,
    mockupImages: quote.mockupImages.map((file) =>
      file.startsWith('/uploads/') || file.startsWith('http') ? file : `/uploads/${file}`,
    ),
    createdAt: quote.createdAt.toISOString(),
  };
}

function parseAccessories(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export async function createQuoteFromMultipart(fields: Record<string, unknown>) {
  const accessories = parseAccessories(fields.accessories);

  const parsed = createQuoteBodySchema.safeParse({
    ...fields,
    accessories,
    quantity: fields.quantity,
    logoCreation: fields.logoCreation || undefined,
    rosterFile: fields.rosterFile || null,
    logoFile: fields.logoFile || null,
  });

  if (!parsed.success) {
    throw new AppError('Validation failed', 400, parsed.error.flatten());
  }

  const data = parsed.data;
  const fleadid =
    typeof fields.fleadid === 'string' && fields.fleadid.trim()
      ? fields.fleadid.trim()
      : data.fleadid || null;
  const ghlContactId =
    typeof fields.ghlContactId === 'string' && fields.ghlContactId.trim()
      ? fields.ghlContactId.trim()
      : data.ghlContactId || null;

  // One-mockup guard: if this Facebook lead already has a mockup in GHL, skip OpenAI.
  let skipMockup = false;
  if (fleadid && isGhlReady()) {
    const existingLead = await resolveLeadByFleadid(fleadid);
    skipMockup = existingLead.mockupAlreadyGenerated;
  }

  const { prompt } = buildPromptFromQuote({
    teamName: data.teamName,
    sport: data.sport,
    gender: data.gender,
    ageGroup: data.ageGroup,
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    alternateColor: data.alternateColor,
    quantity: data.quantity,
    accessories: data.accessories,
    logoFile: data.logoFile,
    logoCreation: data.logoCreation || null,
    rosterInfo: data.rosterInfo,
  });

  const shouldAutoGenerate =
    !skipMockup && env.AUTO_GENERATE_MOCKUP && canGenerateMockups();

  // Always upsert into GHL (public traffic = new contact; missing fleadid contact = new contact).
  let savedGhlContactId: string | null = ghlContactId;
  if (isGhlReady()) {
    try {
      const ghlResult = await upsertLeadInGhl({
        fleadid,
        contactId: ghlContactId,
        customerName: data.customerName,
        email: data.email,
        phone: data.phone,
        teamName: data.teamName,
        sport: data.sport,
        gender: data.gender,
        ageGroup: data.ageGroup,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        alternateColor: data.alternateColor,
        quantity: data.quantity,
        accessories: data.accessories,
        rosterInfo: data.rosterInfo,
        logoCreation: data.logoCreation || null,
        referralSource: data.referralSource,
        mockupGenerated: skipMockup ? true : false,
      });
      savedGhlContactId = ghlResult.contactId;
    } catch (error) {
      console.error('[ghl] Failed to upsert lead', error);
      // Form should still succeed even if GHL is temporarily unavailable.
    }
  }

  const quote = await prisma.quote.create({
    data: {
      customerName: data.customerName,
      email: data.email,
      phone: data.phone,
      teamName: data.teamName,
      sport: data.sport,
      gender: data.gender,
      ageGroup: data.ageGroup,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      alternateColor: data.alternateColor ?? '',
      quantity: data.quantity,
      accessories: data.accessories,
      rosterInfo: data.rosterInfo ?? '',
      rosterFile: data.rosterFile ?? null,
      logoFile: data.logoFile ?? null,
      logoCreation: data.logoCreation || null,
      referralSource: data.referralSource,
      status: shouldAutoGenerate ? 'PROCESSING' : skipMockup ? 'MOCKUP_READY' : 'PENDING',
      aiPrompt: prompt,
      mockupImages: [],
    },
  });

  if (shouldAutoGenerate) {
    void generateMockupForQuote(quote.id)
      .then(async (result) => {
        if (!isGhlReady() || !savedGhlContactId) return;
        const image = result.quote.mockupImages[0];
        if (!image) return;
        await upsertLeadInGhl({
          fleadid,
          contactId: savedGhlContactId,
          customerName: data.customerName,
          email: data.email,
          phone: data.phone,
          teamName: data.teamName,
          sport: data.sport,
          gender: data.gender,
          ageGroup: data.ageGroup,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          alternateColor: data.alternateColor,
          quantity: data.quantity,
          accessories: data.accessories,
          rosterInfo: data.rosterInfo,
          logoCreation: data.logoCreation || null,
          referralSource: data.referralSource,
          mockupGenerated: true,
          mockupImageUrl: image.startsWith('http') ? image : `/uploads/${image}`,
        });
      })
      .catch((error: unknown) => {
        console.error(`[mockup] Failed for quote ${quote.id}`, error);
      });
  }

  return {
    ...serializeQuote(quote),
    ghlContactId: savedGhlContactId,
    fleadid,
    mockupSkipped: skipMockup,
  };
}

export async function listQuotes() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return quotes.map(serializeQuote);
}

export async function getQuoteById(id: string) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    throw new AppError('Quote not found', 404);
  }
  return serializeQuote(quote);
}
