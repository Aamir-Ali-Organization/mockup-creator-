import type { AiPromptPayload } from '@mockup/shared';

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

/**
 * Converts a quote submission into a structured payload for future image generation.
 */
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

/**
 * Builds a detailed OpenAI Images API prompt from structured quote JSON.
 */
export function buildPrompt(payload: AiPromptPayload): string {
  const accessories =
    payload.accessories.length > 0
      ? payload.accessories.join(', ')
      : 'no additional accessories';

  const logoLine = payload.logo
    ? 'Include a custom team logo placement on the chest and optional sleeve mark.'
    : 'No custom logo artwork is available; keep a clean branded uniform look.';

  const alternate = payload.colors.alternate
    ? `Alternate accent color: ${payload.colors.alternate}.`
    : '';

  return [
    `Create a photorealistic product mockup of a custom ${payload.team.sport.toLowerCase()} uniform`,
    `for the team "${payload.team.name}".`,
    `Audience: ${payload.team.gender}, ${payload.team.ageGroup.toLowerCase()} sizing and fit.`,
    `Primary color: ${payload.colors.primary}. Secondary color: ${payload.colors.secondary}. ${alternate}`.trim(),
    `Show a front and three-quarter view on a clean studio background.`,
    `Jersey and matching shorts/pants should look premium, athletic, and game-ready.`,
    logoLine,
    `Suggested accessories context: ${accessories}.`,
    `Order quantity context: ${payload.quantity} uniforms (do not render quantity as text).`,
    'High detail fabric texture, sharp stitching, natural lighting, commercial sportswear catalog style.',
    'No watermarks, no unreadablerandom text, no distorted anatomy.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildPromptFromQuote(quote: QuotePromptInput): {
  payload: AiPromptPayload;
  prompt: string;
} {
  const payload = buildAiPromptPayload(quote);
  return {
    payload,
    prompt: buildPrompt(payload),
  };
}
