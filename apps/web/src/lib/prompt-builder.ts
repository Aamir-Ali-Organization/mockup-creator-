import type { AiPromptPayload, KnowledgeProfile } from '@mockup/shared';

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
  rosterInfo?: string | null;
};

export function buildAiPromptPayload(quote: QuotePromptInput): AiPromptPayload {
  const wantsLogo =
    Boolean(quote.logoFile) ||
    Boolean(quote.logoCreation && quote.logoCreation.toLowerCase().includes('yes'));

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
): string {
  const accessories =
    payload.accessories.length > 0
      ? payload.accessories.join(', ')
      : 'no additional accessories';

  const logoLine = payload.logo
    ? 'Incorporate a bold custom team logo prominently on the chest and keep branding readable for production.'
    : 'No custom logo artwork is available; keep a clean branded uniform wordmark look.';

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

  const parts = [
    profile.instructions.trim(),
    profile.knowledgeBase.trim()
      ? `Knowledge base for ${profile.label}:\n${profile.knowledgeBase.trim()}`
      : '',
    `Task:\n${filled}`,
    profile.sampleImages.length > 0
      ? `Reference samples attached (${profile.sampleImages.length}). Match quality and presentation style; create a new uniform for ${payload.team.name}.`
      : '',
  ].filter(Boolean);

  return parts.join('\n\n');
}

/** @deprecated Prefer buildPromptFromProfile with a knowledge profile. */
export function buildPrompt(payload: AiPromptPayload): string {
  const accessories =
    payload.accessories.length > 0
      ? payload.accessories.join(', ')
      : 'no additional accessories';

  const logoLine = payload.logo
    ? 'Incorporate a bold custom team logo prominently on the chest and keep branding readable for production.'
    : 'No custom logo artwork is available; keep a clean branded uniform wordmark look.';

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
  const { getKnowledgeProfile } = await import('@/lib/knowledge-store');
  const payload = buildAiPromptPayload(quote);
  let profile = await getKnowledgeProfile(quote.sport);
  if (!profile.enabled) {
    profile = await getKnowledgeProfile('Other');
  }
  const prompt = buildPromptFromProfile(profile, payload);
  return { payload, prompt, profile };
}
