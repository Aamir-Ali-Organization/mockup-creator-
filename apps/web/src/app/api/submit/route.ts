import { createQuoteBodySchema, LOGO_ATTACH_OPTION } from '@mockup/shared';
import { env } from '@/lib/env';
import { toErrorResponse, AppError } from '@/lib/errors';
import { isGhlReady, resolveLeadByFleadid, upsertLeadInGhl } from '@/lib/ghl';
import { canGenerateMockups } from '@/lib/openai';
import { buildPromptFromQuoteWithKnowledge } from '@/lib/prompt-builder';
import { createSubmission, saveSubmissionLogo } from '@/lib/submission-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseAccessories(value: FormDataEntryValue[]): string[] {
  return value.map(String).filter(Boolean);
}

function asUploadFile(value: FormDataEntryValue | null): File | null {
  if (!value || typeof value === 'string') return null;
  if (!(value instanceof File) || value.size <= 0) return null;
  return value;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const accessories = parseAccessories(formData.getAll('accessories'));
    const logoUpload = asUploadFile(formData.get('logoFile'));

    const parsed = createQuoteBodySchema.safeParse({
      customerName: formData.get('customerName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      teamName: formData.get('teamName'),
      sport: formData.get('sport'),
      gender: formData.get('gender'),
      ageGroup: formData.get('ageGroup'),
      primaryColor: formData.get('primaryColor'),
      secondaryColor: formData.get('secondaryColor'),
      alternateColor: formData.get('alternateColor') || '',
      quantity: formData.get('quantity'),
      accessories,
      rosterInfo: formData.get('rosterInfo') || '',
      shirtStyle: formData.get('shirtStyle') || '',
      shirtType: formData.get('shirtType') || '',
      shortType: formData.get('shortType') || '',
      logoCreation: formData.get('logoCreation') || undefined,
      referralSource: formData.get('referralSource'),
      fleadid: formData.get('fleadid') || null,
      ghlContactId: formData.get('ghlContactId') || null,
      rosterFile: null,
      logoFile: logoUpload ? 'attached' : null,
    });

    if (!parsed.success) {
      throw new AppError('Validation failed', 400, parsed.error.flatten());
    }

    const data = parsed.data;
    if (data.logoCreation === LOGO_ATTACH_OPTION && !logoUpload) {
      throw new AppError('Attach your logo file', 400);
    }

    const fleadid = data.fleadid || null;
    const ghlContactId = data.ghlContactId || null;

    let skipMockup = false;
    if (fleadid && isGhlReady()) {
      const existing = await resolveLeadByFleadid(fleadid);
      skipMockup = existing.mockupAlreadyGenerated;
    }

    const { prompt, payload, profile } = await buildPromptFromQuoteWithKnowledge({
      teamName: data.teamName,
      sport: data.sport,
      gender: data.gender,
      ageGroup: data.ageGroup,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      alternateColor: data.alternateColor,
      quantity: data.quantity,
      accessories: data.accessories,
      logoFile: logoUpload ? 'attached' : null,
      hasLogoFile: Boolean(logoUpload),
      logoCreation: data.logoCreation || null,
      rosterInfo: data.rosterInfo,
      shirtStyle: data.shirtStyle || '',
      shirtType: data.shirtType || '',
      shortType: data.shortType || '',
    });

    let contactId = ghlContactId;
    if (isGhlReady()) {
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
      shirtStyle: data.shirtStyle || '',
      shirtType: data.shirtType || '',
      shortType: data.shortType || '',
      logoCreation: data.logoCreation || null,
      referralSource: data.referralSource,
      mockupGenerated: skipMockup,
    });
      contactId = ghlResult.contactId;
    }

    const job = {
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
      shirtStyle: data.shirtStyle || '',
      shirtType: data.shirtType || '',
      shortType: data.shortType || '',
      logoCreation: data.logoCreation || null,
      referralSource: data.referralSource,
    };

    let submissionId: string | null = null;
    try {
      const submission = await createSubmission({
        job,
        prompt,
        payload,
        contactId,
        fleadid,
        knowledgeProfileId: profile.id,
        skipMockup,
      });
      submissionId = submission.id;

      if (logoUpload) {
        const buffer = Buffer.from(await logoUpload.arrayBuffer());
        await saveSubmissionLogo(submission.id, {
          buffer,
          filename: logoUpload.name || 'logo.png',
          mimeType: logoUpload.type || 'image/png',
        });
      }
    } catch (logError) {
      console.error('[submit] failed to log submission:', logError);
    }

    return Response.json({
      success: true,
      contactId,
      fleadid,
      submissionId,
      skipMockup,
      shouldGenerate:
        !skipMockup && env.AUTO_GENERATE_MOCKUP && canGenerateMockups(),
      promptPreview: prompt,
      knowledgeProfileId: profile.id,
      payload,
      job,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
