/**
 * Defaults + placeholders for per-sport AI logo creation prompts.
 * Stored on each KnowledgeProfile as logoInstructions / logoPromptTemplate.
 */

export const LOGO_COMPOSITION_WORDMARK = 'Wordmark only (text)' as const;
export const LOGO_COMPOSITION_ICON = 'Icon / mascot only' as const;
export const LOGO_COMPOSITION_COMBINED = 'Word + icon combined' as const;
export const LOGO_COMPOSITION_BADGE = 'Badge / shield emblem' as const;

export const LOGO_PROMPT_PLACEHOLDERS = [
  'teamName',
  'sport',
  'composition',
  'compositionSentence',
  'openerSentence',
  'vibe',
  'text',
  'icon',
  'colors',
  'logoNotes',
  'primaryColor',
  'secondaryColor',
  'alternateColor',
  'textSentence',
  'iconSentence',
  'notesSentence',
] as const;

export const DEFAULT_LOGO_INSTRUCTIONS = [
  'Output ONLY the logo centered on a clean solid white background.',
  'No mockup, no jersey, no athlete, no watermark, no extra text outside the logo.',
  'High-definition vector-like clarity suitable for sublimation and embroidery.',
  'Obey the composition lock first — it overrides brand energy, vibe, and sample style if they conflict.',
  'If reference logo sample images are provided, match quality/clarity only and still obey the composition lock. Never copy sample mascots into a wordmark-only request.',
].join(' ');

export const DEFAULT_LOGO_PROMPT_TEMPLATE = [
  '{{openerSentence}}',
  '{{compositionSentence}}',
  'Logo type: {{composition}}.',
  'Style vibe: {{vibe}}. Big Mad Drip brand energy — bold, custom, production-minded, never basic — but never violate the composition lock.',
  '{{textSentence}}',
  '{{iconSentence}}',
  'Color palette: {{colors}}.',
  '{{notesSentence}}',
  '{{compositionSentence}}',
].join(' ');

export type LogoPromptSettings = {
  instructions: string;
  promptTemplate: string;
};

/** Wordmark-only and icon-only must not borrow reference samples from other composition types. */
export function isStrictLogoComposition(composition: string): boolean {
  const key = composition.trim();
  return key === LOGO_COMPOSITION_WORDMARK || key === LOGO_COMPOSITION_ICON;
}

export function buildLogoCompositionGuard(composition: string): string {
  const key = composition.trim();

  if (key === LOGO_COMPOSITION_WORDMARK) {
    return [
      'CRITICAL COMPOSITION LOCK — WORDMARK ONLY.',
      'Output must be custom athletic TYPOGRAPHY / LETTERING ONLY — the team name (or provided text) as stylized type.',
      'Allowed: block letters, collegiate type, script, outlines, shadows, bevels, drips as letter effects, stacked text.',
      'FORBIDDEN (zero tolerance): mascots, animals, panthers, lions, birds, skulls, faces, characters, creatures, claws, helmets-as-mascot, pictorial icons, emblems-as-pictures, badges with creatures, any non-letter graphic.',
      'If you draw any animal, face, or pictorial symbol, the logo is WRONG. Letters and typographic shapes only.',
    ].join(' ');
  }

  if (key === LOGO_COMPOSITION_ICON) {
    return [
      'CRITICAL COMPOSITION LOCK — ICON / MASCOT ONLY.',
      'One bold standalone emblem or mascot mark centered on white.',
      'FORBIDDEN: full team name wordmark, slogans, paragraph lettering, or a separate text lockup beside the mark.',
      'Minimal letters inside a mark (monogram/initials) are OK only if they are part of the icon itself.',
    ].join(' ');
  }

  if (key === LOGO_COMPOSITION_BADGE) {
    return [
      'CRITICAL COMPOSITION: Badge or shield emblem.',
      'Encapsulate the team identity inside a crest/shield.',
      'Short text and icon may appear together inside the badge only — not a loose wordmark plus separate floating mascot.',
    ].join(' ');
  }

  return [
    'CRITICAL COMPOSITION: Combined wordmark AND icon/mascot in one cohesive lockup.',
    'Both lettering and a distinct icon/mark must be clearly visible and integrated.',
  ].join(' ');
}

export function buildLogoOpenerSentence(composition: string, teamName: string, sport: string): string {
  const key = composition.trim();
  if (key === LOGO_COMPOSITION_WORDMARK) {
    return `Create a single premium TYPOGRAPHY-ONLY wordmark logo for ${teamName} (${sport}) — letters and letter effects only, absolutely no mascot or pictorial icon.`;
  }
  if (key === LOGO_COMPOSITION_ICON) {
    return `Create a single premium ICON/MASCOT-ONLY mark for ${teamName} (${sport}) — no full team-name wordmark.`;
  }
  if (key === LOGO_COMPOSITION_BADGE) {
    return `Create a single premium badge/shield emblem logo for ${teamName} (${sport}).`;
  }
  return `Create a single premium combined word+icon sports team logo for ${teamName} (${sport}).`;
}

export function buildLogoReferencePromptSuffix(
  composition: string,
  teamName: string,
  sampleCount: number,
): string {
  if (sampleCount <= 0) return '';

  const key = composition.trim();

  if (key === LOGO_COMPOSITION_WORDMARK) {
    return `Reference logo sample images are attached (${sampleCount}). They show WORDMARK / TYPOGRAPHY style only. Match typography quality, weight, and production clarity — create a NEW original wordmark for ${teamName}. Do NOT add mascots, animals, icons, or pictorial marks.`;
  }

  if (key === LOGO_COMPOSITION_ICON) {
    return `Reference logo sample images are attached (${sampleCount}). They show ICON / MASCOT style only. Match emblem quality and clarity — create a NEW original icon for ${teamName}. Do NOT add team name lettering or slogans.`;
  }

  return `Reference logo sample images are attached (${sampleCount}). Match their quality, composition style, and production clarity only — create a NEW original logo for ${teamName}. Do not copy text, mascots, or marks from the samples.`;
}

export function createDefaultLogoPromptSettings(): LogoPromptSettings {
  return {
    instructions: DEFAULT_LOGO_INSTRUCTIONS,
    promptTemplate: DEFAULT_LOGO_PROMPT_TEMPLATE,
  };
}
