import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError, toErrorResponse } from '@/lib/errors';
import { isGhlReady, markMockupGeneratedInGhl } from '@/lib/ghl';
import { resolveSampleAbsolutePaths } from '@/lib/knowledge-store';
import { canGenerateMockups, generateMockupImage } from '@/lib/openai';
import { buildPromptFromQuoteWithKnowledge } from '@/lib/prompt-builder';

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

    const { prompt, payload, profile } = await buildPromptFromQuoteWithKnowledge({
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

    const sampleFiles = await resolveSampleAbsolutePaths(profile);
    const image = await generateMockupImage(prompt, sampleFiles);

    // Never fail the mockup response if GHL update breaks — quote + image already succeeded.
    let ghlWarning: string | null = null;
    if (isGhlReady()) {
      try {
        await markMockupGeneratedInGhl({ contactId, fleadid });
      } catch (ghlError) {
        ghlWarning =
          ghlError instanceof Error
            ? ghlError.message
            : 'Could not mark mockup as generated in GHL';
        console.error('[mockups/generate] GHL update failed:', ghlError);
      }
    }

    return Response.json({
      success: true,
      skipped: false,
      contactId,
      fleadid,
      model: image.model,
      prompt,
      payload,
      knowledgeProfileId: profile.id,
      usedSamples: image.usedSamples,
      imageDataUrl: image.dataUrl,
      autoGenerate: env.AUTO_GENERATE_MOCKUP,
      ghlWarning,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
