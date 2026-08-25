import {
  LOGO_ATTACH_OPTION,
  LOGO_CREATE_OPTION,
  resolveKnowledgeLayers,
  type AiPromptPayload,
  type KnowledgeProfile,
} from '@mockup/shared';
import { buildLogoCreationBriefLine } from '@/lib/logo-brief';

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
  shirtStyle?: string | null;
  shirtType?: string | null;
  shortType?: string | null;
  logoComposition?: string | null;
  logoText?: string | null;
  logoIcon?: string | null;
  logoColorSource?: string | null;
  logoPrimaryColor?: string | null;
  logoSecondaryColor?: string | null;
  logoAlternateColor?: string | null;
  logoVibe?: string | null;
  logoNotes?: string | null;
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
    const brief = buildLogoCreationBriefLine({
      teamName,
      sport: payload.team.sport,
      primaryColor: payload.colors.primary,
      secondaryColor: payload.colors.secondary,
      alternateColor: payload.colors.alternate,
      logoComposition: payload.logoComposition,
      logoText: payload.logoText,
      logoIcon: payload.logoIcon,
      logoColorSource: payload.logoColorSource,
      logoPrimaryColor: payload.logoPrimaryColor,
      logoSecondaryColor: payload.logoSecondaryColor,
      logoAlternateColor: payload.logoAlternateColor,
      logoVibe: payload.logoVibe,
      logoNotes: payload.logoNotes,
    });
    return [
      `LOGO CREATION REQUESTED for ${teamName}.`,
      brief,
      'Invent a bold original Big Mad Drip logo from that brief and place it prominently on the chest.',
      'Do not copy logos from style reference samples.',
    ]
      .filter(Boolean)
      .join(' ');
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

export function buildGarmentPromptLine(payload: AiPromptPayload): string {
  const style = (payload.shirtStyle || '').trim();
  const shirtType = (payload.shirtType || '').trim();
  const shortType = (payload.shortType || '').trim();
  if (!style && !shirtType && !shortType) return '';
  return [
    'Uniform construction (follow exactly):',
    style ? `shirt style = ${style}` : null,
    shirtType ? `shirt type = ${shirtType}` : null,
    shortType ? `short type = ${shortType}` : null,
  ]
    .filter(Boolean)
    .join('; ');
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
    shirtStyle: quote.shirtStyle || '',
    shirtType: quote.shirtType || '',
    shortType: quote.shortType || '',
    logoComposition: quote.logoComposition || '',
    logoText: quote.logoText || '',
    logoIcon: quote.logoIcon || '',
    logoColorSource: quote.logoColorSource || '',
    logoPrimaryColor: quote.logoPrimaryColor || '',
    logoSecondaryColor: quote.logoSecondaryColor || '',
    logoAlternateColor: quote.logoAlternateColor || '',
    logoVibe: quote.logoVibe || '',
    logoNotes: quote.logoNotes || '',
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
 * Optional combo overrides (instructions / notes / template) fall back to sport defaults.
 */
export function buildPromptFromProfile(
  profile: KnowledgeProfile,
  payload: AiPromptPayload,
  options?: {
    referenceSampleCount?: number;
    hasLogoFile?: boolean;
    comboId?: string | null;
  },
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
  const garmentLine = buildGarmentPromptLine(payloadWithLogo);
  const layers = resolveKnowledgeLayers(profile, options?.comboId);

  const alternate = payload.colors.alternate
    ? `Use ${payload.colors.alternate} as the sharp accent color.`
    : '';

  const rosterInfo = payload.rosterInfo
    ? `Roster / naming notes (do not invent jersey text unless clearly requested): ${payload.rosterInfo}`
    : '';

  const filled = fillTemplate(layers.promptTemplate, {
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
    garmentLine,
    shirtStyle: payload.shirtStyle || '',
    shirtType: payload.shirtType || '',
    shortType: payload.shortType || '',
    rosterInfo,
  })
    .replace(/\s+/g, ' ')
    .trim();

  const taskBody =
    garmentLine && !filled.toLowerCase().includes('uniform construction')
      ? `${filled} ${garmentLine}`
      : filled;

  const sampleCount =
    options?.referenceSampleCount ?? profile.sampleImages.length;
  const hasLogo = Boolean(payloadWithLogo.hasLogoFile);
  const knowledgeLabel = layers.comboId
    ? `${profile.label} · ${layers.comboId}`
    : profile.label;

  const parts = [
    layers.instructions.trim(),
    layers.knowledgeBase.trim()
      ? `Knowledge base for ${knowledgeLabel}:\n${layers.knowledgeBase.trim()}`
      : '',
    `Task:\n${taskBody}`,
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
  const garmentLine = buildGarmentPromptLine(payload);

  const alternate = payload.colors.alternate
    ? `Use ${payload.colors.alternate} as the sharp accent color.`
    : '';

  return [
    `Create a premium custom ${payload.team.sport} uniform for ${payload.team.name}.`,
    `Use ${payload.colors.primary} as the dominant main color, ${payload.colors.secondary} as the secondary color.`,
    alternate,
    logoLine,
    garmentLine,
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

  const refs = await collectStyleReferenceSamples(profile, 5, {
    gender: quote.gender,
    shirtStyle: quote.shirtStyle,
    shirtType: quote.shirtType,
  });
  const prompt = buildPromptFromProfile(profile, payload, {
    referenceSampleCount: refs.sampleCountForPrompt,
    hasLogoFile: payload.hasLogoFile,
    comboId: refs.comboId,
  });
  return { payload, prompt, profile, sampleFiles: refs.samples, sampleSource: refs.source, comboId: refs.comboId };
}
