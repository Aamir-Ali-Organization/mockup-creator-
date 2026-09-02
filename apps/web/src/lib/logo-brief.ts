import type { AiPromptPayload, LogoPromptSettings } from '@mockup/shared';
import {
  buildLogoCompositionGuard,
  buildLogoOpenerSentence,
  createDefaultLogoPromptSettings,
  isStrictLogoComposition,
  LOGO_COMPOSITION_WORDMARK,
  logoCompositionNeedsIcon,
  logoCompositionNeedsText,
} from '@mockup/shared';

export type LogoBrief = {
  teamName: string;
  sport: string;
  primaryColor: string;
  secondaryColor: string;
  alternateColor?: string | null;
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

export function logoBriefFromPayload(payload: AiPromptPayload): LogoBrief {
  return {
    teamName: payload.team.name,
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
  };
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveLogoPalette(brief: LogoBrief): string {
  const colorSource = (brief.logoColorSource || 'Use my team colors').trim();
  if (colorSource === 'I want specific logo colors') {
    const custom = [
      brief.logoPrimaryColor,
      brief.logoSecondaryColor,
      brief.logoAlternateColor,
    ]
      .map((c) => (c || '').trim())
      .filter(Boolean);
    if (custom.length) return custom.join(' / ');
  }
  return [brief.primaryColor, brief.secondaryColor, brief.alternateColor]
    .filter(Boolean)
    .join(' / ');
}

function briefVars(brief: LogoBrief): Record<string, string> {
  const composition = (brief.logoComposition || 'Word + icon combined').trim();
  const vibe = (brief.logoVibe || 'Bold & aggressive').trim();
  const text = (brief.logoText || brief.teamName).trim();
  const icon = (brief.logoIcon || '').trim();
  const colors = resolveLogoPalette(brief);
  const notes = (brief.logoNotes || '').trim();
  const needsText = logoCompositionNeedsText(composition);
  const needsIcon = logoCompositionNeedsIcon(composition);
  const compositionSentence = buildLogoCompositionGuard(composition);

  return {
    teamName: brief.teamName,
    sport: brief.sport,
    composition,
    compositionSentence,
    openerSentence: buildLogoOpenerSentence(composition, brief.teamName, brief.sport),
    vibe,
    text,
    icon,
    colors,
    logoNotes: notes,
    primaryColor: brief.primaryColor,
    secondaryColor: brief.secondaryColor,
    alternateColor: (brief.alternateColor || '').trim(),
    textSentence: needsText
      ? text
        ? `Lettering / text on the logo: "${text}". Keep typography sharp and readable at jersey size.${
            composition === LOGO_COMPOSITION_WORDMARK
              ? ' Typography and letter effects ONLY — no pictorial mascot or icon of any kind.'
              : ''
          }`
        : `Use "${brief.teamName}" as stylized wordmark lettering.${
            composition === LOGO_COMPOSITION_WORDMARK
              ? ' Typography only — no mascot or icon.'
              : ''
          }`
      : 'Do not include team name lettering or slogan text.',
    iconSentence:
      needsIcon && icon
        ? `Icon / mascot concept: ${icon}.`
        : needsIcon
          ? 'Create an original sport-relevant icon or mascot mark.'
          : 'Do not include any icon, mascot, animal, character, face, claw, helmet-as-mascot, or pictorial symbol.',
    notesSentence: notes ? `Extra direction: ${notes}.` : '',
  };
}

/**
 * Prefer the filled sport template, but for strict types (wordmark / icon-only)
 * always front-load the composition lock so older admin templates cannot bury it.
 */
export function buildStandaloneLogoPrompt(
  brief: LogoBrief,
  settings?: LogoPromptSettings | null,
): string {
  const logoSettings =
    settings?.promptTemplate?.trim() ? settings : createDefaultLogoPromptSettings();

  const vars = briefVars(brief);
  const filled = fillTemplate(logoSettings.promptTemplate, vars);
  const instructions = (logoSettings.instructions || '').trim();
  const guard = vars.compositionSentence;
  const opener = vars.openerSentence;

  const body =
    guard && !filled.includes(guard) ? `${filled} ${guard}` : filled;

  // Image models weight early tokens heavily — put the lock first for wordmark/icon.
  if (isStrictLogoComposition(vars.composition)) {
    return [guard, opener, instructions, body, guard]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return [instructions, body].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** Short brief line injected into the uniform mockup prompt when creating a logo. */
export function buildLogoCreationBriefLine(brief: LogoBrief): string {
  const composition = (brief.logoComposition || '').trim();
  const parts = [
    composition ? `type=${composition}` : null,
    logoCompositionNeedsText(composition) && brief.logoText
      ? `text="${brief.logoText}"`
      : null,
    logoCompositionNeedsIcon(composition) && brief.logoIcon ? `icon=${brief.logoIcon}` : null,
    brief.logoVibe ? `vibe=${brief.logoVibe}` : null,
    `colors=${resolveLogoPalette(brief)}`,
    composition ? buildLogoCompositionGuard(composition) : null,
    brief.logoNotes ? `notes=${brief.logoNotes}` : null,
  ].filter(Boolean);
  return parts.length ? `Logo brief: ${parts.join('; ')}.` : '';
}

/** Reminder when placing an already-generated logo on the uniform (step 2). */
export function buildLogoPlacementGuard(composition?: string | null): string {
  const key = (composition || '').trim();
  if (!key) return '';
  if (key === LOGO_COMPOSITION_WORDMARK) {
    return [
      buildLogoCompositionGuard(key),
      'The attached customer logo is TEXT/WORDMARK only.',
      'Place that exact wordmark on the jersey. Do NOT invent or add a mascot from style-sample uniforms.',
    ].join(' ');
  }
  return buildLogoCompositionGuard(key);
}
