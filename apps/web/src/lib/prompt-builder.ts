import {
  LOGO_ATTACH_OPTION,
  LOGO_CREATE_OPTION,
  type AiPromptPayload,
  type KnowledgeProfile,
} from '@mockup/shared';

export type QuotePromptInput = {
  teamName: string;
  sport: string;
  gender: string;
  ageGroup: string;
  primaryColor: string;
  secondaryColor: string;
  alternateColor?: string | null;
  quantity: number;
  accessories: string[];
  logoFile?: string | null;
  logoCreation?: string | null;
  hasLogoFile?: boolean;
  rosterInfo?: string | null;
};

function resolveLogoMode(quote: QuotePromptInput): {
  wantsLogo: boolean;
  hasLogoFile: boolean;
  createLogo: boolean;
} {
  const creation = (quote.logoCreation || '').trim();
  const hasLogoFile = Boolean(quote.hasLogoFile || quote.logoFile);
  const createLogo = creation === LOGO_CREATE_OPTION || creation.toLowerCase().includes('yes');
  const attachLogo = creation === LOGO_ATTACH_OPTION;
  return {
    wantsLogo: hasLogoFile || createLogo || attachLogo,
    hasLogoFile,
    createLogo: createLogo && !hasLogoFile,
  };
}

export function buildLogoPromptLine(
  payload: AiPromptPayload,
  teamName: string,
): string {
  if (payload.hasLogoFile) {
    return [
      `CUSTOMER LOGO ATTACHED: The first attached reference image is the official team logo for ${teamName}.`,
      'Reproduce that logo faithfully on the uniform (chest primary; optional sleeve/hat if natural).',
      'Keep logo colors, shapes, and proportions accurate. Do not invent a different mascot or replace the logo.',
      'Do not treat style-sample uniforms as the logo source.',
    ].join(' ');
  }

  if (payload.logoCreation === LOGO_CREATE_OPTION) {
    return [
      `LOGO CREATION REQUESTED: Invent a bold, original Big Mad Drip team logo/mascot for ${teamName}.`,
      'Make it aggressive, custom, and production-ready (readable at jersey size; works for embroidery/print).',
      `Use the team colors (${payload.colors.primary} / ${payload.colors.secondary}) in the logo.`,
      'Place the new logo prominently on the chest as the main graphic — not a plain wordmark-only jersey.',
      'Do not copy logos from style reference samples.',
    ].join(' ');
  }

  if (payload.logo) {
    return [
      `Create a bold original chest graphic/mascot for ${teamName} in Big Mad Drip style.`,
      'Keep branding readable for production. Do not copy logos from style samples.',
    ].join(' ');
  }

  return [
    `No customer logo file was provided. Invent a bold original team mascot/graphic for ${teamName}`,
    'and place it as a strong chest graphic — aggressive Big Mad Drip style, not a plain wordmark-only jersey.',
    'Do not copy logos from style reference samples.',
  ].join(' ');
}

export function buildAiPromptPayload(quote: QuotePromptInput): AiPromptPayload {
  const { wantsLogo, hasLogoFile } = resolveLogoMode(quote);

  return {
    team: {
      name: quote.teamName,
      sport: quote.sport,
      gender: quote.gender,
      ageGroup: quote.ageGroup,
    },
    colors: {
      primary: quote.primaryColor,
      secondary: quote.secondaryColor,
      alternate: quote.alternateColor ?? '',
    },
    quantity: quote.quantity,
    accessories: quote.accessories,
    logo: wantsLogo,
    logoCreation: quote.logoCreation || undefined,
    hasLogoFile,
    rosterInfo: quote.rosterInfo || undefined,
  };
}

function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * Builds the final OpenAI prompt from a knowledge profile + quote payload.
 * Instructions and knowledge base are fully dynamic (admin-editable).
 */
