import { z } from 'zod';
import { buildLogoReferencePromptSuffix, LOGO_CREATE_OPTION } from '@mockup/shared';
import { getClientIp } from '@/lib/client-ip';
import { env } from '@/lib/env';
import { AppError, toErrorResponse } from '@/lib/errors';
import { isGhlReady, markMockupGeneratedInGhl } from '@/lib/ghl';
import {
  canGenerateNewMockup,
  consumePaidEntitlement,
  markFreeMockupUsed,
} from '@/lib/mockup-quota';
import { buildStandaloneLogoPrompt } from '@/lib/logo-brief';
import {
  canGenerateMockups,
  generateLogoImage,
  generateMockupImage,
} from '@/lib/openai';
import { buildPromptFromQuoteWithKnowledge } from '@/lib/prompt-builder';
import { getKnowledgeProfile, collectLogoReferenceSamples } from '@/lib/knowledge-store';
import {
  createSubmission,
  getSubmission,
  readSubmissionImage,
  readSubmissionLogo,
  saveSubmissionLogo,
  updateSubmission,
} from '@/lib/submission-store';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  contactId: z.string().optional().nullable(),
  fleadid: z.string().optional().nullable(),
  submissionId: z.string().optional().nullable(),
  paymentSessionId: z.string().optional().nullable(),
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
    shirtStyle: z.string().optional().nullable(),
    shirtType: z.string().optional().nullable(),
    shortType: z.string().optional().nullable(),
    logoCreation: z.string().optional().nullable(),
    logoComposition: z.string().optional().nullable(),
    logoText: z.string().optional().nullable(),
    logoIcon: z.string().optional().nullable(),
    logoColorSource: z.string().optional().nullable(),
    logoPrimaryColor: z.string().optional().nullable(),
    logoSecondaryColor: z.string().optional().nullable(),
    logoAlternateColor: z.string().optional().nullable(),
    logoVibe: z.string().optional().nullable(),
    logoNotes: z.string().optional().nullable(),
    referralSource: z.string(),
  }),
});

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new AppError('Invalid generated logo data URL', 500);
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function loadCachedMockupResult(submissionId: string): Promise<{
  imageDataUrl: string;
  logoDataUrl?: string;
} | null> {
  try {
    const existing = await getSubmission(submissionId);
    if (!existing.hasImage) return null;

    const image = await readSubmissionImage(submissionId);
    if (!image) return null;

    let imageDataUrl: string | null = null;
    if (image.redirectUrl) {
      const response = await fetch(image.redirectUrl);
      if (!response.ok) return null;
      const bytes = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || image.contentType || 'image/png';
      imageDataUrl = bufferToDataUrl(bytes, contentType);
    } else if (image.buffer.length > 0) {
      imageDataUrl = bufferToDataUrl(image.buffer, image.contentType || 'image/png');
    }
    if (!imageDataUrl) return null;

    let logoDataUrl: string | undefined;
    if (existing.hasLogo) {
      const logo = await readSubmissionLogo(submissionId);
      if (logo) {
        logoDataUrl = bufferToDataUrl(logo.buffer, logo.mimeType || 'image/png');
      }
    }

    return { imageDataUrl, logoDataUrl };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let submissionId: string | null = null;

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError('Invalid generate payload', 400, parsed.error.flatten());
    }

    const { job, contactId, fleadid, force, paymentSessionId } = parsed.data;
    submissionId = parsed.data.submissionId ?? null;

    // Refresh / revisit: return the already-saved free mockup instead of regenerating.
    if (!force && submissionId) {
      const cached = await loadCachedMockupResult(submissionId);
      if (cached) {
        console.info('[mockups/generate] returning cached mockup', submissionId);
        return Response.json({
          success: true,
          skipped: false,
          alreadyGenerated: true,
          message: 'Returning your existing free mockup',
          contactId,
          fleadid,
          submissionId,
          imageDataUrl: cached.imageDataUrl,
          logoDataUrl: cached.logoDataUrl,
        });
      }
    }

    if (!force && fleadid && isGhlReady()) {
      const { resolveLeadByFleadid } = await import('@/lib/ghl');
      const existing = await resolveLeadByFleadid(fleadid);
      if (existing.mockupAlreadyGenerated) {
        if (submissionId) {
          const cached = await loadCachedMockupResult(submissionId);
          if (cached) {
            console.info(
              '[mockups/generate] GHL already generated — returning cached',
              submissionId,
            );
            return Response.json({
              success: true,
              skipped: false,
              alreadyGenerated: true,
              message: 'Returning your existing free mockup',
              contactId: existing.contactId || contactId,
              fleadid,
              submissionId,
              imageDataUrl: cached.imageDataUrl,
              logoDataUrl: cached.logoDataUrl,
            });
          }

          await updateSubmission(submissionId, {
            status: 'skipped',
            skipMockup: true,
            contactId: existing.contactId || contactId,
          }).catch(() => undefined);
        }

        // Already generated, no cache, no payment → paywall (force alone does not bypass).
        if (!paymentSessionId?.trim()) {
          throw new AppError(
            'A free mockup was already generated for this lead. Pay to create another.',
            402,
            { requiresPayment: true },
          );
        }
        // Paid session present — fall through to generate another mockup.
      }
    }

    const ip = getClientIp(request);
    const quota = await canGenerateNewMockup({
      ip,
      paymentSessionId,
    });
    if (!quota.ok) {
      throw new AppError(quota.reason, 402, { requiresPayment: true });
    }

    if (!canGenerateMockups()) {
      throw new AppError('OPENAI_API_KEY is not configured', 503);
    }

    let hasLogoFile = false;
    let logoForOpenAi: {
      buffer: Buffer;
      filename: string;
      mimeType: string;
    } | null = null;
    let logoDataUrl: string | undefined;
    let logoPrompt: string | null = null;

    if (submissionId) {
      try {
        const existing = await getSubmission(submissionId);
        hasLogoFile = Boolean(existing.hasLogo);
        logoForOpenAi = await readSubmissionLogo(submissionId);
        hasLogoFile = Boolean(logoForOpenAi);
      } catch {
        // continue without logo
      }
    }

    const wantsCreatedLogo =
      job.logoCreation === LOGO_CREATE_OPTION && !hasLogoFile;

    // Step 1 — create logo from the questionnaire when needed.
    if (wantsCreatedLogo) {
      const sportProfile = await getKnowledgeProfile(job.sport);
      logoPrompt = buildStandaloneLogoPrompt(
        {
          teamName: job.teamName,
          sport: job.sport,
          primaryColor: job.primaryColor,
          secondaryColor: job.secondaryColor,
          alternateColor: job.alternateColor,
          logoComposition: job.logoComposition,
          logoText: job.logoText,
          logoIcon: job.logoIcon,
          logoColorSource: job.logoColorSource,
          logoPrimaryColor: job.logoPrimaryColor,
          logoSecondaryColor: job.logoSecondaryColor,
          logoAlternateColor: job.logoAlternateColor,
          logoVibe: job.logoVibe,
          logoNotes: job.logoNotes,
        },
        {
          instructions: sportProfile.logoInstructions,
          promptTemplate: sportProfile.logoPromptTemplate,
        },
      );

      const logoRefs = await collectLogoReferenceSamples(
        sportProfile,
        job.logoComposition,
        4,
      );
      const refSuffix = buildLogoReferencePromptSuffix(
        job.logoComposition || '',
        job.teamName,
        logoRefs.sampleCountForPrompt,
      );
      const logoPromptWithRefs = refSuffix ? `${logoPrompt} ${refSuffix}` : logoPrompt;

      console.info(
        '[mockups/generate] step1 logo for',
        job.teamName,
        job.sport,
        'samples=',
        logoRefs.sampleCountForPrompt,
        logoRefs.source,
      );
      const logoImage = await generateLogoImage(logoPromptWithRefs, logoRefs.samples);
      logoDataUrl = logoImage.dataUrl;
      const parsedLogo = dataUrlToBuffer(logoImage.dataUrl);
      logoForOpenAi = {
        buffer: parsedLogo.buffer,
        filename: 'generated-logo.png',
        mimeType: parsedLogo.mimeType,
      };
      hasLogoFile = true;

      if (submissionId) {
        await saveSubmissionLogo(submissionId, {
          buffer: parsedLogo.buffer,
          filename: 'generated-logo.png',
          mimeType: parsedLogo.mimeType,
        }).catch((error) => {
          console.error('[mockups/generate] failed to persist generated logo:', error);
        });
      }
    }

    // Step 2 — uniform mockup (uses logo file when available).
    const { prompt, payload, profile, sampleFiles, comboId } =
      await buildPromptFromQuoteWithKnowledge({
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
        hasLogoFile,
        logoFile: hasLogoFile ? 'attached' : null,
        rosterInfo: job.rosterInfo,
        shirtStyle: job.shirtStyle || '',
        shirtType: job.shirtType || '',
        shortType: job.shortType || '',
        logoComposition: job.logoComposition || '',
        logoText: job.logoText || '',
        logoIcon: job.logoIcon || '',
        logoColorSource: job.logoColorSource || '',
        logoPrimaryColor: job.logoPrimaryColor || '',
        logoSecondaryColor: job.logoSecondaryColor || '',
        logoAlternateColor: job.logoAlternateColor || '',
        logoVibe: job.logoVibe || '',
        logoNotes: job.logoNotes || '',
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
        if (logoForOpenAi && wantsCreatedLogo) {
          await saveSubmissionLogo(submissionId, logoForOpenAi).catch(() => undefined);
        }
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

    console.info(
      '[mockups/generate] step2 mockup samples',
      sampleFiles.length,
      'combo',
      comboId,
      'logo',
      Boolean(logoForOpenAi),
      'sport',
      profile.id,
    );
    const image = await generateMockupImage(prompt, sampleFiles, logoForOpenAi);

    if (submissionId) {
      await updateSubmission(submissionId, {
        status: 'ready',
        prompt: logoPrompt ? `LOGO PROMPT:\n${logoPrompt}\n\nMOCKUP PROMPT:\n${prompt}` : prompt,
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

    let paidCreditsRemaining: number | null = null;
    let paidCreditsTotal: number | null = null;

    if (quota.mode === 'paid' && paymentSessionId?.trim()) {
      const consumed = await consumePaidEntitlement(paymentSessionId.trim(), {
        submissionId,
        contactId,
      }).catch((error) => {
        console.error('[mockups/generate] failed to consume paid entitlement:', error);
        return null;
      });
      if (consumed) {
        paidCreditsRemaining = consumed.quantityRemaining ?? 0;
        paidCreditsTotal = consumed.quantityTotal ?? 1;
      }
    } else if (quota.mode === 'free') {
      await markFreeMockupUsed({
        ip,
        submissionId,
        contactId,
      }).catch((error) => {
        console.error('[mockups/generate] failed to mark free mockup used:', error);
      });
    }

    return Response.json({
      success: true,
      skipped: false,
      contactId,
      fleadid,
      submissionId,
      model: image.model,
      prompt,
      logoPrompt,
      payload,
      knowledgeProfileId: profile.id,
      usedSamples: image.usedSamples,
      usedLogo: image.usedLogo,
      imageDataUrl: image.dataUrl,
      logoDataUrl,
      autoGenerate: env.AUTO_GENERATE_MOCKUP,
      ghlWarning,
      paidCreditsRemaining,
      paidCreditsTotal,
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
