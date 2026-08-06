import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError, toErrorResponse } from '@/lib/errors';
import { isGhlReady, upsertLeadInGhl } from '@/lib/ghl';
import { canGenerateMockups, generateMockupImage } from '@/lib/openai';
import { buildPromptFromQuote } from '@/lib/prompt-builder';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  contactId: z.string().optional().nullable(),
  fleadid: z.string().optional().nullable(),
  force: z.boolean().optional().default(false),
  job: z.object({
    customerName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    teamName: z.string(),
    sport: z.string(),
    gender: z.string(),
    ageGroup: z.string(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    alternateColor: z.string().optional().nullable(),
    quantity: z.number(),
    accessories: z.array(z.string()).default([]),
    rosterInfo: z.string().optional().nullable(),
    logoCreation: z.string().optional().nullable(),
    referralSource: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    if (!canGenerateMockups()) {
      throw new AppError('OPENAI_API_KEY is not configured', 503);
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError('Invalid generate payload', 400, parsed.error.flatten());
    }

    const { job, contactId, fleadid, force } = parsed.data;

    // One-mockup guard via GHL custom field (unless force).
    if (!force && fleadid && isGhlReady()) {
      const { resolveLeadByFleadid } = await import('@/lib/ghl');
      const existing = await resolveLeadByFleadid(fleadid);
      if (existing.mockupAlreadyGenerated) {
        return Response.json({
          success: true,
          skipped: true,
          message: 'Mockup already generated for this lead',
          contactId: existing.contactId,
          imageDataUrl: existing.raw
            ? undefined
            : undefined,
        });
      }
    }

    const { prompt, payload } = buildPromptFromQuote({
      teamName: job.teamName,
      sport: job.sport,
      gender: job.gender,
      ageGroup: job.ageGroup,
      primaryColor: job.primaryColor,
      secondaryColor: job.secondaryColor,
      alternateColor: job.alternateColor,
      quantity: job.quantity,
      accessories: job.accessories,
      logoCreation: job.logoCreation,
      rosterInfo: job.rosterInfo,
    });

    const image = await generateMockupImage(prompt);

    if (isGhlReady()) {
      await upsertLeadInGhl({
        fleadid,
        contactId,
        customerName: job.customerName,
        email: job.email,
        phone: job.phone,
        teamName: job.teamName,
        sport: job.sport,
        gender: job.gender,
        ageGroup: job.ageGroup,
        primaryColor: job.primaryColor,
        secondaryColor: job.secondaryColor,
        alternateColor: job.alternateColor || '',
        quantity: job.quantity,
        accessories: job.accessories,
        rosterInfo: job.rosterInfo || '',
        logoCreation: job.logoCreation,
        referralSource: job.referralSource,
        mockupGenerated: true,
        // Store marker; full data URL may be too large for custom fields.
        mockupImageUrl: 'generated',
      });
    }

    return Response.json({
      success: true,
      skipped: false,
      contactId,
      fleadid,
      model: image.model,
      prompt,
      payload,
      imageDataUrl: image.dataUrl,
      autoGenerate: env.AUTO_GENERATE_MOCKUP,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