export function buildPromptFromProfile(
  profile: KnowledgeProfile,
  payload: AiPromptPayload,
  options?: { referenceSampleCount?: number; hasLogoFile?: boolean },
): string {
  const accessories =
    payload.accessories.length > 0
      ? payload.accessories.join(', ')
      : 'no additional accessories';

  const payloadWithLogo: AiPromptPayload = {
    ...payload,
    hasLogoFile: options?.hasLogoFile ?? payload.hasLogoFile ?? false,
  };

  const logoLine = buildLogoPromptLine(payloadWithLogo, payload.team.name);

  const alternate = payload.colors.alternate
    ? `Use ${payload.colors.alternate} as the sharp accent color.`
    : '';

  const rosterInfo = payload.rosterInfo
    ? `Roster / naming notes (do not invent jersey text unless clearly requested): ${payload.rosterInfo}`
    : '';

  const filled = fillTemplate(profile.promptTemplate, {
    teamName: payload.team.name,
    sport: payload.team.sport,
    gender: payload.team.gender,
    ageGroup: payload.team.ageGroup,
    primaryColor: payload.colors.primary,
    secondaryColor: payload.colors.secondary,
    alternateColor: alternate,
    quantity: String(payload.quantity),
    accessories,
    logoLine,
    rosterInfo,
  })
    .replace(/\s+/g, ' ')
    .trim();

  const sampleCount =
    options?.referenceSampleCount ?? profile.sampleImages.length;
  const hasLogo = Boolean(payloadWithLogo.hasLogoFile);

  const parts = [
    profile.instructions.trim(),
    profile.knowledgeBase.trim()
      ? `Knowledge base for ${profile.label}:\n${profile.knowledgeBase.trim()}`
      : '',
    `Task:\n${filled}`,
    hasLogo
      ? 'Image order: (1) customer logo — use exactly on the uniform; (2+) style sample uniforms — match quality/construction/lighting only, never copy their logos/names/numbers.'
      : sampleCount > 0
        ? `Reference sample images are attached (${sampleCount}). Match their quality, garment construction, lighting, aggressive sublimated graphic style, and presentation. Create a NEW ${payload.team.sport} uniform for ${payload.team.name} only — do not copy logos, names, or numbers from the samples.`
        : 'No reference sample images were attached for this generation.',
  ].filter(Boolean);

  return parts.join('\n\n');
}

/** @deprecated Prefer buildPromptFromProfile with a knowledge profile. */
export function buildPrompt(payload: AiPromptPayload): string {
  const accessories =
    payload.accessories.length > 0
      ? payload.accessories.join(', ')
      : 'no additional accessories';

  const logoLine = buildLogoPromptLine(payload, payload.team.name);

  const alternate = payload.colors.alternate
    ? `Use ${payload.colors.alternate} as the sharp accent color.`
    : '';

  return [
    `Create a premium custom ${payload.team.sport} uniform for ${payload.team.name}.`,
    `Use ${payload.colors.primary} as the dominant main color, ${payload.colors.secondary} as the secondary color.`,
    alternate,
    logoLine,
    `Audience fit: ${payload.team.gender}, ${payload.team.ageGroup}.`,
    'Make the design look like premium modern custom sportswear made for competition — aggressive, clean, athletic, and visually distinctive.',
    'Use realistic performance fabric, sublimated graphics, crisp seams, accurate proportions, and high-definition detail.',
    'Present on an athletic model in a confident game-ready pose with a clean white studio background.',
    'Keep the full uniform visible from head to toe.',
    `Suggested accessories context: ${accessories}.`,
    `Order quantity context: ${payload.quantity} uniforms (do not render quantity as text).`,
    'No extra logos, no random text, no watermarks, no distorted anatomy.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildPromptFromQuote(quote: QuotePromptInput) {
  const payload = buildAiPromptPayload(quote);
  return { payload, prompt: buildPrompt(payload) };
}

export async function buildPromptFromQuoteWithKnowledge(quote: QuotePromptInput) {
  const { collectStyleReferenceSamples, getKnowledgeProfile } = await import(
    '@/lib/knowledge-store'
  );
  const payload = buildAiPromptPayload(quote);
  let profile = await getKnowledgeProfile(quote.sport);
  if (!profile.enabled) {
    profile = await getKnowledgeProfile('Other');
  }

  const refs = await collectStyleReferenceSamples(profile, 5);
  const prompt = buildPromptFromProfile(profile, payload, {
    referenceSampleCount: refs.sampleCountForPrompt,
    hasLogoFile: payload.hasLogoFile,
  });
  return { payload, prompt, profile, sampleFiles: refs.samples };
}
