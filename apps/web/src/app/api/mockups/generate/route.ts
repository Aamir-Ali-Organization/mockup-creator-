import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError, toErrorResponse } from '@/lib/errors';
import { isGhlReady, markMockupGeneratedInGhl } from '@/lib/ghl';
import { resolveSampleFiles } from '@/lib/knowledge-store';
import { canGenerateMockups, generateMockupImage } from '@/lib/openai';
import { buildPromptFromQuoteWithKnowledge } from '@/lib/prompt-builder';
import { createSubmission, updateSubmission } from '@/lib/submission-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  contactId: z.string().optional().nullable(),
  fleadid: z.string().optional().nullable(),
  submissionId: z.string().optional().nullable(),
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
  let submissionId: string | null = null;

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
    submissionId = parsed.data.submissionId ?? null;

    // One-mockup guard via GHL custom field (unless force).
    if (!force && fleadid && isGhlReady()) {
      const { resolveLeadByFleadid } = await import('@/lib/ghl');
      const existing = await resolveLeadByFleadid(fleadid);
      if (existing.mockupAlreadyGenerated) {
        if (submissionId) {
          await updateSubmission(submissionId, {
            status: 'skipped',
            skipMockup: true,
            contactId: existing.contactId || contactId,
          }).catch(() => undefined);
        }
        return Response.json({
          success: true,
          skipped: true,
          message: 'Mockup already generated for this lead',
          contactId: existing.contactId,
          submissionId,
          imageDataUrl: undefined,
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

    if (!submissionId) {
      try {
        const created = await createSubmission({
          job,
          prompt,
          payload,
          contactId,
          fleadid,
          knowledgeProfileId: profile.id,
        });
        submissionId = created.id;
      } catch (logError) {
        console.error('[mockups/generate] failed to create submission log:', logError);
      }
    } else {
      await updateSubmission(submissionId, {
        status: 'generating',
        prompt,
        payload,
        knowledgeProfileId: profile.id,
        contactId,
        fleadid,
      }).catch(() => undefined);
    }

    const sampleFiles = await resolveSampleFiles(profile);
    const image = await generateMockupImage(prompt, sampleFiles);

    if (submissionId) {
      await updateSubmission(submissionId, {
        status: 'ready',
        prompt,
        payload,
        model: image.model,
        usedSamples: image.usedSamples,
        imageDataUrl: image.dataUrl,
        contactId,
        fleadid,
        knowledgeProfileId: profile.id,
      }).catch((logError) => {
        console.error('[mockups/generate] failed to update submission:', logError);
      });
    }

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
      submissionId,
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
    if (submissionId) {
      await updateSubmission(submissionId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Mockup generation failed',
      }).catch(() => undefined);
    }
    return toErrorResponse(error);
  }
}
