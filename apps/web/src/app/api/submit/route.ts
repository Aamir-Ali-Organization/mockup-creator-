import { createQuoteBodySchema } from '@mockup/shared';
import { env } from '@/lib/env';
import { toErrorResponse, AppError } from '@/lib/errors';
import { isGhlReady, resolveLeadByFleadid, upsertLeadInGhl } from '@/lib/ghl';
import { canGenerateMockups } from '@/lib/openai';
import { buildPromptFromQuoteWithKnowledge } from '@/lib/prompt-builder';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseAccessories(value: FormDataEntryValue[]): string[] {
  return value.map(String).filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const accessories = parseAccessories(formData.getAll('accessories'));

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
      logoCreation: formData.get('logoCreation') || undefined,
      referralSource: formData.get('referralSource'),
      fleadid: formData.get('fleadid') || null,
      ghlContactId: formData.get('ghlContactId') || null,
      rosterFile: null,
      logoFile: formData.get('logoFile') ? 'attached' : null,
    });

    if (!parsed.success) {
      throw new AppError('Validation failed', 400, parsed.error.flatten());
    }

    const data = parsed.data;
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
      logoFile: data.logoFile,
      logoCreation: data.logoCreation || null,
      rosterInfo: data.rosterInfo,
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
        logoCreation: data.logoCreation || null,
        referralSource: data.referralSource,
        mockupGenerated: skipMockup,
      });
      contactId = ghlResult.contactId;
    }

    return Response.json({
      success: true,
      contactId,
      fleadid,
      skipMockup,
      shouldGenerate:
        !skipMockup && env.AUTO_GENERATE_MOCKUP && canGenerateMockups(),
      promptPreview: prompt,
      knowledgeProfileId: profile.id,
      payload,
      job: {
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
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
